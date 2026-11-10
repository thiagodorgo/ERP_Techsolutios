import assert from "node:assert/strict";
import type { Server } from "node:http";
import test, { after } from "node:test";

import type { PrismaClient } from "@prisma/client";

import {
  cleanupIdentityFixture,
  closeServer,
  createEphemeralRole,
  getBaseUrl,
  requestJson,
  type EphemeralRole,
} from "./helpers/auth-identity-fixture.js";
import { assertApplicationNamePropagated, buildApplicationName, withApplicationName } from "./helpers/pg-barrier.js";

// -----------------------------------------------------------------------------------------------
// B-USERS-ACESSO-SEG — as fatias de USUÁRIO no caminho PRISMA (o de produção), com o código sob teste
// conectado como papel EFÊMERO NOSUPERUSER NOBYPASSRLS (arnês `createEphemeralRole`). O `DATABASE_URL`
// é o administrador do cluster e só monta e desmonta a fixture. As rotas são as reais (`createApp`)
// com o serviço Prisma ligado ao cliente do papel efêmero; as permissões vêm do token (modo memória
// do runner), porque o sujeito aqui é a persistência, não o RBAC persistente (que é a S4).
//
//   S6 — e-mail duplicado na mesma organização → 409 `user_email_conflict`, sem a mensagem do banco
//        no corpo e sem usuário criado; outra organização aceita; duas criações simultâneas com o
//        mesmo e-mail terminam em exatamente um 201 e um 409.
//
// Papéis GLOBAIS (tenant_id IS NULL): `findByKeyForTenant` resolve chave de catálogo SÓ pela linha
// global. A base só-migrada da CI não tem nenhuma; a suíte cria a que falta e, no fim, remove só as
// que criou e que nenhuma atribuição referencia (outra suíte paralela pode ter ganho a mesma linha
// pelo `findFirst`: aí ela fica, como ficaria a linha de uma base provisionada).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const applicationName = buildApplicationName("users-seg-usuarios");

if (!connectionString) {
  test("B-USERS-ACESSO-SEG · usuários (Prisma) exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL e rode as migrações para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";

  const connection = withApplicationName(connectionString, applicationName);

  type Harness = {
    readonly admin: PrismaClient;
    readonly role: EphemeralRole;
    readonly tenantIds: string[];
    readonly createdGlobalRoleIds: string[];
    readonly globalRoleIds: Map<string, string>;
  };

  let harnessPromise: Promise<Harness> | undefined;

  const harness = (): Promise<Harness> =>
    (harnessPromise ??= (async () => {
      const [{ PrismaPg }, { PrismaClient: Client }] = await Promise.all([
        import("@prisma/adapter-pg"),
        import("@prisma/client"),
      ]);
      const admin = new Client({ adapter: new PrismaPg({ connectionString: connection }) });
      const role = await createEphemeralRole(admin, connection);

      await assertApplicationNamePropagated(role.client, applicationName);

      const h: Harness = {
        admin,
        role,
        tenantIds: [],
        createdGlobalRoleIds: [],
        globalRoleIds: new Map(),
      };

      for (const key of ["tenant_admin", "operator", "auditor"]) {
        const existing = await admin.role.findFirst({
          where: { key, tenant_id: null },
          orderBy: { created_at: "asc" },
          select: { id: true },
        });

        if (existing) {
          h.globalRoleIds.set(key, existing.id);
          continue;
        }

        const created = await admin.role.create({
          data: { key, name: `Global ${key} (users-seg)`, scope: "system" },
          select: { id: true },
        });

        h.createdGlobalRoleIds.push(created.id);
        h.globalRoleIds.set(key, created.id);
      }

      return h;
    })());

  after(async () => {
    if (!harnessPromise) {
      return;
    }

    const h = await harnessPromise;

    try {
      await cleanupIdentityFixture(h.admin, h.tenantIds);

      if (h.createdGlobalRoleIds.length > 0) {
        await h.admin.$executeRaw`
          DELETE FROM roles r
          WHERE r.id = ANY(${h.createdGlobalRoleIds}::uuid[])
            AND NOT EXISTS (SELECT 1 FROM user_role_assignments ura WHERE ura.role_id = r.id)
        `;
      }
    } finally {
      await h.role.drop();
      await h.admin.$disconnect();
    }
  });

  type Organization = {
    readonly tenantId: string;
    readonly adminUserId: string;
    readonly adminEmail: string;
  };

  async function seedOrganization(h: Harness, tag: string): Promise<Organization> {
    const suffix = `${tag}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenant = await h.admin.tenant.create({
      data: { name: `Users Seg ${suffix}`, slug: `users-seg-${suffix}` },
    });

    h.tenantIds.push(tenant.id);

    const adminUser = await h.admin.user.create({
      data: {
        tenant_id: tenant.id,
        name: `Admin ${tag}`,
        email: `users-seg-admin-${suffix}@example.com`,
        status: "active",
      },
    });

    await h.admin.userRoleAssignment.create({
      data: {
        tenant_id: tenant.id,
        user_id: adminUser.id,
        role_id: h.globalRoleIds.get("tenant_admin")!,
      },
    });

    return { tenantId: tenant.id, adminUserId: adminUser.id, adminEmail: adminUser.email };
  }

  async function startApp(h: Harness): Promise<{ readonly baseUrl: string; readonly server: Server }> {
    const [
      { createApp },
      { PrismaCoreSaasService },
      { PrismaCoreSaasStore },
      { AuditLogRepository, RoleRepository, TenantRepository, UserRepository, UserRoleRepository },
    ] = await Promise.all([
      import("../src/app.js"),
      import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
      import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
      import("../src/modules/core-saas/repositories/index.js"),
    ]);
    const client = h.role.client;
    const service = new PrismaCoreSaasService(
      new PrismaCoreSaasStore(
        client,
        new TenantRepository(client),
        new UserRepository(client),
        new RoleRepository(client),
        new UserRoleRepository(client),
        new AuditLogRepository(client),
      ),
    );
    const server = createApp(service).listen(0);

    return { baseUrl: await getBaseUrl(server), server };
  }

  async function adminHeaders(org: Organization): Promise<Record<string, string>> {
    const { signAccessToken } = await import("../src/modules/auth/index.js");
    const token = await signAccessToken({
      user_id: org.adminUserId,
      tenant_id: org.tenantId,
      email: org.adminEmail,
      roles: ["tenant_admin"],
    });

    return { authorization: `Bearer ${token}` };
  }

  test("S6·0 — o código sob teste roda como papel NOSUPERUSER NOBYPASSRLS", async () => {
    const h = await harness();
    const rows = await h.admin.$queryRaw<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>`
      SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = ${h.role.roleName}
    `;

    assert.deepEqual(rows, [{ rolsuper: false, rolbypassrls: false }]);
  });

  test("S6·a (Prisma) — e-mail repetido na mesma organização → 409 user_email_conflict, sem a mensagem do banco e sem usuário novo", async () => {
    const h = await harness();
    const orgA = await seedOrganization(h, "s6a");
    const orgB = await seedOrganization(h, "s6b");
    const { baseUrl, server } = await startApp(h);

    try {
      const email = `fulano-${Date.now()}@example.com`;
      const first = await requestJson(baseUrl, "/api/v1/users", {
        method: "POST",
        headers: await adminHeaders(orgA),
        body: { name: "Fulano", email, roles: ["auditor"] },
      });

      assert.equal(first.status, 201);

      const duplicate = await requestJson(baseUrl, "/api/v1/users", {
        method: "POST",
        headers: await adminHeaders(orgA),
        body: { name: "Fulano de novo", email: `  ${email.toUpperCase()} `, roles: ["operator"] },
      });

      assert.equal(duplicate.status, 409, "o segundo cadastro com o mesmo e-mail é recusado");
      assert.equal(duplicate.body.error?.code, "CONFLICT");
      assert.equal(duplicate.body.error?.reason, "user_email_conflict");

      const serialized = JSON.stringify(duplicate.body).toLowerCase();

      for (const leak of ["unique constraint", "prisma", "tenant_id", "p2002", "users_tenant_id_email"]) {
        assert.equal(serialized.includes(leak), false, `o corpo não pode carregar detalhe do banco (${leak})`);
      }

      const sameEmail = await h.admin.user.count({ where: { tenant_id: orgA.tenantId, email } });

      assert.equal(sameEmail, 1, "um único usuário com esse e-mail na organização");

      const otherOrganization = await requestJson(baseUrl, "/api/v1/users", {
        method: "POST",
        headers: await adminHeaders(orgB),
        body: { name: "Fulano em B", email, roles: ["auditor"] },
      });

      assert.equal(otherOrganization.status, 201, "o e-mail não decide entre organizações");
    } finally {
      await closeServer(server);
    }
  });

  test("S6·b (Prisma) — duas criações simultâneas com o mesmo e-mail: exatamente um 201 e um 409", async () => {
    const h = await harness();
    const org = await seedOrganization(h, "s6c");
    const { baseUrl, server } = await startApp(h);

    try {
      const email = `simultaneo-${Date.now()}@example.com`;
      const headers = await adminHeaders(org);
      const [left, right] = await Promise.all([
        requestJson(baseUrl, "/api/v1/users", {
          method: "POST",
          headers,
          body: { name: "Esquerda", email, roles: ["auditor"] },
        }),
        requestJson(baseUrl, "/api/v1/users", {
          method: "POST",
          headers,
          body: { name: "Direita", email, roles: ["auditor"] },
        }),
      ]);

      assert.deepEqual([left.status, right.status].sort(), [201, 409]);

      const loser = left.status === 409 ? left : right;

      assert.equal(loser.body.error?.reason, "user_email_conflict");
      assert.equal(await h.admin.user.count({ where: { tenant_id: org.tenantId, email } }), 1);
    } finally {
      await closeServer(server);
    }
  });
}
