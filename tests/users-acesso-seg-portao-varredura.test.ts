import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { instalarRegistroDeCaminhos, percorrerApp, preencherParametros } from "./helpers/route-walk.js";

// -----------------------------------------------------------------------------------------------
// B-USERS-ACESSO-SEG — conserto do PR #527, G1 (A2, com as correções R1-A03 e R1-A05).
//
// Monta o `createApp` REAL (memória), enumera TODA rota e TODA camada de middleware com caminho pelo walk
// do censo (`tests/helpers/route-walk.ts`) e chama cada uma com um access token RESTRITO
// (`scope: "password_change"`) que carrega papéis CHEIOS — assim o portão é o único obstáculo, e o teste
// prova o portão sem depender dos papéis vazios da emissão (A3/A4 têm teste próprio).
// Esperado: 403 `password_change_required` em todas, salvo a lista FECHADA de R1-A05:
//   - `GET /api/v1/health`, `/health/ready`, `/health/worker`; `POST /api/v1/auth/login`, `/auth/refresh`,
//     `/auth/logout` (não leem access token);
//   - `POST /api/v1/auth/password`: tem de responder algo DIFERENTE de 403 `password_change_required`.
// Mudar a lista exige emenda. Pisos: rotas ≥ 440 (a contagem da C2) e camadas de middleware com caminho ≥ o
// número medido no head do conserto, para o teste não passar vazio.
// -----------------------------------------------------------------------------------------------

const PISO_ROTAS = 440;
// Medido no head do conserto (F4): 73 camadas de middleware com caminho (a mesma contagem da crítica, A-03).
const PISO_MW_COM_CAMINHO = 73;

const NAO_LEEM_ACCESS_TOKEN = new Set([
  "GET /api/v1/health",
  "GET /api/v1/health/ready",
  "GET /api/v1/health/worker",
  "POST /api/v1/auth/login",
  "POST /api/v1/auth/refresh",
  "POST /api/v1/auth/logout",
]);
const ROTA_ACEITA = "POST /api/v1/auth/password";

test("A2/G1 — toda rota e toda camada com caminho recusam a sessão restrita, salvo a lista fechada", async (t) => {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  process.env.JWT_SECRET = "dev-only-change-me";
  delete process.env.DATABASE_URL;
  delete process.env.REDIS_URL;

  instalarRegistroDeCaminhos();

  const [
    { createApp },
    { signAccessToken },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/auth/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenant = core.createTenant({ name: "G1 portão", modules: ["work_orders", "field_operations"] });
  const user = core.createUser({ tenantId: tenant.id, name: "G1", email: "g1-portao@example.com", roles: ["manager"] });
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const percurso = percorrerApp(app);
  const token = await signAccessToken({
    user_id: user.id,
    tenant_id: tenant.id,
    email: "g1-portao@example.com",
    roles: ["super_admin", "tenant_admin", "manager", "operator", "field_technician"],
    scope: "password_change",
  });

  assert.deepEqual(percurso.semCaminho, [], "camada sem caminho textual não pode ser chamada: o G1 não a cobriria");
  assert.ok(percurso.rotas.length >= PISO_ROTAS, `rotas enumeradas: ${percurso.rotas.length} (piso ${PISO_ROTAS})`);
  assert.ok(
    percurso.mwComCaminho.length >= PISO_MW_COM_CAMINHO,
    `camadas de middleware com caminho: ${percurso.mwComCaminho.length} (piso ${PISO_MW_COM_CAMINHO})`,
  );

  const server: Server = app.listen(0, "127.0.0.1");

  await new Promise<void>((resolve) => server.once("listening", () => resolve()));

  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const chamar = async (method: string, path: string) => {
    const response = await fetch(base + preencherParametros(path, () => randomUUID()), {
      method,
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: method === "GET" || method === "HEAD" ? undefined : "{}",
      signal: AbortSignal.timeout(4000),
    }).catch(() => null);

    if (!response) {
      return { status: 0, reason: "sem-resposta" };
    }

    const text = await response.text().catch(() => "");
    let reason = "";

    try {
      reason = String(JSON.parse(text)?.error?.reason ?? "");
    } catch {
      reason = "";
    }

    return { status: response.status, reason };
  };
  const fora: string[] = [];
  const excecoesVistas = new Set<string>();

  try {
    for (const rota of percurso.rotas) {
      const chave = `${rota.method} ${rota.path}`;

      if (NAO_LEEM_ACCESS_TOKEN.has(chave)) {
        excecoesVistas.add(chave);
        continue;
      }

      const r = await chamar(rota.method, rota.path);
      const recusada = r.status === 403 && r.reason === "password_change_required";

      if (chave === ROTA_ACEITA) {
        excecoesVistas.add(chave);

        if (recusada) fora.push(`${chave} → recusou a sessão restrita (é a rota aceita)`);

        continue;
      }

      if (!recusada) fora.push(`${chave} → ${r.status} ${r.reason}`);
    }

    for (const camada of percurso.mwComCaminho) {
      const r = await chamar("GET", camada.path);

      if (!(r.status === 403 && r.reason === "password_change_required")) {
        fora.push(`${camada.key} (GET ${camada.path}) → ${r.status} ${r.reason}`);
      }
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }

  assert.deepEqual(
    [...excecoesVistas].sort(),
    [...NAO_LEEM_ACCESS_TOKEN, ROTA_ACEITA].sort(),
    "a lista fechada de exceções existe inteira no app (lista velha é vermelha)",
  );
  assert.deepEqual(fora, [], `rotas/camadas que escapam do portão (${fora.length})`);
  t.diagnostic(`rotas=${percurso.rotas.length} mwComCaminho=${percurso.mwComCaminho.length} excecoes=${excecoesVistas.size} fora=${fora.length}`);
});
