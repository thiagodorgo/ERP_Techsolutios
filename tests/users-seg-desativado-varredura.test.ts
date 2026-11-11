import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test, { mock } from "node:test";

import { instalarRegistroDeCaminhos, percorrerApp, preencherParametros } from "./helpers/route-walk.js";

// -----------------------------------------------------------------------------------------------
// B-USERS-SEG-DESATIVADO — T9-mem: a varredura do T9-db, rápida, dentro do `npm test` (memória). A conferência da
// sessão é trocada por um dublê que responde "inactive" (`mock.method(sessionLiveness, "check")`): o portão é o
// ÚNICO lugar que a consulta, então TODA rota e TODA camada com caminho têm de responder 401 `session_inactive`,
// salvo a lista FECHADA de 6 que não leem access token. `POST /api/v1/auth/password` NÃO é exceção.
// Pisos: o universo medido na base do ramo (a0979f51, F0): 444 rotas e 73 camadas com caminho.
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

test("T9-mem — com a conferência dizendo 'inactive', toda rota e camada com caminho → 401 session_inactive, salvo as 6", async (t) => {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  process.env.JWT_SECRET = "dev-only-change-me";
  delete process.env.DATABASE_URL;
  delete process.env.REDIS_URL;

  instalarRegistroDeCaminhos();

  const [
    { createApp },
    { signAccessToken },
    { sessionLiveness },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
    { env },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/auth/index.js"),
    import("../src/modules/auth/services/session-liveness.service.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
    import("../src/config/env.js"),
  ]);

  assert.equal(env.BILLING_PROVIDERS_ENABLED, false, "E1.1-1: o canal de cobrança está desligado");

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenant = core.createTenant({ name: "T9 portão", modules: ["work_orders", "field_operations"] });
  const user = core.createUser({ tenantId: tenant.id, name: "T9", email: "t9-portao@example.com", roles: ["manager"] });
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const percurso = percorrerApp(app);
  const token = await signAccessToken({
    user_id: user.id,
    tenant_id: tenant.id,
    email: "t9-portao@example.com",
    roles: ["super_admin", "tenant_admin", "manager", "operator", "field_technician"],
  });
  const check = mock.method(sessionLiveness, "check", async () => "inactive" as const);

  assert.deepEqual(percurso.semCaminho, [], "camada sem caminho textual não pode ser chamada: o T9 não a cobriria");
  assert.ok(percurso.rotas.length >= PISO_ROTAS, `rotas enumeradas: ${percurso.rotas.length} (piso ${PISO_ROTAS})`);
  assert.ok(
    percurso.mwComCaminho.length >= PISO_MW_COM_CAMINHO,
    `camadas com caminho: ${percurso.mwComCaminho.length} (piso ${PISO_MW_COM_CAMINHO})`,
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

  try {
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
  } finally {
    mock.restoreAll();
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }

  assert.deepEqual([...excecoesVistas].sort(), [...NAO_LEEM_ACCESS_TOKEN].sort(), "a lista fechada existe inteira no app");
  assert.ok(check.mock.callCount() > 0, "o dublê foi chamado (o portão consulta a conferência)");
  t.diagnostic(`rotas=${percurso.rotas.length} mwComCaminho=${percurso.mwComCaminho.length} fora=${fora.length}`);
  assert.deepEqual(fora, [], `rotas/camadas que aceitam o token de sessão inativa (${fora.length})`);
});
