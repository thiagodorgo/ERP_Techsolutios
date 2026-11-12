import assert from "node:assert/strict";
import test, { after } from "node:test";

import { requestJson } from "./helpers/auth-identity-fixture.js";
import {
  desmontarSessaoReal,
  entrar,
  montarSessaoReal,
  novaOrganizacao,
  portador,
  sidDo,
  type SessaoRealHarness,
} from "./helpers/users-seg-desativado-sessao.js";

// -----------------------------------------------------------------------------------------------
// B-USERS-SEG-DESATIVADO — T10a–d: os TRÊS assinadores do access token carregam a sessão (claim `sid`), e o `sid`
// é o `session_id` que a resposta entrega. Sem isso o portão não teria o que conferir.
//   (a) login com `tenantId`            · M9: `session_id: loginSession.sessionId,`
//   (b) login sem `tenantId` (o do app) · M9: idem
//   (c) refresh: o MESMO `sid` antes e depois · M9: `session_id: refreshedSessionId,`
//   (d) troca de organização            · M9: `session_id: tenantSwitchSession.sessionId,`
// Modo `prisma` forçado e conferido; o app usa o papel efêmero (A9). Só a listagem de candidatos do login sem
// organização atravessa a função elevada pela conexão do administrador (`candidatosPeloAdministrador`, no arnês).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-USERS-SEG-DESATIVADO · emissão (app real) exige DATABASE_URL e um PostgreSQL migrado", {
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
      const h = await montarSessaoReal(connectionString, { candidatosPeloAdministrador: true });

      try {
        const { env } = await import("../src/config/env.js");

        assert.equal(env.CORE_SAAS_PERSISTENCE, "prisma", "E1.5: a suíte roda em prisma, nunca em memória");
        assert.equal((await import("../src/database/prisma.js")).prisma, h.role.client, "A9: o app usa o papel");
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

  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  test("T10a — login com tenantId: o sid do access token é o session_id da resposta", async () => {
    const h = await harness();
    const org = await novaOrganizacao(h, "t10a");
    const sessao = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });

    assert.match(sessao.sessionId, UUID, "fixture: a resposta traz o session_id");
    assert.equal(sidDo(sessao.accessToken), sessao.sessionId);

    const linha = await h.admin.authSession.count({ where: { id: sessao.sessionId, tenant_id: org.tenantId, user_id: org.userId } });

    assert.equal(linha, 1, "o sid aponta para a sessão do par no banco");
  });

  test("T10b — login sem tenantId (o caminho do app): o sid do access token é o session_id da resposta", async () => {
    const h = await harness();
    const org = await novaOrganizacao(h, "t10b");
    const sessao = await entrar(h, { email: org.email, password: org.password });

    assert.match(sessao.sessionId, UUID);
    assert.equal(sidDo(sessao.accessToken), sessao.sessionId);
  });

  test("T10c — refresh: o access token novo carrega o MESMO sid da sessão renovada", async () => {
    const h = await harness();
    const org = await novaOrganizacao(h, "t10c");
    const sessao = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });
    const refresh = await requestJson(h.baseUrl, "/api/v1/auth/refresh", {
      method: "POST",
      body: { refreshToken: sessao.refreshToken },
    });

    assert.equal(refresh.status, 200, `o refresh: ${JSON.stringify(refresh.body).slice(0, 200)}`);

    const data = refresh.body.data as { access_token: string; session_id: string };

    assert.equal(data.session_id, sessao.sessionId, "fixture: o refresh renova a mesma sessão");
    assert.equal(sidDo(data.access_token), sessao.sessionId, "o sid antes e depois do refresh é o mesmo");
  });

  test("T10d — troca de organização: o sid do access token é o session_id da sessão nova da organização de destino", async () => {
    const h = await harness();
    const email = `t10d-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
    const orgA = await novaOrganizacao(h, "t10d-a", { email, password: "SenhaT10dA!1" });
    const orgB = await novaOrganizacao(h, "t10d-b", { email, password: "SenhaT10dB!1" });
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

    assert.equal(troca.status, 200, `a troca: ${JSON.stringify(troca.body).slice(0, 200)}`);

    const data = troca.body.data as { access_token: string; session_id: string };

    assert.match(data.session_id, UUID);
    assert.notEqual(data.session_id, sessaoA.sessionId, "a troca nasce sessão nova");
    assert.equal(sidDo(data.access_token), data.session_id);

    const linha = await h.admin.authSession.count({ where: { id: data.session_id, tenant_id: orgB.tenantId, user_id: orgB.userId } });

    assert.equal(linha, 1, "o sid aponta para a sessão do par de DESTINO");
  });
}
