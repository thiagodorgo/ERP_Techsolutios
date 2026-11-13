import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import { requestJson } from "./helpers/auth-identity-fixture.js";
import { instalarRegistroDeCaminhos, percorrerApp, preencherParametros } from "./helpers/route-walk.js";
import {
  administradorDe,
  desmontarSessaoReal,
  entrar,
  montarSessaoReal,
  novaOrganizacao,
  portador,
  type SessaoRealHarness,
} from "./helpers/users-seg-desativado-sessao.js";

// -----------------------------------------------------------------------------------------------
// B-USERS-SEG-DESATIVADO — T9-db: NENHUMA rota escapa (o censo do plano vira guard). Login real, o administrador
// desativa o usuário pela API (`PATCH /api/v1/users/:userId`), e o walk do censo (`tests/helpers/route-walk.ts`)
// chama TODA rota e TODA camada de middleware com caminho com o MESMO token. Esperado: 401 `session_inactive`
// em todas, salvo a lista FECHADA de 6 que não leem access token (health 3, login, refresh, logout).
// `POST /api/v1/auth/password` NÃO é exceção (o desativado não troca a senha com o token antigo).
// Pisos: o universo medido na base do ramo (a0979f51, F0): 444 rotas e 73 camadas com caminho.
// Modo `prisma` forçado e conferido; o portão usa o papel efêmero (A9). `env.BILLING_PROVIDERS_ENABLED` é falso
// (E1.1-1: a rota do webhook de cobrança desligada segue para as montagens seguintes e cai no portão).
// -----------------------------------------------------------------------------------------------

const PISO_ROTAS = 444;
const PISO_MW_COM_CAMINHO = 73;

const NAO_LEEM_ACCESS_TOKEN = new Set([
  "GET /api/v1/health",
  "GET /api/v1/health/ready",
  "GET /api/v1/health/worker",
  "POST /api/v1/auth/login",
  "POST /api/v1/auth/refresh",
  "POST /api/v1/auth/logout",
]);

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-USERS-SEG-DESATIVADO · varredura (app real) exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL e rode as migrações para executar esta suíte.",
  });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";

  instalarRegistroDeCaminhos();

  let harnessPromise: Promise<SessaoRealHarness> | undefined;

  const harness = (): Promise<SessaoRealHarness> =>
    (harnessPromise ??= (async () => {
      const h = await montarSessaoReal(connectionString);

      try {
        const { env } = await import("../src/config/env.js");

        assert.equal(env.CORE_SAAS_PERSISTENCE, "prisma", "E1.5: a suíte roda em prisma, nunca em memória");
        assert.equal((await import("../src/database/prisma.js")).prisma, h.role.client, "A9: o portão usa o papel");
        assert.equal(env.BILLING_PROVIDERS_ENABLED, false, "E1.1-1: o canal de cobrança está desligado");
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

  test("T9-db — desativado pela API: toda rota e toda camada com caminho → 401 session_inactive, salvo as 6", async (t) => {
    const h = await harness();
    const org = await novaOrganizacao(h, "t9", { roleKey: "operator" });
    const admin = await administradorDe(h, org.tenantId);
    const sessao = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });
    const controle = await requestJson(h.baseUrl, "/api/v1/me/tenants", { headers: portador(sessao.accessToken) });

    assert.equal(controle.status, 200, "controle: o token vivo passa antes da desativação");

    const desativa = await requestJson(h.baseUrl, `/api/v1/users/${org.userId}`, {
      method: "PATCH",
      headers: admin.headers,
      body: { status: "inactive" },
    });

    assert.equal(desativa.status, 200, `a desativação pela API: ${JSON.stringify(desativa.body).slice(0, 200)}`);

    const percurso = percorrerApp(h.server.listeners("request")[0]);

    assert.deepEqual(percurso.semCaminho, [], "camada sem caminho textual não pode ser chamada: a varredura não a cobriria");
    assert.ok(percurso.rotas.length >= PISO_ROTAS, `rotas enumeradas: ${percurso.rotas.length} (piso ${PISO_ROTAS})`);
    assert.ok(
      percurso.mwComCaminho.length >= PISO_MW_COM_CAMINHO,
      `camadas com caminho: ${percurso.mwComCaminho.length} (piso ${PISO_MW_COM_CAMINHO})`,
    );

    const chamar = async (method: string, path: string) => {
      const response = await fetch(h.baseUrl + preencherParametros(path, () => randomUUID()), {
        method,
        headers: { authorization: `Bearer ${sessao.accessToken}`, "content-type": "application/json" },
        body: method === "GET" || method === "HEAD" ? undefined : "{}",
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);

      if (!response) {
        return { status: 0, code: "sem-resposta", reason: "" };
      }

      const text = await response.text().catch(() => "");

      try {
        const parsed = JSON.parse(text) as { error?: { code?: unknown; reason?: unknown } };

        return { status: response.status, code: String(parsed?.error?.code ?? ""), reason: String(parsed?.error?.reason ?? "") };
      } catch {
        return { status: response.status, code: "", reason: "" };
      }
    };
    const recusada = (r: { status: number; code: string; reason: string }) =>
      r.status === 401 && r.code === "INVALID_TOKEN" && r.reason === "session_inactive";
    const fora: string[] = [];
    const excecoesVistas = new Set<string>();

    for (const rota of percurso.rotas) {
      const chave = `${rota.method} ${rota.path}`;

      if (NAO_LEEM_ACCESS_TOKEN.has(chave)) {
        excecoesVistas.add(chave);
        continue;
      }

      const r = await chamar(rota.method, rota.path);

      if (!recusada(r)) fora.push(`${chave} → ${r.status} ${r.code} ${r.reason}`);
    }

    for (const camada of percurso.mwComCaminho) {
      const r = await chamar("GET", camada.path);

      if (!recusada(r)) fora.push(`${camada.key} (GET ${camada.path}) → ${r.status} ${r.code} ${r.reason}`);
    }

    assert.deepEqual([...excecoesVistas].sort(), [...NAO_LEEM_ACCESS_TOKEN].sort(), "a lista fechada existe inteira no app");
    t.diagnostic(`rotas=${percurso.rotas.length} mwComCaminho=${percurso.mwComCaminho.length} fora=${fora.length}`);
    assert.deepEqual(fora.slice(0, 40), [], `rotas/camadas que aceitam o token do desativado (${fora.length})`);
    assert.equal(fora.length, 0);
  });
}
