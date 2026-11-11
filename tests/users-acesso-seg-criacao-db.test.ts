import assert from "node:assert/strict";
import type { Server } from "node:http";
import test, { after } from "node:test";

import type { PrismaClient } from "@prisma/client";

import {
  cleanupIdentityFixture,
  closeServer,
  createEphemeralRole,
  createOrgWithUser,
  getBaseUrl,
  type EphemeralRole,
} from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-USERS-ACESSO-SEG · S2 (Achado 1 — credencial no create) + UEM-01 (entrega única da provisória).
//
// `POST /api/v1/users` (Prisma, papel efêmero NOSUPERUSER NOBYPASSRLS) grava, na MESMA transação da
// criação, a credencial local do usuário novo com uma senha PROVISÓRIA (só o hash; a marca da P1 ligada),
// e o 201 traz a provisória UMA vez, no campo próprio `temporaryPassword`. O usuário entra com ela, e a
// sessão dela só troca a senha (P-SEG-2). Varredura pelo VALOR: 1 ocorrência no 201 da criação; 0 em toda
// leitura posterior (`GET /users`, `GET /users/:id`), na resposta do PATCH, nas respostas de erro, no
// login, na troca de senha e em toda a auditoria da organização (nem o hash). Os logs do processo entram
// no arquivo da S8 (servidor em processo próprio).
//   S2·0 — atributos do papel efêmero;
//   S2·a — a credencial nasce com a criação; a provisória entra e a sessão dela só troca a senha;
//   S2·b — UEM-01: a provisória aparece uma vez (no 201) e em nenhum outro lugar.
// Vermelho-controle: no head sem a S2, o 201 não traz a provisória e o usuário criado não entra.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-USERS-ACESSO-SEG · S2 exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL e rode as migrações para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";

  type Captured = { readonly label: string; readonly status: number; readonly text: string };

  type Harness = {
    readonly admin: PrismaClient;
    readonly role: EphemeralRole;
    readonly tenantIds: string[];
    readonly createdGlobalRoleIds: string[];
    readonly baseUrl: string;
    readonly server: Server;
    readonly captured: Captured[];
  };

  let harnessPromise: Promise<Harness> | undefined;

  const harness = (): Promise<Harness> =>
    (harnessPromise ??= (async () => {
      const [
        { PrismaPg },
        { PrismaClient: Client },
        { default: express },
        { attachAuthenticatedActor, createAuthRouter, createIdentityLinkRouter, IdentityLinkService, getLocalAuthLoginService, verifyPassword },
        { PrismaCoreSaasService },
        { PrismaCoreSaasStore },
        { AuditLogRepository, RoleRepository, TenantRepository, UserRepository, UserRoleRepository },
        { createPersistentAuthorizationResolver, createCoreSaasRouter },
      ] = await Promise.all([
        import("@prisma/adapter-pg"),
        import("@prisma/client"),
        import("express"),
        import("../src/modules/auth/index.js"),
        import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
        import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
        import("../src/modules/core-saas/repositories/index.js"),
        import("../src/modules/core-saas/index.js"),
      ]);
      const admin = new Client({ adapter: new PrismaPg({ connectionString }) });
      const role = await createEphemeralRole(admin, connectionString);
      const client = role.client;
      const createdGlobalRoleIds: string[] = [];

      // O papel do usuário criado é de catálogo (`operator`): a linha é GLOBAL (tenant_id nulo).
      for (const key of ["operator"]) {
        const existing = await admin.role.findFirst({ where: { key, tenant_id: null }, select: { id: true } });

        if (!existing) {
          const created = await admin.role.create({
            data: { key, name: `Global ${key} (users-seg S2)`, scope: "system" },
            select: { id: true },
          });

          createdGlobalRoleIds.push(created.id);
        }
      }

      const identityLinks = new IdentityLinkService(
        client,
        async (input) => (await getLocalAuthLoginService()).authenticateLocalCredential(input),
        (tx) => new AuditLogRepository(tx),
        verifyPassword,
      );
      const coreSaas = new PrismaCoreSaasService(
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
      const app = express();

      app.use(express.json());
      app.use("/api/v1/auth", createIdentityLinkRouter(async () => identityLinks));
      app.use(
        "/api/v1/auth",
        createAuthRouter({
          getCoreSaasService: async () => coreSaas,
          getIdentityLinkService: async () => identityLinks,
          resolvePersistentAuthorization: createPersistentAuthorizationResolver(client),
        }),
      );
      app.use("/api/v1", attachAuthenticatedActor(), createCoreSaasRouter(coreSaas));

      const server = app.listen(0);
      const baseUrl = await getBaseUrl(server);

      return { admin, role, tenantIds: [], createdGlobalRoleIds, baseUrl, server, captured: [] };
    })());

  after(async () => {
    if (!harnessPromise) {
      return;
    }

    const h = await harnessPromise;

    try {
      await closeServer(h.server);
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

  // Toda resposta passa por aqui e fica guardada (corpo inteiro) para a varredura pelo VALOR.
  async function call(
    h: Harness,
    label: string,
    method: string,
    path: string,
    init: { headers?: Record<string, string>; body?: unknown } = {},
  ) {
    const response = await fetch(`${h.baseUrl}${path}`, {
      method,
      headers: { "content-type": "application/json", ...(init.headers ?? {}) },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    });
    const text = await response.text();

    h.captured.push({ label, status: response.status, text: `${text}\n${JSON.stringify([...response.headers.entries()])}` });

    return { status: response.status, text, body: (text ? JSON.parse(text) : {}) as Record<string, any> };
  }

  type Org = Awaited<ReturnType<typeof createOrgWithUser>>;

  async function newOrg(h: Harness, tag: string): Promise<Org> {
    const suffix = `${tag}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const org = await createOrgWithUser(h.admin, {
      name: `Users Seg S2 ${suffix}`,
      slug: `users-seg-s2-${suffix}`,
      email: `s2-casa-${suffix}@example.com`,
      password: "SenhaCasaS2!",
    });

    h.tenantIds.push(org.tenantId);

    return org;
  }

  // Administrador com papel PERSISTIDO (users.manage + users.read em role_permissions), para valer nos
  // dois modos do RBAC persistente; o token carrega `tenant_admin`.
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
        email: `admin-s2-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
        status: "active",
      },
    });

    await h.admin.userRoleAssignment.create({ data: { tenant_id: org.tenantId, user_id: user.id, role_id: role.id } });

    const token = await signAccessToken({ user_id: user.id, tenant_id: org.tenantId, email: user.email, roles: ["tenant_admin"] });

    return { userId: user.id, headers: { authorization: `Bearer ${token}` } };
  }

  function occurrences(haystack: string, needle: string): number {
    return haystack.split(needle).length - 1;
  }

  test("S2·0 — o código sob teste roda como papel NOSUPERUSER NOBYPASSRLS", async () => {
    const h = await harness();
    const rows = await h.admin.$queryRaw<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>`
      SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = ${h.role.roleName}
    `;

    assert.deepEqual(rows, [{ rolsuper: false, rolbypassrls: false }]);
  });

  test("S2·a — a credencial nasce com a criação: a provisória entra, a marca está ligada e a sessão dela só troca a senha", async () => {
    const h = await harness();
    const org = await newOrg(h, "a");
    const admin = await adminOf(h, org);
    const email = `s2a-novo-${Date.now()}@example.com`;
    const created = await call(h, "s2a-criacao", "POST", "/api/v1/users", {
      headers: admin.headers,
      body: { name: "Usuário Novo S2a", email, roles: ["operator"] },
    });

    assert.equal(created.status, 201);

    const userId = created.body.data.id as string;
    const credential = await h.admin.localAuthCredential.findFirst({
      where: { tenant_id: org.tenantId, user_id: userId },
      select: { password_hash: true, must_change_password: true },
    });

    // Sem credencial local o usuário criado não tem como entrar (o vermelho-controle da S2).
    assert.ok(credential, "a credencial local nasceu na mesma criação");

    const temporaryPassword = created.body.data?.temporaryPassword as string | undefined;

    assert.equal(typeof temporaryPassword, "string", "o 201 traz a senha provisória no campo próprio");
    assert.ok((temporaryPassword ?? "").length >= 20, "a provisória é longa (18 bytes em base64url)");
    assert.equal(credential?.must_change_password, true, "a marca da P1 está ligada");
    assert.equal(credential?.password_hash.includes(temporaryPassword ?? "-"), false, "só o hash fica no banco");

    const login = await call(h, "s2a-login", "POST", "/api/v1/auth/login", {
      body: { tenantId: org.tenantId, email, password: temporaryPassword },
    });

    assert.equal(login.status, 200, "o usuário novo entra com a provisória");

    const session = { authorization: `Bearer ${login.body.data.access_token}` };
    const switchTenant = await call(h, "s2a-active-tenant", "POST", "/api/v1/auth/active-tenant", {
      headers: session,
      body: { tenantId: org.tenantId },
    });

    assert.equal(switchTenant.status, 403, "a sessão da provisória não troca de organização");
    assert.equal(switchTenant.body.error?.reason, "password_change_required");

    const changed = await call(h, "s2a-troca", "POST", "/api/v1/auth/password", {
      headers: session,
      body: { currentPassword: temporaryPassword, newPassword: "SenhaNovaEscolhidaS2a!" },
    });

    assert.equal(changed.status, 200, "a troca de senha funciona com a provisória como senha atual");

    const after = await h.admin.localAuthCredential.findFirst({
      where: { tenant_id: org.tenantId, user_id: userId },
      select: { must_change_password: true },
    });

    assert.equal(after?.must_change_password, false, "a troca apaga a marca");
  });

  test("S2·b — UEM-01: a provisória aparece UMA vez (no 201) e em nenhuma leitura, erro, login, troca nem auditoria", async () => {
    const h = await harness();
    const org = await newOrg(h, "b");
    const admin = await adminOf(h, org);
    const email = `s2b-novo-${Date.now()}@example.com`;
    const created = await call(h, "s2b-criacao", "POST", "/api/v1/users", {
      headers: admin.headers,
      body: { name: "Usuário Novo S2b", email, roles: ["operator"] },
    });

    assert.equal(created.status, 201);

    const temporaryPassword = created.body.data?.temporaryPassword as string;
    const userId = created.body.data.id as string;

    assert.equal(typeof temporaryPassword, "string", "o 201 traz a senha provisória");
    assert.equal(occurrences(created.text, temporaryPassword), 1, "uma ocorrência no corpo do 201");

    // Leituras posteriores, mudança e erros.
    const list = await call(h, "s2b-lista", "GET", "/api/v1/users", { headers: admin.headers });
    const detail = await call(h, "s2b-detalhe", "GET", `/api/v1/users/${userId}`, { headers: admin.headers });
    const patched = await call(h, "s2b-patch", "PATCH", `/api/v1/users/${userId}`, {
      headers: admin.headers,
      body: { name: "Usuário Novo S2b (editado)" },
    });
    const duplicate = await call(h, "s2b-duplicado", "POST", "/api/v1/users", {
      headers: admin.headers,
      body: { name: "Repetido", email, roles: ["operator"] },
    });
    const invalid = await call(h, "s2b-invalido", "POST", "/api/v1/users", {
      headers: admin.headers,
      body: { name: "", email: "nao-e-email", roles: [] },
    });

    assert.equal(list.status, 200);
    assert.equal(detail.status, 200);
    assert.equal(patched.status, 200);
    assert.equal(duplicate.status, 409);
    assert.equal(invalid.status, 400);

    for (const response of [list, detail, patched]) {
      assert.equal(response.text.includes("temporaryPassword"), false, "a leitura não tem o campo");
    }

    // O próprio usuário: login com a provisória e troca de senha.
    const login = await call(h, "s2b-login", "POST", "/api/v1/auth/login", {
      body: { tenantId: org.tenantId, email, password: temporaryPassword },
    });

    assert.equal(login.status, 200);

    const changed = await call(h, "s2b-troca", "POST", "/api/v1/auth/password", {
      headers: { authorization: `Bearer ${login.body.data.access_token}` },
      body: { currentPassword: temporaryPassword, newPassword: "SenhaNovaEscolhidaS2b!" },
    });

    assert.equal(changed.status, 200);

    // A varredura pelo VALOR: 1 no 201, 0 em todas as outras respostas deste teste.
    const mine = h.captured.filter((entry) => entry.label.startsWith("s2b-"));
    const counts = mine.map((entry) => ({ label: entry.label, n: occurrences(entry.text, temporaryPassword) }));

    assert.deepEqual(
      counts.filter((entry) => entry.n > 0),
      [{ label: "s2b-criacao", n: 1 }],
      "a provisória sai só no 201 da criação",
    );

    // Auditoria da organização inteira: nem o valor, nem o hash.
    const audits = await h.admin.auditLog.findMany({ where: { tenant_id: org.tenantId } });
    const auditText = JSON.stringify(audits);
    const credential = await h.admin.localAuthCredential.findFirst({
      where: { tenant_id: org.tenantId, user_id: userId },
      select: { password_hash: true },
    });

    assert.ok(audits.some((row) => row.action === "user.created"), "a criação está auditada");
    assert.equal(occurrences(auditText, temporaryPassword), 0, "a provisória não vai para a auditoria");
    assert.equal(/scrypt/i.test(auditText), false, "nenhum hash na auditoria");
    assert.equal(auditText.includes(credential?.password_hash ?? "-"), false, "nem o hash atual");
  });
}
