// B-ASS-08 · F7 — cobrança gravada (G11), `payment` do cliente SEM dinheiro (R-CHG-1) e gate de perfil (R-PRF-1).
// Vermelho-controle: `charges/**` não existe em origin/main.

import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryOutboxRepository } from "../src/modules/subscription-billing/outbox/outbox.repository.js";
import { runDispatchOutbox } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import { InMemoryStatementChargeRepository } from "../src/modules/subscription-billing/charges/charges.repository.js";
import { toClientPaymentView, findMoneyKeys } from "../src/modules/subscription-billing/charges/charge-view.js";
import { chargeProfileGate } from "../src/modules/subscription-billing/charges/charge-eligibility.js";
import type { ChargeResult, CreateChargeInput, PaymentMethod, PaymentProviderPort } from "../src/modules/subscription-billing/providers/payment/payment-provider.port.js";
import type { SubscriptionStatement } from "../src/modules/subscription-billing/statements/statement.types.js";
import type { BillingProfileInput } from "../src/modules/subscription-billing/billing-profile/billing-profile.js";

const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const STMT = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

class PixPort implements PaymentProviderPort {
  readonly created: CreateChargeInput[] = [];
  async ensureCustomer() { return { customerId: "c" }; }
  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    this.created.push(input);
    return { chargeId: "pay_1", status: "pending", payUrl: "https://pay.example/x", pixCopyPaste: "000201...", boletoUrl: "https://b/x" };
  }
  async getCharge() { return { status: "pending" as const, raw: {} }; }
  async findChargeByExternalReference() { return null; }
  async cancelCharge(id: string) { return { chargeId: id, status: "cancelled" as const }; }
  async refund(id: string) { return { chargeId: id, status: "refunded" as const }; }
  async registerWebhook() { return { externalId: "h" }; }
  async verifyWebhook() { return { ok: false }; }
  supportedMethods(): readonly PaymentMethod[] { return ["pix", "credit_card", "debit_card"]; }
  describe() { return { provider: "asaas", supportedMethods: this.supportedMethods(), pendingHomologation: [], webhookRegistration: "api" as const }; }
}

function closedStatement(patch: Partial<SubscriptionStatement> = {}): SubscriptionStatement {
  const now = new Date();
  return {
    id: STMT, tenantId: TENANT, period: "2026-11", status: "closed", chargeStatus: "pending", invoiceStatus: "none",
    subscriptionId: null, planVersionId: null, addonPlanVersionId: null, computation: null, daysInMonth: 30, daysMeasured: 30,
    totalCents: 10000, paidCents: 0, adjustmentsCents: 0, creditsAppliedCents: 0, adjustmentNote: null, dueDate: "2026-12-10",
    closedAt: now, closedBy: null, reopenedAt: null, reopenedBy: null, reopenReason: null, paidAt: null, cancelledAt: null,
    cancelledBy: null, cancelReason: null, snapshot: { latest: null, history: [] }, createdAt: now, updatedAt: now, ...patch,
  };
}

test("R-CHG-1 dispatch grava a cobrança com payUrl/pix/boleto (T-CHG-1)", async () => {
  const now = new Date("2026-12-01T12:00:00Z");
  const outbox = new InMemoryOutboxRepository(() => now);
  const charges = new InMemoryStatementChargeRepository();
  await outbox.enqueue({ tenantId: TENANT, statementId: STMT, kind: "charge_create", provider: "asaas", seq: 1, payload: { customerId: "c", amountCents: 10000, dueDate: "2026-12-10", method: "pix" } }, now);
  const port = new PixPort();
  await runDispatchOutbox({
    repo: outbox,
    ports: { asaas: port },
    now: () => now,
    onChargeCreated: async (row, result, at) => {
      await charges.insert({ tenantId: row.tenantId, statementId: row.statementId, provider: row.provider, externalChargeId: result.chargeId, status: result.status, payUrl: result.payUrl, pixCopyPaste: result.pixCopyPaste, boletoUrl: result.boletoUrl, dueDate: "2026-12-10" }, at);
    },
  });
  const stored = await charges.listByStatement(TENANT, STMT);
  assert.equal(stored.length, 1);
  assert.equal(stored[0]?.externalChargeId, "pay_1");
  assert.equal(stored[0]?.payUrl, "https://pay.example/x");
  assert.equal(stored[0]?.pixCopyPaste, "000201...");
});

test("R-CHG-1 payment do cliente traz link/Pix/boleto e NENHUMA chave de dinheiro (T-CHG-3 deep-key scan)", async () => {
  const charges = new InMemoryStatementChargeRepository();
  const charge = await charges.insert({ tenantId: TENANT, statementId: STMT, provider: "asaas", externalChargeId: "pay_1", status: "pending", payUrl: "https://pay/x", pixCopyPaste: "00020...", boletoLine: "3419...", dueDate: "2026-12-10" }, new Date());
  const view = toClientPaymentView(closedStatement(), charge);
  assert.ok(view);
  assert.equal(view?.payUrl, "https://pay/x");
  assert.equal(view?.statementId, STMT);
  assert.deepEqual(findMoneyKeys(view), [], "a visão do cliente não tem chave de dinheiro");
});

test("R-CHG-1 sem cobrança viva ou já pago → payment null", async () => {
  assert.equal(toClientPaymentView(closedStatement(), undefined), null);
  assert.equal(toClientPaymentView(closedStatement({ paidCents: 10000, status: "paid" }), undefined), null);
});

test("R-CHG-1 charge_cancel → cobrança cancelada, payment some (T-CHG-4)", async () => {
  const charges = new InMemoryStatementChargeRepository();
  const charge = await charges.insert({ tenantId: TENANT, statementId: STMT, provider: "asaas", externalChargeId: "pay_1", status: "pending", payUrl: "https://pay/x" }, new Date());
  await charges.cancel(charge.id, new Date());
  const live = await charges.findLive(TENANT, STMT);
  assert.equal(live, undefined);
  const cancelled = (await charges.listByStatement(TENANT, STMT))[0];
  assert.equal(toClientPaymentView(closedStatement(), cancelled), null, "cobrança cancelada não vira payment");
});

test("R-PRF-1 perfil incompleto → billing_profile_missing com missing[]; completo → ok", () => {
  const incomplete: BillingProfileInput = { legalName: "Org X", document: null, email: null, address: { postalCode: null, street: null, number: null, district: null, city: null, cityIbge: null, state: null }, paymentMethod: "undefined" };
  const gate = chargeProfileGate(incomplete);
  assert.equal(gate.ok, false);
  if (gate.ok) return;
  assert.equal(gate.reason, "billing_profile_missing");
  assert.ok(gate.missing.includes("document"));
  assert.ok(gate.missing.includes("paymentMethod"));

  const complete: BillingProfileInput = { legalName: "Org X", document: "11222333000181", email: "f@x.com", address: { postalCode: "01001000", street: "R", number: "1", district: "C", city: "SP", cityIbge: "3550308", state: "SP" }, paymentMethod: "pix" };
  assert.equal(chargeProfileGate(complete).ok, true);
});
