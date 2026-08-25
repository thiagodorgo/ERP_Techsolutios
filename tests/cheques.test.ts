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
  getMemoryFinancialEntryRepositoryForTests,
  resetFinancialEntryRuntimeForTests,
} from "../src/modules/financial-entries/index.js";
import {
  CHEQUE_ENTRY_LINK_FIELDS,
  ChequeError,
  createMemoryChequeService,
  resetChequeRuntimeForTests,
  toChequeDto,
  type ChequeActorContext,
} from "../src/modules/cheques/index.js";
import { expectChequeLedgerCoherent } from "./helpers/financial-ledger.js";

// B-O6R-02 ciclo 3 · C1 (P6) — CAPTURA LIQUIDADA: a tentativa de ataque NUNCA rejeita a promessa do
// teste. `assert.rejects` aborta o caso no instante da recusa, e foi assim que o ciclo 2 se enganou:
// com o guard no lugar, o teste morria no `rejects` e o helper de efeito nunca chegava a rodar
// contra o estado pós-ataque — o verde do helper era um verde NÃO EXERCIDO. Capturando o desfecho,
// o razão é julgado PRIMEIRO e SOZINHO, e só depois se cobra a razão da recusa.
type Attempt = { readonly rejected: boolean; readonly error: unknown };

async function capture(action: () => Promise<unknown>): Promise<Attempt> {
  try {
    await action();
    return { rejected: false, error: undefined };
  } catch (error) {
    return { rejected: true, error };
  }
}

function expectRefused(attempt: Attempt, statusCode: number, reason: string, what: string): void {
  assert.ok(attempt.rejected, `${what}: a porta tinha de RECUSAR, e aceitou`);
  assert.ok(
    isDomainError(attempt.error, statusCode, reason),
    `${what}: recusou pelo motivo errado — esperava ${statusCode}/${reason}, veio ${JSON.stringify(
      attempt.error instanceof Error ? { statusCode: (attempt.error as { statusCode?: unknown }).statusCode, reason: (attempt.error as { reason?: unknown }).reason, message: attempt.error.message } : attempt.error,
    )}`,
  );
}

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

// B-O6R-02 ciclo 3 · C1 (P6) — o carregador NÃO seleciona mais nada.
//
// A versão anterior entregava "os vivos vinculados" e era exatamente aí que o B-1 morava: a
// contrapartida do estorno nasce SEM vínculo com o cheque, então este filtro a apagava do razão
// antes do helper ver, e o helper somava +100 num cheque cujo dinheiro já tinha voltado.
//
// Agora o carregador promete UMA coisa só — a COMPLETUDE do razão da conta, vivos E apagados — e a
// seleção do conjunto relevante (o fecho por estorno) acontece dentro do helper.
async function chequeLedgerInput(
  entries: ReturnType<typeof createMemoryFinancialEntryService>,
  ctx: ChequeActorContext,
  chequeId: string,
  cheques: ReturnType<typeof createMemoryChequeService>,
  accountId: string,
) {
  const cheque = await cheques.get(ctx, chequeId);
  const linkedIds = [cheque.clearedEntryId, cheque.bounceEntryId].filter((id): id is string => id != null);
  const all = await entries.list(ctx, { account_id: accountId, include_deleted: true, limit: 100 });
  // A completude é a ÚNICA promessa deste carregador, então ela é ASSERIDA: um razão truncado pela
  // paginação daria verde sobre metade do dinheiro — a classe de defeito exata do ciclo 2.
  assert.equal(all.items.length, all.total, "o razão carregado tem de ser COMPLETO (sem truncar por paginação)");
  return {
    linkedIds,
    ledger: all.items.map((entry) => ({
      id: entry.id,
      direction: entry.direction,
      amount: entry.amount,
      reversalOf: entry.reversalOf,
      deletedAt: entry.deletedAt,
    })),
  };
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

// pós-análise #1: limpar due_date via null explícito (campo canônico snake_case) — o `??` colapsava null.
test("update: due_date=null (snake) LIMPA a data; ausente não mexe", async () => {
  const { cheques, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id, { due_date: "2026-09-10" }));
  assert.ok(cheque.dueDate instanceof Date);
  const cleared = await cheques.update(ctx, cheque.id, { due_date: null });
  assert.equal(cleared.dueDate, undefined, "null explícito limpa a due_date");
  // ausente não mexe (só edita notes)
  const set = await cheques.update(ctx, cheque.id, { due_date: "2026-11-01" });
  const untouched = await cheques.update(ctx, cheque.id, { notes: "x" });
  assert.equal(untouched.dueDate?.getTime(), set.dueDate?.getTime(), "due_date ausente no PATCH não é alterada");
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

// ------------------------------- lançamento de cheque só se desfaz pelo cheque (ciclo 2 · C2)
// P3 — lançamento referenciado por cleared_entry_id ou bounce_entry_id não é deletável nem estornável
//      pela superfície de lançamentos; em QUALQUER ordem de chamadas,
//      net(lançamentos vivos do cheque) ∈ { +valor (cleared), 0 (bounced), sem lançamento (demais) }.
// O ataque da junta (Ω6R-DIN-011), reproduzido e agora RECUSADO: clear +100 → reverse do lançamento
// de compensação → o cheque continuava 'cleared' → bounce postava −100. 200 num cheque de 100.

test("[C2/P3] ATAQUE da junta: reverse do lançamento de COMPENSAÇÃO → 422 cheque_entry_immutable; net = +valor, nunca −valor", async () => {
  const { cheques, accounts, entries } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id, { amount: 100 }));
  await cheques.deposit(ctx, cheque.id);
  const cleared = await cheques.clear(ctx, cheque.id);
  assert.equal((await entries.balance(ctx, account.id)).balance, 100);

  // (1) a tentativa é CAPTURADA, não julgada — o razão fala antes do desfecho (C1.5).
  const attempt = await capture(() => entries.reverse(ctx, cleared.clearedEntryId!));

  // (2) O RAZÃO PRIMEIRO, e SOZINHO. Se o guard cair (drill D15), este checkpoint fica vermelho
  //     pelo HELPER — com o fecho por estorno vendo a contrapartida que nenhuma ponta referencia —
  //     independentemente do que a chamada tenha devolvido.
  expectChequeLedgerCoherent({
    status: (await cheques.get(ctx, cheque.id)).status,
    direction: "received",
    amount: 100,
    ...(await chequeLedgerInput(entries, ctx, cheque.id, cheques, account.id)),
    label: "após a tentativa de reverse",
  });
  assert.equal((await cheques.get(ctx, cheque.id)).status, "cleared");
  assert.equal((await entries.balance(ctx, account.id)).balance, 100, "o estorno recusado não pode ter mexido no caixa");

  // (3) e SÓ ENTÃO a razão da recusa — era ela que abria a devolução em dobro.
  expectRefused(attempt, 422, "cheque_entry_immutable", "reverse do lançamento de compensação");

  // (4) o ÚNICO caminho que desfaz é o bounce — e ele leva a líquido ZERO, jamais a −100.
  const bounced = await cheques.bounce(ctx, cheque.id, { reason: "sem fundos" });
  assert.equal(bounced.status, "bounced");
  assert.equal((await entries.balance(ctx, account.id)).balance, 0, "líquido ZERO — no defeito dava −100");
  expectChequeLedgerCoherent({
    status: "bounced",
    direction: "received",
    amount: 100,
    ...(await chequeLedgerInput(entries, ctx, cheque.id, cheques, account.id)),
    label: "após o bounce",
  });
});

test("[C2/P3] DELETE do lançamento de COMPENSAÇÃO → 422 cheque_entry_immutable; cheque e caixa intactos", async () => {
  const { cheques, accounts, entries } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id, { amount: 250 }));
  await cheques.deposit(ctx, cheque.id);
  const cleared = await cheques.clear(ctx, cheque.id);

  // Captura liquidada: o razão é julgado ANTES do desfecho (C1.5). Sem o guard, o delete apaga a
  // compensação e o fecho por estorno passa a ver ZERO linha viva num cheque 'cleared' de 250.
  const attempt = await capture(() => entries.delete(ctx, cleared.clearedEntryId!));
  expectChequeLedgerCoherent({
    status: (await cheques.get(ctx, cheque.id)).status,
    direction: "received",
    amount: 250,
    ...(await chequeLedgerInput(entries, ctx, cheque.id, cheques, account.id)),
    label: "após a tentativa de delete",
  });
  expectRefused(attempt, 422, "cheque_entry_immutable", "delete do lançamento de compensação");
  assert.equal((await entries.get(ctx, cleared.clearedEntryId!)).deletedAt, undefined);
  assert.equal((await cheques.get(ctx, cheque.id)).status, "cleared");
  assert.equal((await entries.balance(ctx, account.id)).balance, 250);
});

// B-O6R-02 ciclo 4 · C4 (P6-v2) — ACOPLAMENTO carregador × helper (D25 committado). O que faz o drill
// `include_deleted: true→false` MORDER para sempre: um estado committado cujo veredito DEPENDE de a
// linha APAGADA estar no razão. Com a completude (include_deleted no chequeLedgerInput), o helper julga
// certo; se o carregador voltar a filtrar deleted_at, as pontas somem e o C4.1 EXPLODE por ponta ausente.
test("[C4/P6-v2][acoplamento] cheque com pontas APAGADAS: helper julga certo COM a linha no razão e ACUSA sem ela", async () => {
  const { cheques, accounts, entries } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id, { amount: 100 }));
  await cheques.deposit(ctx, cheque.id);
  const cleared = await cheques.clear(ctx, cheque.id);
  const bounced = await cheques.bounce(ctx, cheque.id, { reason: "sem fundos" });

  // MANIPULAÇÃO TEST-ONLY (bypassa o guard cheque_entry_immutable DE PROPÓSITO, indo direto ao
  // repositório): apaga as DUAS pontas do cheque. O cheque segue 'bounced'; as pontas viram linhas
  // APAGADAS no razão. É o estado em que a completude do razão passa a decidir o veredito.
  const entryRepo = getMemoryFinancialEntryRepositoryForTests();
  await entryRepo.softDelete(ctx.tenantId, cleared.clearedEntryId!, ctx.userId);
  await entryRepo.softDelete(ctx.tenantId, bounced.bounceEntryId!, ctx.userId);

  const loaded = await chequeLedgerInput(entries, ctx, cheque.id, cheques, account.id);

  // (a) COM a linha (razão COMPLETO, include_deleted): 'bounced' com 0 lançamento vivo no fecho é
  //     coerente (0 ou 2) → o helper JULGA CERTO (verde).
  expectChequeLedgerCoherent({
    status: "bounced",
    direction: "received",
    amount: 100,
    ...loaded,
    label: "pontas apagadas — razão completo",
  });

  // (b) SEM a linha (o carregador volta a filtrar deleted_at — exatamente a mutação do D25): as pontas
  //     somem do razão e o helper EXPLODE por ponta ausente (C4.1). O veredito DEPENDE da completude.
  const filtrado = { ...loaded, ledger: loaded.ledger.filter((row) => row.deletedAt == null) };
  assert.throws(
    () =>
      expectChequeLedgerCoherent({
        status: "bounced",
        direction: "received",
        amount: 100,
        ...filtrado,
        label: "pontas apagadas — razão filtrado",
      }),
    (error: unknown) => error instanceof assert.AssertionError && /ausente do razão carregado/.test((error as Error).message),
    "carregador que filtra deleted_at derruba este caso: as pontas apagadas somem e a completude quebra",
  );
});

test("[C2/P3] o CONTRA-lançamento do bounce também é imutável: reverse e delete → 422; net segue ZERO", async () => {
  const { cheques, accounts, entries } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id, { amount: 100 }));
  await cheques.deposit(ctx, cheque.id);
  await cheques.clear(ctx, cheque.id);
  const bounced = await cheques.bounce(ctx, cheque.id, { reason: "sem fundos" });

  // Sem este guard, estornar o contra-lançamento devolveria o cheque devolvido ao caixa: +100 outra vez.
  // Captura liquidada nas DUAS portas, com o razão julgado entre elas e no fim.
  const reverseAttempt = await capture(() => entries.reverse(ctx, bounced.bounceEntryId!));
  expectChequeLedgerCoherent({
    status: (await cheques.get(ctx, cheque.id)).status,
    direction: "received",
    amount: 100,
    ...(await chequeLedgerInput(entries, ctx, cheque.id, cheques, account.id)),
    label: "após a tentativa de reverse do contra-lançamento",
  });
  expectRefused(reverseAttempt, 422, "cheque_entry_immutable", "reverse do contra-lançamento do bounce");

  const deleteAttempt = await capture(() => entries.delete(ctx, bounced.bounceEntryId!));
  expectChequeLedgerCoherent({
    status: (await cheques.get(ctx, cheque.id)).status,
    direction: "received",
    amount: 100,
    ...(await chequeLedgerInput(entries, ctx, cheque.id, cheques, account.id)),
    label: "após a tentativa de delete do contra-lançamento",
  });
  expectRefused(deleteAttempt, 422, "cheque_entry_immutable", "delete do contra-lançamento do bounce");

  assert.equal((await entries.balance(ctx, account.id)).balance, 0, "o cheque devolvido tem de continuar valendo ZERO");
});

test("[C2] o guard é ESTREITO: lançamento avulso na mesma conta segue estornável e deletável", async () => {
  const { cheques, accounts, entries } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id, { amount: 100 }));
  await cheques.deposit(ctx, cheque.id);
  await cheques.clear(ctx, cheque.id);

  const avulso = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 15, payment_method: "pix" });
  const contra = await entries.reverse(ctx, avulso.id);
  assert.equal(contra.reversalOf, avulso.id, "o guard do cheque não pode virar parede sobre lançamento alheio");
  const outro = await entries.create(ctx, { account_id: account.id, direction: "in", amount: 5, payment_method: "pix" });
  assert.notEqual((await entries.delete(ctx, outro.id)).deletedAt, undefined);
});

// ------------------------------------------------- B-O6R-02 ciclo 3 · C2 (P5): TABELA POR PONTA
//
// Os casos de recusa deixaram de nomear as pontas à mão e passam a ITERAR a fonte única
// (`CHEQUE_ENTRY_LINK_FIELDS`). Consequência que é o ponto: ponta nova classificada em
// `CHEQUE_FIELD_CLASS` ganha linhas de teste SOZINHA, nas duas rotas — ninguém precisa lembrar de
// escrevê-las. E repositório que deixar de enxergar uma ponta (drill D18) perde a linha dela.

/**
 * Fixtures por ponta. FAIL-CLOSED EM RUNTIME: ponta presente na fonte única e ausente daqui faz o
 * caso FALHAR, não sumir. Um teste que se cala diante de uma ponta desconhecida seria exatamente a
 * classe de defeito que este bloco existe para fechar.
 */
const PONTA_FIXTURES: Record<
  string,
  (deps: ReturnType<typeof setup>, ctx: ChequeActorContext, accountId: string) => Promise<{ entryId: string; chequeId: string }>
> = {
  clearedEntryId: async ({ cheques }, ctx, accountId) => {
    const cheque = await cheques.create(ctx, chequeBody(accountId, { amount: 100 }));
    await cheques.deposit(ctx, cheque.id);
    const cleared = await cheques.clear(ctx, cheque.id);
    return { entryId: cleared.clearedEntryId!, chequeId: cheque.id };
  },
  bounceEntryId: async ({ cheques }, ctx, accountId) => {
    const cheque = await cheques.create(ctx, chequeBody(accountId, { amount: 100 }));
    await cheques.deposit(ctx, cheque.id);
    await cheques.clear(ctx, cheque.id);
    const bounced = await cheques.bounce(ctx, cheque.id, { reason: "sem fundos" });
    return { entryId: bounced.bounceEntryId!, chequeId: cheque.id };
  },
};

for (const ponta of CHEQUE_ENTRY_LINK_FIELDS) {
  for (const rota of ["delete", "reverse"] as const) {
    test(`[C2/P5][memória][ponta:${ponta}][rota:${rota}] lançamento vinculado → 422 cheque_entry_immutable`, async () => {
      const fixture = PONTA_FIXTURES[ponta];
      assert.ok(
        fixture,
        `a ponta '${ponta}' está em CHEQUE_ENTRY_LINK_FIELDS e não tem fixture nesta tabela. ` +
          "Ponta nova entra na fonte única E ganha o estado que a exercita — silenciar aqui recriaria o B-2.",
      );
      const deps = setup();
      const ctx = actor();
      const account = await activeAccount(deps.accounts, ctx);
      const { entryId, chequeId } = await fixture(deps, ctx, account.id);
      assert.ok(entryId, `${ponta}: a fixture tem de produzir o lançamento vinculado`);

      const attempt = await capture(() => deps.entries[rota](ctx, entryId));
      expectRefused(attempt, 422, "cheque_entry_immutable", `${rota} do lançamento da ponta ${ponta}`);
      // A recusa não pode ter mexido em nada: a linha continua viva e o cheque no estado dele.
      assert.equal((await deps.entries.get(ctx, entryId)).deletedAt, undefined, `${ponta}: a linha continua viva`);
      expectChequeLedgerCoherent({
        status: (await deps.cheques.get(ctx, chequeId)).status,
        direction: "received",
        amount: 100,
        ...(await chequeLedgerInput(deps.entries, ctx, chequeId, deps.cheques, account.id)),
        label: `ponta ${ponta} após ${rota} recusado`,
      });
    });
  }
}

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

// pós-análise #4: DTO emite due_date como date-only 'YYYY-MM-DD' (sem hora/ambiguidade de fuso) e omite tenant_id.
test("DTO: due_date date-only, active, sem tenant_id (§2.8)", async () => {
  const { cheques, accounts } = setup();
  const ctx = actor();
  const account = await activeAccount(accounts, ctx);
  const cheque = await cheques.create(ctx, chequeBody(account.id, { due_date: "2026-09-10" }));
  const dto = toChequeDto(cheque) as Record<string, unknown>;
  assert.equal(dto.dueDate, "2026-09-10");
  assert.equal(dto.active, true);
  assert.equal("tenantId" in dto, false);
  assert.equal("deletedAt" in dto, false);
});

test("ChequeError expõe statusCode/reason (contrato HTTP)", async () => {
  const err = new ChequeError(422, "CHEQUE_UNPROCESSABLE", "invalid_transition", "x");
  assert.equal(err.statusCode, 422);
  assert.equal(err.reason, "invalid_transition");
});
