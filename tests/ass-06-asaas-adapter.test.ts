// B-ASS-06 · F2 — o adaptador Asaas contra o falso (plano §4.6, R-PAY-1, R-PAY-2 e R-PAY-7b). Nenhuma
// chamada a host real: o falso roda em 127.0.0.1:0. Mutações do plano: `DEBIT_CARD` enviado ao Asaas →
// vermelho (R-PAY-7b); tratar só `RECEIVED` como pago → vermelho (R-PAY-2).

import assert from "node:assert/strict";
import test from "node:test";

import { BillingHttpClient } from "../src/modules/subscription-billing/providers/http/billing-http.client.js";
import { AsaasPaymentAdapter, asaasStatusToOurs, type AsaasSecretReader } from "../src/modules/subscription-billing/providers/payment/asaas/index.js";
import type { CreateChargeInput } from "../src/modules/subscription-billing/providers/payment/payment-provider.port.js";
import { startAsaasFake } from "./helpers/fake-providers/asaas.js";

const API_TOKEN = "TOKEN-ASAAS-123";
const WEBHOOK_SECRET = "WEBHOOK-SECRET-123";
const STATEMENT_ID = "11111111-2222-3333-4444-555555555555";

function makeSecrets(overrides: Partial<Record<"api_token" | "webhook_secret", string | null>> = {}): AsaasSecretReader {
  const secrets: Record<string, string | null> = { api_token: API_TOKEN, webhook_secret: WEBHOOK_SECRET, ...overrides };
  return async (kind) => secrets[kind] ?? null;
}

async function setup() {
  const server = await startAsaasFake();
  const client = new BillingHttpClient({
    provider: "asaas",
    environment: "sandbox",
    channelEnabled: true,
    allowLocalHosts: true,
    nodeEnv: "test",
    baseUrl: `${server.baseUrl}/v3`,
  });
  const adapter = new AsaasPaymentAdapter(client, makeSecrets());
  return { server, adapter };
}

function parsedBody(server: { recorded: readonly { body: string }[] }, index: number): Record<string, unknown> {
  return JSON.parse(server.recorded[index]!.body) as Record<string, unknown>;
}

const CHARGE: CreateChargeInput = {
  customerId: "cus_0001",
  amountCents: 2999,
  dueDate: "2026-11-20",
  description: "Assinatura novembro",
  externalReference: STATEMENT_ID,
  method: "pix",
};

test("T-PAY-ASAAS-1 · ensureCustomer localiza antes por cpfCnpj e cria com notificationDisabled:false", async () => {
  const { server, adapter } = await setup();
  try {
    const created = await adapter.ensureCustomer({ name: "Cliente Exemplo", document: "12345678000199" });
    assert.equal(created.customerId, "cus_0001");
    // 1 GET (busca) + 1 POST (cria)
    assert.equal(server.recorded.length, 2);
    assert.equal(server.recorded[0]!.method, "GET");
    assert.match(server.recorded[0]!.path, /cpfCnpj=12345678000199/);
    const auth = server.recorded[1]!.headers;
    assert.equal(auth["access_token"], API_TOKEN);
    assert.equal(auth["user-agent"], "erp-techsolutions/1.0");
    const body = parsedBody(server, 1);
    assert.equal(body.notificationDisabled, false);
    assert.equal(body.cpfCnpj, "12345678000199");
  } finally {
    await server.close();
  }
});

test("T-PAY-ASAAS-2 · createCharge PIX envia value em reais e externalReference = statement_id, e busca o pixQrCode", async () => {
  const { server, adapter } = await setup();
  try {
    const result = await adapter.createCharge(CHARGE);
    assert.equal(result.chargeId, "pay_0001");
    assert.equal(result.status, "pending");
    assert.ok(result.payUrl);
    assert.ok(result.pixCopyPaste, "PIX busca o pixQrCode");
    // POST /payments + GET /payments/{id}/pixQrCode
    assert.equal(server.recorded.length, 2);
    const auth = server.recorded[0]!.headers;
    assert.equal(auth["access_token"], API_TOKEN);
    assert.equal(auth["user-agent"], "erp-techsolutions/1.0");
    const body = parsedBody(server, 0);
    assert.equal(body.billingType, "PIX");
    assert.equal(body.externalReference, STATEMENT_ID);
    assert.equal(body.customer, "cus_0001");
    assert.equal(Math.round((body.value as number) * 100), 2999, "value é em reais (29.99)");
  } finally {
    await server.close();
  }
});

test("T-PAY-ASAAS-3 · createCharge BOLETO mapeia boletoUrl e busca a linha digitável", async () => {
  const { server, adapter } = await setup();
  try {
    const result = await adapter.createCharge({ ...CHARGE, method: "boleto" });
    assert.ok(result.boletoUrl);
    assert.ok(result.boletoLine, "BOLETO busca o identificationField");
    const body = parsedBody(server, 0);
    assert.equal(body.billingType, "BOLETO");
  } finally {
    await server.close();
  }
});

test("T-PAY-ASAAS-4 · createCharge CREDIT_CARD envia CREDIT_CARD e não busca pix nem boleto", async () => {
  const { server, adapter } = await setup();
  try {
    const result = await adapter.createCharge({ ...CHARGE, method: "credit_card" });
    assert.equal(result.status, "pending");
    assert.equal(server.recorded.length, 1, "cartão não chama pixQrCode nem identificationField");
    assert.equal(parsedBody(server, 0).billingType, "CREDIT_CARD");
  } finally {
    await server.close();
  }
});

test("T-PAY-ASAAS-5 · débito vira UNDEFINED (R-PAY-7b), nunca DEBIT_CARD", async () => {
  const { server, adapter } = await setup();
  try {
    await adapter.createCharge({ ...CHARGE, method: "debit_card" });
    assert.equal(parsedBody(server, 0).billingType, "UNDEFINED");
  } finally {
    await server.close();
  }
});

test("T-PAY-ASAAS-6 · getCharge: paidCents só em estado pago (A2)", async () => {
  const { server, adapter } = await setup();
  try {
    await adapter.createCharge(CHARGE);
    const pending = await adapter.getCharge("pay_0001");
    assert.equal(pending.status, "pending");
    assert.equal(pending.paidCents, undefined, "pendente não tem paidCents");
    assert.equal((pending.raw as { id: string }).id, "pay_0001");

    server.setPaymentStatus("pay_0001", "RECEIVED");
    const paid = await adapter.getCharge("pay_0001");
    assert.equal(paid.status, "paid");
    assert.equal(paid.paidCents, 2999);

    for (const status of ["OVERDUE", "REFUNDED", "CHARGEBACK_REQUESTED"]) {
      server.setPaymentStatus("pay_0001", status);
      const lookup = await adapter.getCharge("pay_0001");
      assert.equal(lookup.paidCents, undefined, `${status} não tem paidCents`);
    }
  } finally {
    await server.close();
  }
});

test("T-PAY-ASAAS-7 · findChargeByExternalReference acha a cobrança criada; sem cobrança → null", async () => {
  const { server, adapter } = await setup();
  try {
    await adapter.createCharge(CHARGE);
    const found = await adapter.findChargeByExternalReference(STATEMENT_ID);
    assert.ok(found);
    assert.equal(found.chargeId, "pay_0001");
    assert.equal(found.status, "pending");
    assert.equal(await adapter.findChargeByExternalReference("outra-ref"), null);
  } finally {
    await server.close();
  }
});

test("T-PAY-ASAAS-8 · cancelCharge faz DELETE e devolve cancelled; refund devolve refunded", async () => {
  const { server, adapter } = await setup();
  try {
    const first = await adapter.createCharge(CHARGE);
    const cancelled = await adapter.cancelCharge(first.chargeId);
    assert.equal(cancelled.status, "cancelled");
    assert.equal(server.recorded[2]!.method, "DELETE");

    const second = await adapter.createCharge(CHARGE);
    const refunded = await adapter.refund(second.chargeId);
    assert.equal(refunded.status, "refunded");
    const refundRequest = server.recorded.find((r) => r.method === "POST" && /\/refund$/.test(r.path));
    assert.ok(refundRequest, "houve POST no endpoint de refund");
  } finally {
    await server.close();
  }
});

test("T-PAY-ASAAS-9 · registerWebhook envia url, authToken = segredo e sendType SEQUENTIALLY", async () => {
  const { server, adapter } = await setup();
  try {
    const result = await adapter.registerWebhook({
      url: "https://app.exemplo.com/webhooks/billing/asaas",
      secret: WEBHOOK_SECRET,
      events: ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"],
    });
    assert.deepEqual(result, { externalId: "hook_0001" });
    const body = parsedBody(server, 0);
    assert.equal(body.url, "https://app.exemplo.com/webhooks/billing/asaas");
    assert.equal(body.authToken, WEBHOOK_SECRET);
    assert.deepEqual(body.events, ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
    assert.equal(body.sendType, "SEQUENTIALLY");
  } finally {
    await server.close();
  }
});

test("T-PAY-ASAAS-10 · supportedMethods cobre débito, crédito e Pix (R-PAY-7)", () => {
  const methods = ["pix", "credit_card", "debit_card"];
  for (const method of methods) {
    assert.ok(new AsaasPaymentAdapter(null as unknown as BillingHttpClient, makeSecrets()).supportedMethods().includes(method as never), method);
  }
});

test("T-PAY-ASAAS-11 · tabela de mesa dos estados Asaas (R-PAY-2, inclui D3)", () => {
  const cases: readonly [string, string, boolean?][] = [
    ["CONFIRMED", "paid"], ["RECEIVED", "paid"], ["RECEIVED_IN_CASH", "paid"], ["DUNNING_RECEIVED", "paid"],
    ["REFUNDED", "refunded"],
    ["CHARGEBACK_REQUESTED", "chargeback_disputed"], ["CHARGEBACK_DISPUTE", "chargeback_disputed"],
    ["AWAITING_CHARGEBACK_REVERSAL", "chargeback_disputed", true],
    ["OVERDUE", "overdue"],
    ["PENDING", "pending"], ["AWAITING_RISK_ANALYSIS", "pending"], ["DUNNING_REQUESTED", "pending"],
    ["REFUND_REQUESTED", "unknown"], ["REFUND_IN_PROGRESS", "unknown"],
    ["STATUS_INEXISTENTE", "unknown"],
  ];
  for (const [providerStatus, ours, disputeWonPending] of cases) {
    const state = asaasStatusToOurs(providerStatus);
    assert.equal(state.status, ours, `${providerStatus} → ${ours}`);
    assert.equal(state.disputeWonPending ?? false, disputeWonPending ?? false, providerStatus);
  }
});
