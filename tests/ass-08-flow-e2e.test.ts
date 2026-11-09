// B-ASS-08 · F8 — fluxo ponta a ponta do LADO PAGAMENTO (R-FLX-1, parcial): demonstrativo closed → outbox +
// billing_statement_refs → cobrança criada no provedor (payUrl) → GET /billing/subscription traz payUrl → o falso
// emite o webhook → 200 → reconcile resolve a organização pelo NOSSO id → reconsulta `paid` → baixa → `paid`.
// A perna da NOTA (invoice_issue → authorized → invoicePdfAvailable) fica para a continuação (precisa do handler de
// invoice_issue na outbox e do reconcile de nota, que pareiam com F10+). Usa o adaptador Asaas REAL contra o falso.

import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import express from "express";

import { startAsaasFake, emitAsaasWebhook } from "./helpers/fake-providers/asaas.js";
import { BillingHttpClient } from "../src/modules/subscription-billing/providers/http/billing-http.client.js";
import { AsaasPaymentAdapter } from "../src/modules/subscription-billing/providers/payment/asaas/asaas.adapter.js";
import { InMemoryOutboxRepository } from "../src/modules/subscription-billing/outbox/outbox.repository.js";
import { runDispatchOutbox } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import { InMemoryStatementChargeRepository } from "../src/modules/subscription-billing/charges/charges.repository.js";
import { toClientPaymentView } from "../src/modules/subscription-billing/charges/charge-view.js";
import { InMemoryStatementRepository } from "../src/modules/subscription-billing/statements/statement.repository.js";
import { StatementService } from "../src/modules/subscription-billing/statements/statement.service.js";
import { StatementSettlementService } from "../src/modules/subscription-billing/statements/statement-settlement.service.js";
import { InMemoryWebhookEventRepository } from "../src/modules/subscription-billing/webhooks/webhook-events.repository.js";
import { InMemoryStatementRefRepository } from "../src/modules/subscription-billing/webhooks/statement-refs.repository.js";
import { reconcileWebhookEvent } from "../src/modules/subscription-billing/webhooks/reconcile.service.js";
import { createSubscriptionBillingWebhookRouter, type WebhookTarget } from "../src/modules/subscription-billing/webhooks/subscription-billing.webhook.routes.js";
import { createWebhookRateLimiter } from "../src/modules/subscription-billing/webhooks/webhook.rate-limit.js";

const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const API_TOKEN = "TOK-123";
const WEBHOOK_SECRET = "WHK-xyz";

test("R-FLX-1 (pagamento) fechado → cobrança → payUrl ao cliente → webhook → reconsulta paga → em dia", async () => {
  const fake = await startAsaasFake();
  try {
    const client = new BillingHttpClient({ provider: "asaas", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${fake.baseUrl}/v3` });
    const adapter = new AsaasPaymentAdapter(client, async (kind) => (kind === "api_token" ? API_TOKEN : WEBHOOK_SECRET));

    // --- demonstrativo closed (R$ 100) ---
    const statements = new InMemoryStatementRepository();
    const service = new StatementService(statements, { resolve: async () => ({ kind: "skip" as const, reason: "no_subscription" as const }) }, { record: async () => {} });
    const settlement = new StatementSettlementService(statements, service);
    const statement = await statements.transaction(TENANT, async (tx) => {
      const { statement: s } = await tx.insertIfAbsentAndLock({ tenantId: TENANT, period: "2026-11" });
      return tx.saveStatement({ ...s, status: "closed", chargeStatus: "pending", totalCents: 10000, dueDate: "2026-12-10", closedAt: new Date() });
    });

    // --- outbox + billing_statement_refs na "transação do fechamento" ---
    const outbox = new InMemoryOutboxRepository();
    const charges = new InMemoryStatementChargeRepository();
    const refs = new InMemoryStatementRefRepository();
    await refs.put({ statementId: statement.id, tenantId: TENANT, provider: "asaas" }, new Date());
    await outbox.enqueue({ tenantId: TENANT, statementId: statement.id, kind: "charge_create", provider: "asaas", seq: 1, payload: { customerId: "cus_1", amountCents: 10000, dueDate: "2026-12-10", method: "pix" } }, new Date());

    // --- dispatcher cria a cobrança no provedor e grava subscription_statement_charges ---
    let createdChargeId = "";
    await runDispatchOutbox({
      repo: outbox,
      ports: { asaas: adapter },
      onChargeCreated: async (row, result, at) => {
        createdChargeId = result.chargeId;
        await charges.insert({ tenantId: row.tenantId, statementId: row.statementId, provider: "asaas", externalChargeId: result.chargeId, status: result.status, payUrl: result.payUrl, pixCopyPaste: result.pixCopyPaste, boletoUrl: result.boletoUrl, dueDate: "2026-12-10" }, at);
        await refs.setExternalChargeId(row.statementId, result.chargeId, at);
      },
    });
    assert.ok(createdChargeId.startsWith("pay_"), "cobrança criada no provedor");
    const [charge] = await charges.listByStatement(TENANT, statement.id);
    assert.match(charge?.payUrl ?? "", /^https:\/\/www\.asaas\.com\/i\//, "payUrl do provedor gravado");

    // --- GET /billing/subscription: o cliente recebe o payUrl e nenhum valor ---
    const paymentView = toClientPaymentView(statement, charge);
    assert.equal(paymentView?.payUrl, charge?.payUrl);
    assert.equal(paymentView?.statementId, statement.id);

    // --- o cliente paga: o provedor confirma a cobrança ---
    fake.setPaymentStatus(createdChargeId, "CONFIRMED");

    // --- router do webhook (verifica com o adaptador real) ---
    const target: WebhookTarget = {
      provider: "asaas",
      verify: async (input) => {
        const r = await adapter.verifyWebhook(input);
        return { ok: r.ok, eventId: r.eventId, externalResourceId: r.chargeId, externalReference: r.externalReference };
      },
    };
    const events = new InMemoryWebhookEventRepository();
    const reconcileQueue: { provider: string; externalEventId: string }[] = [];
    const router = createSubscriptionBillingWebhookRouter({
      resolveTarget: async (p) => (p === "asaas" ? target : null),
      events,
      limiter: createWebhookRateLimiter(),
      enqueueReconcile: async (i) => void reconcileQueue.push(i),
      clientIp: () => "ip-1",
    });
    const app = express();
    app.use("/webhooks/billing", router);
    const server: Server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const { port } = server.address() as AddressInfo;

    // --- o falso emite o webhook assinado ---
    const emitted = await emitAsaasWebhook(
      `http://127.0.0.1:${port}/webhooks/billing/asaas`,
      { id: "evt_flux_1", event: "PAYMENT_CONFIRMED", payment: { id: createdChargeId, externalReference: statement.id, status: "CONFIRMED" } },
      { secret: WEBHOOK_SECRET },
    );
    assert.equal(emitted.status, 200);
    assert.equal(reconcileQueue.length, 1);
    await new Promise<void>((resolve) => server.close(() => resolve()));

    // --- reconcile: reconsulta no provedor (paid) e baixa; a organização vem do NOSSO id ---
    const outcome = await reconcileWebhookEvent(
      { events, refs, ports: { asaas: adapter }, settlement },
      reconcileQueue[0]!,
    );
    assert.equal(outcome, "settled");
    const finalStatement = await statements.findStatement(TENANT, statement.id);
    assert.equal(finalStatement?.status, "paid");
    assert.equal(finalStatement?.paidCents, 10000);
    assert.equal(finalStatement?.chargeStatus, "confirmed");
  } finally {
    await fake.close();
  }
});
