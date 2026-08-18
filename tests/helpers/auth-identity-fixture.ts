import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import type { Prisma, PrismaClient } from "@prisma/client";

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

// -----------------------------------------------------------------------------------------------
// B-O6R-01 ciclo 2 (R-B-O6R-01-ciclo1, A-1/B-5) — determinismo do catálogo de roles.
//
// CREATE ROLE/GRANT/DROP escrevem em linhas COMPARTILHADAS do catálogo do Postgres (`pg_authid`,
// `pg_auth_members`, `pg_default_acl`). `node --test` roda os arquivos de teste em PARALELO — em
// processos distintos —, e quatro suítes do batch -db escrevem catálogo ao mesmo tempo; a disputa
// produz `XX000: tuple concurrently updated` (~25% medido no ciclo 1), o arquivo aborta e a suíte
// roda MENOS testes reportando um total plausível. Por isso toda a sequência de catálogo roda numa
// transação com `pg_advisory_xact_lock` — lock DO SERVIDOR, porque o paralelismo é entre processos
// e um mutex em JS não alcançaria. A constante é DISTINTA da de provisioning (medida:
// `scripts/provision-rbac.ts:67` usa `20260863`): os dois fluxos não disputam a mesma fila.
// Timeout da transação EXPLÍCITO: com os quatro escritores enfileirando no lock, o default de 5s
// do Prisma viraria um flake novo.
// -----------------------------------------------------------------------------------------------
const ROLE_CATALOG_ADVISORY_LOCK = 20268801n;
const ROLE_CATALOG_TX_OPTIONS = { maxWait: 30_000, timeout: 30_000 } as const;

// Idade a partir da qual uma role `o6r_b01_*` deixada para trás é considerada órfã (o timestamp
// embutido no nome é o `Date.now()` da criação). 60 min: nenhuma execução legítima do batch vive
// tanto; roles da execução corrente nunca são alcançadas.
const ORPHAN_ROLE_MAX_AGE_MS = 60 * 60 * 1000;

export async function withRoleCatalogLock<T>(
  adminClient: PrismaClient,
  run: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return adminClient.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ROLE_CATALOG_ADVISORY_LOCK}::bigint)`;

    return run(tx);
  }, ROLE_CATALOG_TX_OPTIONS);
}

// Sweep de órfãs, SEMPRE dentro do lock de catálogo: exclusivamente roles do prefixo do PRÓPRIO
// arnês (`o6r_b01_`) cujo timestamp embutido no nome seja mais velho que 60 min. É teardown do
// próprio namespace — nunca curinga além disso (este repositório já teve incidente de mass-delete
// na base viva). O que for dropado é reportado no stderr para ficar anexável ao relatório.
async function sweepOrphanEphemeralRoles(tx: Prisma.TransactionClient): Promise<string[]> {
  const rows = await tx.$queryRaw<Array<{ rolname: string }>>`
    SELECT rolname FROM pg_roles WHERE rolname LIKE 'o6r_b01_%' ORDER BY rolname
  `;
  const cutoff = Date.now() - ORPHAN_ROLE_MAX_AGE_MS;
  const orphans = rows
    .map((row) => row.rolname)
    .filter((name) => {
      const match = /^o6r_b01_(\d+)_[0-9a-f]+$/.exec(name);

      if (!match) {
        return false;
      }

      const createdAt = Number(match[1]);

      return Number.isFinite(createdAt) && createdAt < cutoff;
    });

  for (const orphan of orphans) {
    await tx.$executeRawUnsafe(`DROP OWNED BY "${orphan}"`);
    await tx.$executeRawUnsafe(`DROP ROLE "${orphan}"`);
  }

  if (orphans.length > 0) {
    process.stderr.write(
      `[o6r-arnes] sweep dropou ${orphans.length} role(s) órfã(s) o6r_b01_* (> 60 min):\n` +
        orphans.map((name) => `[o6r-arnes]   ${name}\n`).join(""),
    );
  }

  return orphans;
}

export async function createEphemeralRole(
  adminClient: PrismaClient,
  connectionString: string,
): Promise<EphemeralRole> {
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("@prisma/client");

  const roleName = `o6r_b01_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const rolePassword = `o6r-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  await withRoleCatalogLock(adminClient, async (tx) => {
    await sweepOrphanEphemeralRoles(tx);
    await tx.$executeRawUnsafe(
      `CREATE ROLE "${roleName}" LOGIN PASSWORD '${rolePassword.replace(/'/g, "''")}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`,
    );
    await tx.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${roleName}"`);
    await tx.$executeRawUnsafe(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${roleName}"`,
    );
    await tx.$executeRawUnsafe(
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${roleName}"`,
    );
  });

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
      await withRoleCatalogLock(adminClient, async (tx) => {
        await tx.$executeRawUnsafe(`DROP OWNED BY "${roleName}"`);
        await tx.$executeRawUnsafe(`DROP ROLE "${roleName}"`);
      });
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
