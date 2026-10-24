import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import {
  createMemoryFinancialAccountService,
  getMemoryFinancialAccountRepositoryForTests,
  resetFinancialAccountRuntimeForTests,
} from "../src/modules/financial-accounts/financial-account.service.js";
import { createMemoryFinancialEntryService, resetFinancialEntryRuntimeForTests } from "../src/modules/financial-entries/financial-entry.service.js";
import {
  createMemoryFinancialTitleService,
  deriveCompetencia,
  getMemoryFinancialPeriodCloseRepositoryForTests,
  getMemoryFinancialTitleRepositoryForTests,
  resetFinancialTitleRuntimeForTests,
  type FinancialTitleService,
} from "../src/modules/financial-titles/index.js";
import {
  ChequeService,
  createMemoryChequeService,
  getMemoryChequeRepositoryForTests,
  resetChequeRuntimeForTests,
  toChequeDto,
  type AccountReader,
} from "../src/modules/cheques/index.js";
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
  // Precedência pública (fast-fail `assertEditable`): fora de `registered`, o estado decide ANTES da validação do título.
  await assert.rejects(() => s.cheques.update(s.ctx, cheque.id, { title_id: randomUUID() }), (e) => domain(e, 422, "cheque_not_editable"));
  assert.equal((await s.cheques.get(s.ctx, cheque.id)).titleId, undefined);
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
  assert.equal((await s.cheques.get(s.ctx, cheque.id)).clearedEntryId, undefined);
  assert.equal((await s.entries.list(s.ctx, { account_id: s.account.id, limit: 100 })).total, 1);
  // T-K8d (H7): a unidade de memória não deixa o título mudar — continua pago só pelo pix.
  const title = await s.titles.get(s.ctx, s.title.id);
  assert.equal(title.paidAmount, 100);
  assert.equal(title.status, "paid");
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

// -----------------------------------------------------------------------------------------------
// B-SAN3-20 — retomada (Claude Opus cobrindo o Codex): os itens de memória do §4.1 que faltavam —
// T-K1d, T-K3c, T-K4 pela porta HTTP, T-K5 (roteiro da reprodução pela porta nova), T-K6b, T-K9a/c
// pela porta HTTP, T-K10d e T-K11d (intercalação determinística), T-K11e intercalado e T-K11f.
// -----------------------------------------------------------------------------------------------

test("K1 (T-K1d): moeda do título diferente da do cheque → 422 currency_mismatch", async () => {
  // Hoje título e conta só aceitam BRL pelas portas públicas (a guarda é rede para quando houver outra moeda); a conta
  // em USD entra direto no repositório de memória para exercitar a recusa do vínculo.
  const s = await seed();
  const usdAccount = await getMemoryFinancialAccountRepositoryForTests().create({
    tenantId: s.ctx.tenantId, name: `Conta USD ${randomUUID()}`, kind: "cash", currency: "USD", openingBalance: 0,
  } as never);
  assert.equal(usdAccount.currency, "USD");
  await assert.rejects(() => s.cheques.create(s.ctx, chequeBody(usdAccount.id, s.title.id)), (e) => domain(e, 422, "currency_mismatch"));
  const cheque = await s.cheques.create(s.ctx, chequeBody(usdAccount.id, undefined));
  await assert.rejects(() => s.cheques.update(s.ctx, cheque.id, { title_id: s.title.id }), (e) => domain(e, 422, "currency_mismatch"));
  assert.equal((await s.cheques.get(s.ctx, cheque.id)).titleId, undefined);
});

test("K3 (T-K3c): a contrapartida da devolução não tem titleId e é imutável nas duas rotas", async () => {
  const s = await seed();
  const cheque = await s.cheques.create(s.ctx, chequeBody(s.account.id, s.title.id));
  await s.cheques.deposit(s.ctx, cheque.id);
  await s.cheques.clear(s.ctx, cheque.id);
  const bounced = await s.cheques.bounce(s.ctx, cheque.id, { reason: "sem fundos" });
  assert.ok(bounced.bounceEntryId);
  const ledger = await s.entries.list(s.ctx, { account_id: s.account.id, limit: 100 });
  const counter = ledger.items.find((entry) => entry.id === bounced.bounceEntryId);
  assert.equal(counter?.titleId, undefined, "a contrapartida da devolução nasce sem titleId (como o estorno)");
  await assert.rejects(() => s.entries.delete(s.ctx, bounced.bounceEntryId!), (e) => domain(e, 422, "cheque_entry_immutable"));
  await assert.rejects(() => s.entries.reverse(s.ctx, bounced.bounceEntryId!), (e) => domain(e, 422, "cheque_entry_immutable"));
  assert.equal((await s.titles.get(s.ctx, s.title.id)).paidAmount, 0);
});

test("K6 (T-K6b): liquidação SEM cheque segue settlement_entry_immutable no DELETE e o reverse continua permitido", async () => {
  const s = await seed();
  const settlement = await s.entries.payTitle(s.ctx, s.title.id, { account_id: s.account.id, amount: 100, payment_method: "pix" });
  await assert.rejects(() => s.entries.delete(s.ctx, settlement.id), (e) => domain(e, 422, "settlement_entry_immutable"));
  await s.entries.reverse(s.ctx, settlement.id);
  const title = await s.titles.get(s.ctx, s.title.id);
  assert.equal(title.paidAmount, 0);
  assert.equal(title.status, "open");
});

test("K10 (T-K10d): PATCH title_id que leu 'registered' e grava DEPOIS do deposit+clear → 422 cheque_not_editable; cheque cleared sem vínculo", async () => {
  const s = await seed();
  const cheque = await s.cheques.create(s.ctx, chequeBody(s.account.id, undefined));
  // Intercalação DETERMINÍSTICA: o PATCH passa o pré-check (`registered`) e fica preso no resolvedor do serviço de
  // títulos (dentro da validação do vínculo) até o deposit + clear terminarem pela porta normal.
  let releasePatch!: () => void;
  const gate = new Promise<void>((resolve) => {
    releasePatch = resolve;
  });
  let patchReachedGate!: () => void;
  const reached = new Promise<void>((resolve) => {
    patchReachedGate = resolve;
  });
  const gatedTitles = async (): Promise<FinancialTitleService> => {
    patchReachedGate();
    await gate;
    return createMemoryFinancialTitleService();
  };
  const accountReader: AccountReader = {
    async findAccount(tenantId, accountId) {
      const account = await getMemoryFinancialAccountRepositoryForTests().findById(tenantId, accountId);
      return account ? { id: account.id, currency: account.currency, isActive: account.isActive, openingBalance: account.openingBalance } : undefined;
    },
  };
  const patcher = new ChequeService(getMemoryChequeRepositoryForTests(), accountReader, undefined, gatedTitles);
  const patch = patcher.update(s.ctx, cheque.id, { title_id: s.title.id }).then(
    () => ({ rejected: false as const, error: undefined }),
    (error: unknown) => ({ rejected: true as const, error }),
  );
  await reached;
  await s.cheques.deposit(s.ctx, cheque.id);
  await s.cheques.clear(s.ctx, cheque.id);
  releasePatch();
  const outcome = await patch;
  assert.ok(outcome.rejected, "o PATCH que perdeu a corrida tinha de RECUSAR");
  assert.ok(domain(outcome.error, 422, "cheque_not_editable"), `motivo errado: ${JSON.stringify(outcome.error)}`);
  const final = await s.cheques.get(s.ctx, cheque.id);
  assert.equal(final.status, "cleared", "o PATCH velho não pode sobrescrever o status");
  assert.equal(final.titleId, undefined, "nunca um vínculo póstumo (o estado de F23)");
  const ledger = await s.entries.list(s.ctx, { account_id: s.account.id, limit: 100 });
  assert.equal(ledger.total, 1);
  assert.equal(ledger.items[0]?.titleId, undefined);
  assert.equal((await s.titles.get(s.ctx, s.title.id)).paidAmount, 0);
  // T-K10e (memória): a escrita direta do repositório depois da compensação casa 0 linhas.
  assert.equal(await getMemoryChequeRepositoryForTests().update({ tenantId: s.ctx.tenantId, chequeId: cheque.id, titleId: s.title.id }), undefined);
  assert.equal(await getMemoryChequeRepositoryForTests().softDelete(s.ctx.tenantId, cheque.id), undefined);
});

test("K11 (T-K11d): changeStatus que leu 'open' perde para a liquidação intercalada → 422 invalid_status_transition; título segue paid", async () => {
  const s = await seed();
  // O serviço lê `open` na chamada (síncrono até o 1º await); a liquidação grava ANTES de ele chegar ao CAS.
  const pending = s.titles.changeStatus(s.ctx, s.title.id, { status: "cancelled" }).then(
    () => ({ rejected: false as const, error: undefined }),
    (error: unknown) => ({ rejected: true as const, error }),
  );
  const paid = await getMemoryFinancialTitleRepositoryForTests().applyPaymentGuarded({ tenantId: s.ctx.tenantId, financialTitleId: s.title.id, amount: 100 });
  assert.equal(paid?.status, "paid");
  const outcome = await pending;
  assert.ok(outcome.rejected, "a transição manual tinha de RECUSAR");
  assert.ok(domain(outcome.error, 422, "invalid_status_transition"), `motivo errado: ${JSON.stringify(outcome.error)}`);
  const title = await s.titles.get(s.ctx, s.title.id);
  assert.equal(title.status, "paid");
  assert.equal(title.paidAmount, 100);
});

test("K11 (T-K11e): svc.applyPayment intercalado com outra liquidação usa o CAS incremental → 422 overpayment, nunca sobrescreve", async () => {
  const s = await seed("receivable", 100);
  const pending = s.titles.applyPayment(s.ctx, s.title.id, 50).then(
    () => ({ rejected: false as const, error: undefined }),
    (error: unknown) => ({ rejected: true as const, error }),
  );
  const other = await getMemoryFinancialTitleRepositoryForTests().applyPaymentGuarded({ tenantId: s.ctx.tenantId, financialTitleId: s.title.id, amount: 60 });
  assert.equal(other?.paidAmount, 60);
  const outcome = await pending;
  assert.ok(outcome.rejected, "60 + 50 > 100: tinha de RECUSAR");
  assert.ok(domain(outcome.error, 422, "overpayment"), `motivo errado: ${JSON.stringify(outcome.error)}`);
  const title = await s.titles.get(s.ctx, s.title.id);
  assert.equal(title.paidAmount, 60, "nunca a sobrescrita absoluta (que gravaria 50 e perderia os 60)");
  assert.equal(title.status, "partially_paid");
});

test("K11 (T-K11f): transições manuais válidas seguem 200 e paid→cancelled segue 422 (precedência inalterada)", async () => {
  const s = await seed();
  for (const status of ["scheduled", "open", "in_dispute", "open", "cancelled"]) {
    assert.equal((await s.titles.changeStatus(s.ctx, s.title.id, { status })).status, status);
  }
  const t = await seed();
  await t.entries.payTitle(t.ctx, t.title.id, { account_id: t.account.id, amount: 100, payment_method: "pix" });
  await assert.rejects(() => t.titles.changeStatus(t.ctx, t.title.id, { status: "cancelled" }), (e) => domain(e, 422, "invalid_status_transition"));
});

// ------------------------------------- porta HTTP (createApp) -------------------------------------

type Api = {
  readonly baseUrl: string;
  readonly tenantA: { readonly id: string };
  readonly tenantB: { readonly id: string };
};

async function withApi(work: (api: Api) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [{ createApp }, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  resetAll();
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "SAN320 HTTP A", modules: ["dashboard", "finance"] });
  const tenantB = core.createTenant({ name: "SAN320 HTTP B", modules: ["dashboard", "finance"] });
  const server: Server = createApp(new MemoryCoreSaasAdapter(core)).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
  try {
    await work({ baseUrl, tenantA, tenantB });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    resetAll();
  }
}

function headersFor(tenant: { readonly id: string }, role = "finance"): Record<string, string> {
  return { "content-type": "application/json", "x-tenant-id": tenant.id, "x-user-id": randomUUID(), "x-role": role };
}

async function call(api: Api, tenant: { readonly id: string }, method: string, path: string, body?: unknown) {
  const response = await fetch(`${api.baseUrl}${path}`, { method, headers: headersFor(tenant), body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function httpSeed(api: Api, direction: "receivable" | "payable", amount = 100) {
  const account = (await call(api, api.tenantA, "POST", "/financial-accounts", { name: `Conta ${randomUUID()}` })).body.data;
  const title = (await call(api, api.tenantA, "POST", "/financial-titles", {
    direction, party_type: direction === "receivable" ? "customer" : "supplier", party_name: "Parte HTTP", amount, due_date: "2026-12-01",
  })).body.data;
  return { account, title };
}

test("K4 (T-K4a/T-K4b, HTTP): /financial-titles/:id/pay e /financial-entries com check → 422 cheque_required; título e razão intactos", async () => {
  await withApi(async (api) => {
    const { account, title } = await httpSeed(api, "receivable");
    const pay = await call(api, api.tenantA, "POST", `/financial-titles/${title.id}/pay`, { account_id: account.id, amount: 100, payment_method: "check" });
    assert.equal(pay.status, 422);
    assert.equal(pay.body.error.reason, "cheque_required");
    const entry = await call(api, api.tenantA, "POST", "/financial-entries", { account_id: account.id, direction: "in", amount: 100, payment_method: "check" });
    assert.equal(entry.status, 422);
    assert.equal(entry.body.error.reason, "cheque_required");
    const after = (await call(api, api.tenantA, "GET", `/financial-titles/${title.id}`)).body.data;
    assert.equal(after.paidAmount, 0);
    assert.equal(after.status, "open");
    const balance = (await call(api, api.tenantA, "GET", `/financial-accounts/${account.id}/balance`)).body.data;
    assert.equal(balance.balance, 0);
    // T-K4c: os outros métodos seguem iguais pela mesma porta.
    const pix = await call(api, api.tenantA, "POST", `/financial-titles/${title.id}/pay`, { account_id: account.id, amount: 100, payment_method: "transfer" });
    assert.equal(pix.status, 201);
  });
});

// T-K5 — o roteiro da reprodução (`B-SAN3-20-repro-http.ts`) refeito pela porta nova: cheque VINCULADO, as duas ordens.
async function k5Scenario(api: Api, direction: "receivable" | "payable", order: "pay-clear" | "clear-pay") {
  const { account, title } = await httpSeed(api, direction);
  const cheque = (await call(api, api.tenantA, "POST", "/cheques", {
    account_id: account.id, title_id: title.id, direction: direction === "receivable" ? "received" : "issued",
    cheque_number: `K5-${order}`, bank: "Banco K5", amount: 100,
  })).body.data;
  assert.equal(cheque.titleId, title.id);
  assert.equal((await call(api, api.tenantA, "POST", `/cheques/${cheque.id}/deposit`, {})).status, 200);
  const pay = () => call(api, api.tenantA, "POST", `/financial-titles/${title.id}/pay`, { account_id: account.id, amount: 100, payment_method: "check" });
  const clear = () => call(api, api.tenantA, "POST", `/cheques/${cheque.id}/clear`, {});
  const first = await (order === "pay-clear" ? pay() : clear());
  const second = await (order === "pay-clear" ? clear() : pay());
  const [payResult, clearResult] = order === "pay-clear" ? [first, second] : [second, first];
  const label = `${direction}/${order}`;
  assert.equal(clearResult.status, 200, `${label}: o /clear compensa e liquida`);
  // Com o cheque vinculado, a 2ª porta é recusada: antes da compensação por cheque_required; depois dela, o título
  // já está pago e a identidade do título decide primeiro (precedência do §1).
  assert.equal(payResult.status, 422, `${label}: /pay(check) recusado`);
  assert.equal(payResult.body.error.reason, order === "pay-clear" ? "cheque_required" : "title_already_paid", `${label}: motivo`);
  const finalTitle = (await call(api, api.tenantA, "GET", `/financial-titles/${title.id}`)).body.data;
  const balance = (await call(api, api.tenantA, "GET", `/financial-accounts/${account.id}/balance`)).body.data;
  const ledger = (await call(api, api.tenantA, "GET", `/financial-entries?account_id=${account.id}`)).body;
  assert.equal(finalTitle.paidAmount, 100, `${label}: paid_amount`);
  assert.equal(finalTitle.status, "paid", `${label}: status`);
  assert.equal(balance.balance, direction === "receivable" ? 100 : -100, `${label}: saldo pela rota real`);
  assert.equal(ledger.items.length, 1, `${label}: exatamente 1 lançamento`);
  assert.equal(ledger.items[0].titleId, title.id, `${label}: o lançamento da compensação É o da liquidação`);
  return { order, direction, statuses: [first.status, second.status], paidAmount: finalTitle.paidAmount, balance: balance.balance, entries: ledger.items.length };
}

test("K5 (T-K5, HTTP): receivable — pagar primeiro e compensar primeiro dão +100, 1 lançamento, título pago", async () => {
  await withApi(async (api) => {
    await k5Scenario(api, "receivable", "pay-clear");
    await k5Scenario(api, "receivable", "clear-pay");
  });
});

test("K5 (T-K5, HTTP): payable — pagar primeiro e compensar primeiro dão −100, 1 lançamento, título pago", async () => {
  await withApi(async (api) => {
    await k5Scenario(api, "payable", "pay-clear");
    await k5Scenario(api, "payable", "clear-pay");
  });
});

test("K9 (T-K9a, HTTP): outra organização não vê nem mexe — filtro vazio, PATCH de cheque 404, PATCH /status de título 404", async () => {
  await withApi(async (api) => {
    const { account, title } = await httpSeed(api, "receivable");
    const cheque = (await call(api, api.tenantA, "POST", "/cheques", {
      account_id: account.id, title_id: title.id, direction: "received", cheque_number: "K9A", bank: "Banco K9", amount: 100,
    })).body.data;
    const list = await call(api, api.tenantB, "GET", `/cheques?title_id=${title.id}`);
    assert.equal(list.status, 200);
    assert.equal(list.body.items.length, 0);
    const patch = await call(api, api.tenantB, "PATCH", `/cheques/${cheque.id}`, { title_id: null });
    assert.equal(patch.status, 404);
    assert.equal(patch.body.error.reason, "cheque_not_found");
    const status = await call(api, api.tenantB, "PATCH", `/financial-titles/${title.id}/status`, { status: "cancelled" });
    assert.equal(status.status, 404);
    assert.equal(status.body.error.reason, "title_not_found");
    const own = (await call(api, api.tenantA, "GET", `/cheques/${cheque.id}`)).body.data;
    assert.equal(own.titleId, title.id);
    assert.equal((await call(api, api.tenantA, "GET", `/financial-titles/${title.id}`)).body.data.status, "open");
  });
});

test("K9 (T-K9c, HTTP): o 400 do título de outra organização é idêntico ao de um id inexistente; auditoria sem titleId nem valor", async () => {
  await withApi(async (api) => {
    const own = await httpSeed(api, "receivable");
    const foreignTitle = (await call(api, api.tenantB, "POST", "/financial-titles", {
      direction: "receivable", party_type: "customer", party_name: "Outra", amount: 100, due_date: "2026-12-01",
    })).body.data;
    const missing = randomUUID();
    const attempt = (titleId: string) => call(api, api.tenantA, "POST", "/cheques", {
      account_id: own.account.id, title_id: titleId, direction: "received", cheque_number: "K9C", bank: "Banco K9", amount: 100,
    });
    const foreign = await attempt(foreignTitle.id);
    const absent = await attempt(missing);
    assert.equal(foreign.status, 400);
    assert.equal(foreign.body.error.reason, "invalid_title_reference");
    assert.deepEqual(foreign.body, absent.body, "o corpo não pode distinguir 'de outra organização' de 'não existe'");
    const created = (await call(api, api.tenantA, "POST", "/cheques", {
      account_id: own.account.id, title_id: own.title.id, direction: "received", cheque_number: "K9C-ok", bank: "Banco K9", amount: 100,
    })).body.data;
    assert.equal(created.titleId, own.title.id);
    // Auditoria: em memória `recordRequestAuditBestEffort` não grava (só Prisma); os metadados são o literal fixo
    // `{direction, status}` de `cheque.controller.ts`, que este bloco não toca (conferido por `git diff` no relatório).
  });
});
