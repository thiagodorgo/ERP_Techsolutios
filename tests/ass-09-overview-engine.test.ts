import assert from "node:assert/strict";
import test from "node:test";

import type { CloudCostAllocationSummary } from "../src/modules/cloud-cost-allocation/index.js";
import { formatCents, formatMicro, rateToMicro, subOrNull } from "../src/modules/subscription-billing/overview/overview-money.js";
import {
  alertFor,
  costStatusOf,
  marginPct,
  marginPctOrNull,
  pricingOf,
  summaryCurrencyOf,
  tenantCostOf,
} from "../src/modules/subscription-billing/overview/overview.engine.js";

// B-ASS-09 · F1 — status do custo, alerta e percentual da margem (plano v2 §3 P2 e P4; §6 C1: R-FX-3, R-FX-4, R-MG-1..4).
// Valores sintéticos (plano §15).
//
// MUTAÇÕES LITERAIS QUE ESTE ARQUIVO MATA (plano v1 §6, sem mudança no v2):
//   M-FX-4  `if (rateMicro === null) return null;` → `if (rateMicro === null) rateMicro = MICRO;`   → T-FX-3
//   M-FX-5  `if (currency === "BRL")` → `if (currency === "BRL" && rateMicro !== null)`              → T-FX-4
//   M-MG-1  `cost > sub` → `cost >= sub`                                                             → T-MG-3
//   M-MG-2  `80n` → `90n` (em `WARNING_PERCENT`)                                                     → T-MG-2
//   M-MG-3  tirar `sub > 0n && `                                                                     → T-MG-5
//   M-MG-6  `roundHalfAwayFromZero(margin * 10_000n, sub)` → `(…, cost)`                             → T-MG-9
//   M-MG-4  corpo de `costStatusOf` → `return summary.runId === null ? "no_run" : "ok";`              → T-MG-13
//   M-MG-5  `entry === undefined ? 0n :` → `entry === undefined ? null :`                             → T-MG-15
//   M-MG-8  `summary.currency ?? null` → `summary.currency ?? "BRL"`                                  → T-MG-16

function summary(overrides: Partial<CloudCostAllocationSummary> = {}): CloudCostAllocationSummary {
  return {
    periodStart: "2026-10-01T00:00:00.000Z",
    periodEnd: "2026-10-31T00:00:00.000Z",
    currency: "USD",
    totalImportedCost: 0,
    totalAllocatedCost: 0,
    totalUnallocatedCost: 0,
    totalPlatformCost: 0,
    roundingResidualCost: 0,
    runId: "run-1",
    importId: "imp-1",
    importResolution: "explicit",
    coverage: "imported",
    unallocatedByReason: [],
    platformCostByService: [],
    estimatedCategories: [],
    tenants: [],
    services: [],
    generatedAt: "2026-11-01T00:00:00.000Z",
    ...overrides,
  };
}

function tenantRow(tenantId: string, allocatedCost: number) {
  return { tenantId, tenantName: `Organização ${tenantId.toUpperCase()}`, allocatedCost, allocationRatio: 0 };
}

/** O custo em reais de uma organização, como a visão calcula: status → preço → custo. */
function costOf(s: CloudCostAllocationSummary, tenantId: string, rate: string | null) {
  const rateMicro = rate === null ? null : rateToMicro(rate);
  const status = costStatusOf(s, rateMicro);
  const pricing = pricingOf(status, summaryCurrencyOf(s), rateMicro);
  return { status, pricing, ...tenantCostOf(s, tenantId, status, pricing) };
}

const SUB = 100_000n; // assinatura sintética de 1000.00

test("T-FX-3 · USD sem taxa do mês → fx_missing, custo e margem null, alerta cost_missing (a taxa nunca vira 1)", () => {
  const s = summary({ currency: "USD", tenants: [tenantRow("a", 100)] });
  const cost = costOf(s, "a", null);
  assert.equal(cost.status, "fx_missing");
  assert.equal(cost.costCents, null);
  assert.equal(subOrNull(SUB, cost.costCents), null);
  assert.equal(alertFor(SUB, cost.costCents), "cost_missing");
  // O original continua conhecido: a moeda é sabida, só falta a taxa.
  assert.equal(formatMicro(cost.costMicro!), "100.000000");
});

test("T-FX-4 · real não converte: 123.456789 BRL sem taxa → 123.46, status ok, sem taxa no preço", () => {
  const s = summary({ currency: "BRL", tenants: [tenantRow("a", 123.456789)] });
  const cost = costOf(s, "a", null);
  assert.equal(cost.status, "ok");
  assert.equal(cost.pricing.rateMicro, null);
  assert.equal(formatCents(cost.costCents!), "123.46");
});

test("T-MG-1..8 · mesa de alerta (assinatura 1000.00): 80 % é atenção, acima de 100 % é crítico", () => {
  const cases: ReadonlyArray<readonly [string, bigint | null, bigint | null, string]> = [
    ["T-MG-1 custo 790.00", SUB, 79_000n, "none"],
    ["T-MG-2 custo 800.00", SUB, 80_000n, "warning"],
    ["T-MG-3 custo 1000.00", SUB, 100_000n, "warning"],
    ["T-MG-4 custo 1000.01", SUB, 100_001n, "critical"],
    ["T-MG-5 assinatura 0.00 e custo 0.00", 0n, 0n, "none"],
    ["T-MG-6 assinatura 0.00 e custo 0.01", 0n, 1n, "critical"],
    ["T-MG-7 assinatura nula", null, 50_000n, "no_subscription"],
    ["T-MG-8 custo nulo", SUB, null, "cost_missing"],
  ];
  for (const [name, sub, cost, expected] of cases) {
    assert.equal(alertFor(sub, cost), expected, name);
  }
  // A ordem conta: custo nulo vence assinatura nula.
  assert.equal(alertFor(null, null), "cost_missing");
});

test("T-MG-9..11 · percentual da margem sobre a assinatura, em 2 casas, metade para longe do zero", () => {
  assert.equal(marginPct(SUB - 54_000n, SUB), "46.00", "T-MG-9 1000.00/540.00");
  const margin = subOrNull(300n, 100n);
  assert.equal(formatCents(margin!), "2.00", "T-MG-10 margem 3.00 − 1.00");
  assert.equal(marginPct(margin!, 300n), "66.67", "T-MG-10 66,666… → 66.67");
  assert.equal(marginPct(-100n, 300n), "-33.33", "margem negativa mantém o sinal");
  assert.equal(marginPctOrNull(0n, 0n), null, "T-MG-11 assinatura 0.00 → null");
  assert.equal(marginPctOrNull(null, SUB), null, "margem nula → null");
  assert.equal(marginPctOrNull(5n, null), null, "assinatura nula → null");
});

test("T-MG-12..15 · cobertura do resumo: no_run e no_import distintos, legacy_unscoped com selo, ausente no rateio = 0.00 real", () => {
  // T-MG-12 · sem run no período.
  const noRun = costOf(summary({ coverage: "no_run", runId: null, importId: null, importResolution: null, currency: undefined }), "a", null);
  assert.equal(noRun.status, "no_run");
  assert.equal(noRun.costCents, null);
  assert.equal(noRun.costMicro, null);
  assert.equal(alertFor(SUB, noRun.costCents), "cost_missing");

  // T-MG-13 · run vazia (sem importação): `no_import`, distinto de `no_run` na saída, mesmo em real.
  const noImport = costOf(
    summary({ coverage: "no_import", runId: "run-vazia", importId: null, importResolution: "none", currency: "BRL" }),
    "a",
    null,
  );
  assert.equal(noImport.status, "no_import");
  assert.equal(noImport.costCents, null);
  assert.equal(alertFor(SUB, noImport.costCents), "cost_missing");
  // Uma `coverage` que o bloco não conhece falha fechado (nunca vira `ok`).
  const unknownCoverage = summary({ coverage: "partial" as unknown as CloudCostAllocationSummary["coverage"], currency: "BRL" });
  assert.equal(costOf(unknownCoverage, "a", null).status, "no_import");

  // T-MG-14 · run anterior ao escopo de importação: o valor aparece, com o selo.
  const legacy = costOf(
    summary({ coverage: "legacy_unscoped", importResolution: null, importId: null, currency: "BRL", tenants: [tenantRow("a", 12.5)] }),
    "a",
    null,
  );
  assert.equal(legacy.status, "legacy_unscoped");
  assert.equal(formatCents(legacy.costCents!), "12.50");

  // T-MG-15 · coberto por importação e fora de `tenants[]`: o rateio não deu nada → 0.00 de verdade, status ok.
  const absent = costOf(summary({ currency: "USD", tenants: [tenantRow("a", 100)] }), "b", "5.400000");
  assert.equal(absent.status, "ok");
  assert.equal(absent.costCents, 0n);
  assert.equal(formatCents(absent.costCents!), "0.00");
  assert.equal(alertFor(SUB, absent.costCents), "none");
});

test("T-MG-16 · coberto por importação sem moeda → currency_unknown, custo null, alerta cost_missing (nunca vira real)", () => {
  const s = summary({ currency: undefined, tenants: [tenantRow("a", 100)] });
  assert.equal(summaryCurrencyOf(s), null);
  const cost = costOf(s, "a", null);
  assert.equal(cost.status, "currency_unknown");
  assert.equal(cost.costCents, null);
  assert.equal(cost.costMicro, null);
  assert.equal(alertFor(SUB, cost.costCents), "cost_missing");
  // Com taxa de qualquer moeda à mão, continua desconhecida.
  assert.equal(costOf(s, "a", "5.400000").status, "currency_unknown");
});
