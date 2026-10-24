import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { createMemoryFinancialAccountService, resetFinancialAccountRuntimeForTests } from "../src/modules/financial-accounts/financial-account.service.js";
import { createMemoryFinancialEntryService, resetFinancialEntryRuntimeForTests } from "../src/modules/financial-entries/financial-entry.service.js";
import {
  createMemoryFinancialTitleService,
  deriveCompetencia,
  getMemoryFinancialPeriodCloseRepositoryForTests,
  resetFinancialTitleRuntimeForTests,
} from "../src/modules/financial-titles/index.js";
import { createMemoryChequeService, resetChequeRuntimeForTests, toChequeDto } from "../src/modules/cheques/index.js";
import type { ChequeActorContext } from "../src/modules/cheques/cheque.types.js";

function actor(tenantId = randomUUID()): ChequeActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["finance"],
    permissions: [
      "financial_accounts:read", "financial_accounts:create", "financial_accounts:update",
      "financial_titles:read", "financial_titles:create", "financial_titles:update",
      "financial_entries:read", "financial_entries:create", "financial_entries:update",
      "cheques:read", "cheques:create", "cheques:update",
    ],
  };
}

function resetAll(): void {
  resetChequeRuntimeForTests();
  resetFinancialEntryRuntimeForTests();
  resetFinancialAccountRuntimeForTests();
  resetFinancialTitleRuntimeForTests();
}

function setup() {
  resetAll();
  return {
    accounts: createMemoryFinancialAccountService(),
    titles: createMemoryFinancialTitleService(),
    entries: createMemoryFinancialEntryService(),
    cheques: createMemoryChequeService(),
  };
}

async function seed(direction: "receivable" | "payable" = "receivable", amount = 100, tenantId?: string) {
  const h = setup();
  const ctx = actor(tenantId);
  const account = await h.accounts.create(ctx, { name: `Conta ${randomUUID()}` });
  const title = await h.titles.create(ctx, {
    direction,
    party_type: direction === "receivable" ? "customer" : "supplier",
    party_name: "Parte SAN3-20",
    amount,
    issue_date: "2026-10-24",
    due_date: "2026-11-24",
    account_id: account.id,
  });
  return { ...h, ctx, account, title };
}

function chequeBody(accountId: string, titleId: string | undefined, direction: "received" | "issued" = "received", amount = 100) {
  return { account_id: accountId, title_id: titleId, direction, cheque_number: `SAN320-${randomUUID().slice(0, 12)}`, bank: "Banco SAN3", amount };
}

function domain(error: unknown, statusCode: number, reason: string): boolean {
  return typeof error === "object" && error !== null &&
    (error as { statusCode?: unknown }).statusCode === statusCode &&
    (error as { reason?: unknown }).reason === reason;
}

test("K1: registra vínculo, expõe titleId e filtra pelo título", async () => {
  const s = await seed();
  const cheque = await s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id));
  assert.equal(cheque.titleId, s.title.id);
  assert.equal(toChequeDto(cheque).titleId, s.title.id);
  assert.equal((await s.cheques.list(s.ctx, { title_id: s.title.id })).items[0]?.id, cheque.id);
  assert.equal((await s.cheques.list(s.ctx, { title_id: randomUUID() })).total, 0);
});

test("K1: PATCH vincula e null explícito desvincula enquanto registered", async () => {
  const s = await seed();
  const cheque = await s.cheques.create(s.ctx, chequeBody(s.account.id, undefined));
  assert.equal((await s.cheques.update(s.ctx, cheque.id, { title_id: s.title.id })).titleId, s.title.id);
  assert.equal((await s.cheques.update(s.ctx, cheque.id, { title_id: null })).titleId, undefined);
});

test("K1/K9: título inexistente e de outra organização produzem o mesmo 400", async () => {
  const s = await seed();
  const other = actor();
  const foreign = await s.titles.create(other, {
    direction: "receivable", party_type: "customer", party_name: "Outra", amount: 100,
    issue_date: "2026-10-24", due_date: "2026-11-24",
  });
  for (const id of [randomUUID(), foreign.id]) {
    await assert.rejects(() => s.cheques.create(s.ctx, chequeBody(s.account.id, id)), (e) => domain(e, 400, "invalid_title_reference"));
  }
});

test("K1: direção received exige receivable", async () => {
  const s = await seed("payable");
  await assert.rejects(() => s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id, "received")), (e) => domain(e, 422, "title_direction_mismatch"));
});

test("K1: direção issued exige payable", async () => {
  const s = await seed("receivable");
  await assert.rejects(() => s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id, "issued")), (e) => domain(e, 422, "title_direction_mismatch"));
});

test("K1: título cancelado é recusado", async () => {
  const s = await seed();
  await s.titles.changeStatus(s.ctx, s.title.id, { status: "cancelled" });
  await assert.rejects(() => s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id)), (e) => domain(e, 422, "title_cancelled"));
});

test("K1: título pago é recusado", async () => {
  const s = await seed();
  await s.entries.payTitle(s.ctx, s.title.id, { account_id: s.account.id, amount: 100, payment_method: "pix" });
  await assert.rejects(() => s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id)), (e) => domain(e, 422, "title_already_paid"));
});

test("K1: valor acima do saldo do título é recusado", async () => {
  const s = await seed("receivable", 100);
  await assert.rejects(() => s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id, "received", 101)), (e) => domain(e, 422, "overpayment"));
});

test("K1: vínculo não pode mudar depois do depósito", async () => {
  const s = await seed();
  const cheque = await s.cheques.create(s.ctx, chequeBody(s.account.id, undefined));
  await s.cheques.deposit(s.ctx, cheque.id);
  await assert.rejects(() => s.cheques.update(s.ctx, cheque.id, { title_id: s.title.id }), (e) => domain(e, 422, "cheque_not_editable"));
});

test("K2: clear recebido é o único lançamento e liquida o título", async () => {
  const s = await seed();
  const cheque = await s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id));
  await s.cheques.deposit(s.ctx, cheque.id);
  const cleared = await s.cheques.clear(s.ctx, cheque.id);
  const title = await s.titles.get(s.ctx, s.title.id);
  const ledger = await s.entries.list(s.ctx, { account_id: s.account.id, limit: 100 });
  assert.equal(cleared.status, "cleared");
  assert.equal(title.status, "paid");
  assert.equal(title.paidAmount, 100);
  assert.equal(ledger.total, 1);
  assert.equal(ledger.items[0]?.titleId, s.title.id);
  assert.equal(ledger.items[0]?.paymentMethod, "check");
  assert.equal((await s.entries.balance(s.ctx, s.account.id)).balance, 100);
});

test("K2: clear parcial deriva partially_paid", async () => {
  const s = await seed("receivable", 300);
  const cheque = await s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id, "received", 100));
  await s.cheques.deposit(s.ctx, cheque.id);
  await s.cheques.clear(s.ctx, cheque.id);
  const title = await s.titles.get(s.ctx, s.title.id);
  assert.equal(title.status, "partially_paid");
  assert.equal(title.paidAmount, 100);
});

test("K2: clear issued/payable debita uma vez", async () => {
  const s = await seed("payable");
  const cheque = await s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id, "issued"));
  await s.cheques.deposit(s.ctx, cheque.id);
  await s.cheques.clear(s.ctx, cheque.id);
  assert.equal((await s.entries.balance(s.ctx, s.account.id)).balance, -100);
  assert.equal((await s.titles.get(s.ctx, s.title.id)).status, "paid");
});

test("K2: título pago depois do vínculo faz clear falhar sem tocar cheque/razão", async () => {
  const s = await seed();
  const cheque = await s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id));
  await s.cheques.deposit(s.ctx, cheque.id);
  await s.entries.payTitle(s.ctx, s.title.id, { account_id: s.account.id, amount: 100, payment_method: "pix" });
  await assert.rejects(() => s.cheques.clear(s.ctx, cheque.id), (e) => domain(e, 422, "title_already_paid"));
  assert.equal((await s.cheques.get(s.ctx, cheque.id)).status, "deposited");
  assert.equal((await s.entries.list(s.ctx, { account_id: s.account.id, limit: 100 })).total, 1);
});

test("K2: título apagado depois do vínculo faz clear falhar fechado", async () => {
  const s = await seed();
  const cheque = await s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id));
  await s.cheques.deposit(s.ctx, cheque.id);
  await s.titles.delete(s.ctx, s.title.id);
  await assert.rejects(() => s.cheques.clear(s.ctx, cheque.id), (e) => domain(e, 404, "title_not_found"));
  assert.equal((await s.cheques.get(s.ctx, cheque.id)).status, "deposited");
  assert.equal((await s.entries.list(s.ctx, { account_id: s.account.id, limit: 100 })).total, 0);
});

test("K3: bounce restaura título e caixa, sem titleId na contrapartida", async () => {
  const s = await seed();
  const cheque = await s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id));
  await s.cheques.deposit(s.ctx, cheque.id);
  await s.cheques.clear(s.ctx, cheque.id);
  await s.cheques.bounce(s.ctx, cheque.id, { reason: "sem fundos" });
  const title = await s.titles.get(s.ctx, s.title.id);
  const ledger = await s.entries.list(s.ctx, { account_id: s.account.id, limit: 100 });
  assert.equal(title.status, "open");
  assert.equal(title.paidAmount, 0);
  assert.equal((await s.entries.balance(s.ctx, s.account.id)).balance, 0);
  assert.equal(ledger.total, 2);
  assert.equal(ledger.items.find((entry) => entry.category === "cheque_bounce")?.titleId, undefined);
});

test("K3: pagamento misto volta ao parcial quando o cheque é devolvido", async () => {
  const s = await seed("receivable", 300);
  const cheque = await s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id, "received", 100));
  await s.cheques.deposit(s.ctx, cheque.id);
  await s.cheques.clear(s.ctx, cheque.id);
  await s.entries.payTitle(s.ctx, s.title.id, { account_id: s.account.id, amount: 200, payment_method: "pix" });
  await s.cheques.bounce(s.ctx, cheque.id, {});
  const title = await s.titles.get(s.ctx, s.title.id);
  assert.equal(title.status, "partially_paid");
  assert.equal(title.paidAmount, 200);
});

test("K3: período fechado aborta bounce e preserva título pago", async () => {
  const s = await seed();
  const cheque = await s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id));
  await s.cheques.deposit(s.ctx, cheque.id);
  await s.cheques.clear(s.ctx, cheque.id);
  getMemoryFinancialPeriodCloseRepositoryForTests().setPeriodStatus(s.ctx.tenantId, deriveCompetencia(new Date()), "closed");
  await assert.rejects(() => s.cheques.bounce(s.ctx, cheque.id, {}), (e) => domain(e, 422, "period_closed"));
  assert.equal((await s.titles.get(s.ctx, s.title.id)).status, "paid");
  assert.equal((await s.cheques.get(s.ctx, cheque.id)).status, "cleared");
});

test("K4: payTitle recusa check e deixa título/razão intactos", async () => {
  const s = await seed();
  await assert.rejects(() => s.entries.payTitle(s.ctx, s.title.id, { account_id: s.account.id, amount: 100, payment_method: "check" }), (e) => domain(e, 422, "cheque_required"));
  assert.equal((await s.titles.get(s.ctx, s.title.id)).paidAmount, 0);
  assert.equal((await s.entries.list(s.ctx, { account_id: s.account.id, limit: 100 })).total, 0);
});

test("K4: lançamento avulso recusa check", async () => {
  const s = await seed();
  await assert.rejects(() => s.entries.create(s.ctx, { account_id: s.account.id, direction: "in", amount: 100, payment_method: "check" }), (e) => domain(e, 422, "cheque_required"));
});

test("K4: título já pago precede cheque_required", async () => {
  const s = await seed();
  await s.entries.payTitle(s.ctx, s.title.id, { account_id: s.account.id, amount: 100, payment_method: "pix" });
  await assert.rejects(() => s.entries.payTitle(s.ctx, s.title.id, { account_id: s.account.id, amount: 100, payment_method: "check" }), (e) => domain(e, 422, "title_already_paid"));
});

test("K4: cheque_required precede período fechado", async () => {
  const s = await seed();
  getMemoryFinancialPeriodCloseRepositoryForTests().setPeriodStatus(s.ctx.tenantId, deriveCompetencia(new Date()), "closed");
  await assert.rejects(() => s.entries.payTitle(s.ctx, s.title.id, { account_id: s.account.id, amount: 100, payment_method: "check" }), (e) => domain(e, 422, "cheque_required"));
});

test("K4: pix continua liquidando normalmente", async () => {
  const s = await seed();
  const entry = await s.entries.payTitle(s.ctx, s.title.id, { account_id: s.account.id, amount: 100, payment_method: "pix" });
  assert.equal(entry.paymentMethod, "pix");
  assert.equal((await s.titles.get(s.ctx, s.title.id)).status, "paid");
});

test("K6: lançamento de compensação vinculado recusa delete/reverse por cheque_entry_immutable", async () => {
  const s = await seed();
  const cheque = await s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id));
  await s.cheques.deposit(s.ctx, cheque.id);
  const cleared = await s.cheques.clear(s.ctx, cheque.id);
  assert.ok(cleared.clearedEntryId);
  await assert.rejects(() => s.entries.delete(s.ctx, cleared.clearedEntryId!), (e) => domain(e, 422, "cheque_entry_immutable"));
  await assert.rejects(() => s.entries.reverse(s.ctx, cleared.clearedEntryId!), (e) => domain(e, 422, "cheque_entry_immutable"));
});

test("K9: filtro title_id não revela cheque de outra organização", async () => {
  const s = await seed();
  await s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id));
  const intruder = actor();
  assert.equal((await s.cheques.list(intruder, { title_id: s.title.id })).total, 0);
});

test("K9: clear sem permissão financeira preserva título", async () => {
  const s = await seed();
  const cheque = await s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id));
  await s.cheques.deposit(s.ctx, cheque.id);
  const weak = { ...s.ctx, permissions: ["cheques:read", "cheques:update"] as const };
  await assert.rejects(() => s.cheques.clear(weak, cheque.id), (e) => domain(e, 403, "financial_write_forbidden"));
  assert.equal((await s.titles.get(s.ctx, s.title.id)).paidAmount, 0);
});

test("K11: applyPayment incremental nunca sobrescreve título já pago", async () => {
  const s = await seed();
  await s.entries.payTitle(s.ctx, s.title.id, { account_id: s.account.id, amount: 100, payment_method: "pix" });
  await assert.rejects(() => s.titles.applyPayment(s.ctx, s.title.id, 10), (e) => domain(e, 422, "title_already_paid"));
  assert.equal((await s.titles.get(s.ctx, s.title.id)).paidAmount, 100);
});
