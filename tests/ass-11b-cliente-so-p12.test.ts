// B-ASS-11b (Parte R do item 62) — o cliente vê SÓ o que a P12 permite: a rota de tendência (`usage-history`) saiu.
// A P12 (requisito do dono, 31/10) tira "da tela e do payload do cliente" os veículos rastreados e a tendência de 6
// meses; a decisão 8.2 (13/11) diz "a tendência sai". Estes testes prendem a retirada nos 5 lugares onde ela vivia:
//   T-R1 o roteador do cliente tem EXATAMENTE `GET /billing/subscription` (lido da pilha do próprio roteador);
//   T-R2 `subscription-view.ts`, lido como TEXTO, não tem `buildUsageHistory`, `UsageHistoryRow` nem `shiftPeriod`
//        (um tipo some em tempo de execução: por import, a metade do tipo nasceria verde);
//   T-R3 o item `tenant.billing` do registro de navegação tem 1 endpoint relacionado;
//   T-R4 nenhuma CHAVE das 2 fixtures de censo contém `usage-history`;
//   T-R5 `docs/subscription-billing.md` não contém `usage-history`.
// O 404 do caminho antigo, pelo app real, é o T-ST-64 de `tests/ass-04-statement-routes.test.ts`.
// Vermelho-controle na `main` `adec93ce` (antes da retirada): os 5 falham por asserção.

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

process.env.LOG_LEVEL = "silent";
process.env.CORE_SAAS_PERSISTENCE = "memory";

function lerTexto(relativo: string): string {
  return fs.readFileSync(new URL(`../${relativo}`, import.meta.url), "utf8");
}

/** Todas as chaves de um JSON, em qualquer nível. */
function chavesProfundas(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.flatMap((item) => chavesProfundas(item));
  if (valor === null || typeof valor !== "object") return [];
  return Object.entries(valor as Record<string, unknown>).flatMap(([chave, filho]) => [chave, ...chavesProfundas(filho)]);
}

type CamadaDeRota = { readonly route?: { readonly path: unknown; readonly methods: Record<string, boolean> } };

test("T-R1: o roteador do cliente tem exatamente GET /billing/subscription", async () => {
  const { createSubscriptionBillingTenantRouter } = await import("../src/modules/subscription-billing/subscription-billing.tenant.routes.js");
  const router = createSubscriptionBillingTenantRouter() as unknown as { readonly stack: readonly CamadaDeRota[] };
  const rotas = router.stack
    .filter((camada) => camada.route !== undefined)
    .flatMap((camada) =>
      Object.entries(camada.route!.methods)
        .filter(([, ligado]) => ligado)
        .map(([metodo]) => `${metodo.toUpperCase()} ${String(camada.route!.path)}`),
    )
    .sort();
  assert.deepEqual(rotas, ["GET /billing/subscription"]);
});

test("T-R2: subscription-view.ts, lido como texto, não tem buildUsageHistory, UsageHistoryRow nem shiftPeriod", () => {
  const texto = lerTexto("src/modules/subscription-billing/statements/subscription-view.ts");
  const achados = texto.match(/buildUsageHistory|UsageHistoryRow|shiftPeriod/g) ?? [];
  assert.deepEqual(achados, [], `ocorrências: ${achados.length}`);
});

test("T-R3: o item tenant.billing do registro de navegação tem 1 endpoint relacionado", async () => {
  const { NAVIGATION_REGISTRY } = await import("../src/modules/navigation/navigation.registry.js");
  const item = NAVIGATION_REGISTRY.find((entrada) => entrada.id === "tenant.billing");
  assert.ok(item, "o item tenant.billing existe");
  assert.deepEqual(item.relatedEndpoints, ["GET /api/v1/billing/subscription"]);
});

test("T-R4: nenhuma chave das 2 fixtures de censo contém usage-history", () => {
  const fixtures = ["tests/fixtures/o6r07c-classificacao-vias.json", "tests/fixtures/san3-18-route-modules.json"];
  const achados: Record<string, string[]> = {};
  for (const fixture of fixtures) {
    const chaves = chavesProfundas(JSON.parse(lerTexto(fixture)));
    assert.ok(chaves.length > 0, `${fixture} tem chaves`);
    achados[fixture] = chaves.filter((chave) => chave.includes("usage-history"));
  }
  assert.deepEqual(achados, Object.fromEntries(fixtures.map((fixture) => [fixture, []])));
});

test("T-R5: docs/subscription-billing.md não contém usage-history", () => {
  const linhas = lerTexto("docs/subscription-billing.md")
    .split("\n")
    .map((linha, indice) => `${indice + 1}: ${linha}`)
    .filter((linha) => linha.includes("usage-history"));
  assert.deepEqual(linhas, []);
});
