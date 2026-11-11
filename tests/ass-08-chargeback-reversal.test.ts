// B-ASS-08 · F6 — chargeback/estorno (R-CB-1, D3/R-CB-2) + estorno desconta PRIMEIRO do crédito (D4/R-SET-3) +
// invoice_cancel automático só em reversão TOTAL (R-SET-2). Vermelho-controle: módulos novos não existem em origin/main.

import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryStatementInvoiceRepository } from "../src/modules/subscription-billing/invoices/invoices.repository.js";
import { InMemoryOutboxRepository } from "../src/modules/subscription-billing/outbox/outbox.repository.js";
import { InMemoryStatementRepository } from "../src/modules/subscription-billing/statements/statement.repository.js";
import { StatementService, upToDateStatus } from "../src/modules/subscription-billing/statements/statement.service.js";
import { StatementSettlementService } from "../src/modules/subscription-billing/statements/statement-settlement.service.js";
import { InMemoryWebhookEventRepository } from "../src/modules/subscription-billing/webhooks/webhook-events.repository.js";
import { InMemoryStatementRefRepository } from "../src/modules/subscription-billing/webhooks/statement-refs.repository.js";
import { reconcileWebhookEvent, type ReconcileDeps } from "../src/modules/subscription-billing/webhooks/reconcile.service.js";
import type { ChargeLookup, PaymentMethod, PaymentProviderPort } from "../src/modules/subscription-billing/providers/payment/payment-provider.port.js";
import type { SubscriptionStatement } from "../src/modules/subscription-billing/statements/statement.types.js";

const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const inputsStub = { resolve: async () => ({ kind: "skip" as const, reason: "no_subscription" as const }) };

function make() {
  const repo = new InMemoryStatementRepository();
  const service = new StatementService(repo, inputsStub, { record: async () => {} });
  const settlement = new StatementSettlementService(repo, service);
  return { repo, service, settlement };
}

/** Conserto da J-530: a intenção de nota nasce na transação da reversão — o teste lê a FILA (o dublê do demonstrativo ligado
 * à outbox e à nota do modo memória), em vez de uma ponte chamada pelo reconcile depois. */
function makeWithIntents() {
  const repo = new InMemoryStatementRepository();
  const service = new StatementService(repo, inputsStub, { record: async () => {} });
  const outbox = new InMemoryOutboxRepository({ readStatement: async (tenantId, statementId) => repo.findStatement(tenantId, statementId) });
  const invoices = new InMemoryStatementInvoiceRepository(repo);
  repo.attachChannelStores({ outbox, invoices });
  const settlement = new StatementSettlementService(repo, service, { issueTarget: { provider: "focusnfe", enabled: true }, enabledInvoiceProviders: ["focusnfe"] });
  /** Nota AUTORIZADA de verdade na loja da nota (o espelho `invoiceStatus` deixou de decidir). */
  const authorizeInvoice = async (statementId: string) => {
    const { invoice } = await invoices.beginIssue({ tenantId: TENANT, statementId, seq: 1, provider: "focusnfe", environment: "sandbox", serie: 1 }, new Date());
    await invoices.markAuthorized(TENANT, invoice.id, { pdfSource: "public_url" }, new Date());
  };
  const cancelsOf = async (statementId: string) => (await outbox.listByStatement(TENANT, statementId)).filter((row) => row.kind === "invoice_cancel");
  return { repo, service, settlement, outbox, invoices, authorizeInvoice, cancelsOf };
}

async function closedStatement(repo: InMemoryStatementRepository, totalCents: number, patch: Partial<SubscriptionStatement> = {}): Promise<SubscriptionStatement> {
  return repo.transaction(TENANT, async (tx) => {
    const { statement } = await tx.insertIfAbsentAndLock({ tenantId: TENANT, period: `2026-${String(1 + Math.floor(Math.random() * 9)).padStart(2, "0")}` });
    return tx.saveStatement({ ...statement, status: "closed", chargeStatus: "pending", totalCents, dueDate: "2026-12-10", closedAt: new Date(), ...patch });
  });
}

function portReturning(lookup: ChargeLookup): PaymentProviderPort {
  return {
    ensureCustomer: async () => ({ customerId: "c" }),
    createCharge: async () => ({ chargeId: "x", status: "pending" }),
    getCharge: async () => lookup,
    findChargeByExternalReference: async () => null,
    cancelCharge: async (id) => ({ chargeId: id, status: "cancelled" }),
    refund: async (id) => ({ chargeId: id, status: "refunded" }),
    registerWebhook: async () => ({ externalId: "h" }),
    verifyWebhook: async () => ({ ok: false }),
    supportedMethods: (): readonly PaymentMethod[] => ["pix", "credit_card", "debit_card"],
    describe: () => ({ provider: "asaas", supportedMethods: ["pix"], pendingHomologation: [], webhookRegistration: "api" as const }),
  };
}

test("R-SET-3/D4 pago 120 em saldo 100 + estorno 20 → desconta do crédito; paid_amount 100, segue paid", async () => {
  const { repo, settlement } = make();
  const statement = await closedStatement(repo, 10000);
  await settlement.settle({ tenantId: TENANT, statementId: statement.id, source: "asaas", externalChargeId: "pay_1", paidCents: 12000, method: null, now: new Date() });
  const reversal = await settlement.applyReversal({ tenantId: TENANT, statementId: statement.id, externalChargeId: "pay_1", reversedCents: 2000, kind: "refund", now: new Date() });
  assert.ok("fromApplied" in reversal);
  if (!("fromApplied" in reversal)) return;
  assert.equal(reversal.absorbedByCredit, 2000, "o estorno saiu do crédito, não do aplicado");
  assert.equal(reversal.fromApplied, 0);
  const refreshed = await repo.findStatement(TENANT, statement.id);
  assert.equal(refreshed?.paidCents, 10000, "paid_amount permanece 100");
  assert.equal(refreshed?.status, "paid");
  const credits = await repo.listCredits(TENANT);
  assert.equal(credits[0]?.status, "written_off");
});

test("R-SET-3/D4 pago 200 em saldo 100, crédito aplicado a outro mês, chargeback total → mês seguinte DESAPLICADO e este charged_back", async () => {
  const { repo, service, settlement } = make();
  const thisMonth = await closedStatement(repo, 10000);
  const nextMonth = await repo.transaction(TENANT, async (tx) => {
    const { statement } = await tx.insertIfAbsentAndLock({ tenantId: TENANT, period: "2099-12" });
    return tx.saveStatement({ ...statement, status: "open", totalCents: 10000 });
  });
  await settlement.settle({ tenantId: TENANT, statementId: thisMonth.id, source: "asaas", externalChargeId: "pay_2", paidCents: 20000, method: null, now: new Date() });
  const credit = (await repo.listCredits(TENANT)).find((c) => c.amountCents === 10000)!;
  await service.applyCredit({ tenantId: TENANT, creditId: credit.id, statementId: nextMonth.id, actorId: "u", now: new Date() });
  assert.equal((await repo.findStatement(TENANT, nextMonth.id))?.creditsAppliedCents, 10000);

  await settlement.applyReversal({ tenantId: TENANT, statementId: thisMonth.id, externalChargeId: "pay_2", reversedCents: 20000, kind: "chargeback", now: new Date() });
  assert.equal((await repo.findStatement(TENANT, nextMonth.id))?.creditsAppliedCents, 0, "crédito aplicado foi desfeito");
  const refreshedThis = await repo.findStatement(TENANT, thisMonth.id);
  assert.equal(refreshedThis?.paidCents, 0, "o resto saiu do aplicado");
  assert.equal(refreshedThis?.chargeStatus, "charged_back");
});

function reconcileDeps(repo: InMemoryStatementRepository, settlement: StatementSettlementService, lookup: ChargeLookup) {
  const events = new InMemoryWebhookEventRepository();
  const refs = new InMemoryStatementRefRepository();
  const deps: ReconcileDeps = {
    events,
    refs,
    ports: { asaas: portReturning(lookup) },
    settlement,
  };
  return { events, refs, deps };
}

test("R-CB-1 chargeback pela reconsulta → charged_back, inGoodStanding false (T-CB-1)", async () => {
  const { repo, settlement } = make();
  const statement = await closedStatement(repo, 10000);
  await settlement.settle({ tenantId: TENANT, statementId: statement.id, source: "asaas", externalChargeId: "pay_3", paidCents: 10000, method: null, now: new Date() });
  const { events, refs, deps } = reconcileDeps(repo, settlement, { status: "charged_back", paidCents: 10000, raw: {} });
  await refs.put({ statementId: statement.id, tenantId: TENANT, provider: "asaas" }, new Date());
  await events.insertIfAbsent({ provider: "asaas", externalEventId: "cb_1", bodyDigest: "d", signatureOk: true, externalResourceId: "pay_3", externalReference: statement.id }, new Date());
  assert.equal(await reconcileWebhookEvent(deps, { provider: "asaas", externalEventId: "cb_1" }), "reversed");
  const refreshed = await repo.findStatement(TENANT, statement.id);
  assert.equal(refreshed?.chargeStatus, "charged_back");
  assert.equal(upToDateStatus([refreshed!], new Date()).upToDate, false, "chargeback derruba em dia");
});

test("D3/R-CB-2 disputa de chargeback → chargeback_disputed, NÃO derruba em dia nem cancela nota (T-CB reescrito)", async () => {
  const { repo, settlement, authorizeInvoice, cancelsOf } = makeWithIntents();
  const statement = await closedStatement(repo, 10000);
  await settlement.settle({ tenantId: TENANT, statementId: statement.id, source: "asaas", externalChargeId: "pay_4", paidCents: 10000, method: null, now: new Date() });
  await authorizeInvoice(statement.id);
  const { events, refs, deps } = reconcileDeps(repo, settlement, { status: "chargeback_disputed", disputeWonPending: true, raw: {} });
  await refs.put({ statementId: statement.id, tenantId: TENANT, provider: "asaas" }, new Date());
  await events.insertIfAbsent({ provider: "asaas", externalEventId: "cb_disp", bodyDigest: "d", signatureOk: true, externalResourceId: "pay_4", externalReference: statement.id }, new Date());
  assert.equal(await reconcileWebhookEvent(deps, { provider: "asaas", externalEventId: "cb_disp" }), "disputed");
  const refreshed = await repo.findStatement(TENANT, statement.id);
  assert.equal(refreshed?.chargeStatus, "chargeback_disputed");
  assert.equal(upToDateStatus([refreshed!], new Date()).upToDate, true, "disputa não derruba em dia");
  assert.equal((await cancelsOf(statement.id)).length, 0, "disputa não cancela nota");
});

test("R-SET-2 chargeback com nota authorized → enfileira invoice_cancel; estorno PARCIAL não cancela", async () => {
  // Chargeback total com nota autorizada → cancela.
  const total = makeWithIntents();
  const stmtTotal = await closedStatement(total.repo, 10000);
  await total.settlement.settle({ tenantId: TENANT, statementId: stmtTotal.id, source: "asaas", externalChargeId: "pay_5", paidCents: 10000, method: null, now: new Date() });
  await total.authorizeInvoice(stmtTotal.id);
  const totalCtx = reconcileDeps(total.repo, total.settlement, { status: "charged_back", paidCents: 10000, raw: {} });
  await totalCtx.refs.put({ statementId: stmtTotal.id, tenantId: TENANT, provider: "asaas" }, new Date());
  await totalCtx.events.insertIfAbsent({ provider: "asaas", externalEventId: "cb_full", bodyDigest: "d", signatureOk: true, externalResourceId: "pay_5", externalReference: stmtTotal.id }, new Date());
  await reconcileWebhookEvent(totalCtx.deps, { provider: "asaas", externalEventId: "cb_full" });
  assert.equal((await total.cancelsOf(stmtTotal.id)).length, 1, "chargeback total com nota autorizada cancela a nota (a linha nasce na transação da reversão)");

  // Estorno PARCIAL com nota autorizada → NÃO cancela (R-SET-2/N11).
  const partial = makeWithIntents();
  const stmtPartial = await closedStatement(partial.repo, 10000);
  await partial.settlement.settle({ tenantId: TENANT, statementId: stmtPartial.id, source: "asaas", externalChargeId: "pay_6", paidCents: 10000, method: null, now: new Date() });
  await partial.authorizeInvoice(stmtPartial.id);
  const partialReversal = await partial.settlement.applyReversal({ tenantId: TENANT, statementId: stmtPartial.id, externalChargeId: "pay_6", reversedCents: 3000, kind: "refund", now: new Date() });
  assert.ok("shouldCancelInvoice" in partialReversal && partialReversal.shouldCancelInvoice === false, "estorno parcial não cancela a nota");
  assert.equal((await partial.cancelsOf(stmtPartial.id)).length, 0, "estorno parcial não enfileira invoice_cancel");
  const refreshedPartial = await partial.repo.findStatement(TENANT, stmtPartial.id);
  assert.equal(refreshedPartial?.chargeStatus, "partially_refunded");
  assert.equal(refreshedPartial?.paidCents, 7000);
});

// Regressões da reversão em mais de um passo (o mesmo pagamento revertido duas vezes — webhook de estorno e depois de
// chargeback, ou a reconsulta diária). Vermelho no código anterior: `fromApplied = applied − reversed` contava como
// "saído do aplicado" o que tinha saído do CRÉDITO, e a reconsulta sem valor somava `Number.MAX_SAFE_INTEGER` ao estorno.

test("D4 em dois passos: pago 120 em 100 → estorno de 20 (sai do crédito) → chargeback → paid_amount 0, nunca 20", async () => {
  const { repo, settlement } = make();
  const statement = await closedStatement(repo, 10000);
  await settlement.settle({ tenantId: TENANT, statementId: statement.id, source: "asaas", externalChargeId: "pay_ms", paidCents: 12000, method: null, now: new Date() });
  await settlement.applyReversal({ tenantId: TENANT, statementId: statement.id, externalChargeId: "pay_ms", reversedCents: 2000, kind: "refund", now: new Date() });
  assert.equal((await repo.findStatement(TENANT, statement.id))?.paidCents, 10000, "o 1º estorno saiu do crédito");
  await settlement.applyReversal({ tenantId: TENANT, statementId: statement.id, externalChargeId: "pay_ms", reversedCents: Number.MAX_SAFE_INTEGER, kind: "chargeback", now: new Date() });
  const refreshed = await repo.findStatement(TENANT, statement.id);
  assert.equal(refreshed?.paidCents, 0, "o chargeback tira o aplicado INTEIRO (100), não 80");
  assert.equal(refreshed?.chargeStatus, "charged_back");
  const [payment] = await repo.listPayments(TENANT, statement.id);
  assert.equal(payment?.reversedCents, 12000, "o pagamento fica revertido pelo valor dele, nunca acima");
});

test("idempotência: o mesmo chargeback reconsultado 2× → a 2ª é already_reversed e nada muda", async () => {
  const { repo, settlement } = make();
  const statement = await closedStatement(repo, 10000);
  await settlement.settle({ tenantId: TENANT, statementId: statement.id, source: "asaas", externalChargeId: "pay_id", paidCents: 10000, method: null, now: new Date() });
  await settlement.applyReversal({ tenantId: TENANT, statementId: statement.id, externalChargeId: "pay_id", reversedCents: 10000, kind: "chargeback", now: new Date() });
  const second = await settlement.applyReversal({ tenantId: TENANT, statementId: statement.id, externalChargeId: "pay_id", reversedCents: 10000, kind: "chargeback", now: new Date() });
  assert.deepEqual(second, { kind: "already_reversed" });
  const refreshed = await repo.findStatement(TENANT, statement.id);
  assert.equal(refreshed?.paidCents, 0, "paid_amount não fica negativo nem inflado");
  const [payment] = await repo.listPayments(TENANT, statement.id);
  assert.equal(payment?.reversedCents, 10000, "o estorno não é somado duas vezes");
});

test("reconsulta de estorno SEM valor (Asaas REFUNDED) reverte só o pagamento — nunca soma MAX_SAFE_INTEGER", async () => {
  const { repo, settlement } = make();
  const statement = await closedStatement(repo, 10000);
  await settlement.settle({ tenantId: TENANT, statementId: statement.id, source: "asaas", externalChargeId: "pay_rf", paidCents: 10000, method: null, now: new Date() });
  const { events, refs, deps } = reconcileDeps(repo, settlement, { status: "refunded", raw: {} });
  await refs.put({ statementId: statement.id, tenantId: TENANT, provider: "asaas" }, new Date());
  await events.insertIfAbsent({ provider: "asaas", externalEventId: "rf_1", bodyDigest: "d", signatureOk: true, externalResourceId: "pay_rf", externalReference: statement.id }, new Date());
  assert.equal(await reconcileWebhookEvent(deps, { provider: "asaas", externalEventId: "rf_1" }), "reversed");
  const [payment] = await repo.listPayments(TENANT, statement.id);
  assert.equal(payment?.reversedCents, 10000);
  assert.equal((await repo.findStatement(TENANT, statement.id))?.paidCents, 0);
});
