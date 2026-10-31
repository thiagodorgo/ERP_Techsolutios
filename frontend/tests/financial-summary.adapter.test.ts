import assert from "node:assert/strict";
import test from "node:test";

import { adaptFinancialSummaryResponse } from "../src/modules/finance/dashboard/financial-summary.adapter";

// Ω4-8b + B-SAN3-12c/R-P2 — o adapter lê snake/camel, mas um agregado monetário incompleto não pode virar
// um sucesso zerado. Zero explícito continua sendo dado válido.

const COMPLETE = {
  receivable: { openAmount: 2500, openCount: 3, overdueAmount: 500, overdueCount: 1, inDisputeCount: 0 },
  payable: { openAmount: 800, openCount: 2, overdueAmount: 0, overdueCount: 0, inDisputeCount: 1 },
  settledThisMonth: { competencia: "2026-07", inflow: 400, outflow: 120 },
  cash: { totalBalance: 1400, accountCount: 2, currency: "BRL" },
  cheques: {
    pendingReceivedCount: 1,
    pendingReceivedAmount: 700,
    pendingIssuedCount: 0,
    pendingIssuedAmount: 0,
    linkedPendingCount: 1,
    linkedPendingAmount: 700,
  },
  cashFlow: [{ competencia: "2026-06", inflow: 300, outflow: 100 }],
  recentTitles: [{ id: "t1", direction: "receivable", partyName: "Cliente Alfa", amount: 2500, openAmount: 2500, dueDate: "2026-09-10", status: "open", overdue: false }],
};

test("adapter: envelope { data } camelCase → agregados corretos", () => {
  const s = adaptFinancialSummaryResponse(
    {
      data: COMPLETE,
    },
    "api",
  );
  assert.equal(s.source, "api");
  assert.equal(s.receivable.openAmount, 2500);
  assert.equal(s.payable.inDisputeCount, 1);
  assert.equal(s.cash.totalBalance, 1400);
  assert.equal(s.cheques.pendingReceivedAmount, 700);
  assert.equal(s.cashFlow[0]?.inflow, 300);
  assert.equal(s.recentTitles[0]?.partyName, "Cliente Alfa");
  assert.equal(s.recentTitles[0]?.overdue, false);
});

test("adapter: snake_case também é lido (leitura defensiva)", () => {
  const s = adaptFinancialSummaryResponse(
    {
      data: {
        receivable: { open_amount: 100, open_count: 1, overdue_amount: 100, overdue_count: 1, in_dispute_count: 0 },
        payable: { open_amount: 0, open_count: 0, overdue_amount: 0, overdue_count: 0, in_dispute_count: 0 },
        settled_this_month: { competencia: "2026-07", inflow: 0, outflow: 0 },
        cash: { total_balance: 50, account_count: 1, currency: "BRL" },
        cheques: { pending_received_count: 2, pending_received_amount: 300, pending_issued_count: 0, pending_issued_amount: 0, linked_pending_count: 1, linked_pending_amount: 100 },
        cash_flow: [],
        recent_titles: [{ id: "t2", direction: "payable", party_name: "Fornecedor Delta", amount: 800, open_amount: 800, due_date: "2026-08-01", status: "scheduled", overdue: false }],
      },
    },
    "api",
  );
  assert.equal(s.receivable.openAmount, 100);
  assert.equal(s.receivable.overdueAmount, 100);
  assert.equal(s.cash.totalBalance, 50);
  assert.equal(s.cheques.pendingReceivedCount, 2);
  assert.equal(s.recentTitles[0]?.partyName, "Fornecedor Delta");
});

test("adapter: payload ausente → fallback com motivo seguro", () => {
  const s = adaptFinancialSummaryResponse(null, "api");
  assert.equal(s.source, "fallback");
  assert.match(s.fallbackReason ?? "", /Resumo financeiro indisponível/);
  assert.equal(s.receivable.openAmount, 0);
  assert.equal(s.payable.openAmount, 0);
  assert.equal(s.cash.totalBalance, 0);
  assert.equal(s.cheques.pendingReceivedCount, 0);
  assert.equal(s.cashFlow.length, 0);
  assert.equal(s.recentTitles.length, 0);
});

test("adapter: status/direction fora do enum são NORMALIZADOS (chip/label nunca quebra o render)", () => {
  const s = adaptFinancialSummaryResponse(
    { data: { ...COMPLETE, recentTitles: [{ id: "t9", direction: "weird", partyName: "X", amount: 10, openAmount: 10, dueDate: "2026-08-01", status: "bogus_status", overdue: false }] } },
    "api",
  );
  assert.equal(s.recentTitles[0]?.status, "open"); // fallback seguro
  assert.equal(s.recentTitles[0]?.direction, "receivable"); // fallback seguro
});

test("adapter: campo numérico ausente invalida o resumo inteiro", () => {
  const { totalBalance: _missing, ...cash } = COMPLETE.cash;
  const s = adaptFinancialSummaryResponse({ data: { ...COMPLETE, cash } }, "api");
  assert.equal(s.source, "fallback");
  assert.match(s.fallbackReason ?? "", /cash\.totalBalance/);
});

test("adapter: null em campo numérico invalida o resumo inteiro", () => {
  const s = adaptFinancialSummaryResponse({ data: { ...COMPLETE, cash: { ...COMPLETE.cash, totalBalance: null } } }, "api");
  assert.equal(s.source, "fallback");
});

test("adapter: string numérica não é convertida silenciosamente", () => {
  const s = adaptFinancialSummaryResponse({ data: { ...COMPLETE, cash: { ...COMPLETE.cash, totalBalance: "1400" } } }, "api");
  assert.equal(s.source, "fallback");
});

test("adapter: NaN invalida o resumo inteiro", () => {
  const s = adaptFinancialSummaryResponse({ data: { ...COMPLETE, cash: { ...COMPLETE.cash, totalBalance: Number.NaN } } }, "api");
  assert.equal(s.source, "fallback");
});

test("adapter: Infinity invalida o resumo inteiro", () => {
  const s = adaptFinancialSummaryResponse({ data: { ...COMPLETE, cash: { ...COMPLETE.cash, totalBalance: Number.POSITIVE_INFINITY } } }, "api");
  assert.equal(s.source, "fallback");
});

test("adapter: zero explícito continua legítimo", () => {
  const s = adaptFinancialSummaryResponse({ data: { ...COMPLETE, cash: { ...COMPLETE.cash, totalBalance: 0 } } }, "api");
  assert.equal(s.source, "api");
  assert.equal(s.cash.totalBalance, 0);
});

test("adapter: linkedPending ausente invalida em vez de fabricar zero", () => {
  const { linkedPendingAmount: _missing, ...cheques } = COMPLETE.cheques;
  const s = adaptFinancialSummaryResponse({ data: { ...COMPLETE, cheques } }, "api");
  assert.equal(s.source, "fallback");
  assert.match(s.fallbackReason ?? "", /cheques\.linkedPendingAmount/);
});

test("adapter: coleções vazias presentes são válidas", () => {
  const s = adaptFinancialSummaryResponse({ data: { ...COMPLETE, cashFlow: [], recentTitles: [] } }, "api");
  assert.equal(s.source, "api");
  assert.deepEqual(s.cashFlow, []);
  assert.deepEqual(s.recentTitles, []);
});

test("adapter: coleção ausente invalida o resumo inteiro", () => {
  const { cashFlow: _missing, ...withoutSeries } = COMPLETE;
  const s = adaptFinancialSummaryResponse({ data: withoutSeries }, "api");
  assert.equal(s.source, "fallback");
  assert.match(s.fallbackReason ?? "", /cashFlow/);
});

test("adapter: número inválido dentro da série invalida o resumo inteiro", () => {
  const s = adaptFinancialSummaryResponse({ data: { ...COMPLETE, cashFlow: [{ competencia: "2026-06", inflow: 300, outflow: null }] } }, "api");
  assert.equal(s.source, "fallback");
  assert.match(s.fallbackReason ?? "", /cashFlow\[0\]\.outflow/);
});
