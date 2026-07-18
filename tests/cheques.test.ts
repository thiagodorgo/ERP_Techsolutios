import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  createMemoryFinancialAccountService,
  resetFinancialAccountRuntimeForTests,
} from "../src/modules/financial-accounts/financial-account.service.js";
import {
  deriveCompetencia,
  getMemoryFinancialPeriodCloseRepositoryForTests,
  resetFinancialTitleRuntimeForTests,
} from "../src/modules/financial-titles/index.js";
import {
  createMemoryFinancialEntryService,
  resetFinancialEntryRuntimeForTests,
} from "../src/modules/financial-entries/index.js";
import {
  ChequeError,
  createMemoryChequeService,
  resetChequeRuntimeForTests,
  type ChequeActorContext,
} from "../src/modules/cheques/index.js";

// Erros de domínio renderizam idêntico via HTTP (statusCode+reason); o clear/bounce compõem com o serviço de
// lançamentos → um period_closed do chokepoint chega como FinancialEntryError. Checagem class-agnostic.
function isDomainError(error: unknown, statusCode: number, reason: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { statusCode?: unknown }).statusCode === statusCode &&
    (error as { reason?: unknown }).reason === reason
  );
}

// Ator finance: cheques:* + financial_entries:create (a permissão de dinheiro que /clear e /bounce exigem).
function actor(tenantId = randomUUID()): ChequeActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["finance"],
    permissions: ["cheques:read", "cheques:create", "cheques:update", "financial_entries:read", "financial_entries:create", "financial_entries:update"],
  };
}

// Ator SEM a permissão financeira forte (só opera cheque, não move caixa) — para o gate de escalada.
function chequeOnlyActor(tenantId: string): ChequeActorContext {
  return { tenantId, userId: randomUUID(), roles: ["operator"], permissions: ["cheques:read", "cheques:create", "cheques:update"] };
}

function resetAll(): void {
  resetChequeRuntimeForTests();
  resetFinancialEntryRuntimeForTests();
  resetFinancialAccountRuntimeForTests();
  resetFinancialTitleRuntimeForTests(); // limpa também o singleton de fechamento de período (chokepoint)
}

function setup() {
  resetAll();
  return {
    cheques: createMemoryChequeService(),
    accounts: createMemoryFinancialAccountService(),
    entries: createMemoryFinancialEntryService(),
  };
}

async function activeAccount(
  accounts: ReturnType<typeof createMemoryFinancialAccountService>,
  ctx: ChequeActorContext,
  overrides: Record<string, unknown> = {},
) {
  return accounts.create(ctx, { name: `Caixa ${randomUUID()}`, ...overrides });
}

function chequeBody(accountId: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    direction: "received",
    cheque_number: "000123",
    bank: "Banco Alfa",
    amount: 1500,
    account_id: accountId,
    due_date: "2026-09-10",
    ...overrides,
  };
}

// ------------------------------------------------------------------ REGISTRO (create)

test("registro received: happy path (status registered, moeda herdada, due_date memo, createdBy)", async () => {
  const { cheques, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id));
  assert.equal(cheque.direction, "received");
  assert.equal(cheque.status, "registered");
  assert.equal(cheque.amount, 1500);
  assert.equal(cheque.currency, "BRL");
  assert.equal(cheque.accountId, account.id);
  assert.equal(cheque.chequeNumber, "000123");
  assert.equal(cheque.bank, "Banco Alfa");
  assert.ok(cheque.dueDate instanceof Date);
  assert.equal(cheque.clearedEntryId, undefined);
  assert.equal(cheque.createdBy, ctx.userId);
});

test("registro issued: happy path", async () => {
  const { cheques, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id, { direction: "issued", amount: 800 }));
  assert.equal(cheque.direction, "issued");
  assert.equal(cheque.amount, 800);
});

test("registro: due_date omitido → undefined (opcional/memo)", async () => {
  const { cheques, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id, { due_date: undefined }));
  assert.equal(cheque.dueDate, undefined);
});

test("registro: amount <= 0 → 400 invalid_amount", async () => {
  const { cheques, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  await assert.rejects(() => cheques.create(ctx, chequeBody(account.id, { amount: 0 })), (e: unknown) => isDomainError(e, 400, "invalid_amount"));
  await assert.rejects(() => cheques.create(ctx, chequeBody(account.id, { amount: -5 })), (e: unknown) => isDomainError(e, 400, "invalid_amount"));
});

test("registro: amount acima de Decimal(12,2) → 422 amount_overflow (garante compensabilidade)", async () => {
  const { cheques, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  await assert.rejects(
    () => cheques.create(ctx, chequeBody(account.id, { amount: 50_000_000_000 })),
    (e: unknown) => isDomainError(e, 422, "amount_overflow"),
  );
});

test("registro: direction inválida → 400 invalid_direction", async () => {
  const { cheques, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  await assert.rejects(() => cheques.create(ctx, chequeBody(account.id, { direction: "in" })), (e: unknown) => isDomainError(e, 400, "invalid_direction"));
});

test("registro: cheque_number/bank ausentes → 400 required_field", async () => {
  const { cheques, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  await assert.rejects(() => cheques.create(ctx, chequeBody(account.id, { cheque_number: "  " })), (e: unknown) => isDomainError(e, 400, "required_field"));
  await assert.rejects(() => cheques.create(ctx, chequeBody(account.id, { bank: "" })), (e: unknown) => isDomainError(e, 400, "required_field"));
});

test("registro: due_date inválida → 400 invalid_due_date", async () => {
  const { cheques, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  await assert.rejects(() => cheques.create(ctx, chequeBody(account.id, { due_date: "2026-13-40" })), (e: unknown) => isDomainError(e, 400, "invalid_due_date"));
});

test("registro: conta inexistente → 400 invalid_account_reference", async () => {
  const { cheques } = setup();
  const ctx = actor();
  await assert.rejects(() => cheques.create(ctx, chequeBody(randomUUID())), (e: unknown) => isDomainError(e, 400, "invalid_account_reference"));
});

test("registro: conta INATIVA → 422 account_inactive", async () => {
  const { cheques, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  await accounts.delete(ctx, account.id); // soft-delete → is_active=false
  await assert.rejects(() => cheques.create(ctx, chequeBody(account.id)), (e: unknown) => isDomainError(e, 422, "account_inactive"));
});

test("registro: moeda divergente da conta → 422 currency_mismatch", async () => {
  const { cheques, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  await assert.rejects(() => cheques.create(ctx, chequeBody(account.id, { currency: "USD" })), (e: unknown) => isDomainError(e, 422, "currency_mismatch"));
});

// ------------------------------------------------------------------ GET / LIST / isolamento

test("get: 404 inexistente e cross-tenant", async () => {
  const { cheques, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id));
  await assert.rejects(() => cheques.get(ctx, randomUUID()), (e: unknown) => isDomainError(e, 404, "cheque_not_found"));
  const other = actor();
  await assert.rejects(() => cheques.get(other, cheque.id), (e: unknown) => isDomainError(e, 404, "cheque_not_found"));
});

test("list: filtros direction/status/account_id + paginação e isolamento por tenant", async () => {
  const { cheques, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  await cheques.create(ctx, chequeBody(account.id, { direction: "received", cheque_number: "1" }));
  await cheques.create(ctx, chequeBody(account.id, { direction: "issued", cheque_number: "2" }));
  const all = await cheques.list(ctx, {});
  assert.equal(all.total, 2);
  const received = await cheques.list(ctx, { direction: "received" });
  assert.equal(received.total, 1);
  const registered = await cheques.list(ctx, { status: "registered" });
  assert.equal(registered.total, 2);
  // outro tenant não enxerga
  const other = actor();
  const otherList = await cheques.list(other, {});
  assert.equal(otherList.total, 0);
});

// ------------------------------------------------------------------ UPDATE / DELETE

test("update: edita notes/due_date enquanto 'registered'", async () => {
  const { cheques, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id));
  const updated = await cheques.update(ctx, cheque.id, { notes: "3ª via", due_date: "2026-10-01" });
  assert.equal(updated.notes, "3ª via");
  assert.equal(updated.dueDate?.getUTCFullYear(), 2026);
});

test("update após depósito → 422 cheque_not_editable", async () => {
  const { cheques, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id));
  await cheques.deposit(ctx, cheque.id);
  await assert.rejects(() => cheques.update(ctx, cheque.id, { notes: "x" }), (e: unknown) => isDomainError(e, 422, "cheque_not_editable"));
});

test("delete: soft-delete enquanto 'registered' (active=false); após depósito → 422", async () => {
  const { cheques, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const a = await cheques.create(ctx, chequeBody(account.id, { cheque_number: "A" }));
  const removed = await cheques.delete(ctx, a.id);
  assert.ok(removed.deletedAt instanceof Date);
  await assert.rejects(() => cheques.get(ctx, a.id), (e: unknown) => isDomainError(e, 404, "cheque_not_found"));

  const b = await cheques.create(ctx, chequeBody(account.id, { cheque_number: "B" }));
  await cheques.deposit(ctx, b.id);
  await assert.rejects(() => cheques.delete(ctx, b.id), (e: unknown) => isDomainError(e, 422, "cheque_not_editable"));
});

test("update/delete cross-tenant → 404", async () => {
  const { cheques, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id));
  const other = actor();
  await assert.rejects(() => cheques.update(other, cheque.id, { notes: "x" }), (e: unknown) => isDomainError(e, 404, "cheque_not_found"));
  await assert.rejects(() => cheques.delete(other, cheque.id), (e: unknown) => isDomainError(e, 404, "cheque_not_found"));
});

// ------------------------------------------------------------------ TRANSIÇÕES SEM DINHEIRO

test("deposit: registered→deposited; depositar de novo → 422 invalid_transition", async () => {
  const { cheques, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id));
  const deposited = await cheques.deposit(ctx, cheque.id);
  assert.equal(deposited.status, "deposited");
  await assert.rejects(() => cheques.deposit(ctx, cheque.id), (e: unknown) => isDomainError(e, 422, "invalid_transition"));
});

test("cancel: registered→cancelled; cancelar depositado → 422 invalid_transition", async () => {
  const { cheques, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id));
  const cancelled = await cheques.cancel(ctx, cheque.id);
  assert.equal(cancelled.status, "cancelled");
  const other = await cheques.create(ctx, chequeBody(account.id, { cheque_number: "Z" }));
  await cheques.deposit(ctx, other.id);
  await assert.rejects(() => cheques.cancel(ctx, other.id), (e: unknown) => isDomainError(e, 422, "invalid_transition"));
});

// ------------------------------------------------------------------ COMPENSAR (clear) — move caixa

test("clear received: deposited→cleared posta lançamento 'in' (+amount) e vincula cleared_entry_id", async () => {
  const { cheques, accounts, entries } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id, { amount: 1500 }));
  await cheques.deposit(ctx, cheque.id);
  const cleared = await cheques.clear(ctx, cheque.id);
  assert.equal(cleared.status, "cleared");
  assert.ok(cleared.clearedEntryId, "cleared_entry_id vinculado");
  const entry = await entries.get(ctx, cleared.clearedEntryId!);
  assert.equal(entry.direction, "in");
  assert.equal(entry.amount, 1500);
  assert.equal(entry.paymentMethod, "check");
  assert.equal(entry.category, "cheque_clearing");
  const balance = await entries.balance(ctx, account.id);
  assert.equal(balance.balance, 1500);
});

test("clear issued: deposited→cleared posta lançamento 'out' (−amount)", async () => {
  const { cheques, accounts, entries } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx, { opening_balance: 2000 });
  const cheque = await cheques.create(ctx, chequeBody(account.id, { direction: "issued", amount: 500 }));
  await cheques.deposit(ctx, cheque.id);
  const cleared = await cheques.clear(ctx, cheque.id);
  const entry = await entries.get(ctx, cleared.clearedEntryId!);
  assert.equal(entry.direction, "out");
  const balance = await entries.balance(ctx, account.id);
  assert.equal(balance.balance, 1500); // 2000 abertura − 500
});

test("clear de 'registered' (sem depositar) → 422 invalid_transition", async () => {
  const { cheques, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id));
  await assert.rejects(() => cheques.clear(ctx, cheque.id), (e: unknown) => isDomainError(e, 422, "invalid_transition"));
});

test("re-clear (compensar já compensado) → 422 invalid_transition (sem 2º lançamento)", async () => {
  const { cheques, accounts, entries } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id, { amount: 300 }));
  await cheques.deposit(ctx, cheque.id);
  await cheques.clear(ctx, cheque.id);
  await assert.rejects(() => cheques.clear(ctx, cheque.id), (e: unknown) => isDomainError(e, 422, "invalid_transition"));
  const balance = await entries.balance(ctx, account.id);
  assert.equal(balance.balance, 300); // um único lançamento
});

test("clear com competência CORRENTE fechada → 422 period_closed e cheque VOLTA a 'deposited' (rollback, nada postado)", async () => {
  const { cheques, accounts, entries } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id, { amount: 400 }));
  await cheques.deposit(ctx, cheque.id);
  // fecha o mês corrente (a compensação usa server-now → competência corrente)
  getMemoryFinancialPeriodCloseRepositoryForTests().setPeriodStatus(ctx.tenantId, deriveCompetencia(new Date()), "closed");
  await assert.rejects(() => cheques.clear(ctx, cheque.id), (e: unknown) => isDomainError(e, 422, "period_closed"));
  const after = await cheques.get(ctx, cheque.id);
  assert.equal(after.status, "deposited", "rollback: cheque não fica meio-compensado");
  assert.equal(after.clearedEntryId, undefined);
  const balance = await entries.balance(ctx, account.id);
  assert.equal(balance.balance, 0, "nenhum caixa postado");
});

test("clear com conta desativada após o registro → 422 account_inactive e cheque continua 'deposited'", async () => {
  const { cheques, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id));
  await cheques.deposit(ctx, cheque.id);
  await accounts.delete(ctx, account.id); // desativa a conta DEPOIS do registro
  await assert.rejects(() => cheques.clear(ctx, cheque.id), (e: unknown) => isDomainError(e, 422, "account_inactive"));
  const after = await cheques.get(ctx, cheque.id);
  assert.equal(after.status, "deposited");
});

// ------------------------------------------------------------------ DEVOLVER (bounce)

test("bounce deposited→bounced: sem caixa (saldo inalterado), motivo registrado", async () => {
  const { cheques, accounts, entries } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id, { amount: 700 }));
  await cheques.deposit(ctx, cheque.id);
  const bounced = await cheques.bounce(ctx, cheque.id, { reason: "sem fundos" });
  assert.equal(bounced.status, "bounced");
  assert.equal(bounced.bounceReason, "sem fundos");
  assert.equal(bounced.bounceEntryId, undefined);
  const balance = await entries.balance(ctx, account.id);
  assert.equal(balance.balance, 0);
});

test("bounce cleared→bounced (received): posta CONTRA-lançamento 'out', saldo LÍQUIDO zero, bounce_entry_id vinculado", async () => {
  const { cheques, accounts, entries } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id, { amount: 1000 }));
  await cheques.deposit(ctx, cheque.id);
  await cheques.clear(ctx, cheque.id);
  const bounced = await cheques.bounce(ctx, cheque.id, { reason: "devolvido" });
  assert.equal(bounced.status, "bounced");
  assert.ok(bounced.bounceEntryId);
  const counter = await entries.get(ctx, bounced.bounceEntryId!);
  assert.equal(counter.direction, "out");
  assert.equal(counter.category, "cheque_bounce");
  const balance = await entries.balance(ctx, account.id);
  assert.equal(balance.balance, 0, "compensação +1000 e devolução −1000 = líquido zero");
});

// REGRESSÃO do achado ALTA do ataque: bounce-após-clear NÃO pode ser travado por lançamento CONCILIADO.
test("bounce cleared→bounced FUNCIONA mesmo com o lançamento de compensação CONCILIADO (não usa reverse)", async () => {
  const { cheques, accounts, entries } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id, { amount: 900 }));
  await cheques.deposit(ctx, cheque.id);
  const cleared = await cheques.clear(ctx, cheque.id);
  // extrato chega e concilia o lançamento compensado (Ω4-5) — reverse() travaria aqui (entry_reconciled)
  await entries.reconcile(ctx, cleared.clearedEntryId!, { reconciled: true });
  const bounced = await cheques.bounce(ctx, cheque.id, {});
  assert.equal(bounced.status, "bounced");
  const balance = await entries.balance(ctx, account.id);
  assert.equal(balance.balance, 0);
});

test("bounce de 'registered'/'cancelled' → 422 invalid_transition", async () => {
  const { cheques, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id));
  await assert.rejects(() => cheques.bounce(ctx, cheque.id, {}), (e: unknown) => isDomainError(e, 422, "invalid_transition"));
  await cheques.cancel(ctx, cheque.id);
  await assert.rejects(() => cheques.bounce(ctx, cheque.id, {}), (e: unknown) => isDomainError(e, 422, "invalid_transition"));
});

// ------------------------------------------------------------------ CONSERVAÇÃO & MUTEX & RBAC

test("ciclo completo received: register→deposit→clear(+)→bounce(−) = saldo líquido zero", async () => {
  const { cheques, accounts, entries } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id, { amount: 1234.56 }));
  await cheques.deposit(ctx, cheque.id);
  await cheques.clear(ctx, cheque.id);
  assert.equal((await entries.balance(ctx, account.id)).balance, 1234.56);
  await cheques.bounce(ctx, cheque.id, {});
  assert.equal((await entries.balance(ctx, account.id)).balance, 0);
});

// MUTEX: duas compensações CONCORRENTES não podem postar 2 lançamentos (invariante: ≤1 líquido).
test("mutex: dois clear() concorrentes → exatamente 1 sucesso, 1 conflito; saldo = +amount (não 2×)", async () => {
  const { cheques, accounts, entries } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id, { amount: 600 }));
  await cheques.deposit(ctx, cheque.id);
  const results = await Promise.allSettled([cheques.clear(ctx, cheque.id), cheques.clear(ctx, cheque.id)]);
  const ok = results.filter((r) => r.status === "fulfilled").length;
  const conflicts = results.filter((r) => r.status === "rejected" && isDomainError((r as PromiseRejectedResult).reason, 409, "transition_conflict")).length;
  assert.equal(ok, 1, "só uma compensação vence");
  assert.equal(conflicts, 1, "a perdedora recebe 409 transition_conflict");
  const balance = await entries.balance(ctx, account.id);
  assert.equal(balance.balance, 600, "um único lançamento, sem dupla postagem");
});

// RBAC (defesa em profundidade): mover caixa exige financial_entries:create além de cheques:update.
test("clear sem financial_entries:create → 403 financial_write_forbidden", async () => {
  const { cheques, accounts } = setup();
  const admin = actor();
  const account = await activeAccount(accounts, admin);
  const cheque = await cheques.create(admin, chequeBody(account.id));
  await cheques.deposit(admin, cheque.id);
  const weak = chequeOnlyActor(admin.tenantId);
  await assert.rejects(() => cheques.clear(weak, cheque.id), (e: unknown) => isDomainError(e, 403, "financial_write_forbidden"));
});

test("bounce-após-clear sem financial_entries:create → 403 financial_write_forbidden", async () => {
  const { cheques, accounts } = setup();
  const admin = actor();
  const account = await activeAccount(accounts, admin);
  const cheque = await cheques.create(admin, chequeBody(account.id));
  await cheques.deposit(admin, cheque.id);
  await cheques.clear(admin, cheque.id);
  const weak = chequeOnlyActor(admin.tenantId);
  await assert.rejects(() => cheques.bounce(weak, cheque.id, {}), (e: unknown) => isDomainError(e, 403, "financial_write_forbidden"));
});

test("bounce deposited→bounced (sem caixa) NÃO exige gate financeiro (só cheques:update)", async () => {
  const { cheques, accounts } = setup();
  const admin = actor();
  const account = await activeAccount(accounts, admin);
  const cheque = await cheques.create(admin, chequeBody(account.id));
  await cheques.deposit(admin, cheque.id);
  const weak = chequeOnlyActor(admin.tenantId);
  const bounced = await cheques.bounce(weak, cheque.id, { reason: "sem fundos" });
  assert.equal(bounced.status, "bounced");
});

test("ChequeError expõe statusCode/reason (contrato HTTP)", async () => {
  const err = new ChequeError(422, "CHEQUE_UNPROCESSABLE", "invalid_transition", "x");
  assert.equal(err.statusCode, 422);
  assert.equal(err.reason, "invalid_transition");
});
