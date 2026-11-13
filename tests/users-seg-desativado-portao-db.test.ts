import assert from "node:assert/strict";
import test, { after } from "node:test";

import { requestJson } from "./helpers/auth-identity-fixture.js";
import {
  administradorDe,
  desmontarSessaoReal,
  entrar,
  montarSessaoReal,
  novaOrganizacao,
  novoUsuario,
  papelGlobal,
  portador,
  type SessaoRealHarness,
} from "./helpers/users-seg-desativado-sessao.js";

// -----------------------------------------------------------------------------------------------
// B-USERS-SEG-DESATIVADO — P-SESSAO-VIVA, ponta a ponta no app REAL (`createApp`), modo `prisma` FORÇADO e
// conferido, com o Prisma GLOBAL ligado ao papel EFÊMERO NOSUPERUSER NOBYPASSRLS (A9: o portão usa esse
// cliente). Toda recusa confere o `reason` (`session_inactive`), não só o status: sem isso o `403
// role_required` do RBAC persistente esconderia o portão. Todo teste de recusa tem, no mesmo teste, um controle
// positivo com token vivo (200): zero linhas por GUC errado daria "inativa" para todos, e só o controle pega.
//
//   T1  desativado pela API não cria OS pelo app (401 e 0 OS)        · M5
//   T1b status desligado SEM revogar a sessão (defesa em profundidade) · M2
//   T2  desativado com papel de plataforma, por papel do catálogo      · M5
//   T3  vínculo removido corta o token da organização desvinculada     · M1
//   T4  reset pelo administrador corta o token anterior (a irmã)      · M1
//   T5  revogação pelo administrador · T5b revoga UMA de duas sessões  · M1 · M11
//   T6  logout · T6b logout de UMA de duas sessões                     · M1 · M11
//   T7  troca da própria senha corta o token atual                    · M1
//   T8  sessão vencida (expires_at no passado, sem revogar)           · M3
//   T11 `sid` alheio, com X de sessão viva própria                    · M4
//   T12 token sem `sid` (o do deploy): desativado 401, ativo 200       · M10
//   T19 (P2 = a) trocar o CONJUNTO de papéis corta; renomear não corta · M19 · M18
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-USERS-SEG-DESATIVADO · portão (app real) exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL e rode as migrações para executar esta suíte.",
  });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";

  let harnessPromise: Promise<SessaoRealHarness> | undefined;

  const harness = (): Promise<SessaoRealHarness> =>
    (harnessPromise ??= (async () => {
      const h = await montarSessaoReal(connectionString);

      try {
        const { env } = await import("../src/config/env.js");

        assert.equal(env.CORE_SAAS_PERSISTENCE, "prisma", "E1.5: a suíte roda em prisma, nunca em memória");
        assert.equal((await import("../src/database/prisma.js")).prisma, h.role.client, "A9: o portão usa o papel");
      } catch (error) {
        // O assert do modo ou do cliente falhou (drills D-A4/D-A9): desmonta antes de propagar, para o processo
        // não ficar preso no servidor aberto.
        await desmontarSessaoReal(h);
        throw error;
      }

      return h;
    })());

  after(async () => {
    if (harnessPromise) {
      // Arnês que falhou já se desmontou.
      const h = await harnessPromise.catch(() => undefined);

      if (h) {
        await desmontarSessaoReal(h);
      }
    }
  });

  const get = (h: SessaoRealHarness, path: string, accessToken: string) =>
    requestJson(h.baseUrl, path, { headers: portador(accessToken) });

  type Resposta = Awaited<ReturnType<typeof requestJson>>;

  function assertSessaoInativa(resposta: Resposta, rotulo: string): void {
    assert.equal(resposta.status, 401, `${rotulo}: ${JSON.stringify(resposta.body).slice(0, 240)}`);
    assert.equal(resposta.body.error?.code, "INVALID_TOKEN", rotulo);
    assert.equal(resposta.body.error?.reason, "session_inactive", rotulo);
  }

  function assertVivo(resposta: Resposta, rotulo: string): void {
    assert.equal(resposta.status, 200, `${rotulo}: ${JSON.stringify(resposta.body).slice(0, 240)}`);
  }

  async function desligarStatus(h: SessaoRealHarness, userId: string): Promise<void> {
    await h.admin.user.update({ where: { id: userId }, data: { status: "inactive" } });
  }

  test("PT·0 — modo prisma, cliente do papel e papel NOSUPERUSER NOBYPASSRLS", async () => {
    const h = await harness();
    const rows = await h.admin.$queryRaw<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>`
      SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = ${h.role.roleName}
    `;

    assert.deepEqual(rows, [{ rolsuper: false, rolbypassrls: false }]);
  });

  test("T1 — desativado pela API não cria OS pelo app: 401 session_inactive e 0 OS no banco", async () => {
    const h = await harness();
    const org = await novaOrganizacao(h, "t1", { roleKey: "operator" });
    const admin = await administradorDe(h, org.tenantId);
    const sessao = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });

    assertVivo(await get(h, "/api/v1/mobile/bootstrap", sessao.accessToken), "controle: ativo usa o app");

    const desativa = await requestJson(h.baseUrl, `/api/v1/users/${org.userId}`, {
      method: "PATCH",
      headers: admin.headers,
      body: { status: "inactive" },
    });

    assert.equal(desativa.status, 200, `a desativação pela API: ${JSON.stringify(desativa.body).slice(0, 240)}`);

    const title = `OS do desativado T1 ${Date.now()}`;
    const sync = await requestJson(h.baseUrl, "/api/v1/mobile/sync/work-order-actions", {
      method: "POST",
      headers: portador(sessao.accessToken),
      body: {
        client_batch_id: `t1-batch-${Date.now()}`,
        actions: [
          {
            client_action_id: `t1-create-${Date.now()}`,
            type: "work_order.create",
            local_created_at: new Date().toISOString(),
            payload: {
              client_id: `t1-local-${Date.now()}`,
              title,
              customer_name: "Cliente T1",
              service_address: "Rua T1, 1",
              priority: "high",
            },
          },
        ],
      },
    });

    const [row] = await h.admin.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*)::bigint AS count FROM work_orders WHERE tenant_id = ${org.tenantId}::uuid AND title = ${title}
    `;
    const osNoBanco = Number(row?.count ?? -1);

    assertSessaoInativa(sync, `T1: o desativado não sincroniza (OS no banco: ${osNoBanco})`);
    assert.equal(osNoBanco, 0, "nenhuma OS no banco");
  });

  test("T1b — status desligado SEM revogar a sessão: o token com sid é recusado em /me/tenants e /mobile/bootstrap", async () => {
    const h = await harness();
    const org = await novaOrganizacao(h, "t1b", { roleKey: "operator" });
    const sessao = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });

    assertVivo(await get(h, "/api/v1/me/tenants", sessao.accessToken), "controle /me/tenants");
    assertVivo(await get(h, "/api/v1/mobile/bootstrap", sessao.accessToken), "controle /mobile/bootstrap");

    await desligarStatus(h, org.userId);

    const viva = await h.admin.authSession.count({ where: { id: sessao.sessionId, revoked_at: null } });

    assert.equal(viva, 1, "fixture: a sessão segue sem revogação (só o status mudou)");
    assertSessaoInativa(await get(h, "/api/v1/me/tenants", sessao.accessToken), "T1b /me/tenants");
    assertSessaoInativa(await get(h, "/api/v1/mobile/bootstrap", sessao.accessToken), "T1b /mobile/bootstrap");
    assertSessaoInativa(await get(h, "/api/v1/work-orders", sessao.accessToken), "T1b /work-orders");
  });

  test("T2 — desativado com papel de PLATAFORMA não lê /platform/tenants: 401 session_inactive, por papel", async () => {
    const h = await harness();
    const { PLATFORM_ROLES } = await import("../src/modules/core-saas/permissions/catalog.js");

    assert.ok(PLATFORM_ROLES.length > 0, "o catálogo tem papéis de plataforma");

    for (const platformRole of PLATFORM_ROLES) {
      const org = await novaOrganizacao(h, `t2-${platformRole}`);
      const platform = await papelGlobal(h, platformRole);

      await h.admin.userRoleAssignment.create({
        data: { tenant_id: org.tenantId, user_id: org.userId, role_id: platform.id },
      });

      const sessao = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });

      assertVivo(await get(h, "/api/v1/platform/tenants", sessao.accessToken), `${platformRole}: controle ativo`);

      // Desativar como o cadastro faz: status e revogação das sessões do par, na mesma transação.
      await h.admin.$transaction([
        h.admin.user.update({ where: { id: org.userId }, data: { status: "inactive" } }),
        h.admin.authSession.updateMany({
          where: { tenant_id: org.tenantId, user_id: org.userId, revoked_at: null },
          data: { revoked_at: new Date() },
        }),
      ]);

      assertSessaoInativa(await get(h, "/api/v1/platform/tenants", sessao.accessToken), `${platformRole}: desativado`);
    }
  });

  test("T3 — vínculo removido: o token da organização desvinculada é recusado; o da organização de casa segue", async () => {
    const h = await harness();
    const email = `t3-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
    const orgA = await novaOrganizacao(h, "t3a", { email, password: "SenhaT3CasaA!1", roleKey: "operator" });
    const orgB = await novaOrganizacao(h, "t3b", { email, password: "SenhaT3OrgB!1", roleKey: "operator" });
    const sessaoA = await entrar(h, { tenantId: orgA.tenantId, email, password: orgA.password });
    const relink = await requestJson(h.baseUrl, "/api/v1/auth/identity-links", {
      method: "POST",
      headers: portador(sessaoA.accessToken),
      body: { tenantId: orgB.tenantId, email, password: orgB.password },
    });

    assert.equal(relink.status, 201, `fixture: religação ${JSON.stringify(relink.body).slice(0, 200)}`);

    const troca = await requestJson(h.baseUrl, "/api/v1/auth/active-tenant", {
      method: "POST",
      headers: portador(sessaoA.accessToken),
      body: { tenantId: orgB.tenantId },
    });

    assert.equal(troca.status, 200, `fixture: troca para B ${JSON.stringify(troca.body).slice(0, 200)}`);

    const tokenB = String((troca.body.data as { access_token: string }).access_token);

    assertVivo(await get(h, "/api/v1/me/tenants", tokenB), "controle: token de B antes do desvínculo");
    assertVivo(await get(h, "/api/v1/mobile/bootstrap", tokenB), "controle: token de B no app");

    const links = await requestJson(h.baseUrl, "/api/v1/auth/identity-links", { headers: portador(sessaoA.accessToken) });
    const linkB = (links.body.data as Array<{ id: string; tenant: { id: string } }>).find(
      (link) => link.tenant.id === orgB.tenantId,
    );

    assert.ok(linkB, "fixture: o vínculo de B está listado");

    const remove = await requestJson(h.baseUrl, `/api/v1/auth/identity-links/${linkB.id}`, {
      method: "DELETE",
      headers: portador(sessaoA.accessToken),
      body: { password: orgA.password, reauthTenantId: orgA.tenantId },
    });

    assert.equal(remove.status, 200, `o desvínculo: ${JSON.stringify(remove.body).slice(0, 200)}`);
    assertSessaoInativa(await get(h, "/api/v1/me/tenants", tokenB), "T3 /me/tenants com o token de B");
    assertSessaoInativa(await get(h, "/api/v1/mobile/bootstrap", tokenB), "T3 /mobile/bootstrap com o token de B");
    assertVivo(await get(h, "/api/v1/me/tenants", sessaoA.accessToken), "controle: a sessão de casa (A) segue viva");
  });

  test("T4 — reset pelo administrador: o token anterior do alvo é recusado (fecha P-USERS-SEG-TOKEN-ANTERIOR-A-TROCA)", async () => {
    const h = await harness();
    const org = await novaOrganizacao(h, "t4", { roleKey: "operator" });
    const admin = await administradorDe(h, org.tenantId);
    const sessao = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });

    assertVivo(await get(h, "/api/v1/mobile/bootstrap", sessao.accessToken), "controle /mobile/bootstrap");
    assertVivo(await get(h, "/api/v1/me/tenants", sessao.accessToken), "controle /me/tenants");

    const reset = await requestJson(h.baseUrl, `/api/v1/auth/users/${org.userId}/reset-password`, {
      method: "POST",
      headers: admin.headers,
      body: {},
    });

    assert.equal(reset.status, 200, `o reset: ${JSON.stringify(reset.body).slice(0, 200)}`);
    assertSessaoInativa(await get(h, "/api/v1/mobile/bootstrap", sessao.accessToken), "T4 /mobile/bootstrap");
    assertSessaoInativa(await get(h, "/api/v1/me/tenants", sessao.accessToken), "T4 /me/tenants");
    assertSessaoInativa(await get(h, "/api/v1/work-orders", sessao.accessToken), "T4 /work-orders");
  });

  test("T5 — revogação pelo administrador (POST /sessions/:id/revoke): o token da vítima é recusado", async () => {
    const h = await harness();
    const org = await novaOrganizacao(h, "t5", { roleKey: "operator" });
    const admin = await administradorDe(h, org.tenantId);
    const sessao = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });

    assertVivo(await get(h, "/api/v1/me/tenants", sessao.accessToken), "controle");

    const revoke = await requestJson(h.baseUrl, `/api/v1/sessions/${sessao.sessionId}/revoke`, {
      method: "POST",
      headers: admin.headers,
      body: {},
    });

    assert.equal(revoke.status, 200, `a revogação: ${JSON.stringify(revoke.body).slice(0, 200)}`);
    assertSessaoInativa(await get(h, "/api/v1/me/tenants", sessao.accessToken), "T5");
  });

  test("T5b — duas sessões do mesmo usuário; o administrador revoga UMA: só ela cai", async () => {
    const h = await harness();
    const org = await novaOrganizacao(h, "t5b", { roleKey: "operator" });
    const admin = await administradorDe(h, org.tenantId);
    const s1 = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });
    const s2 = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });

    assert.notEqual(s1.sessionId, s2.sessionId, "fixture: duas sessões");
    assertVivo(await get(h, "/api/v1/me/tenants", s1.accessToken), "controle t1");

    const revoke = await requestJson(h.baseUrl, `/api/v1/sessions/${s1.sessionId}/revoke`, {
      method: "POST",
      headers: admin.headers,
      body: {},
    });

    assert.equal(revoke.status, 200, `a revogação de S1: ${JSON.stringify(revoke.body).slice(0, 200)}`);
    assertSessaoInativa(await get(h, "/api/v1/me/tenants", s1.accessToken), "T5b: t1 (S1 revogada)");
    assertVivo(await get(h, "/api/v1/me/tenants", s2.accessToken), "T5b: t2 (S2 viva)");
  });

  test("T6 — logout: o access token da mesma sessão é recusado", async () => {
    const h = await harness();
    const org = await novaOrganizacao(h, "t6", { roleKey: "operator" });
    const sessao = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });

    assertVivo(await get(h, "/api/v1/me/tenants", sessao.accessToken), "controle");

    const logout = await requestJson(h.baseUrl, "/api/v1/auth/logout", {
      method: "POST",
      body: { refreshToken: sessao.refreshToken },
    });

    assert.ok(logout.status === 200 || logout.status === 204, `o logout: ${logout.status}`);
    assertSessaoInativa(await get(h, "/api/v1/me/tenants", sessao.accessToken), "T6");
  });

  test("T6b — duas sessões do mesmo usuário; logout de UMA: só ela cai", async () => {
    const h = await harness();
    const org = await novaOrganizacao(h, "t6b", { roleKey: "operator" });
    const s1 = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });
    const s2 = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });

    assertVivo(await get(h, "/api/v1/me/tenants", s1.accessToken), "controle t1");

    const logout = await requestJson(h.baseUrl, "/api/v1/auth/logout", {
      method: "POST",
      body: { refreshToken: s1.refreshToken },
    });

    assert.ok(logout.status === 200 || logout.status === 204, `o logout de S1: ${logout.status}`);
    assertSessaoInativa(await get(h, "/api/v1/me/tenants", s1.accessToken), "T6b: t1 (logout)");
    assertVivo(await get(h, "/api/v1/me/tenants", s2.accessToken), "T6b: t2 (outra sessão viva)");
  });

  test("T7 — troca da própria senha corta o token atual; um login novo com a senha nova entra", async () => {
    const h = await harness();
    const org = await novaOrganizacao(h, "t7", { roleKey: "operator", password: "SenhaAntigaT7!1" });
    const sessao = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });

    assertVivo(await get(h, "/api/v1/me/tenants", sessao.accessToken), "controle");

    const troca = await requestJson(h.baseUrl, "/api/v1/auth/password", {
      method: "POST",
      headers: portador(sessao.accessToken),
      body: { currentPassword: org.password, newPassword: "SenhaNovaT7!9z" },
    });

    assert.equal(troca.status, 200, `a troca: ${JSON.stringify(troca.body).slice(0, 200)}`);
    assertSessaoInativa(await get(h, "/api/v1/me/tenants", sessao.accessToken), "T7: o token anterior à troca");

    const nova = await entrar(h, { tenantId: org.tenantId, email: org.email, password: "SenhaNovaT7!9z" });

    assertVivo(await get(h, "/api/v1/me/tenants", nova.accessToken), "T7: o login novo entra");
  });

  test("T8 — sessão vencida (expires_at no passado, sem revogar): 401 session_inactive", async () => {
    const h = await harness();
    const org = await novaOrganizacao(h, "t8", { roleKey: "operator" });
    const sessao = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });

    assertVivo(await get(h, "/api/v1/me/tenants", sessao.accessToken), "controle");

    await h.admin.authSession.update({
      where: { id: sessao.sessionId },
      data: { expires_at: new Date(Date.now() - 60_000) },
    });

    assertSessaoInativa(await get(h, "/api/v1/me/tenants", sessao.accessToken), "T8");
  });

  test("T11 — sid alheio: token de X com o sid da sessão viva de Y é recusado; o token do login de X passa", async () => {
    const h = await harness();
    const { signAccessToken } = await import("../src/modules/auth/index.js");
    const org = await novaOrganizacao(h, "t11", { roleKey: "operator" });
    const y = await novoUsuario(h, org.tenantId, "t11-y");
    const sessaoX = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });
    const sessaoY = await entrar(h, { tenantId: org.tenantId, email: y.email, password: y.password });
    const forjado = await signAccessToken({
      user_id: org.userId,
      tenant_id: org.tenantId,
      email: org.email,
      roles: ["operator"],
      session_id: sessaoY.sessionId,
    });

    assertVivo(await get(h, "/api/v1/me/tenants", sessaoX.accessToken), "controle: X com a própria sessão");
    assertSessaoInativa(await get(h, "/api/v1/me/tenants", forjado), "T11: X com o sid de Y");
  });

  test("T12 — token sem sid (o do deploy): desativado 401; ativo passa", async () => {
    const h = await harness();
    const { signAccessToken } = await import("../src/modules/auth/index.js");
    const org = await novaOrganizacao(h, "t12", { roleKey: "operator" });
    const outro = await novoUsuario(h, org.tenantId, "t12-ativo");
    const semSid = (userId: string, email: string) =>
      signAccessToken({ user_id: userId, tenant_id: org.tenantId, email, roles: ["operator"] });
    const tokenAlvo = await semSid(org.userId, org.email);
    const tokenAtivo = await semSid(outro.userId, outro.email);

    assertVivo(await get(h, "/api/v1/me/tenants", tokenAlvo), "controle: o alvo ativo, sem sid");

    await desligarStatus(h, org.userId);

    assertSessaoInativa(await get(h, "/api/v1/me/tenants", tokenAlvo), "T12: desativado sem sid");
    assertVivo(await get(h, "/api/v1/me/tenants", tokenAtivo), "T12: ativo sem sid");
  });

  test("T19 (a) — trocar o CONJUNTO de papéis corta o token; um login novo entra", async () => {
    const h = await harness();
    const org = await novaOrganizacao(h, "t19a");
    const admin = await administradorDe(h, org.tenantId);
    const operator = await papelGlobal(h, "operator", "system");
    const auditor = await papelGlobal(h, "auditor", "system");

    await h.admin.userRoleAssignment.deleteMany({ where: { tenant_id: org.tenantId, user_id: org.userId } });
    await h.admin.userRoleAssignment.createMany({
      data: [
        { tenant_id: org.tenantId, user_id: org.userId, role_id: operator.id },
        { tenant_id: org.tenantId, user_id: org.userId, role_id: auditor.id },
      ],
    });

    const sessao = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });

    assertVivo(await get(h, "/api/v1/me/tenants", sessao.accessToken), "controle");

    const patch = await requestJson(h.baseUrl, `/api/v1/users/${org.userId}`, {
      method: "PATCH",
      headers: admin.headers,
      body: { roles: ["operator"] },
    });

    assert.equal(patch.status, 200, `a troca de papéis: ${JSON.stringify(patch.body).slice(0, 200)}`);
    assertSessaoInativa(await get(h, "/api/v1/me/tenants", sessao.accessToken), "T19 (a): o token com os papéis antigos");

    const nova = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });

    assertVivo(await get(h, "/api/v1/me/tenants", nova.accessToken), "T19 (a): o login novo entra");
  });

  test("T19 (b) — controle: renomear com o MESMO conjunto de papéis (outra ordem) não corta o token", async () => {
    const h = await harness();
    const org = await novaOrganizacao(h, "t19b");
    const admin = await administradorDe(h, org.tenantId);
    const operator = await papelGlobal(h, "operator", "system");
    const auditor = await papelGlobal(h, "auditor", "system");

    await h.admin.userRoleAssignment.deleteMany({ where: { tenant_id: org.tenantId, user_id: org.userId } });
    await h.admin.userRoleAssignment.createMany({
      data: [
        { tenant_id: org.tenantId, user_id: org.userId, role_id: operator.id },
        { tenant_id: org.tenantId, user_id: org.userId, role_id: auditor.id },
      ],
    });

    const sessao = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });

    assertVivo(await get(h, "/api/v1/me/tenants", sessao.accessToken), "controle");

    const patch = await requestJson(h.baseUrl, `/api/v1/users/${org.userId}`, {
      method: "PATCH",
      headers: admin.headers,
      body: { name: "Nome novo T19b", roles: ["auditor", "operator"] },
    });

    assert.equal(patch.status, 200, `renomear: ${JSON.stringify(patch.body).slice(0, 200)}`);
    assertVivo(await get(h, "/api/v1/me/tenants", sessao.accessToken), "T19 (b): renomear não corta");
  });
}
