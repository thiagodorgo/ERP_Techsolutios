import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import type { PrismaClient } from "@prisma/client";

// -----------------------------------------------------------------------------------------------
// B-O6R-01 — arnês compartilhado das suítes -db de identidade. Regras do §7 que ele materializa:
//   - role EFÊMERA NOSUPERUSER (precedente tests/rls-tenant-isolation.test.ts:20-45): o único
//     arranjo em que o RLS existe — sob a conexão `postgres` da CI todo teste de política ficaria
//     verde para sempre.
//   - teardown ESCOPADO aos ids do próprio teste (nunca curinga; houve incidente de mass-delete);
//     a trilha append-only é limpa NA CONEXÃO PRIVILEGIADA com SET LOCAL
//     session_replication_role='replica' DENTRO da transação (o idioma dos moldes 20260836/47) —
//     jamais ALTER TABLE … DISABLE TRIGGER. Em modo replica a checagem de FK também não roda:
//     a ordem eventos→links→identities abaixo é DISCIPLINA do autor, não imposição do banco.
// -----------------------------------------------------------------------------------------------

export type EphemeralRole = {
  readonly roleName: string;
  readonly client: PrismaClient;
  drop(): Promise<void>;
};

export async function createEphemeralRole(
  adminClient: PrismaClient,
  connectionString: string,
): Promise<EphemeralRole> {
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("@prisma/client");

  const roleName = `o6r_b01_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const rolePassword = `o6r-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  await adminClient.$executeRawUnsafe(
    `CREATE ROLE "${roleName}" LOGIN PASSWORD '${rolePassword.replace(/'/g, "''")}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`,
  );
  await adminClient.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${roleName}"`);
  await adminClient.$executeRawUnsafe(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${roleName}"`,
  );
  await adminClient.$executeRawUnsafe(
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${roleName}"`,
  );

  const client = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: buildConnectionStringForRole(connectionString, roleName, rolePassword),
    }),
  });

  return {
    roleName,
    client,
    async drop(): Promise<void> {
      await client.$disconnect();
      await adminClient.$executeRawUnsafe(`DROP OWNED BY "${roleName}"`);
      await adminClient.$executeRawUnsafe(`DROP ROLE "${roleName}"`);
    },
  };
}

export function buildConnectionStringForRole(
  connectionString: string,
  roleName: string,
  rolePassword: string,
): string {
  const url = new URL(connectionString);

  url.username = roleName;
  url.password = rolePassword;

  return url.toString();
}

export type OrgFixture = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roleId: string;
  readonly email: string;
  readonly password: string;
};

// Cria organização + usuário + papel + assignment + credencial LOCAL, tudo com o cliente
// privilegiado (fixture; a superfície TESTADA autentica por JWT/login real).
export async function createOrgWithUser(
  adminClient: PrismaClient,
  input: {
    readonly name: string;
    readonly slug: string;
    readonly email: string;
    readonly password: string;
    readonly roleKey?: string;
    readonly userStatus?: string;
  },
): Promise<OrgFixture> {
  const { LocalAuthCredentialRepository, LocalAuthCredentialService } = await import(
    "../../src/modules/auth/index.js"
  );

  const tenant = await adminClient.tenant.create({
    data: { name: input.name, slug: input.slug },
  });
  const user = await adminClient.user.create({
    data: {
      tenant_id: tenant.id,
      name: input.name,
      email: input.email,
      status: input.userStatus ?? "active",
    },
  });
  const role = await adminClient.role.create({
    data: {
      tenant_id: tenant.id,
      key: input.roleKey ?? `role_${tenant.id.slice(0, 8)}`,
      name: "Fixture Role",
      scope: "tenant",
    },
  });

  await adminClient.userRoleAssignment.create({
    data: { tenant_id: tenant.id, user_id: user.id, role_id: role.id },
  });

  const credentialService = new LocalAuthCredentialService(
    new LocalAuthCredentialRepository(adminClient),
    {
      findByIdForTenant: (userId: string, tenantId: string) =>
        adminClient.user.findFirst({
          where: { id: userId, tenant_id: tenantId },
          select: { id: true, tenant_id: true, email: true },
        }),
    },
  );

  await credentialService.createCredentialForUser({
    tenant_id: tenant.id,
    user_id: user.id,
    email: input.email,
    password: input.password,
  });

  return {
    tenantId: tenant.id,
    userId: user.id,
    roleId: role.id,
    email: input.email.trim().toLowerCase(),
    password: input.password,
  };
}

// Teardown escopado aos tenants da fixture. A trilha (append-only) sai na conexão PRIVILEGIADA
// com SET LOCAL session_replication_role='replica' dentro da transação (idioma dos moldes).
export async function cleanupIdentityFixture(
  adminClient: PrismaClient,
  tenantIds: readonly string[],
): Promise<void> {
  if (tenantIds.length === 0) {
    return;
  }

  const identityRows = await adminClient.$queryRaw<Array<{ identity_id: string }>>`
    SELECT DISTINCT identity_id FROM auth_identity_links
    WHERE tenant_id = ANY(${tenantIds}::uuid[])
  `;
  const eventIdentityRows = await adminClient.$queryRaw<Array<{ id: string }>>`
    SELECT DISTINCT to_identity_id AS id FROM auth_identity_link_events
    WHERE tenant_id = ANY(${tenantIds}::uuid[])
    UNION
    SELECT DISTINCT from_identity_id AS id FROM auth_identity_link_events
    WHERE tenant_id = ANY(${tenantIds}::uuid[]) AND from_identity_id IS NOT NULL
  `;
  const identityIds = [
    ...new Set([
      ...identityRows.map((row) => row.identity_id),
      ...eventIdentityRows.map((row) => row.id),
    ]),
  ];

  await adminClient.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL session_replication_role = 'replica'`;
    await tx.$executeRaw`
      DELETE FROM auth_identity_link_events WHERE tenant_id = ANY(${tenantIds}::uuid[])
    `;
  });

  await adminClient.authSession.deleteMany({ where: { tenant_id: { in: [...tenantIds] } } });
  await adminClient.auditLog.deleteMany({ where: { tenant_id: { in: [...tenantIds] } } });
  await adminClient.localAuthCredential.deleteMany({ where: { tenant_id: { in: [...tenantIds] } } });
  await adminClient.authIdentityLink.deleteMany({ where: { tenant_id: { in: [...tenantIds] } } });

  if (identityIds.length > 0) {
    await adminClient.authIdentity.deleteMany({ where: { id: { in: identityIds } } });
  }

  await adminClient.userRoleAssignment.deleteMany({ where: { tenant_id: { in: [...tenantIds] } } });
  await adminClient.role.deleteMany({ where: { tenant_id: { in: [...tenantIds] } } });
  await adminClient.user.deleteMany({ where: { tenant_id: { in: [...tenantIds] } } });
  await adminClient.tenant.deleteMany({ where: { id: { in: [...tenantIds] } } });
}

export async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address();

  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");

  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

export async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

export async function requestJson(
  baseUrl: string,
  pathName: string,
  init: {
    readonly method?: string;
    readonly headers?: Record<string, string>;
    readonly body?: Record<string, unknown>;
  } = {},
): Promise<{ status: number; body: Record<string, unknown> & { data?: unknown; error?: { code?: string; reason?: string; tenants?: unknown } } }> {
  const response = await fetch(`${baseUrl}${pathName}`, {
    method: init.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });

  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
}
