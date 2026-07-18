import assert from "node:assert/strict";
import test from "node:test";

import { adaptFinancialSummaryResponse } from "../src/modules/finance/dashboard/financial-summary.adapter";

// Ω4-8b — o adapter lê o envelope { data } defensivamente (snake/camel), tolera ausência → 0/"" (o front nunca
// inventa número) e preserva o `source`.

test("adapter: envelope { data } camelCase → agregados corretos", () => {
  const s = adaptFinancialSummaryResponse(
    {
      data: {
        receivable: { openAmount: 2500, openCount: 3, overdueAmount: 500, overdueCount: 1, inDisputeCount: 0 },
        payable: { openAmount: 800, openCount: 2, overdueAmount: 0, overdueCount: 0, inDisputeCount: 1 },
        settledThisMonth: { competencia: "2026-07", inflow: 400, outflow: 120 },
        cash: { totalBalance: 1400, accountCount: 2, currency: "BRL" },
        cheques: { pendingReceivedCount: 1, pendingReceivedAmount: 700, pendingIssuedCount: 0, pendingIssuedAmount: 0 },
        cashFlow: [{ competencia: "2026-06", inflow: 300, outflow: 100 }],
        recentTitles: [{ id: "t1", direction: "receivable", partyName: "Cliente Alfa", amount: 2500, openAmount: 2500, dueDate: "2026-09-10", status: "open", overdue: false }],
      },
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
        cash: { total_balance: 50, account_count: 1, currency: "BRL" },
        cheques: { pending_received_count: 2, pending_received_amount: 300, pending_issued_count: 0, pending_issued_amount: 0 },
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

test("adapter: payload ausente/vazio → tudo ZERO (front nunca inventa)", () => {
  const s = adaptFinancialSummaryResponse(null, "fallback");
  assert.equal(s.source, "fallback");
  assert.equal(s.receivable.openAmount, 0);
  assert.equal(s.payable.openAmount, 0);
  assert.equal(s.cash.totalBalance, 0);
  assert.equal(s.cheques.pendingReceivedCount, 0);
  assert.equal(s.cashFlow.length, 0);
  assert.equal(s.recentTitles.length, 0);
});

test("adapter: campos parciais não derrubam o resto (default 0/\"\")", () => {
  const s = adaptFinancialSummaryResponse({ data: { receivable: { openAmount: 10 } } }, "api");
  assert.equal(s.receivable.openAmount, 10);
  assert.equal(s.receivable.openCount, 0);
  assert.equal(s.cash.currency, "BRL");
  assert.equal(s.settledThisMonth.competencia, "");
});
