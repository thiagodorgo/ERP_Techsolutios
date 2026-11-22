// B-GRUPO-GESTOR (1a, F1) — MON e VAR: o dinheiro do grupo, somado em centavos inteiros pela máquina do repositório.
import assert from "node:assert/strict";
import test from "node:test";

import type { FinancialSummary } from "../src/modules/financial-summary/financial-summary.types.js";
import { consolidate, fromCents, sumMoney, toCents, variationPct } from "../src/modules/group-panel/group-panel.money.js";

type Parts = {
  readonly receivable?: number;
  readonly payable?: number;
  readonly overdue?: number;
  readonly cash?: number;
  readonly inflow?: number;
  readonly outflow?: number;
  readonly flow?: readonly [string, number, number][];
  readonly currency?: string;
};

function summaryOf(parts: Parts = {}): FinancialSummary {
  const flow = parts.flow ?? [
    ["2026-10", 0, 0],
    ["2026-11", parts.inflow ?? 0, parts.outflow ?? 0],
  ];
  return {
    receivable: { openAmount: parts.receivable ?? 0, openCount: parts.receivable ? 1 : 0, overdueAmount: parts.overdue ?? 0, overdueCount: parts.overdue ? 1 : 0, inDisputeCount: 0 },
    payable: { openAmount: parts.payable ?? 0, openCount: parts.payable ? 1 : 0, overdueAmount: 0, overdueCount: 0, inDisputeCount: 0 },
    settledThisMonth: { competencia: "2026-11", inflow: parts.inflow ?? 0, outflow: parts.outflow ?? 0 },
    cash: { totalBalance: parts.cash ?? 0, accountCount: 1, currency: parts.currency ?? "BRL" },
    cheques: { pendingReceivedCount: 0, pendingReceivedAmount: 0, pendingIssuedCount: 0, pendingIssuedAmount: 0, linkedPendingCount: 0, linkedPendingAmount: 0 },
    cashFlow: flow.map(([competencia, inflow, outflow]) => ({ competencia, inflow, outflow })),
    recentTitles: [],
  };
}

test("MON-1: a conversão dá centavos INTEIROS mesmo onde valor × 100 não é inteiro em ponto flutuante", () => {
  // 1,15 × 100 = 114,99999999999999 e 0,29 × 100 = 28,999999999999996 em IEEE-754.
  for (const [value, cents] of [
    [1.15, 115],
    [0.29, 29],
    [0.1, 10],
    [0.7, 70],
    [1234.56, 123456],
    [-0.29, -29],
  ] as const) {
    assert.ok(Number.isInteger(toCents(value)), `${value} não deu centavo inteiro`);
    assert.equal(toCents(value), cents);
  }
  assert.equal(fromCents(115 + 29), 1.44);
  assert.equal(sumMoney([0.1, 0.2, 0.7]), 1, "0,10 + 0,20 + 0,70 = 1,00, sem resto de ponto flutuante");
  const grupo = consolidate([summaryOf({ receivable: 1.15 }), summaryOf({ receivable: 0.29 })]);
  assert.equal(grupo.receivableOpen, 1.44);
});

test("MON-2: propriedade — 200 sorteios de 3 a 10 pátios: o total do grupo é a soma dos pátios, ao centavo", () => {
  let seed = 20261122;
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let draw = 0; draw < 200; draw += 1) {
    const patios = 3 + Math.floor(next() * 8);
    const cents = Array.from({ length: patios }, () => Math.floor(next() * 10_000_000) - 1_000_000);
    const summaries = cents.map((value) =>
      summaryOf({ receivable: value / 100, payable: value / 200, cash: value / 100, inflow: Math.abs(value) / 100, outflow: Math.abs(value) / 300 }),
    );
    const grupo = consolidate(summaries);
    const expected = (pick: (s: FinancialSummary) => number) => summaries.reduce((total, s) => total + toCents(pick(s)), 0);
    assert.equal(toCents(grupo.receivableOpen), expected((s) => s.receivable.openAmount), `sorteio ${draw}: a receber`);
    assert.equal(toCents(grupo.payableOpen), expected((s) => s.payable.openAmount), `sorteio ${draw}: a pagar`);
    assert.equal(toCents(grupo.cashBalance), expected((s) => s.cash.totalBalance), `sorteio ${draw}: caixa`);
    assert.equal(toCents(grupo.receivedThisMonth), expected((s) => s.settledThisMonth.inflow), `sorteio ${draw}: recebido`);
    assert.equal(toCents(grupo.paidThisMonth), expected((s) => s.settledThisMonth.outflow), `sorteio ${draw}: pago`);
    assert.equal(grupo.accountCount, patios);
  }
});

test("MON-6: contagens e fluxo de 6 meses somados por competência", () => {
  const flow: [string, number, number][] = [
    ["2026-06", 1, 2],
    ["2026-07", 0, 0],
    ["2026-08", 0.1, 0],
    ["2026-09", 0, 0.29],
    ["2026-10", 100, 50],
    ["2026-11", 1.15, 0.7],
  ];
  const grupo = consolidate([summaryOf({ receivable: 10, overdue: 5, flow }), summaryOf({ receivable: 20, flow })]);
  assert.equal(grupo.receivableOpenCount, 2);
  assert.equal(grupo.receivableOverdue, 5);
  assert.equal(grupo.receivableOverdueCount, 1);
  assert.deepEqual(
    grupo.cashFlow.map((point) => [point.competencia, point.inflow, point.outflow]),
    [
      ["2026-06", 2, 4],
      ["2026-07", 0, 0],
      ["2026-08", 0.2, 0],
      ["2026-09", 0, 0.58],
      ["2026-10", 200, 100],
      ["2026-11", 2.3, 1.4],
    ],
  );
  assert.equal(grupo.competencia, "2026-11");
});

test("VAR-1: a variação de recebido e de pago sai do cashFlow (mês corrente sobre o anterior, inteiro)", () => {
  assert.equal(variationPct(150, 100), 50);
  assert.equal(variationPct(50, 100), -50);
  assert.equal(variationPct(1.15, 1), 15);
  const grupo = consolidate([
    summaryOf({ flow: [["2026-10", 100, 40], ["2026-11", 120, 30]] }),
    summaryOf({ flow: [["2026-10", 100, 60], ["2026-11", 80, 90]] }),
  ]);
  assert.equal(grupo.receivedVariationPct, 0, "(200 − 200) / 200");
  assert.equal(grupo.paidVariationPct, 20, "(120 − 100) / 100");
});

test("VAR-2: mês anterior zero dá variação nula (nunca infinito nem NaN)", () => {
  assert.equal(variationPct(10, 0), null);
  const grupo = consolidate([summaryOf({ flow: [["2026-10", 0, 0], ["2026-11", 10, 5]] })]);
  assert.equal(grupo.receivedVariationPct, null);
  assert.equal(grupo.paidVariationPct, null);
  assert.equal(consolidate([summaryOf({ flow: [["2026-11", 10, 5]] })]).receivedVariationPct, null, "um mês só: nulo");
});
