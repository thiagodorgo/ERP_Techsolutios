import assert from "node:assert/strict";
import test from "node:test";

import {
  CloudCostAllocationService,
  InMemoryCloudCostAllocationRepository,
  type CloudCostAllocationSummary,
} from "../src/modules/cloud-cost-allocation/index.js";
import { formatCents, formatMicro, rateToMicro, subOrNull } from "../src/modules/subscription-billing/overview/overview-money.js";
import {
  alertFor,
  buildOverview,
  costSourcesOf,
  costStatusOf,
  firstDayOfNextPeriod,
  firstDayOfPeriod,
  groupLineOf,
  lastDateOfPeriod,
  lastDayOfPeriod,
  marginPct,
  marginPctOrNull,
  pricingOf,
  summaryCurrencyOf,
  tenantCostOf,
  totalsOf,
  type OverviewInput,
} from "../src/modules/subscription-billing/overview/overview.engine.js";
import type {
  FxRateRef,
  GlobalJson,
  OverviewTenant,
  SubscriptionAmount,
  TenantLine,
} from "../src/modules/subscription-billing/overview/overview.types.js";

// B-ASS-09 · F1 — status do custo, alerta e percentual da margem (plano v2 §3 P2 e P4; §6 C1: R-FX-3, R-FX-4, R-MG-1..4).
// A F2 (no fim do arquivo) monta as linhas, o grupo, os totais, o global e a resposta.
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

// =====================================================================================================================
// B-ASS-09 · F2 — linhas, grupo, totais, global e a resposta (plano v2 §3 P5 a P7, P11, P13; §6 C1: R-MG-5, R-GLB-1..3,
// R-FX-7, R-FX-8, R-H13-1; Emenda 1 §3: R-FX-9).
//
// MUTAÇÕES LITERAIS QUE ESTA PARTE MATA:
//   M-FX-10  em `sumOrNull`, `if (xs.some((x) => x === null)) return null;` → `xs = xs.map((x) => x ?? 0n);`          → T-FX-7
//   M-FX-11  `costToBrlCents(totalImportedMicro, currency, rateMicro)` → `…, rateMicro ?? MICRO)`                       → T-FX-7, T-FX-8
//   M-FX-12  `platformOwnCost: costToBrlCents(platformMicro, currency, rateMicro),` → `… ?? 0n,`                        → T-FX-7
//   M-FX-13  `margin: subOrNull(subscriptionTotal, totalCost),` → `margin: subscriptionTotal - (totalCost ?? 0n),`     → T-FX-7
//   M-FX-14  em `groupLineOf`, `allocatedCost: sumOrNull(members.map(…))` → `sumIgnoringNull(…)`                       → T-FX-9 (a)
//   M-FX-15  em `totalsOf`, `allocatedCost: sumOrNull(lines.map(…))` → `sumIgnoringNull(…)`                            → T-FX-9 (b)
//   M-GLB-1  `toMicro(summary.totalUnallocatedCost)` → `toMicro(summary.totalUnallocatedCost + summary.totalPlatformCost)` → T-GLB-1
//   M-GLB-2  `const conversionResidualCost = subOrNull(…);` → `const conversionResidualCost = 0n;`                      → T-GLB-2
//   M-GLB-3  `subOrNull(subscriptionTotal, totalCost)` → `subOrNull(subscriptionTotal, tenantsCost)`                    → T-GLB-3
//   M-GLB-4  `const orgs = input.tenants.filter((t) => !isPlatformTenant(t));` → `const orgs = input.tenants;`         → T-GLB-1
//   M-H13-1  tirar `warnings.push("multiple_imports_in_month");`                                                       → T-H13-1
//   M-H13-2  `const totalImportedMicro = toMicro(…)` → `2n * toMicro(…)` (o valor dobrado de quem soma as runs)        → T-H13-1
//   M-MG-7f  em `lastDayOfPeriod`, `Date.UTC(year, month, 0)` → `Date.UTC(year, month, 1)` (suplementar; a M-MG-7 do
//            plano mora no `overview.service.ts`, da F6)                                                               → T-MG-17
// A M-FX-14 e a M-FX-15 são EQUIVALENTES pela entrada HTTP hoje (Emenda 1 §3): só o T-FX-9 as mata, por chamada direta.

const GENERATED_AT = new Date("2026-11-02T12:00:00.000Z");

function org(id: string, slug: string | null = `org-${id}`): OverviewTenant {
  return { tenantId: id, tenantName: `Organização ${id.toUpperCase()}`, slug };
}

function paying(cents: bigint): SubscriptionAmount {
  return {
    subscriptionAmountCents: cents,
    statementTotalCents: cents,
    creditsAppliedCents: 0n,
    subscriptionBasis: "statement_total",
    source: "statement",
    skipReason: null,
    estimate: false,
  };
}

function notSubscribed(reason: SubscriptionAmount["skipReason"] = "no_subscription"): SubscriptionAmount {
  return {
    subscriptionAmountCents: null,
    statementTotalCents: null,
    creditsAppliedCents: null,
    subscriptionBasis: "statement_total",
    source: "none",
    skipReason: reason,
    estimate: false,
  };
}

function usdRate(rate: string, version = 1, month = "2026-10"): FxRateRef {
  return { month, currencyFrom: "USD", rate, version };
}

function overviewInput(overrides: Partial<OverviewInput>): OverviewInput {
  return {
    period: "2026-10",
    groupBy: "tenant",
    generatedAt: GENERATED_AT,
    summary: summary(),
    runs: [],
    fxRate: null,
    tenants: [],
    subscriptions: new Map(),
    groups: [],
    memberships: [],
    ...overrides,
  };
}

/** `"12.34"` / `"-0.01"` → centavos. */
function toCents(value: string | null): bigint {
  assert.notEqual(value, null);
  const negative = value!.startsWith("-");
  const [whole, fraction] = value!.replace("-", "").split(".") as [string, string];
  const cents = BigInt(whole) * 100n + BigInt(fraction);
  return negative ? -cents : cents;
}

/** Percorre `caminho.com[*].indice` e exige `null` em cada folha; o caminho tem de existir. */
function assertNullAt(root: unknown, pathText: string): void {
  const walk = (node: unknown, parts: readonly string[], trail: string): void => {
    if (parts.length === 0) {
      assert.equal(node, null, `${trail} tem de ser null`);
      return;
    }
    const [head, ...rest] = parts as [string, ...string[]];
    if (head === "[*]") {
      assert.ok(Array.isArray(node) && node.length > 0, `${trail} tem de ser lista não vazia`);
      (node as unknown[]).forEach((item, index) => walk(item, rest, `${trail}[${index}]`));
      return;
    }
    assert.ok(node !== null && typeof node === "object" && head in (node as object), `${trail}.${head} tem de existir`);
    walk((node as Record<string, unknown>)[head], rest, `${trail}.${head}`);
  };
  walk(root, pathText.replace(/\[\*\]/g, ".[*]").split(".").filter(Boolean), "data");
}

const GLOBAL_NULL_PATHS = [
  "global.tenantsCost",
  "global.platformOwnCost",
  "global.unallocatedOther",
  "global.unallocatedByReason[*].cost",
  "global.roundingResidualCost",
  "global.conversionResidualCost",
  "global.totalCost",
  "global.margin",
  "global.marginPct",
];
const LINE_NULL_PATHS = ["lines[*].allocatedCost", "lines[*].margin", "lines[*].marginPct", "totals.allocatedCost", "totals.margin", "totals.marginPct"];

/** O caso do T-FX-7: 3 organizações (A e B no Grupo 1, C sem grupo), assinatura 1000.00 cada, custo em dólar. */
function threeOrgsInput(overrides: Partial<OverviewInput>): OverviewInput {
  return overviewInput({
    summary: summary({
      currency: "USD",
      totalImportedCost: 105.000001,
      totalAllocatedCost: 90,
      totalUnallocatedCost: 5,
      totalPlatformCost: 10,
      roundingResidualCost: 0.000001,
      unallocatedByReason: [{ reason: "no_allocation_rule", unallocatedCost: 5 }],
      tenants: [tenantRow("a", 20), tenantRow("b", 30), tenantRow("c", 40)],
    }),
    tenants: [org("a"), org("b"), org("c")],
    subscriptions: new Map([
      ["a", paying(100_000n)],
      ["b", paying(100_000n)],
      ["c", paying(100_000n)],
    ]),
    groups: [{ groupId: "g1", groupName: "Grupo 1" }],
    memberships: [
      { tenantId: "a", groupId: "g1", validFrom: "2026-10-01", validTo: null },
      { tenantId: "b", groupId: "g1", validFrom: "2026-10-01", validTo: null },
    ],
    ...overrides,
  });
}

test("T-FX-1b · a linha inteira: 100.000000 USD × 5.400000, assinatura 1000.00 → 540.00, margem 460.00, 46.00 %", () => {
  const data = buildOverview(
    overviewInput({
      summary: summary({ currency: "USD", totalImportedCost: 100, totalAllocatedCost: 100, tenants: [tenantRow("a", 100)] }),
      fxRate: usdRate("5.400000", 2),
      tenants: [org("a")],
      subscriptions: new Map([["a", paying(100_000n)]]),
    }),
  );
  assert.equal(data.groupBy, "tenant");
  if (data.groupBy !== "tenant") return;
  assert.deepEqual(
    { status: data.cost.status, currencyOriginal: data.cost.currencyOriginal, fxRate: data.cost.fxRate, fxRateVersion: data.cost.fxRateVersion },
    { status: "ok", currencyOriginal: "USD", fxRate: "5.400000", fxRateVersion: 2 },
  );
  const [line] = data.lines;
  assert.equal(line!.allocatedCost, "540.00");
  assert.equal(line!.allocatedCostOriginal, "100.000000");
  assert.equal(line!.margin, "460.00");
  assert.equal(line!.marginPct, "46.00");
  assert.equal(line!.alert, "none");
  assert.equal(line!.subscriptionAmount, "1000.00");
  assert.equal(line!.subscriptionBasis, "statement_total");
  assert.equal(data.currency, "BRL");
});

test("T-FX-1c · taxa de outro mês ou de outra moeda nunca converte (falha fechado em fx_missing)", () => {
  const base = {
    summary: summary({ currency: "USD", totalImportedCost: 100, totalAllocatedCost: 100, tenants: [tenantRow("a", 100)] }),
    tenants: [org("a")],
    subscriptions: new Map([["a", paying(100_000n)]]),
  };
  for (const fxRate of [usdRate("5.400000", 1, "2026-09"), { month: "2026-10", currencyFrom: "EUR", rate: "6.000000", version: 1 }]) {
    const data = buildOverview(overviewInput({ ...base, fxRate }));
    assert.equal(data.cost.status, "fx_missing");
    assert.equal(data.cost.fxRate, null);
    if (data.groupBy === "tenant") assert.equal(data.lines[0]!.allocatedCost, null);
  }
  assert.throws(() => buildOverview(overviewInput({ ...base, fxRate: usdRate("1000.000000") })), /fx_rate_invalid/);
});

test("T-MG-17 · janela exata do resumo: a run do 09a de fevereiro (fim 23:59:59.999Z) casa com o último dia do mês", async () => {
  for (const [period, lastDay] of [["2026-02", "2026-02-28"], ["2028-02", "2028-02-29"]] as const) {
    const repository = new InMemoryCloudCostAllocationRepository();
    const service = new CloudCostAllocationService(repository);
    const run = await repository.createRun({
      periodStart: new Date(`${period}-01T00:00:00.000Z`),
      periodEnd: new Date(`${lastDay}T23:59:59.999Z`),
      metadata: {},
    });
    await repository.updateRun(run.id, {
      status: "completed",
      totalImportedCost: 7,
      totalAllocatedCost: 0,
      totalUnallocatedCost: 0,
      currency: "BRL",
      completedAt: new Date(`${lastDay}T23:59:59.999Z`),
      metadata: { importResolution: "explicit", importId: "imp-1", totalPlatformCost: 7 },
    });
    assert.equal(lastDateOfPeriod(period), lastDay);
    assert.equal(lastDayOfPeriod(period).toISOString(), `${lastDay}T00:00:00.000Z`);
    const exact = await service.getAllocationSummary({ periodStart: firstDayOfPeriod(period), periodEnd: lastDayOfPeriod(period) });
    assert.equal(exact.coverage, "imported", period);
    assert.equal(exact.runId, run.id);
    // Controle: o fim no dia 1 do mês seguinte devolve `no_run` em silêncio (K1).
    const wrong = await service.getAllocationSummary({ periodStart: firstDayOfPeriod(period), periodEnd: firstDayOfNextPeriod(period) });
    assert.equal(wrong.coverage, "no_run", period);
  }
  assert.throws(() => lastDayOfPeriod("2026-13"), /invalid_period/);
});

test("T-GLB-1 · a plataforma é linha própria (DONO 31/10): 50.00 da plataforma, 25.00 não rateado, e a organização da plataforma não é linha", () => {
  const input = overviewInput({
    summary: summary({
      currency: "USD",
      totalImportedCost: 16.000001,
      totalAllocatedCost: 1,
      totalUnallocatedCost: 5,
      totalPlatformCost: 10,
      roundingResidualCost: 0.000001,
      unallocatedByReason: [{ reason: "no_allocation_rule", unallocatedCost: 5 }],
      tenants: [tenantRow("a", 1)],
    }),
    fxRate: usdRate("5.000000"),
    tenants: [org("a"), org("p", "platform")],
    subscriptions: new Map([
      ["a", paying(100_000n)],
      ["p", notSubscribed("platform_organization")],
    ]),
  });
  const global = buildOverview({ ...input, groupBy: "global" });
  assert.equal(global.groupBy, "global");
  if (global.groupBy !== "global") return;
  assert.equal(global.global.platformOwnCost, "50.00");
  assert.equal(global.global.unallocatedOther, "25.00");
  assert.deepEqual(global.global.unallocatedByReason, [{ reason: "no_allocation_rule", cost: "25.00" }]);
  assert.equal(global.global.tenantsCost, "5.00");
  assert.equal(global.global.totalCost, "80.00");
  assert.equal(global.global.original.platformOwnCost, "10.000000");

  const byTenant = buildOverview(input);
  if (byTenant.groupBy !== "tenant") return assert.fail("visão por organização");
  assert.deepEqual(byTenant.lines.map((line) => line.tenantId), ["a"]);
});

test("T-GLB-2 · conservação em centavos: as 5 parcelas somam o custo total, exato, em 3 conjuntos de dados", () => {
  const datasets: ReadonlyArray<{ name: string; input: OverviewInput; expect?: (g: GlobalJson) => void }> = [
    {
      name: "3 × 0.004 USD a 1.000000",
      input: overviewInput({
        summary: summary({ currency: "USD", totalImportedCost: 0.012, totalAllocatedCost: 0.012, tenants: [tenantRow("a", 0.004), tenantRow("b", 0.004), tenantRow("c", 0.004)] }),
        fxRate: usdRate("1.000000"),
        tenants: [org("a"), org("b"), org("c")],
        subscriptions: new Map([["a", paying(1n)], ["b", paying(1n)], ["c", paying(1n)]]),
      }),
      expect: (g) => {
        assert.equal(g.tenantsCost, "0.00");
        assert.equal(g.totalCost, "0.01");
        assert.equal(g.conversionResidualCost, "0.01");
      },
    },
    {
      name: "7 × 1.235 BRL, plataforma e não rateado de meio centavo",
      input: overviewInput({
        summary: summary({
          currency: "BRL",
          totalImportedCost: 8.655,
          totalAllocatedCost: 8.645,
          totalPlatformCost: 0.005,
          totalUnallocatedCost: 0.005,
          unallocatedByReason: [{ reason: "no_allocation_rule", unallocatedCost: 0.005 }],
          tenants: ["a", "b", "c", "d", "e", "f", "g"].map((id) => tenantRow(id, 1.235)),
        }),
        tenants: ["a", "b", "c", "d", "e", "f", "g"].map((id) => org(id)),
        subscriptions: new Map(["a", "b", "c", "d", "e", "f", "g"].map((id) => [id, paying(500n)] as const)),
      }),
      expect: (g) => assert.equal(g.conversionResidualCost, "-0.04"),
    },
    {
      name: "USD a 5.432100 com resíduo de arredondamento negativo",
      input: overviewInput({
        summary: summary({
          currency: "USD",
          totalImportedCost: 2.611108,
          totalAllocatedCost: 0.999999,
          totalPlatformCost: 1.111111,
          totalUnallocatedCost: 0.5,
          roundingResidualCost: -0.000002,
          unallocatedByReason: [{ reason: "no_allocation_rule", unallocatedCost: 0.5 }],
          tenants: [tenantRow("a", 0.333333), tenantRow("b", 0.333333), tenantRow("c", 0.333333)],
        }),
        fxRate: usdRate("5.432100"),
        tenants: [org("a"), org("b"), org("c")],
        subscriptions: new Map([["a", paying(1n)], ["b", paying(1n)], ["c", paying(1n)]]),
      }),
    },
  ];
  for (const { name, input, expect } of datasets) {
    const data = buildOverview({ ...input, groupBy: "global" });
    if (data.groupBy !== "global") return assert.fail(name);
    const g = data.global;
    const parts = [g.tenantsCost, g.platformOwnCost, g.unallocatedOther, g.roundingResidualCost, g.conversionResidualCost].map(toCents);
    assert.equal(parts.reduce((a, x) => a + x, 0n), toCents(g.totalCost), name);
    assert.notEqual(g.conversionResidualCost, null, name);
    expect?.(g);
  }
});

test("T-GLB-3 · margem global = assinaturas − todo o custo que a plataforma paga (300.00 − 150.00 = 150.00)", () => {
  const data = buildOverview(
    overviewInput({
      groupBy: "global",
      summary: summary({ currency: "BRL", totalImportedCost: 150, totalAllocatedCost: 100, totalPlatformCost: 50, tenants: [tenantRow("a", 60), tenantRow("b", 40)] }),
      tenants: [org("a"), org("b"), org("c")],
      subscriptions: new Map([["a", paying(10_000n)], ["b", paying(10_000n)], ["c", paying(10_000n)]]),
    }),
  );
  if (data.groupBy !== "global") return assert.fail("visão global");
  assert.equal(data.global.subscriptionTotal, "300.00");
  assert.equal(data.global.tenantsCost, "100.00");
  assert.equal(data.global.totalCost, "150.00");
  assert.equal(data.global.margin, "150.00");
  assert.equal(data.global.marginPct, "50.00");
  assert.equal(data.global.alert, "none");
});

test("T-FX-7 · sem taxa: TODO agregado em reais é null nas 3 visões (linha, grupo, totals, global); assinaturas e originais ficam", () => {
  const tenantView = buildOverview(threeOrgsInput({ groupBy: "tenant" }));
  const groupView = buildOverview(threeOrgsInput({ groupBy: "group" }));
  const globalView = buildOverview(threeOrgsInput({ groupBy: "global" }));
  for (const view of [tenantView, groupView, globalView]) assert.equal(view.cost.status, "fx_missing", view.groupBy);

  for (const pathText of LINE_NULL_PATHS) {
    assertNullAt(tenantView, pathText);
    assertNullAt(groupView, pathText);
  }
  for (const pathText of GLOBAL_NULL_PATHS) assertNullAt(globalView, pathText);

  if (tenantView.groupBy !== "tenant" || groupView.groupBy !== "group" || globalView.groupBy !== "global") return assert.fail("visões");
  assert.ok(tenantView.lines.every((line) => line.alert === "cost_missing" && line.subscriptionAmount === "1000.00"));
  assert.equal(tenantView.totals.subscriptionAmount, "3000.00");
  assert.deepEqual(
    groupView.lines.map((line) => [line.groupName, line.subscriptionAmount, line.alert]),
    [["Grupo 1", "2000.00", "cost_missing"], [null, "1000.00", null]],
  );
  assert.equal(globalView.global.alert, "cost_missing");
  assert.equal(globalView.global.subscriptionTotal, "3000.00");
  assert.equal(globalView.global.original.platformOwnCost, "10.000000");
  assert.equal(globalView.global.original.currency, "USD");
  assert.equal(globalView.global.original.totalImportedCost, "105.000001");
  assert.equal(tenantView.lines[0]!.allocatedCostOriginal, "20.000000");
});

test("T-FX-8 · no_run e currency_unknown no global: os mesmos null, e os originais também (moeda null)", () => {
  const noRun = buildOverview(
    threeOrgsInput({
      groupBy: "global",
      summary: summary({ coverage: "no_run", runId: null, importId: null, importResolution: null, currency: undefined }),
      fxRate: usdRate("5.400000"),
    }),
  );
  const unknown = buildOverview(
    threeOrgsInput({
      groupBy: "global",
      summary: summary({
        currency: undefined,
        totalImportedCost: 90,
        totalAllocatedCost: 90,
        unallocatedByReason: [{ reason: "no_allocation_rule", unallocatedCost: 0 }],
        tenants: [tenantRow("a", 20), tenantRow("b", 30), tenantRow("c", 40)],
      }),
      fxRate: usdRate("5.400000"),
    }),
  );
  assert.equal(noRun.cost.status, "no_run");
  assert.equal(unknown.cost.status, "currency_unknown");
  for (const view of [noRun, unknown]) {
    for (const pathText of GLOBAL_NULL_PATHS.filter((p) => !p.includes("unallocatedByReason") || view === unknown)) {
      assertNullAt(view, pathText);
    }
    if (view.groupBy !== "global") return assert.fail("visão global");
    assert.deepEqual(view.global.original, {
      currency: null,
      tenantsCost: null,
      platformOwnCost: null,
      unallocatedOther: null,
      roundingResidualCost: null,
      totalImportedCost: null,
    });
    assert.equal(view.global.alert, "cost_missing");
    assert.equal(view.global.subscriptionTotal, "3000.00");
    assert.equal(view.cost.fxRate, null);
  }
  for (const groupBy of ["tenant", "group"] as const) {
    const view = buildOverview(threeOrgsInput({ groupBy, summary: summary({ coverage: "no_run", runId: null, importId: null, importResolution: null, currency: undefined }) }));
    for (const pathText of LINE_NULL_PATHS) assertNullAt(view, pathText);
  }
});

function memberLine(tenantId: string, costCents: bigint | null, subscriptionCents: bigint | null): TenantLine {
  return {
    tenantId,
    tenantName: `Organização ${tenantId.toUpperCase()}`,
    groupId: "g1",
    groupName: "Grupo 1",
    subscriptionCents,
    statementTotalCents: subscriptionCents,
    creditsAppliedCents: subscriptionCents === null ? null : 0n,
    subscriptionSource: subscriptionCents === null ? "none" : "statement",
    subscriptionSkipReason: subscriptionCents === null ? "no_subscription" : null,
    estimate: false,
    costMicro: costCents === null ? null : costCents * 10_000n,
    costCents,
    marginCents: subOrNull(subscriptionCents, costCents),
    marginPct: null,
    alert: alertFor(subscriptionCents, costCents),
  };
}

test("T-FX-9 · grupo com membro sem custo falha fechado, mesmo com outro membro com custo (Emenda 1 §3)", () => {
  const g1 = { groupId: "g1", groupName: "Grupo 1" };
  const a = memberLine("a", 30_000n, 100_000n);
  // (a) B sem custo (como em `no_run` ou `fx_missing`), com e sem assinatura.
  for (const b of [memberLine("b", null, 100_000n), memberLine("b", null, null)]) {
    const line = groupLineOf(g1, [a, b]);
    assert.equal(line.allocatedCost, null);
    assert.equal(line.margin, null);
    assert.equal(line.marginPct, null);
    assert.equal(line.alert, "cost_missing");
    assert.equal(line.subscriptionAmount, b.subscriptionCents === null ? 100_000n : 200_000n);
  }
  // (b) os totais também.
  const totals = totalsOf([a, memberLine("b", null, 100_000n)]);
  assert.equal(totals.allocatedCost, null);
  assert.equal(totals.margin, null);
  assert.equal(totals.marginPct, null);
  // (c) controle positivo: os dois com custo.
  const ok = groupLineOf(g1, [a, memberLine("a2", 20_000n, 100_000n)]);
  assert.equal(ok.allocatedCost, 50_000n);
  assert.equal(ok.margin, 150_000n);
  assert.equal(ok.marginPct, "75.00");
  assert.equal(ok.alert, "none");
});

test("T-H13-1 · vários arquivos no mês: aviso e fontes à vista, e o valor é o da importação publicada (nunca a soma)", async () => {
  const repository = new InMemoryCloudCostAllocationRepository();
  const service = new CloudCostAllocationService(repository);
  const completed = async (importId: string, total: number, start: string, end: string) => {
    const run = await repository.createRun({ periodStart: new Date(start), periodEnd: new Date(end), metadata: {} });
    await repository.updateRun(run.id, {
      status: "completed",
      totalImportedCost: total,
      totalAllocatedCost: 0,
      totalUnallocatedCost: 0,
      currency: "BRL",
      completedAt: new Date(end),
      metadata: { importResolution: "explicit", importId, totalPlatformCost: total },
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
  };
  await completed("imp-1", 10, "2026-10-01T00:00:00.000Z", "2026-10-31T23:59:59.999Z");
  await completed("imp-2", 12, "2026-10-01T00:00:00.000Z", "2026-10-31T23:59:59.999Z");
  // Uma run que só TOCA outubro (31/10 a 30/11) não conta.
  await completed("imp-3", 99, "2026-10-31T00:00:00.000Z", "2026-11-30T23:59:59.999Z");

  const window = { periodStart: firstDayOfPeriod("2026-10"), periodEnd: lastDayOfPeriod("2026-10") };
  const summaryOfMonth = await service.getAllocationSummary(window);
  const runs = await service.listAllocationRuns({ ...window, status: "completed" });
  assert.equal(runs.length, 3);
  const data = buildOverview(
    overviewInput({ groupBy: "global", summary: summaryOfMonth, runs, tenants: [org("a")], subscriptions: new Map([["a", paying(100_000n)]]) }),
  );
  assert.deepEqual(data.cost.warnings, ["multiple_imports_in_month"]);
  assert.deepEqual(data.cost.sources, { runs: 2, importIds: ["imp-1", "imp-2"], usedImportId: "imp-2" });
  if (data.groupBy !== "global") return assert.fail("visão global");
  assert.equal(data.global.totalCost, "12.00");
  assert.equal(data.global.original.totalImportedCost, "12.000000");
  assert.equal(data.global.platformOwnCost, "12.00");

  // Controle: um arquivo só no mês → sem aviso.
  const single = costSourcesOf("2026-10", runs.filter((run) => run.metadata.importId !== "imp-1"), "imp-2");
  assert.deepEqual(single.warnings, []);
  assert.equal(single.sources.runs, 1);
});

test("F2 apoio · entrada incoerente falha fechado: organização do rateio fora da lista, assinatura ou grupo faltando", () => {
  const base = threeOrgsInput({ fxRate: usdRate("5.400000") });
  assert.throws(() => buildOverview({ ...base, tenants: [org("a"), org("b")] }), /tenant_list_incomplete/);
  assert.throws(() => buildOverview({ ...base, subscriptions: new Map([["a", paying(1n)], ["b", paying(1n)]]) }), /subscription_missing/);
  assert.throws(() => buildOverview({ ...base, groups: [] }), /group_unknown/);
  // Com a entrada coerente, a resposta sai e as linhas vêm por nome.
  const data = buildOverview(base);
  if (data.groupBy !== "tenant") return assert.fail("visão por organização");
  assert.deepEqual(data.lines.map((line) => line.tenantId), ["a", "b", "c"]);
  assert.deepEqual(data.lines.map((line) => line.groupId), ["g1", "g1", null]);
  assert.equal(data.generatedAt, GENERATED_AT.toISOString());
});
