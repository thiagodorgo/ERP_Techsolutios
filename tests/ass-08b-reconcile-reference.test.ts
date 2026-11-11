// B-ASS-08b · conserto da J-530, C2-A4 (plano v2 §3.6, R-WH-5b) — a cobrança RECONSULTADA tem de ser do demonstrativo:
// `lookup.raw.externalReference` (o que o provedor guardou quando NÓS criamos a cobrança: o único criador manda
// `externalReference = statementId`) tem de ser o `statementId` resolvido pelo nosso índice, antes de qualquer efeito.
// Sem banco: falso Asaas + adaptador real + demonstrativo em memória.

import assert from "node:assert/strict";
import test from "node:test";

import { startAsaasFake } from "./helpers/fake-providers/asaas.js";
import { BillingHttpClient } from "../src/modules/subscription-billing/providers/http/billing-http.client.js";
import { AsaasPaymentAdapter } from "../src/modules/subscription-billing/providers/payment/asaas/asaas.adapter.js";
import { InMemoryStatementRepository } from "../src/modules/subscription-billing/statements/statement.repository.js";
import { StatementService } from "../src/modules/subscription-billing/statements/statement.service.js";
import { StatementSettlementService } from "../src/modules/subscription-billing/statements/statement-settlement.service.js";
import { applyReconsultedChargeState } from "../src/modules/subscription-billing/webhooks/reconcile.service.js";

const TENANT = "22222222-2222-4222-8222-222222222222";

async function harness() {
  const fake = await startAsaasFake();
  const adapter = new AsaasPaymentAdapter(
    new BillingHttpClient({ provider: "asaas", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${fake.baseUrl}/v3` }),
    async (k) => (k === "api_token" ? "TOK" : "WHK"),
  );
  const repository = new InMemoryStatementRepository();
  const service = new StatementService(repository, { resolve: async () => ({ kind: "skip" as const, reason: "no_subscription" as const }) }, { record: async () => {} });
  const settlement = new StatementSettlementService(repository, service);
  const closed = async (period: string) =>
    repository.transaction(TENANT, async (tx) => {
      const { statement } = await tx.insertIfAbsentAndLock({ tenantId: TENANT, period });
      return tx.saveStatement({ ...statement, status: "closed", totalCents: 10000, closedAt: new Date() });
    });
  const charge = async (externalReference: string | undefined) => {
    const body: Record<string, unknown> = { customer: "cus_ref", billingType: "PIX", value: 100, dueDate: "2026-11-10" };
    if (externalReference !== undefined) body.externalReference = externalReference;
    const r = await fetch(`${fake.baseUrl}/v3/payments`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const id = ((await r.json()) as { id: string }).id;
    fake.setPaymentStatus(id, "CONFIRMED");
    return id;
  };
  const apply = (statementId: string, chargeId: string) =>
    applyReconsultedChargeState({ ports: { asaas: adapter }, settlement, resolveExpectedCustomerId: async () => "cus_ref" }, { provider: "asaas", tenantId: TENANT, statementId, chargeId });
  return { fake, repository, closed, charge, apply };
}

test("T-WH-5b-1 (C2-A4): a cobrança paga de OUTRO demonstrativo não baixa este — reference_mismatch, nada pago", async () => {
  const h = await harness();
  try {
    const mine = await h.closed("2026-10");
    const other = await h.closed("2026-09");
    const chargeOfOther = await h.charge(other.id);
    const result = await h.apply(mine.id, chargeOfOther);
    assert.deepEqual(result, { outcome: "rejected", reason: "reference_mismatch" });
    const after = await h.repository.findStatement(TENANT, mine.id);
    assert.equal(after?.paidCents, 0);
    assert.equal((await h.repository.listPayments(TENANT, mine.id)).length, 0);
  } finally {
    await h.fake.close();
  }
});

test("T-WH-5b-2 (C2-A4): reconsulta SEM externalReference recusa — reference_missing, nada pago", async () => {
  const h = await harness();
  try {
    const mine = await h.closed("2026-10");
    const result = await h.apply(mine.id, await h.charge(undefined));
    assert.deepEqual(result, { outcome: "rejected", reason: "reference_missing" });
    assert.equal((await h.repository.listPayments(TENANT, mine.id)).length, 0);
  } finally {
    await h.fake.close();
  }
});

test("T-WH-5b-3 (C2-A4, controle): a cobrança do PRÓPRIO demonstrativo baixa normalmente", async () => {
  const h = await harness();
  try {
    const mine = await h.closed("2026-10");
    const result = await h.apply(mine.id, await h.charge(mine.id));
    assert.deepEqual(result, { outcome: "settled" });
    assert.equal((await h.repository.findStatement(TENANT, mine.id))?.status, "paid");
  } finally {
    await h.fake.close();
  }
});
