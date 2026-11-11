import assert from "node:assert/strict";
import type { Server } from "node:http";
import test, { after } from "node:test";

import type { PrismaClient } from "@prisma/client";
import { decodeJwt } from "jose";

import {
  cleanupIdentityFixture,
  closeServer,
  createEphemeralRole,
  createOrgWithUser,
  getBaseUrl,
  requestJson,
  type EphemeralRole,
} from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-USERS-ACESSO-SEG — conserto do PR #527 (P-SESSAO-RESTRITA), ponta a ponta no app REAL (`createApp`)
// com o Prisma GLOBAL ligado ao papel EFÊMERO NOSUPERUSER NOBYPASSRLS (injetado no singleton antes de
// importar o app, `CORE_SAAS_PERSISTENCE=prisma`). O `DATABASE_URL` é o administrador do cluster e só monta,
// liga a marca e desmonta a fixture.
//
//   A6 (C2CL-01) — usuário criado com a provisória (S2, `POST /users`), login, e `POST
//        /mobile/sync/work-order-actions` com `work_order.create` → 403 `password_change_required` e
//        nenhuma OS no banco. Vermelho-controle (objeto 6acae1c6 e head F1): 200, `accepted 1`, 1 OS.
//   A7 (C1-Q1) — para CADA papel de `PLATFORM_ROLES` (lido do catálogo): alvo com o papel de plataforma e a
//        marca ligada direto (o reset agora recusa), login, `GET /platform/tenants` → 403
//        `password_change_required`. Vermelho-controle: 200.
//   A8b (C1-Q1, E8) — a cadeia de tomada de conta de plataforma: reset pelo administrador da organização →
//        login com a provisória → `POST /auth/password` → login com a senha nova → `GET /platform/tenants`.
//        Com o conserto, o 1º passo já recusa (403 `target_not_manageable`). Vermelho-controle: a cadeia chega
//        ao 200 final (a mensagem do assert registra o status de cada passo).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-USERS-ACESSO-SEG · portão (app real) exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL e rode as migrações para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";

  type Harness = {
    readonly admin: PrismaClient;
    readonly role: EphemeralRole;
    readonly tenantIds: string[];
    readonly createdGlobalRoleIds: string[];
    readonly baseUrl: string;
    readonly server: Server;
  };

  let harnessPromise: Promise<Harness> | undefined;

  const harness = (): Promise<Harness> =>
    (harnessPromise ??= (async () => {
      const [{ PrismaPg }, { PrismaClient: Client }] = await Promise.all([
        import("@prisma/adapter-pg"),
        import("@prisma/client"),
      ]);
      const admin = new Client({ adapter: new PrismaPg({ connectionString }) });
      const role = await createEphemeralRole(admin, connectionString);

      (globalThis as { prisma?: unknown }).prisma = role.client;

      const createdGlobalRoleIds: string[] = [];

      for (const key of ["operator"]) {
        const existing = await admin.role.findFirst({ where: { key, tenant_id: null }, select: { id: true } });

        if (!existing) {
          const created = await admin.role.create({
            data: { key, name: `Global ${key} (users-seg portão)`, scope: "system" },
            select: { id: true },
          });

          createdGlobalRoleIds.push(created.id);
        }
      }

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
      const client = role.client;
      const service = new PrismaCoreSaasService(
        new PrismaCoreSaasStore(
          client,
          new TenantRepository(client),
          new UserRepository(client),
          new RoleRepository(client),
          new UserRoleRepository(client),
          new AuditLogRepository(client),
        ),
        client,
      );
      const server = createApp(service).listen(0);

      return { admin, role, tenantIds: [], createdGlobalRoleIds, baseUrl: await getBaseUrl(server), server };
    })());

  after(async () => {
    if (!harnessPromise) {
      return;
    }

    const h = await harnessPromise;

    try {
      await closeServer(h.server);

      if (h.tenantIds.length > 0) {
        // OS criadas no vermelho-controle (o objeto deixava a provisória criar): fora antes da fixture.
        const tables = await h.admin.$queryRaw<Array<{ table_name: string }>>`
          SELECT c.table_name FROM information_schema.columns c
          JOIN information_schema.tables t ON t.table_name = c.table_name AND t.table_schema = c.table_schema
          WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id' AND t.table_type = 'BASE TABLE'
            AND c.table_name LIKE 'work_order%'
        `;

        await h.admin.$transaction(async (tx) => {
          await tx.$executeRaw`SET LOCAL session_replication_role = 'replica'`;

          for (const { table_name } of tables) {
            await tx.$executeRawUnsafe(`DELETE FROM "${table_name}" WHERE tenant_id = ANY($1::uuid[])`, h.tenantIds);
          }
        });
      }

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

  type Org = Awaited<ReturnType<typeof createOrgWithUser>>;

  async function newOrg(h: Harness, tag: string, email?: string, password = "SenhaCasaPortao!1"): Promise<Org> {
    const suffix = `${tag}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const org = await createOrgWithUser(h.admin, {
      name: `Users Seg Portao ${suffix}`,
      slug: `users-seg-portao-${suffix}`,
      email: email ?? `portao-casa-${suffix}@example.com`,
      password,
    });

    h.tenantIds.push(org.tenantId);

    return org;
  }

  // Administrador com papel PERSISTIDO (users.manage + users.read), como em users-acesso-seg-criacao-db.
  async function adminOf(h: Harness, org: Org) {
    const { signAccessToken } = await import("../src/modules/auth/index.js");
    const role =
      (await h.admin.role.findFirst({ where: { tenant_id: org.tenantId, key: "tenant_admin" } })) ??
      (await h.admin.role.create({
        data: { tenant_id: org.tenantId, key: "tenant_admin", name: "Papel tenant_admin", scope: "tenant" },
      }));

    for (const key of ["users.manage", "users.read"]) {
      const permission = await h.admin.permission.upsert({
        where: { key },
        update: {},
        create: { key, description: `Permissão ${key}` },
      });

      await h.admin.rolePermission.upsert({
        where: { role_id_permission_id: { role_id: role.id, permission_id: permission.id } },
        update: {},
        create: { role_id: role.id, permission_id: permission.id },
      });
    }

    const user = await h.admin.user.create({
      data: {
        tenant_id: org.tenantId,
        name: "Administrador",
        email: `admin-portao-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
        status: "active",
      },
    });

    await h.admin.userRoleAssignment.create({ data: { tenant_id: org.tenantId, user_id: user.id, role_id: role.id } });

    const token = await signAccessToken({ user_id: user.id, tenant_id: org.tenantId, email: user.email, roles: ["tenant_admin"] });

    return { headers: { authorization: `Bearer ${token}` } };
  }

  test("PT·0 — o código sob teste roda como papel NOSUPERUSER NOBYPASSRLS", async () => {
    const h = await harness();
    const rows = await h.admin.$queryRaw<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>`
      SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = ${h.role.roleName}
    `;

    assert.deepEqual(rows, [{ rolsuper: false, rolbypassrls: false }]);
  });

  test("A6 (C2CL-01) — a provisória da criação não cria OS pelo /mobile: 403 password_change_required e 0 OS no banco", async () => {
    const h = await harness();
    const org = await newOrg(h, "a6");
    const admin = await adminOf(h, org);
    const email = `a6-novo-${Date.now()}@example.com`;
    const created = await requestJson(h.baseUrl, "/api/v1/users", {
      method: "POST",
      headers: admin.headers,
      body: { name: "Usuário Novo A6", email, roles: ["operator"] },
    });

    assert.equal(created.status, 201, "a criação (S2) entrega a provisória");

    const temporary = String(created.body.data?.temporaryPassword ?? "");

    assert.ok(temporary.length >= 8, "a provisória veio no 201");

    const login = await requestJson(h.baseUrl, "/api/v1/auth/login", {
      method: "POST",
      body: { tenantId: org.tenantId, email, password: temporary },
    });

    assert.equal(login.status, 200, "a provisória entra (só para trocar a senha)");

    const token = String(login.body.data?.access_token);
    const title = `OS da provisória A6 ${Date.now()}`;
    const sync = await requestJson(h.baseUrl, "/api/v1/mobile/sync/work-order-actions", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: {
        client_batch_id: `a6-batch-${Date.now()}`,
        actions: [
          {
            client_action_id: `a6-create-${Date.now()}`,
            type: "work_order.create",
            local_created_at: new Date().toISOString(),
            payload: {
              client_id: `a6-local-${Date.now()}`,
              title,
              customer_name: "Cliente A6",
              service_address: "Rua A6, 6",
              priority: "high",
            },
          },
        ],
      },
    });

    assert.equal(sync.status, 403, `a sessão da provisória não sincroniza: ${JSON.stringify(sync.body)}`);
    assert.equal(sync.body.error?.reason, "password_change_required");

    const [row] = await h.admin.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*)::bigint AS count FROM work_orders WHERE tenant_id = ${org.tenantId}::uuid AND title = ${title}
    `;

    assert.equal(Number(row?.count ?? -1), 0, "nenhuma OS no banco");
  });

  test("A7 (C1-Q1) — sessão da provisória com papel de PLATAFORMA não lê /platform/tenants: 403 password_change_required, por papel", async () => {
    const h = await harness();
    const { PLATFORM_ROLES } = await import("../src/modules/core-saas/permissions/catalog.js");

    assert.ok(PLATFORM_ROLES.length > 0, "o catálogo tem papéis de plataforma");

    for (const platformRole of PLATFORM_ROLES) {
      const email = `a7-${platformRole}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
      const org = await newOrg(h, `a7-${platformRole}`, email, "SenhaProvisoriaA7!");
      let platform = await h.admin.role.findFirst({ where: { tenant_id: null, key: platformRole } });

      if (!platform) {
        platform = await h.admin.role.create({
          data: { tenant_id: null, key: platformRole, name: `Papel ${platformRole}`, scope: "platform" },
        });
        h.createdGlobalRoleIds.push(platform.id);
      }

      await h.admin.userRoleAssignment.create({
        data: { tenant_id: org.tenantId, user_id: org.userId, role_id: platform.id },
      });

      const marked = await h.admin.localAuthCredential.updateMany({
        where: { tenant_id: org.tenantId, user_id: org.userId },
        data: { must_change_password: true },
      });

      assert.equal(marked.count, 1);

      const login = await requestJson(h.baseUrl, "/api/v1/auth/login", {
        method: "POST",
        body: { tenantId: org.tenantId, email, password: org.password },
      });

      assert.equal(login.status, 200, platformRole);

      const token = String(login.body.data?.access_token);
      const tenants = await requestJson(h.baseUrl, "/api/v1/platform/tenants", {
        headers: { authorization: `Bearer ${token}` },
      });

      assert.equal(tenants.status, 403, `${platformRole}: ${JSON.stringify(tenants.body).slice(0, 200)}`);
      assert.equal(tenants.body.error?.reason, "password_change_required", platformRole);
      assert.equal(decodeJwt(token).scope, "password_change", `${platformRole}: o login emite sessão restrita`);
    }
  });

  test("A8b (C1-Q1) — a cadeia reset → provisória → troca → login → /platform/tenants fica quebrada no 1º passo", async () => {
    const h = await harness();
    const email = `a8b-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
    const org = await newOrg(h, "a8b", email, "SenhaAntigaA8b!1");
    const admin = await adminOf(h, org);
    let platform = await h.admin.role.findFirst({ where: { tenant_id: null, key: "super_admin" } });

    if (!platform) {
      platform = await h.admin.role.create({
        data: { tenant_id: null, key: "super_admin", name: "Papel super_admin", scope: "platform" },
      });
      h.createdGlobalRoleIds.push(platform.id);
    }

    await h.admin.userRoleAssignment.create({
      data: { tenant_id: org.tenantId, user_id: org.userId, role_id: platform.id },
    });

    const steps: string[] = [];
    const reset = await requestJson(h.baseUrl, `/api/v1/auth/users/${org.userId}/reset-password`, {
      method: "POST",
      headers: admin.headers,
      body: {},
    });

    steps.push(`reset=${reset.status}`);

    if (reset.status === 200) {
      const temporary = String(reset.body.data?.temporary_password ?? "");
      const first = await requestJson(h.baseUrl, "/api/v1/auth/login", {
        method: "POST",
        body: { tenantId: org.tenantId, email, password: temporary },
      });

      steps.push(`login-provisoria=${first.status}`);

      const changed = await requestJson(h.baseUrl, "/api/v1/auth/password", {
        method: "POST",
        headers: { authorization: `Bearer ${String(first.body.data?.access_token)}` },
        body: { currentPassword: temporary, newPassword: "SenhaTomadaA8b!9" },
      });

      steps.push(`troca=${changed.status}`);

      const second = await requestJson(h.baseUrl, "/api/v1/auth/login", {
        method: "POST",
        body: { tenantId: org.tenantId, email, password: "SenhaTomadaA8b!9" },
      });

      steps.push(`login-nova=${second.status}`);

      const tenants = await requestJson(h.baseUrl, "/api/v1/platform/tenants", {
        headers: { authorization: `Bearer ${String(second.body.data?.access_token)}` },
      });

      steps.push(`platform-tenants=${tenants.status}`);
    }

    assert.equal(reset.status, 403, `a cadeia de tomada: ${steps.join(" → ")}`);
    assert.equal(reset.body.error?.reason, "target_not_manageable");

    const stillOld = await requestJson(h.baseUrl, "/api/v1/auth/login", {
      method: "POST",
      body: { tenantId: org.tenantId, email, password: org.password },
    });

    assert.equal(stillOld.status, 200, "a senha do alvo não mudou");
  });
}
