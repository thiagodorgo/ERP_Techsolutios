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
  requestJson,
  type EphemeralRole,
} from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-USERS-ACESSO-SEG · S7 (ajuste 5 da crítica) — a troca de senha pelo GANCHO, agora com rota:
// `POST /api/v1/auth/password`, só para o próprio usuário autenticado por JWT, provando a senha atual.
//
// O que a fatia DECLARA e este arquivo prova, sob o papel efêmero NOSUPERUSER NOBYPASSRLS (o serviço
// de identidade, que é quem escreve, conecta como ele):
//   · senha atual errada conta como tentativa direcionada (401, contador sobe); trancada → 423;
//   · senha nova inválida → 400, nada muda;
//   · troca aceita → a senha antiga deixa de entrar e a nova entra; TODAS as sessões do par são
//     revogadas, INCLUSIVE a atual (a renovação dela responde 401); o token de acesso já emitido
//     segue válido até expirar (até 15 min, a janela do D-USERS-2); a marca "trocar a senha no
//     próximo acesso" (coluna da P1) volta a falso;
//   · se o vínculo do par chegou por RELIGAÇÃO e a identidade tem 2+ vínculos, a troca DESVINCULA o
//     par (a regra §5.5 do gancho): depois dela, a troca de organização para a outra conta é 403.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-USERS-ACESSO-SEG · S7 exige DATABASE_URL e um PostgreSQL migrado", {
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
        { createApp },
        { PrismaCoreSaasService },
        { IdentityLinkService, getLocalAuthLoginService },
        { AuditLogRepository },
      ] = await Promise.all([
        import("@prisma/adapter-pg"),
        import("@prisma/client"),
        import("../src/app.js"),
        import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
        import("../src/modules/auth/index.js"),
        import("../src/modules/core-saas/repositories/index.js"),
      ]);
      const admin = new Client({ adapter: new PrismaPg({ connectionString }) });
      const role = await createEphemeralRole(admin, connectionString);
      const identityLinks = new IdentityLinkService(
        role.client,
        async (input) => (await getLocalAuthLoginService()).authenticateLocalCredential(input),
        (tx) => new AuditLogRepository(tx),
      );
      const server = createApp(new PrismaCoreSaasService(), {
        getIdentityLinkService: async () => identityLinks,
      }).listen(0);

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
      name: `Users Seg S7 ${suffix}`,
      slug: `users-seg-s7-${suffix}`,
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

  test("S7·0 — o serviço que escreve roda como papel NOSUPERUSER NOBYPASSRLS", async () => {
    const h = await harness();
    const rows = await h.admin.$queryRaw<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>`
      SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = ${h.role.roleName}
    `;

    assert.deepEqual(rows, [{ rolsuper: false, rolbypassrls: false }]);
  });

  test("S7·a — sem JWT → 401; senha atual errada → 401 e o contador sobe; senha nova inválida → 400 e nada muda", async () => {
    const h = await harness();
    const email = `s7a-${Date.now()}@example.com`;
    const org = await newOrg(h, "a", email, "SenhaAtual123!");
    const session = await sessionOf(h, org.tenantId, email, org.password);

    const anonymous = await requestJson(h.baseUrl, "/api/v1/auth/password", {
      method: "POST",
      body: { currentPassword: org.password, newPassword: "SenhaNova456!" },
    });

    assert.equal(anonymous.status, 401);

    const wrongCurrent = await requestJson(h.baseUrl, "/api/v1/auth/password", {
      method: "POST",
      headers: bearer(session.access_token),
      body: { currentPassword: "SenhaErrada000!", newPassword: "SenhaNova456!" },
    });

    assert.equal(wrongCurrent.status, 401);
    assert.equal(wrongCurrent.body.error?.reason, "invalid_credentials");

    const afterWrong = await h.admin.localAuthCredential.findFirst({
      where: { tenant_id: org.tenantId, user_id: org.userId },
      select: { failed_attempts: true },
    });

    assert.equal(afterWrong?.failed_attempts, 1, "a senha atual errada conta como tentativa direcionada");

    const tooShort = await requestJson(h.baseUrl, "/api/v1/auth/password", {
      method: "POST",
      headers: bearer(session.access_token),
      body: { currentPassword: org.password, newPassword: "curta" },
    });

    assert.equal(tooShort.status, 400);
    assert.equal(tooShort.body.error?.reason, "invalid_new_password");

    const stillOld = await login(h, org.tenantId, email, org.password);

    assert.equal(stillOld.status, 200, "nada mudou: a senha atual continua entrando");
  });

  test("S7·b — troca aceita: antiga não entra, nova entra, TODAS as sessões do par revogadas (inclusive a atual), token de acesso segue até expirar, marca da P1 volta a falso", async () => {
    const h = await harness();
    const email = `s7b-${Date.now()}@example.com`;
    const org = await newOrg(h, "b", email, "SenhaAtual123!");
    const current = await sessionOf(h, org.tenantId, email, org.password);
    const other = await sessionOf(h, org.tenantId, email, org.password);

    await h.admin.localAuthCredential.updateMany({
      where: { tenant_id: org.tenantId, user_id: org.userId },
      data: { must_change_password: true },
    });

    const changed = await requestJson(h.baseUrl, "/api/v1/auth/password", {
      method: "POST",
      headers: bearer(current.access_token),
      body: { currentPassword: org.password, newPassword: "SenhaNova456!" },
    });

    assert.equal(changed.status, 200);

    const data = changed.body.data as { changed: boolean; revoked_sessions: number; unlinked: boolean };

    assert.equal(data.changed, true);
    assert.equal(data.unlinked, false, "vínculo de casa não desvincula");
    assert.equal(data.revoked_sessions, 2, "as duas sessões do par, a atual inclusive");

    for (const session of [current, other]) {
      const refresh = await requestJson(h.baseUrl, "/api/v1/auth/refresh", {
        method: "POST",
        body: { refreshToken: session.refresh_token },
      });

      assert.equal(refresh.status, 401, "a renovação de qualquer sessão anterior à troca é recusada");
    }

    assert.equal((await login(h, org.tenantId, email, org.password)).status, 401, "a senha antiga não entra");
    assert.equal((await login(h, org.tenantId, email, "SenhaNova456!")).status, 200, "a nova entra");

    const { verifyAccessToken } = await import("../src/modules/auth/index.js");
    const stillValid = await verifyAccessToken(current.access_token);

    assert.equal(stillValid.sub, org.userId, "verifyAccessToken sozinho ainda aceita a assinatura; quem recusa é o portão (P-SESSAO-VIVA)");

    const credential = await h.admin.localAuthCredential.findFirst({
      where: { tenant_id: org.tenantId, user_id: org.userId },
      select: { must_change_password: true, failed_attempts: true },
    });

    assert.equal(credential?.must_change_password, false, "a troca apaga a marca da P1");
    assert.equal(credential?.failed_attempts, 0);

    const audit = await h.admin.auditLog.findFirst({
      where: { tenant_id: org.tenantId, action: "auth.password.sessions_revoked" },
      orderBy: { created_at: "desc" },
    });

    assert.ok(audit, "a revogação da troca fica auditada");

    const serialized = JSON.stringify(audit?.metadata ?? {});

    for (const secret of [org.password, "SenhaNova456!"]) {
      assert.equal(serialized.includes(secret), false, "nenhuma senha na auditoria");
    }
  });

  test("S7·c — par que chegou por RELIGAÇÃO, identidade com 2 vínculos: a troca desvincula e a troca de organização vira 403", async () => {
    const h = await harness();
    const email = `s7c-${Date.now()}@example.com`;
    const home = await newOrg(h, "c-casa", email, "SenhaCasa123!");
    const linked = await newOrg(h, "c-religada", email, "SenhaReligada123!");
    const homeSession = await sessionOf(h, home.tenantId, email, home.password);

    const relink = await requestJson(h.baseUrl, "/api/v1/auth/identity-links", {
      method: "POST",
      headers: bearer(homeSession.access_token),
      body: { tenantId: linked.tenantId, email, password: linked.password },
    });

    assert.equal(relink.status, 201, "a conta da outra organização religa na identidade da casa");

    const linkedSession = await sessionOf(h, linked.tenantId, email, linked.password);
    const switchBefore = await requestJson(h.baseUrl, "/api/v1/auth/active-tenant", {
      method: "POST",
      headers: bearer(linkedSession.access_token),
      body: { tenantId: home.tenantId },
    });

    assert.equal(switchBefore.status, 200, "antes da troca, a religada alcança a casa");

    const changed = await requestJson(h.baseUrl, "/api/v1/auth/password", {
      method: "POST",
      headers: bearer(linkedSession.access_token),
      body: { currentPassword: linked.password, newPassword: "SenhaReligadaNova456!" },
    });

    assert.equal(changed.status, 200);
    assert.equal((changed.body.data as { unlinked: boolean }).unlinked, true, "declarado: a troca desvincula o par religado");

    const fresh = await sessionOf(h, linked.tenantId, email, "SenhaReligadaNova456!");
    const switchAfter = await requestJson(h.baseUrl, "/api/v1/auth/active-tenant", {
      method: "POST",
      headers: bearer(fresh.access_token),
      body: { tenantId: home.tenantId },
    });

    assert.equal(switchAfter.status, 403, "depois da troca, a conta religada não alcança mais a casa");
    assert.equal((await login(h, home.tenantId, email, home.password)).status, 200, "a casa segue intacta");
  });
}
