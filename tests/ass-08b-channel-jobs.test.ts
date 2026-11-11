// B-ASS-08b · (c) — os executores dos 4 jobs do canal (dublê em memória). Vermelho-controle: `outbox/channel.jobs.ts` não
// existe na parte 1. Provam: dispatch grava a cobrança e o índice; poll-pending retoma evento órfão (R-WH-8) e cobrança
// pendente sem evento; poll-settled pega chargeback tardio (G9) UMA vez; provedor desligado nunca é alcançado (R-OBX-4).

import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryOutboxRepository } from "../src/modules/subscription-billing/outbox/outbox.repository.js";
import { InMemoryStatementChargeRepository } from "../src/modules/subscription-billing/charges/charges.repository.js";
import { InMemoryStatementRepository } from "../src/modules/subscription-billing/statements/statement.repository.js";
import { StatementService } from "../src/modules/subscription-billing/statements/statement.service.js";
import { StatementSettlementService } from "../src/modules/subscription-billing/statements/statement-settlement.service.js";
import { InMemoryWebhookEventRepository } from "../src/modules/subscription-billing/webhooks/webhook-events.repository.js";
import { InMemoryStatementRefRepository } from "../src/modules/subscription-billing/webhooks/statement-refs.repository.js";
import {
  POLL_PENDING_STALE_MS,
  runBillingDispatch,
  runBillingPollPending,
  runBillingPollSettled,
  type ChannelDeps,
} from "../src/modules/subscription-billing/outbox/channel.jobs.js";
import type { ChargeLookup, ChargeResult, PaymentMethod, PaymentProviderPort } from "../src/modules/subscription-billing/providers/payment/payment-provider.port.js";
import type { SubscriptionStatement } from "../src/modules/subscription-billing/statements/statement.types.js";

const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const NOW = new Date("2026-12-10T12:00:00Z");
const OLD = new Date(NOW.getTime() - POLL_PENDING_STALE_MS - 60_000);

/** Porta falsa: a reconsulta devolve o estado programado e conta as chamadas (o `recorded[]` sem rede). */
class ScriptedPort implements PaymentProviderPort {
  lookups = 0;
  created = 0;
  constructor(private lookup: ChargeLookup) {}
  setLookup(lookup: ChargeLookup) {
    this.lookup = lookup;
  }
  async ensureCustomer() { return { customerId: "cus_1" }; }
  async createCharge(): Promise<ChargeResult> {
    this.created += 1;
    return { chargeId: `pay_${this.created}`, status: "pending", payUrl: "https://pay.example/x", pixCopyPaste: "00020..." };
  }
  async getCharge() { this.lookups += 1; return this.lookup; }
  async findChargeByExternalReference() { return null; }
  async cancelCharge(id: string) { return { chargeId: id, status: "cancelled" as const }; }
  async refund(id: string) { return { chargeId: id, status: "refunded" as const }; }
  async registerWebhook() { return { externalId: "h" }; }
  async verifyWebhook() { return { ok: false }; }
  supportedMethods(): readonly PaymentMethod[] { return ["pix", "credit_card", "debit_card"]; }
  describe() { return { provider: "asaas", supportedMethods: this.supportedMethods(), pendingHomologation: [], webhookRegistration: "api" as const }; }
}

function harness(ports: Record<string, PaymentProviderPort>) {
  const statements = new InMemoryStatementRepository(() => NOW);
  const service = new StatementService(statements, { resolve: async () => ({ kind: "skip" as const, reason: "no_subscription" as const }) }, { record: async () => {} });
  const deps: ChannelDeps = {
    outbox: new InMemoryOutboxRepository({
      // R-OBX-5 (2º conserto do #522): o dublê lê o demonstrativo do MESMO repositório; `totalCents` é o V da adoção.
      readStatement: async (tenantId, statementId) => {
        const statement = await statements.findStatement(tenantId, statementId);
        return statement && { status: statement.status, reopenedAt: statement.reopenedAt, totalCents: statement.totalCents };
      },
      clock: () => NOW,
    }),
    events: new InMemoryWebhookEventRepository(),
    refs: new InMemoryStatementRefRepository(),
    charges: new InMemoryStatementChargeRepository(),
    ports,
    // R-PRF-1: o cliente vem do perfil (aqui, resolvido); o payload nunca o decide.
    resolveCustomer: async () => ({ ok: true, customerId: "cus_1" }),
    settlement: new StatementSettlementService(statements, service),
    statements,
    now: () => NOW,
  };
  return { deps, statements };
}

async function closedStatement(statements: InMemoryStatementRepository, totalCents: number, patch: Partial<SubscriptionStatement> = {}) {
  return statements.transaction(TENANT, async (tx) => {
    const { statement } = await tx.insertIfAbsentAndLock({ tenantId: TENANT, period: `2026-${String(1 + Math.floor(Math.random() * 9)).padStart(2, "0")}` });
    return tx.saveStatement({ ...statement, status: "closed", chargeStatus: "pending", totalCents, dueDate: "2026-12-10", closedAt: OLD, ...patch });
  });
}

test("dispatch: cria a cobrança, grava subscription_statement_charges (pending, payUrl) e o id no índice", async () => {
  const port = new ScriptedPort({ status: "pending", raw: {} });
  const { deps, statements } = harness({ asaas: port });
  const statement = await closedStatement(statements, 10000);
  await deps.refs.put({ statementId: statement.id, tenantId: TENANT, provider: "asaas" }, OLD);
  await deps.outbox.enqueue({ tenantId: TENANT, statementId: statement.id, kind: "charge_create", provider: "asaas", seq: 1, payload: { customerId: "cus_1", amountCents: 10000, dueDate: "2026-12-10", method: "pix" } }, NOW);
  const result = await runBillingDispatch(deps);
  assert.equal(result.outcomes.sent, 1);
  const [charge] = await deps.charges.listByStatement(TENANT, statement.id);
  assert.equal(charge?.status, "pending");
  assert.equal(charge?.payUrl, "https://pay.example/x");
  assert.equal(charge?.dueDate, "2026-12-10");
  assert.equal((await deps.refs.resolve(statement.id))?.externalChargeId, "pay_1", "o id do provedor entra no índice");
});

test("poll-pending (a): evento received órfão há > 30 min é reconciliado (R-WH-8); o recente não é tocado", async () => {
  const port = new ScriptedPort({ status: "paid", paidCents: 10000, raw: {} });
  const { deps, statements } = harness({ asaas: port });
  const statement = await closedStatement(statements, 10000);
  await deps.refs.put({ statementId: statement.id, tenantId: TENANT, provider: "asaas" }, OLD);
  const old = await deps.events.insertIfAbsent({ provider: "asaas", externalEventId: "evt_old", bodyDigest: "d", signatureOk: true, externalResourceId: "pay_1", externalReference: statement.id }, OLD);
  const fresh = await deps.events.insertIfAbsent({ provider: "asaas", externalEventId: "evt_new", bodyDigest: "d", signatureOk: true, externalResourceId: "pay_2", externalReference: statement.id }, NOW);
  const result = await runBillingPollPending(deps);
  assert.equal(result.events, 1, "só o órfão");
  assert.equal((await deps.events.find("asaas", old.event.externalEventId))?.status, "processed");
  assert.equal((await deps.events.find("asaas", fresh.event.externalEventId))?.status, "received", "o recente espera o job dele");
  assert.equal((await statements.findStatement(TENANT, statement.id))?.status, "paid");
});

test("poll-pending (b): cobrança pending sem evento há > 30 min é reconsultada; reconsulta paga → baixa", async () => {
  const port = new ScriptedPort({ status: "paid", paidCents: 10000, raw: {} });
  const { deps, statements } = harness({ asaas: port });
  const statement = await closedStatement(statements, 10000);
  await deps.refs.put({ statementId: statement.id, tenantId: TENANT, provider: "asaas", externalChargeId: "pay_9" }, OLD);
  const result = await runBillingPollPending(deps);
  assert.equal(result.charges, 1);
  assert.equal(port.lookups, 1, "uma reconsulta");
  assert.equal((await statements.findStatement(TENANT, statement.id))?.status, "paid");
});

test("poll-settled: chargeback tardio (sem evento) reverte UMA vez — a 2ª rodada não estorna de novo (idempotente)", async () => {
  const port = new ScriptedPort({ status: "paid", paidCents: 10000, raw: {} });
  const { deps, statements } = harness({ asaas: port });
  const statement = await closedStatement(statements, 10000);
  await deps.refs.put({ statementId: statement.id, tenantId: TENANT, provider: "asaas", externalChargeId: "pay_cb" }, OLD);
  await deps.settlement.settle({ tenantId: TENANT, statementId: statement.id, source: "asaas", externalChargeId: "pay_cb", paidCents: 10000, method: null, now: NOW });
  assert.equal((await statements.findStatement(TENANT, statement.id))?.chargeStatus, "confirmed");

  port.setLookup({ status: "charged_back", raw: {} });
  const first = await runBillingPollSettled(deps);
  assert.equal(first.outcomes.reversed, 1);
  const afterFirst = await statements.findStatement(TENANT, statement.id);
  assert.equal(afterFirst?.chargeStatus, "charged_back");
  assert.equal(afterFirst?.paidCents, 0);

  // 2ª rodada no dia seguinte: o demonstrativo já não está em estado "confirmado" → nada a reconsultar.
  const second = await runBillingPollSettled(deps);
  assert.equal(second.charges, 0);
  const [payment] = await statements.listPayments(TENANT, statement.id);
  assert.equal(payment?.reversedCents, 10000, "estornado uma vez só");
});

test("R-OBX-4 provedor desligado (fora das portas) nunca é alcançado pelos polls nem pelo dispatch", async () => {
  const asaas = new ScriptedPort({ status: "paid", paidCents: 10000, raw: {} });
  const { deps, statements } = harness({}); // nenhum provedor ligado
  const statement = await closedStatement(statements, 10000);
  await deps.refs.put({ statementId: statement.id, tenantId: TENANT, provider: "asaas", externalChargeId: "pay_off" }, OLD);
  await deps.events.insertIfAbsent({ provider: "asaas", externalEventId: "evt_off", bodyDigest: "d", signatureOk: true, externalResourceId: "pay_off", externalReference: statement.id }, OLD);
  await deps.outbox.enqueue({ tenantId: TENANT, statementId: statement.id, kind: "charge_create", provider: "asaas", seq: 1, payload: {} }, NOW);
  const pending = await runBillingPollPending(deps);
  const settled = await runBillingPollSettled(deps);
  const dispatch = await runBillingDispatch(deps);
  assert.equal(pending.events + pending.charges + settled.charges + dispatch.processed, 0);
  assert.equal(asaas.lookups + asaas.created, 0, "zero chamada ao provedor desligado");
  assert.equal((await deps.events.find("asaas", "evt_off"))?.status, "received", "o evento espera o canal religar");
});

test("G12: o resolver do despacho guarda o cliente do provedor no perfil; perfil incompleto não grava; e o R-WH-5 passa a conferir", async () => {
  const { InMemoryProviderCustomerStore, persistingCustomerResolver } = await import("../src/modules/subscription-billing/charges/provider-customer.store.js");
  const store = new InMemoryProviderCustomerStore();
  const port = new ScriptedPort({ status: "paid", paidCents: 10000, raw: { customer: "cus_OUTRO" } });
  const row = { tenantId: TENANT, provider: "asaas" } as never;
  const ok = persistingCustomerResolver(async () => ({ ok: true, customerId: "cus_1" }), store);
  assert.deepEqual(await ok(row, port), { ok: true, customerId: "cus_1" });
  assert.equal(await store.get(TENANT, "asaas"), "cus_1", "o id do provedor ficou no perfil");
  const incomplete = persistingCustomerResolver(async () => ({ ok: false, missing: ["document"] }), store);
  assert.deepEqual(await incomplete({ tenantId: "outra", provider: "asaas" } as never, port), { ok: false, missing: ["document"] });
  assert.equal(await store.get("outra", "asaas"), null, "perfil incompleto não grava nada");
  await store.set(TENANT, "provedor-sem-coluna", "x", NOW);
  assert.equal(await store.get(TENANT, "provedor-sem-coluna"), null, "lista fechada de provedores");

  // R-WH-5 com o id guardado: a reconsulta traz OUTRO cliente → rejeitada, sem baixa.
  const { deps, statements } = harness({ asaas: port });
  const statement = await closedStatement(statements, 10000);
  await deps.refs.put({ statementId: statement.id, tenantId: TENANT, provider: "asaas", externalChargeId: "pay_g12" }, OLD);
  const result = await runBillingPollPending({ ...deps, resolveExpectedCustomerId: (tenantId, provider) => store.get(tenantId, provider) });
  assert.equal(result.outcomes.rejected, 1, "cliente da cobrança ≠ cliente guardado → rejeitada");
  assert.equal((await statements.findStatement(TENANT, statement.id))?.status, "closed", "nenhuma baixa");
});
