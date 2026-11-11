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
// B-USERS-ACESSO-SEG · P-SEG-2 (Emenda 1, opção a; `D-USERS-SEG-PSEG-RESPOSTAS`) — o que a senha
// provisória (`local_auth_credentials.must_change_password = true`) deixa fazer.
//
// RESTRIÇÕES (cada uma com vermelho-controle no head da PAUSA, onde a marca é ignorada):
//   P2·r1 — a troca de organização ativa é recusada (403 `password_change_required`);
//   P2·r2 — a religação é recusada com o ator marcado (a sessão da provisória não liga conta);
//   P2·r3 — a religação é recusada com a PROVA marcada (a provisória não prova conta);
//   P2·r4 — o RBAC persistente devolve papéis e permissões vazios, e a rota protegida responde 403.
// EFEITOS POSITIVOS (regressão: verdes antes e depois, sem vermelho-controle — UEM-02):
//   P2·p1 — entrar com a senha marcada dá sessão;
//   P2·p2 — `POST /auth/password` funciona com a sessão marcada e desliga a marca.
//
// Onde mede: o serviço de identidade, o core-saas Prisma e o resolvedor do RBAC persistente ligados ao
// papel EFÊMERO NOSUPERUSER NOBYPASSRLS; a marca é ligada pelo administrador do cluster (fixture),
// porque o reset e a criação com provisória são as S1/S2. O login usa o serviço real.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-USERS-ACESSO-SEG · P-SEG-2 exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL e rode as migrações para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";

  type Harness = {
    readonly admin: PrismaClient;
    readonly role: EphemeralRole;
    readonly tenantIds: string[];
    readonly baseUrl: string;
    readonly server: Server;
  };

  let harnessPromise: Promise<Harness> | undefined;

  const harness = (): Promise<Harness> =>
    (harnessPromise ??= (async () => {
      const [
        { PrismaPg },
        { PrismaClient: Client },
        { default: express },
        { createAuthRouter, createIdentityLinkRouter, IdentityLinkService, getLocalAuthLoginService },
        { PrismaCoreSaasService },
        { PrismaCoreSaasStore },
        { AuditLogRepository, RoleRepository, TenantRepository, UserRepository, UserRoleRepository },
      ] = await Promise.all([
        import("@prisma/adapter-pg"),
        import("@prisma/client"),
        import("express"),
        import("../src/modules/auth/index.js"),
        import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
        import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
        import("../src/modules/core-saas/repositories/index.js"),
      ]);
      const admin = new Client({ adapter: new PrismaPg({ connectionString }) });
      const role = await createEphemeralRole(admin, connectionString);
      const client = role.client;
      const identityLinks = new IdentityLinkService(
        client,
        async (input) => (await getLocalAuthLoginService()).authenticateLocalCredential(input),
        (tx) => new AuditLogRepository(tx),
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
        }),
      );

      const server = app.listen(0);

      return { admin, role, tenantIds: [], baseUrl: await getBaseUrl(server), server };
    })());

  after(async () => {
    if (!harnessPromise) {
      return;
    }

    const h = await harnessPromise;

    try {
      await closeServer(h.server);
      await cleanupIdentityFixture(h.admin, h.tenantIds);
    } finally {
      await h.role.drop();
      await h.admin.$disconnect();
    }
  });

  async function newOrg(h: Harness, tag: string, email: string, password: string) {
    const suffix = `${tag}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const org = await createOrgWithUser(h.admin, {
      name: `Users Seg P2 ${suffix}`,
      slug: `users-seg-p2-${suffix}`,
      email,
      password,
    });

    h.tenantIds.push(org.tenantId);

    return org;
  }

  async function login(h: Harness, tenantId: string, email: string, password: string) {
    return requestJson(h.baseUrl, "/api/v1/auth/login", {
      method: "POST",
      body: { tenantId, email, password },
    });
  }

  async function sessionOf(h: Harness, tenantId: string, email: string, password: string) {
    const response = await login(h, tenantId, email, password);

    assert.equal(response.status, 200, "o login da fixture precisa funcionar");

    return response.body.data as { access_token: string; refresh_token: string };
  }

  function bearer(token: string): Record<string, string> {
    return { authorization: `Bearer ${token}` };
  }

  async function setMustChange(h: Harness, tenantId: string, userId: string, value: boolean) {
    const result = await h.admin.localAuthCredential.updateMany({
      where: { tenant_id: tenantId, user_id: userId },
      data: { must_change_password: value },
    });

    assert.equal(result.count, 1);
  }

  // Duas contas da mesma pessoa, a de B religada na identidade da de A (o caminho real: a sessão de A
  // prova a credencial de B).
  async function linkedPair(h: Harness, tag: string) {
    const email = `p2-${tag}-${Date.now()}@example.com`;
    const home = await newOrg(h, `${tag}-a`, email, "SenhaCasaP2!1");
    const other = await newOrg(h, `${tag}-b`, email, "SenhaOutraP2!1");
    const homeSession = await sessionOf(h, home.tenantId, email, home.password);
    const relink = await requestJson(h.baseUrl, "/api/v1/auth/identity-links", {
      method: "POST",
      headers: bearer(homeSession.access_token),
      body: { tenantId: other.tenantId, email, password: other.password },
    });

    assert.equal(relink.status, 201, "a fixture religa B na identidade de A");

    return { email, home, other };
  }

  test("P2·0 — o código sob teste roda como papel NOSUPERUSER NOBYPASSRLS", async () => {
    const h = await harness();
    const rows = await h.admin.$queryRaw<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>`
      SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = ${h.role.roleName}
    `;

    assert.deepEqual(rows, [{ rolsuper: false, rolbypassrls: false }]);
  });

  test("P2·p1 (regressão) — entrar com a senha marcada dá sessão", async () => {
    const h = await harness();
    const email = `p2-p1-${Date.now()}@example.com`;
    const org = await newOrg(h, "p1", email, "SenhaProvisoriaP1!");

    await setMustChange(h, org.tenantId, org.userId, true);

    const response = await login(h, org.tenantId, email, org.password);

    assert.equal(response.status, 200, "a provisória dá sessão (só para trocar a senha)");
  });

  test("A3-D — login dirigido emite sessão restrita e explicita a marca", async () => {
    const h = await harness();
    const email = `p2-a3d-${Date.now()}@example.com`;
    const org = await newOrg(h, "a3d", email, "SenhaProvisoriaA3D!");

    await setMustChange(h, org.tenantId, org.userId, true);

    const restricted = await login(h, org.tenantId, email, org.password);
    assert.equal(restricted.status, 200);
    const restrictedData = restricted.body.data as Record<string, unknown>;
    const restrictedJwt = decodeJwt(String(restrictedData.access_token));
    assert.equal(restrictedJwt.scope, "password_change");
    assert.deepEqual(restrictedJwt.roles, []);
    assert.equal(restrictedData.must_change_password, true);
    assert.deepEqual(restrictedData.roles, []);
    assert.deepEqual(restrictedData.permissions, []);
    // Emenda 4, item 4 — a sessão restrita mantém o e-mail da PRÓPRIA sessão (a linha "Entrando como").
    assert.equal((restrictedData.user as { email?: unknown } | undefined)?.email, email);

    await setMustChange(h, org.tenantId, org.userId, false);
    const full = await login(h, org.tenantId, email, org.password);
    assert.equal(full.status, 200);
    const fullData = full.body.data as Record<string, unknown>;
    const fullJwt = decodeJwt(String(fullData.access_token));
    assert.equal("scope" in fullJwt, false);
    assert.equal(fullData.must_change_password, false);
    assert.ok(Array.isArray(fullData.roles) && fullData.roles.length > 0);
  });

  test("A3-B/A3-C — login sem tenantId preserva a marca do candidato vencedor", async () => {
    const h = await harness();
    const email = `p2-a3b-${Date.now()}@example.com`;
    const org = await newOrg(h, "a3b", email, "SenhaProvisoriaA3B!");

    await setMustChange(h, org.tenantId, org.userId, true);

    const response = await requestJson(h.baseUrl, "/api/v1/auth/login", {
      method: "POST",
      body: { email, password: org.password },
    });
    assert.equal(response.status, 200);
    const data = response.body.data as Record<string, unknown>;
    const payload = decodeJwt(String(data.access_token));
    assert.equal(payload.scope, "password_change");
    assert.deepEqual(payload.roles, []);
    assert.equal(data.must_change_password, true);
    assert.deepEqual(data.roles, []);
    assert.deepEqual(data.permissions, []);
    // Emenda 4, item 4 — também no login sem organização (o caminho do app).
    assert.equal((data.user as { email?: unknown } | undefined)?.email, email);
  });

  test("A4 — refresh relê a marca do par e emite access token restrito", async () => {
    const h = await harness();
    const email = `p2-a4-${Date.now()}@example.com`;
    const org = await newOrg(h, "a4", email, "SenhaProvisoriaA4!");
    const initial = await sessionOf(h, org.tenantId, email, org.password);

    await setMustChange(h, org.tenantId, org.userId, true);

    const response = await requestJson(h.baseUrl, "/api/v1/auth/refresh", {
      method: "POST",
      body: { refreshToken: initial.refresh_token },
    });
    assert.equal(response.status, 200);
    const payload = decodeJwt(String(response.body.data?.access_token));
    assert.equal(payload.scope, "password_change");
    assert.deepEqual(payload.roles, []);
  });

  test("A5 — active-tenant usa a marca do par de DESTINO", async () => {
    const h = await harness();
    const { email, home, other } = await linkedPair(h, "a5");
    await setMustChange(h, other.tenantId, other.userId, true);
    const fullAtHome = await sessionOf(h, home.tenantId, email, home.password);

    const response = await requestJson(h.baseUrl, "/api/v1/auth/active-tenant", {
      method: "POST",
      headers: bearer(fullAtHome.access_token),
      body: { tenantId: other.tenantId },
    });
    assert.equal(response.status, 200);
    const payload = decodeJwt(String(response.body.data?.access_token));
    assert.equal(payload.scope, "password_change");
    assert.deepEqual(payload.roles, []);
  });

  test("A4·RQ-3 — refresh de par SEM linha de credencial emite token inteiro (falta de linha não é valor perdido)", async () => {
    const h = await harness();
    const email = `p2-a4n-${Date.now()}@example.com`;
    const org = await newOrg(h, "a4n", email, "SenhaSemLinhaA4!");
    const initial = await sessionOf(h, org.tenantId, email, org.password);

    const removed = await h.admin.localAuthCredential.deleteMany({
      where: { tenant_id: org.tenantId, user_id: org.userId },
    });
    assert.equal(removed.count, 1, "a fixture apaga a linha da credencial do par");

    const response = await requestJson(h.baseUrl, "/api/v1/auth/refresh", {
      method: "POST",
      body: { refreshToken: initial.refresh_token },
    });
    assert.equal(response.status, 200);
    const payload = decodeJwt(String(response.body.data?.access_token));
    assert.equal("scope" in payload, false, "par sem credencial: token inteiro");
    assert.ok(Array.isArray(payload.roles) && payload.roles.length > 0, "par sem credencial: papéis cheios");
  });

  test("A5·RQ-3 — troca para organização cujo par NÃO tem linha de credencial emite token inteiro", async () => {
    const h = await harness();
    const { email, home, other } = await linkedPair(h, "a5n");
    const fullAtHome = await sessionOf(h, home.tenantId, email, home.password);
    const removed = await h.admin.localAuthCredential.deleteMany({
      where: { tenant_id: other.tenantId, user_id: other.userId },
    });
    assert.equal(removed.count, 1, "a fixture apaga a linha da credencial do par de destino");
    // Papel de catálogo no destino, para "papéis cheios" ser observável no token (a chave da fixture não é de catálogo).
    await h.admin.role.update({ where: { id: other.roleId }, data: { key: "operator" } });

    const response = await requestJson(h.baseUrl, "/api/v1/auth/active-tenant", {
      method: "POST",
      headers: bearer(fullAtHome.access_token),
      body: { tenantId: other.tenantId },
    });
    assert.equal(response.status, 200);
    const payload = decodeJwt(String(response.body.data?.access_token));
    assert.equal("scope" in payload, false, "destino sem credencial: token inteiro");
    assert.ok(Array.isArray(payload.roles) && payload.roles.length > 0, "destino sem credencial: papéis cheios");
    assert.equal(response.body.data?.must_change_password, false);
  });

  // A11 — as camadas antigas (no banco) continuam provadas para o token INTEIRO emitido antes da marca (o
  // "token anterior", residual da D-USERS-2): assinado direto, sem `scope`, com a marca ligada no par.
  async function fullTokenOf(org: { tenantId: string; userId: string; email: string }, roles: string[] = ["tenant_admin"]) {
    const { signAccessToken } = await import("../src/modules/auth/index.js");
    return signAccessToken({ user_id: org.userId, tenant_id: org.tenantId, email: org.email, roles });
  }

  test("A11·r1 — token INTEIRO anterior + marca ligada: a troca de organização é recusada pela camada do banco", async () => {
    const h = await harness();
    const { home, other } = await linkedPair(h, "a11r1");

    await setMustChange(h, home.tenantId, home.userId, true);

    const token = await fullTokenOf(home);
    assert.equal("scope" in decodeJwt(token), false, "o token é inteiro: o portão não o barra");
    const refused = await requestJson(h.baseUrl, "/api/v1/auth/active-tenant", {
      method: "POST",
      headers: bearer(token),
      body: { tenantId: other.tenantId },
    });

    assert.equal(refused.status, 403);
    assert.equal(refused.body.error?.reason, "password_change_required");
    assert.equal(JSON.stringify(refused.body).includes(other.tenantId), false);
  });

  test("A11·r2 — token INTEIRO anterior + marca ligada no ATOR: a religação é recusada pela camada do banco", async () => {
    const h = await harness();
    const email = `p2-a11r2-${Date.now()}@example.com`;
    const home = await newOrg(h, "a11r2-a", email, "SenhaCasaA11!1");
    const other = await newOrg(h, "a11r2-b", email, "SenhaOutraA11!1");

    await setMustChange(h, home.tenantId, home.userId, true);

    const relink = await requestJson(h.baseUrl, "/api/v1/auth/identity-links", {
      method: "POST",
      headers: bearer(await fullTokenOf(home)),
      body: { tenantId: other.tenantId, email, password: other.password },
    });

    assert.equal(relink.status, 403);
    assert.equal(relink.body.error?.reason, "password_change_required");
  });

  test("P2·r1 — com a marca ligada, a troca de organização ativa é recusada (403 password_change_required)", async () => {
    const h = await harness();
    const { email, home, other } = await linkedPair(h, "r1");
    const control = await sessionOf(h, home.tenantId, email, home.password);
    const allowed = await requestJson(h.baseUrl, "/api/v1/auth/active-tenant", {
      method: "POST",
      headers: bearer(control.access_token),
      body: { tenantId: other.tenantId },
    });

    assert.equal(allowed.status, 200, "controle: sem a marca, a troca para B funciona");

    await setMustChange(h, home.tenantId, home.userId, true);

    const marked = await sessionOf(h, home.tenantId, email, home.password);
    const refused = await requestJson(h.baseUrl, "/api/v1/auth/active-tenant", {
      method: "POST",
      headers: bearer(marked.access_token),
      body: { tenantId: other.tenantId },
    });

    assert.equal(refused.status, 403);
    assert.equal(refused.body.error?.reason, "password_change_required");
    assert.equal(JSON.stringify(refused.body).includes(other.tenantId), false, "a recusa não devolve dado da outra organização");
  });

  test("P2·r2 — com a marca ligada no ATOR, a religação é recusada e nada se move", async () => {
    const h = await harness();
    const email = `p2-r2-${Date.now()}@example.com`;
    const home = await newOrg(h, "r2-a", email, "SenhaCasaR2!1");
    const other = await newOrg(h, "r2-b", email, "SenhaOutraR2!1");

    await setMustChange(h, home.tenantId, home.userId, true);

    const marked = await sessionOf(h, home.tenantId, email, home.password);
    const relink = await requestJson(h.baseUrl, "/api/v1/auth/identity-links", {
      method: "POST",
      headers: bearer(marked.access_token),
      body: { tenantId: other.tenantId, email, password: other.password },
    });

    assert.equal(relink.status, 403);
    assert.equal(relink.body.error?.reason, "password_change_required");

    const [homeLink] = await h.admin.$queryRaw<Array<{ identity_id: string }>>`
      SELECT identity_id FROM auth_identity_links WHERE tenant_id = ${home.tenantId}::uuid AND user_id = ${home.userId}::uuid
    `;
    const [otherLink] = await h.admin.$queryRaw<Array<{ identity_id: string; attached_via: string }>>`
      SELECT identity_id, attached_via FROM auth_identity_links WHERE tenant_id = ${other.tenantId}::uuid AND user_id = ${other.userId}::uuid
    `;

    assert.notEqual(otherLink?.identity_id, homeLink?.identity_id, "o vínculo de B não foi movido");
  });

  test("P2·r3 — com a marca ligada na conta PROVADA, a religação é recusada (a provisória não prova conta)", async () => {
    const h = await harness();
    const email = `p2-r3-${Date.now()}@example.com`;
    const actorOrg = await newOrg(h, "r3-a", email, "SenhaAtorR3!1");
    const proved = await newOrg(h, "r3-b", email, "SenhaProvadaR3!1");

    await setMustChange(h, proved.tenantId, proved.userId, true);

    const actorSession = await sessionOf(h, actorOrg.tenantId, email, actorOrg.password);
    const relink = await requestJson(h.baseUrl, "/api/v1/auth/identity-links", {
      method: "POST",
      headers: bearer(actorSession.access_token),
      body: { tenantId: proved.tenantId, email, password: proved.password },
    });

    assert.equal(relink.status, 403);
    assert.equal(relink.body.error?.reason, "password_change_required");

    const [actorLink] = await h.admin.$queryRaw<Array<{ identity_id: string }>>`
      SELECT identity_id FROM auth_identity_links WHERE tenant_id = ${actorOrg.tenantId}::uuid AND user_id = ${actorOrg.userId}::uuid
    `;
    const [provedLink] = await h.admin.$queryRaw<Array<{ identity_id: string }>>`
      SELECT identity_id FROM auth_identity_links WHERE tenant_id = ${proved.tenantId}::uuid AND user_id = ${proved.userId}::uuid
    `;

    assert.notEqual(provedLink?.identity_id, actorLink?.identity_id, "a conta provada não foi movida");
  });

  test("P2·r4 — com a marca ligada, o RBAC persistente devolve papéis e permissões vazios; a rota protegida responde 403", async () => {
    const h = await harness();
    const email = `p2-r4-${Date.now()}@example.com`;
    const org = await newOrg(h, "r4", email, "SenhaRbacR4!1");
    const permission = await h.admin.permission.upsert({
      where: { key: "users.read" },
      update: {},
      create: { key: "users.read", description: "Permissão users.read" },
    });

    await h.admin.rolePermission.create({ data: { role_id: org.roleId, permission_id: permission.id } });
    await h.admin.role.update({ where: { id: org.roleId }, data: { key: "viewer" } });

    const [
      { default: express },
      { attachAuthenticatedActor, signAccessToken },
      { createPersistentAuthorizationResolver, createPersistentRbacContextMiddleware },
      { requirePermission },
    ] = await Promise.all([
      import("express"),
      import("../src/modules/auth/index.js"),
      import("../src/modules/core-saas/middleware/persistent-rbac-context.middleware.js"),
      import("../src/modules/core-saas/middleware/rbac.middleware.js"),
    ]);
    const resolver = createPersistentAuthorizationResolver(h.role.client);
    const before = await resolver({ tenantId: org.tenantId, userId: org.userId });

    assert.ok(before.permissions.includes("users.read"), "controle: sem a marca, a permissão vem da tabela");

    await setMustChange(h, org.tenantId, org.userId, true);

    const marked = await resolver({ tenantId: org.tenantId, userId: org.userId });

    assert.deepEqual([...marked.roles], []);
    assert.deepEqual([...marked.permissions], []);

    const app = express();

    app.get(
      "/probe",
      attachAuthenticatedActor(),
      createPersistentRbacContextMiddleware({ resolveAuthorization: resolver }),
      requirePermission("users.read"),
      (_request, response) => {
        response.json({ data: { ok: true } });
      },
    );

    const server: Server = app.listen(0);
    // O endereço é lido JÁ: `getBaseUrl` espera o evento `listening`, que não se repete depois de um await.
    const baseUrl = await getBaseUrl(server);

    try {
      const token = await signAccessToken({
        user_id: org.userId,
        tenant_id: org.tenantId,
        email: org.email,
        roles: ["viewer"],
      });
      const probe = await requestJson(baseUrl, "/probe", { headers: bearer(token) });

      assert.equal(probe.status, 403, "a sessão da provisória não passa por requirePermission");
    } finally {
      await closeServer(server);
    }
  });

  test("P2·p2 (regressão) — com a marca ligada, POST /auth/password funciona e desliga a marca", async () => {
    const h = await harness();
    const email = `p2-p2-${Date.now()}@example.com`;
    const org = await newOrg(h, "p2", email, "SenhaProvisoriaP2!");

    await setMustChange(h, org.tenantId, org.userId, true);

    const marked = await sessionOf(h, org.tenantId, email, org.password);
    const changed = await requestJson(h.baseUrl, "/api/v1/auth/password", {
      method: "POST",
      headers: bearer(marked.access_token),
      body: { currentPassword: org.password, newPassword: "SenhaDefinitivaP2!" },
    });

    assert.equal(changed.status, 200, "a única ação da sessão marcada é a troca de senha");

    const credential = await h.admin.localAuthCredential.findFirst({
      where: { tenant_id: org.tenantId, user_id: org.userId },
      select: { must_change_password: true },
    });

    assert.equal(credential?.must_change_password, false, "a troca desliga a marca");
  });
}
