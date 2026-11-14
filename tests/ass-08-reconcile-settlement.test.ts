// B-ASS-08 · F5 — reconcile por `billing_statement_refs` + baixa automática + créditos (R-WH-3/4/5, R-SET-1).
// Vermelho-controle: `reconcile.service.ts` e `statement-settlement.service.ts` não existem em origin/main.

import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryStatementRepository } from "../src/modules/subscription-billing/statements/statement.repository.js";
import { StatementService } from "../src/modules/subscription-billing/statements/statement.service.js";
import { StatementSettlementService } from "../src/modules/subscription-billing/statements/statement-settlement.service.js";
import { InMemoryWebhookEventRepository } from "../src/modules/subscription-billing/webhooks/webhook-events.repository.js";
import { InMemoryStatementRefRepository } from "../src/modules/subscription-billing/webhooks/statement-refs.repository.js";
import { reconcileWebhookEvent, type ReconcileDeps } from "../src/modules/subscription-billing/webhooks/reconcile.service.js";
import type { ChargeLookup, PaymentMethod, PaymentProviderPort } from "../src/modules/subscription-billing/providers/payment/payment-provider.port.js";
import type { SubscriptionStatement } from "../src/modules/subscription-billing/statements/statement.types.js";

const TENANT_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const inputsStub = { resolve: async () => ({ kind: "skip" as const, reason: "no_subscription" as const }) };

function makeStatements(): { repo: InMemoryStatementRepository; service: StatementService; settlement: StatementSettlementService } {
  const repo = new InMemoryStatementRepository();
  const service = new StatementService(repo, inputsStub, { record: async () => {} });
  const settlement = new StatementSettlementService(repo, service);
  return { repo, service, settlement };
}

/** Cria um demonstrativo `closed` com total dado (sem passar pelo fechamento — isola a baixa). */
async function closedStatement(repo: InMemoryStatementRepository, tenantId: string, totalCents: number): Promise<SubscriptionStatement> {
  return repo.transaction(tenantId, async (tx) => {
    const { statement } = await tx.insertIfAbsentAndLock({ tenantId, period: "2026-11" });
    return tx.saveStatement({ ...statement, status: "closed", chargeStatus: "pending", totalCents, dueDate: "2026-12-10", closedAt: new Date() });
  });
}

/** Porta de pagamento falsa cuja reconsulta (`getCharge`) devolve o estado programado. */
function portReturning(lookup: ChargeLookup): PaymentProviderPort {
  return {
    ensureCustomer: async () => ({ customerId: "c" }),
    createCharge: async () => ({ chargeId: "x", status: "pending" }),
    getCharge: async () => lookup,
    listChargesByExternalReference: async () => [],
    cancelCharge: async (id) => ({ chargeId: id, status: "cancelled" }),
    refund: async (id) => ({ chargeId: id, status: "refunded" }),
    registerWebhook: async () => ({ externalId: "h" }),
    verifyWebhook: async () => ({ ok: false }),
    supportedMethods: (): readonly PaymentMethod[] => ["pix", "credit_card", "debit_card"],
    describe: () => ({ provider: "asaas", supportedMethods: ["pix"], pendingHomologation: [], webhookRegistration: "api" as const }),
  };
}

test("R-SET-1 excedente vira crédito: pago 120 em saldo 100 → applied 100 + crédito 20, status paid (T-SET-10)", async () => {
  const { repo, settlement } = makeStatements();
  const statement = await closedStatement(repo, TENANT_A, 10000);
  const result = await settlement.settle({ tenantId: TENANT_A, statementId: statement.id, source: "asaas", externalChargeId: "pay_1", paidCents: 12000, method: null, now: new Date() });
  assert.equal(result.kind, "settled");
  if (result.kind !== "settled") return;
  assert.equal(result.statement.status, "paid");
  assert.equal(result.statement.paidCents, 10000);
  assert.equal(result.payment.appliedCents, 10000);
  assert.equal(result.credit?.amountCents, 2000);
  assert.equal(result.credit?.reason, "overpayment");
});

test("R-WH-3/D6 parcial 60 → quitação 100 em saldo 100 → 1 linha, paid_amount 100, paid (T-WH-31)", async () => {
  const { repo, settlement } = makeStatements();
  const statement = await closedStatement(repo, TENANT_A, 10000);
  const first = await settlement.settle({ tenantId: TENANT_A, statementId: statement.id, source: "asaas", externalChargeId: "pay_1", paidCents: 6000, method: null, now: new Date() });
  assert.equal(first.kind, "settled");
  const second = await settlement.settle({ tenantId: TENANT_A, statementId: statement.id, source: "asaas", externalChargeId: "pay_1", paidCents: 10000, method: null, now: new Date() });
  assert.equal(second.kind, "settled");
  const payments = await repo.listPayments(TENANT_A, statement.id);
  assert.equal(payments.length, 1, "uma única linha de pagamento para a mesma cobrança");
  assert.equal(payments[0]?.amountCents, 10000);
  assert.equal(payments[0]?.appliedCents, 10000);
  const refreshed = await repo.findStatement(TENANT_A, statement.id);
  assert.equal(refreshed?.paidCents, 10000);
  assert.equal(refreshed?.status, "paid");
});

test("R-WH-3/D6 monotônico: paidCents menor na reconsulta → ignorado, não baixa o saldo", async () => {
  const { repo, settlement } = makeStatements();
  const statement = await closedStatement(repo, TENANT_A, 10000);
  await settlement.settle({ tenantId: TENANT_A, statementId: statement.id, source: "asaas", externalChargeId: "pay_1", paidCents: 10000, method: null, now: new Date() });
  const lower = await settlement.settle({ tenantId: TENANT_A, statementId: statement.id, source: "asaas", externalChargeId: "pay_1", paidCents: 6000, method: null, now: new Date() });
  assert.equal(lower.kind, "ignored");
  const refreshed = await repo.findStatement(TENANT_A, statement.id);
  assert.equal(refreshed?.paidCents, 10000);
});

function makeReconcileDeps(repo: InMemoryStatementRepository, settlement: StatementSettlementService, lookup: ChargeLookup, expectedCustomer?: string | null) {
  const events = new InMemoryWebhookEventRepository();
  const refs = new InMemoryStatementRefRepository();
  const deps: ReconcileDeps = {
    events,
    refs,
    ports: { asaas: portReturning(lookup) },
    settlement,
    resolveExpectedCustomerId: expectedCustomer === undefined ? undefined : async () => expectedCustomer,
  };
  return { events, refs, deps };
}

test("R-WH-4 o corpo não decide: webhook 'pago' + reconsulta pending → sem baixa, evento ignored (T-WH-21)", async () => {
  const { repo, settlement } = makeStatements();
  const statement = await closedStatement(repo, TENANT_A, 10000);
  const { events, refs, deps } = makeReconcileDeps(repo, settlement, { status: "pending", raw: { externalReference: statement.id } });
  await refs.put({ statementId: statement.id, tenantId: TENANT_A, provider: "asaas" }, new Date());
  const { event } = await events.insertIfAbsent({ provider: "asaas", externalEventId: "evt_1", bodyDigest: "d", signatureOk: true, externalResourceId: "pay_1", externalReference: statement.id }, new Date());
  const outcome = await reconcileWebhookEvent(deps, { provider: "asaas", externalEventId: "evt_1" });
  assert.equal(outcome, "ignored");
  assert.equal((await events.find("asaas", "evt_1"))?.status, "ignored");
  assert.equal((await repo.listPayments(TENANT_A, statement.id)).length, 0, "nenhuma baixa quando a reconsulta diz pending");
});

test("R-WH-5 organização pelo nosso id: reconsulta paga baixa na dona do statement_id (T-WH-22)", async () => {
  const { repo, settlement } = makeStatements();
  const statement = await closedStatement(repo, TENANT_A, 10000);
  const { events, refs, deps } = makeReconcileDeps(repo, settlement, { status: "paid", paidCents: 10000, raw: { customer: "cus_A", externalReference: statement.id } });
  await refs.put({ statementId: statement.id, tenantId: TENANT_A, provider: "asaas" }, new Date());
  await events.insertIfAbsent({ provider: "asaas", externalEventId: "evt_1", bodyDigest: "d", signatureOk: true, externalResourceId: "pay_1", externalReference: statement.id }, new Date());
  const outcome = await reconcileWebhookEvent(deps, { provider: "asaas", externalEventId: "evt_1" });
  assert.equal(outcome, "settled");
  const resolved = await events.find("asaas", "evt_1");
  assert.equal(resolved?.resolvedTenantId, TENANT_A);
  assert.equal(resolved?.status, "processed");
  assert.equal((await repo.findStatement(TENANT_A, statement.id))?.status, "paid");
});

test("R-WH-5 customer id divergente → rejected, sem baixa (T-WH-23)", async () => {
  const { repo, settlement } = makeStatements();
  const statement = await closedStatement(repo, TENANT_A, 10000);
  const { events, refs, deps } = makeReconcileDeps(repo, settlement, { status: "paid", paidCents: 10000, raw: { customer: "cus_OUTRO", externalReference: statement.id } }, "cus_A");
  await refs.put({ statementId: statement.id, tenantId: TENANT_A, provider: "asaas" }, new Date());
  await events.insertIfAbsent({ provider: "asaas", externalEventId: "evt_1", bodyDigest: "d", signatureOk: true, externalResourceId: "pay_1", externalReference: statement.id }, new Date());
  const outcome = await reconcileWebhookEvent(deps, { provider: "asaas", externalEventId: "evt_1" });
  assert.equal(outcome, "rejected");
  assert.equal((await events.find("asaas", "evt_1"))?.status, "rejected");
  assert.equal((await repo.listPayments(TENANT_A, statement.id)).length, 0);
});

test("R-WH-3 replay: mesmo evento reconciliado 2× → a 2ª é no_op (dedupe por status)", async () => {
  const { repo, settlement } = makeStatements();
  const statement = await closedStatement(repo, TENANT_A, 10000);
  const { events, refs, deps } = makeReconcileDeps(repo, settlement, { status: "paid", paidCents: 10000, raw: { customer: "cus_A", externalReference: statement.id } });
  await refs.put({ statementId: statement.id, tenantId: TENANT_A, provider: "asaas" }, new Date());
  await events.insertIfAbsent({ provider: "asaas", externalEventId: "evt_1", bodyDigest: "d", signatureOk: true, externalResourceId: "pay_1", externalReference: statement.id }, new Date());
  assert.equal(await reconcileWebhookEvent(deps, { provider: "asaas", externalEventId: "evt_1" }), "settled");
  assert.equal(await reconcileWebhookEvent(deps, { provider: "asaas", externalEventId: "evt_1" }), "no_op");
  assert.equal((await repo.listPayments(TENANT_A, statement.id)).length, 1);
});

test("R-SET-1 baixa automática em paid → crédito paid_after_manual_settlement (T-SET-11)", async () => {
  const { repo, settlement } = makeStatements();
  const statement = await closedStatement(repo, TENANT_A, 10000);
  // já pago por baixa manual: marca paid.
  await repo.transaction(TENANT_A, async (tx) => {
    const current = (await tx.lockById(statement.id))!;
    await tx.saveStatement({ ...current, status: "paid", paidCents: 10000, paidAt: new Date() });
  });
  const result = await settlement.settle({ tenantId: TENANT_A, statementId: statement.id, source: "asaas", externalChargeId: "pay_late", paidCents: 10000, method: null, now: new Date() });
  assert.equal(result.kind, "settled");
  if (result.kind !== "settled") return;
  assert.equal(result.credit?.reason, "paid_after_manual_settlement");
  assert.equal(result.credit?.amountCents, 10000);
});
