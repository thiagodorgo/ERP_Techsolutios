import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  createMemoryFinancialAccountService,
  resetFinancialAccountRuntimeForTests,
} from "../src/modules/financial-accounts/financial-account.service.js";
import {
  createMemoryFinancialTitleService,
  deriveCompetencia,
  resetFinancialTitleRuntimeForTests,
} from "../src/modules/financial-titles/index.js";
import {
  createMemoryFinancialEntryService,
  resetFinancialEntryRuntimeForTests,
} from "../src/modules/financial-entries/index.js";
import {
  createMemoryChequeService,
  resetChequeRuntimeForTests,
} from "../src/modules/cheques/index.js";
import {
  cashFlowCompetencias,
  computeFinancialSummary,
  createMemoryFinancialSummaryService,
  resetFinancialSummaryRuntimeForTests,
  type ChequeRow,
  type EntryRow,
  type TitleRow,
} from "../src/modules/financial-summary/index.js";

const NOW = new Date("2026-07-15T12:00:00-03:00"); // referência fixa (competência corrente 2026-07)

function title(overrides: Partial<TitleRow> = {}): TitleRow {
  return {
    id: randomUUID(),
    direction: "receivable",
    status: "open",
    amount: 1000,
    paidAmount: 0,
    dueDate: new Date("2026-08-10T00:00:00-03:00"), // futuro (não vencido)
    partyName: "Cliente Alfa",
    createdAt: new Date("2026-07-10T00:00:00-03:00"),
    ...overrides,
  };
}

// -------------------------------------------------------------- compute PURO (money rules)

test("compute: receivable aberto exclui paid/cancelled; openAmount = amount − paidAmount", () => {
  const s = computeFinancialSummary({
    titles: [
      title({ amount: 1000, paidAmount: 0, status: "open" }),
      title({ amount: 500, paidAmount: 200, status: "partially_paid" }), // aberto 300
      title({ amount: 800, paidAmount: 800, status: "paid" }), // NÃO conta
      title({ amount: 999, paidAmount: 0, status: "cancelled" }), // NÃO conta
      title({ amount: 400, paidAmount: 0, status: "in_dispute" }), // aberto + disputa
    ],
    entries: [],
    cheques: [],
    accounts: [],
    currency: "BRL",
    now: NOW,
  });
  assert.equal(s.receivable.openAmount, 1700); // 1000 + 300 + 400
  assert.equal(s.receivable.openCount, 3);
  assert.equal(s.receivable.inDisputeCount, 1);
  assert.equal(s.receivable.overdueAmount, 0); // todos futuros
});

test("compute: vencido = aberto E due_date < now", () => {
  const s = computeFinancialSummary({
    titles: [
      title({ amount: 1000, dueDate: new Date("2026-06-01T00:00:00-03:00") }), // vencido
      title({ amount: 500, dueDate: new Date("2026-09-01T00:00:00-03:00") }), // futuro
      title({ amount: 700, status: "paid", dueDate: new Date("2026-06-01T00:00:00-03:00") }), // vencido mas PAGO → não conta
    ],
    entries: [],
    cheques: [],
    accounts: [],
    currency: "BRL",
    now: NOW,
  });
  assert.equal(s.receivable.overdueAmount, 1000);
  assert.equal(s.receivable.overdueCount, 1);
  assert.equal(s.receivable.openAmount, 1500);
});

test("compute: payable agregado independente do receivable", () => {
  const s = computeFinancialSummary({
    titles: [
      title({ direction: "receivable", amount: 1000 }),
      title({ direction: "payable", amount: 600 }),
      title({ direction: "payable", amount: 400, status: "cancelled" }),
    ],
    entries: [],
    cheques: [],
    accounts: [],
    currency: "BRL",
    now: NOW,
  });
  assert.equal(s.receivable.openAmount, 1000);
  assert.equal(s.payable.openAmount, 600);
  assert.equal(s.payable.openCount, 1);
});

test("compute: saldo de caixa = Σ(abertura + in − out) das contas ATIVAS", () => {
  const s = computeFinancialSummary({
    titles: [],
    entries: [],
    cheques: [],
    accounts: [
      { openingBalance: 1000, inflow: 500, outflow: 200 }, // 1300
      { openingBalance: 0, inflow: 100, outflow: 350 }, // -250
    ],
    currency: "BRL",
    now: NOW,
  });
  assert.equal(s.cash.totalBalance, 1050);
  assert.equal(s.cash.accountCount, 2);
});

test("compute: cheque pendente = registered+deposited (por direção); cleared/bounced/cancelled excluídos", () => {
  const cheques: ChequeRow[] = [
    { direction: "received", status: "registered", amount: 100 },
    { direction: "received", status: "deposited", amount: 200 },
    { direction: "received", status: "cleared", amount: 999 }, // não conta
    { direction: "issued", status: "registered", amount: 50 },
    { direction: "issued", status: "bounced", amount: 999 }, // não conta
    { direction: "issued", status: "cancelled", amount: 999 }, // não conta
  ];
  const s = computeFinancialSummary({ titles: [], entries: [], cheques, accounts: [], currency: "BRL", now: NOW });
  assert.equal(s.cheques.pendingReceivedCount, 2);
  assert.equal(s.cheques.pendingReceivedAmount, 300);
  assert.equal(s.cheques.pendingIssuedCount, 1);
  assert.equal(s.cheques.pendingIssuedAmount, 50);
});

test("compute: settledThisMonth = in/out da competência CORRENTE; cashFlow janela de 6 meses cronológica", () => {
  const entries: EntryRow[] = [
    { direction: "in", amount: 500, competencia: "2026-07" }, // corrente
    { direction: "out", amount: 120, competencia: "2026-07" },
    { direction: "in", amount: 300, competencia: "2026-06" }, // mês anterior
    { direction: "in", amount: 999, competencia: "2026-01" }, // fora da janela de 6 meses (fev-jul)
  ];
  const s = computeFinancialSummary({ titles: [], entries, cheques: [], accounts: [], currency: "BRL", now: NOW });
  assert.equal(s.settledThisMonth.competencia, "2026-07");
  assert.equal(s.settledThisMonth.inflow, 500);
  assert.equal(s.settledThisMonth.outflow, 120);
  assert.equal(s.cashFlow.length, 6);
  assert.deepEqual(
    s.cashFlow.map((p) => p.competencia),
    ["2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"],
  );
  assert.equal(s.cashFlow.at(-1)?.inflow, 500);
  assert.equal(s.cashFlow.find((p) => p.competencia === "2026-06")?.inflow, 300);
  assert.equal(s.cashFlow.find((p) => p.competencia === "2026-01"), undefined); // fora da janela
});

test("compute: recentTitles — abertos primeiro, mais recentes, limite 6, flag overdue + openAmount", () => {
  const titles: TitleRow[] = [
    title({ status: "paid", createdAt: new Date("2026-07-14T00:00:00-03:00") }), // pago vai depois dos abertos
    title({ status: "open", amount: 1000, paidAmount: 250, createdAt: new Date("2026-07-13T00:00:00-03:00"), dueDate: new Date("2026-06-01T00:00:00-03:00") }),
  ];
  const s = computeFinancialSummary({ titles, entries: [], cheques: [], accounts: [], currency: "BRL", now: NOW });
  assert.equal(s.recentTitles.length, 2);
  // o aberto vem antes do pago
  assert.equal(s.recentTitles[0]?.status, "open");
  assert.equal(s.recentTitles[0]?.openAmount, 750); // 1000 − 250
  assert.equal(s.recentTitles[0]?.overdue, true); // vencido
  assert.equal(s.recentTitles[1]?.status, "paid");
  assert.equal(s.recentTitles[1]?.openAmount, 0); // pago não tem "aberto"
});

test("compute: recentTitles respeita o limite de 6", () => {
  const titles = Array.from({ length: 10 }, (_, i) => title({ createdAt: new Date(`2026-07-${String(i + 1).padStart(2, "0")}T00:00:00-03:00`) }));
  const s = computeFinancialSummary({ titles, entries: [], cheques: [], accounts: [], currency: "BRL", now: NOW });
  assert.equal(s.recentTitles.length, 6);
});

test("cashFlowCompetencias: N competências terminando na corrente (fuso de negócio)", () => {
  assert.deepEqual(cashFlowCompetencias(new Date("2026-07-15T12:00:00-03:00"), 3), ["2026-05", "2026-06", "2026-07"]);
  // vira o ano corretamente
  assert.deepEqual(cashFlowCompetencias(new Date("2026-02-10T12:00:00-03:00"), 3), ["2025-12", "2026-01", "2026-02"]);
});

// REGRESSÃO da ALTA da junta: virada de mês em HORÁRIO BR (00:00–02:59Z do dia 1 = fim do mês anterior BRT). A
// janela DEVE terminar na competência de NEGÓCIO (deriveCompetencia(now)), não no mês UTC — inclusive virando o ano.
test("cashFlowCompetencias: âncora é a competência de NEGÓCIO na virada de mês BR (não o mês UTC)", () => {
  // 2026-01-01T01:30Z = 2025-12-31 22:30 BRT → competência de negócio 2025-12 (não 2026-01).
  const rollover = new Date("2026-01-01T01:30:00Z");
  assert.equal(deriveCompetencia(rollover), "2025-12");
  const window = cashFlowCompetencias(rollover, 6);
  assert.equal(window.at(-1), "2025-12", "o bucket terminal bate com a competência corrente de negócio");
  assert.deepEqual(window, ["2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12"]);
  // 2026-03-01T02:00Z = 2026-02-28 23:00 BRT → negócio 2026-02.
  assert.equal(cashFlowCompetencias(new Date("2026-03-01T02:00:00Z"), 2).at(-1), "2026-02");
});

// -------------------------------------------------------------- integração via serviço InMemory

function resetAll(): void {
  resetFinancialSummaryRuntimeForTests();
  resetChequeRuntimeForTests();
  resetFinancialEntryRuntimeForTests();
  resetFinancialAccountRuntimeForTests();
  resetFinancialTitleRuntimeForTests();
}

function actor(tenantId = randomUUID()) {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["finance" as const],
    permissions: [
      "financial_titles:read",
      "financial_titles:create",
      "financial_entries:read",
      "financial_entries:create",
      "financial_accounts:read",
      "financial_accounts:create",
      "cheques:read",
      "cheques:create",
    ] as const,
  };
}

test("serviço: tenant vazio → agregados zerados", async () => {
  resetAll();
  const summary = createMemoryFinancialSummaryService();
  const s = await summary.getSummary(actor());
  assert.equal(s.receivable.openAmount, 0);
  assert.equal(s.payable.openAmount, 0);
  assert.equal(s.cash.totalBalance, 0);
  assert.equal(s.cheques.pendingReceivedCount, 0);
  assert.equal(s.recentTitles.length, 0);
  assert.equal(s.cashFlow.length, 6);
});

test("serviço: agrega título + conta + lançamento + cheque REAIS do tenant e ISOLA cross-tenant", async () => {
  resetAll();
  const ctx = actor();
  const titles = createMemoryFinancialTitleService();
  const accounts = createMemoryFinancialAccountService();
  const entries = createMemoryFinancialEntryService();
  const cheques = createMemoryChequeService();
  const summary = createMemoryFinancialSummaryService();

  const account = await accounts.create(ctx, { name: `Caixa ${randomUUID()}`, opening_balance: 1000 });
  await titles.create(ctx, { direction: "receivable", party_type: "customer", party_name: "Cliente Alfa", amount: 2500, due_date: "2026-09-10", issue_date: "2026-07-10" });
  await entries.create(ctx, { account_id: account.id, direction: "in", amount: 400, payment_method: "pix" }); // now → competência corrente
  await cheques.create(ctx, { direction: "received", cheque_number: "1", bank: "B", amount: 700, account_id: account.id });

  const s = await summary.getSummary(ctx);
  assert.equal(s.receivable.openAmount, 2500);
  assert.equal(s.receivable.openCount, 1);
  assert.equal(s.cash.totalBalance, 1400); // 1000 abertura + 400 in
  assert.equal(s.settledThisMonth.inflow, 400);
  assert.equal(s.cheques.pendingReceivedCount, 1);
  assert.equal(s.cheques.pendingReceivedAmount, 700);
  assert.equal(s.recentTitles.length, 1);
  assert.equal(s.recentTitles[0]?.partyName, "Cliente Alfa");

  // outro tenant não enxerga nada
  const otherSummary = await summary.getSummary(actor());
  assert.equal(otherSummary.receivable.openAmount, 0);
  assert.equal(otherSummary.cash.totalBalance, 0);
  assert.equal(otherSummary.cheques.pendingReceivedCount, 0);
});

test("serviço: competência corrente do settledThisMonth = deriveCompetencia(now)", async () => {
  resetAll();
  const summary = createMemoryFinancialSummaryService();
  const s = await summary.getSummary(actor());
  assert.equal(s.settledThisMonth.competencia, deriveCompetencia(new Date()));
});
