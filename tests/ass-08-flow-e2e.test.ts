// B-ASS-08 · F8 — fluxo ponta a ponta (R-FLX-1): demonstrativo closed → outbox + billing_statement_refs → cobrança
// criada no provedor (payUrl) → GET /billing/subscription traz payUrl → o falso emite o webhook → 200 → reconcile
// resolve a organização pelo NOSSO id → reconsulta `paid` → baixa → `paid` → (B-ASS-08b) `invoice_issue` com `numero_dps`
// da sequência → 202 → webhook da nota → reconsulta → `authorized` (número, código, URLs; `invoice_status = authorized`,
// que é o que `invoicePdfAvailable` lê). Adaptadores Asaas e Focus NFe REAIS contra os falsos.

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
import { profileCustomerResolver, requestChargeCreate } from "../src/modules/subscription-billing/charges/charge-request.service.js";
import { InMemoryChargeIntentRepository } from "../src/modules/subscription-billing/charges/charge-intent.repository.js";
import { InMemoryBillingProfileRepository } from "../src/modules/subscription-billing/billing-profile/billing-profile.js";
import { toClientPaymentView } from "../src/modules/subscription-billing/charges/charge-view.js";
import { InMemoryStatementRepository } from "../src/modules/subscription-billing/statements/statement.repository.js";
import { StatementService } from "../src/modules/subscription-billing/statements/statement.service.js";
import { StatementSettlementService } from "../src/modules/subscription-billing/statements/statement-settlement.service.js";
import { InMemoryWebhookEventRepository } from "../src/modules/subscription-billing/webhooks/webhook-events.repository.js";
import { InMemoryStatementRefRepository } from "../src/modules/subscription-billing/webhooks/statement-refs.repository.js";
import { reconcileWebhookEvent } from "../src/modules/subscription-billing/webhooks/reconcile.service.js";
import { createSubscriptionBillingWebhookRouter, type WebhookTarget } from "../src/modules/subscription-billing/webhooks/subscription-billing.webhook.routes.js";
import { createWebhookRateLimiter } from "../src/modules/subscription-billing/webhooks/webhook.rate-limit.js";
import { emitFocusNfeWebhook, startFocusNfeFake } from "./helpers/fake-providers/focusnfe.js";
import { FocusNfeInvoiceAdapter } from "../src/modules/subscription-billing/providers/invoice/focusnfe/focusnfe.adapter.js";
import { InMemoryStatementInvoiceRepository } from "../src/modules/subscription-billing/invoices/invoices.repository.js";
import { competenceDateOf, InvoiceOutboxHandler, taxProfileFromSettings } from "../src/modules/subscription-billing/outbox/invoice.dispatch.js";

const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const API_TOKEN = "TOK-123";
const WEBHOOK_SECRET = "WHK-xyz";
const FOCUS_WEBHOOK_SECRET = "WHK-focus-e2e";
// Settings fiscais do emissor (B-ASS-05, `billing_provider_configs.settings`) — o que o PUT da configuração aceita.
const FISCAL_SETTINGS = { cnpj: "11222333000181", regimeTributario: "lucro_presumido", municipioIbge: "3550308", cTribNac: "010301", tributacaoIss: "1", regimeEspecialTributacao: "0", codigoOpcaoSimplesNacional: "1", serieDps: 7, nfseRoute: "nacional" };

test("R-FLX-1 (pagamento) fechado → cobrança → payUrl ao cliente → webhook → reconsulta paga → em dia", async () => {
  const fake = await startAsaasFake();
  try {
    const client = new BillingHttpClient({ provider: "asaas", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${fake.baseUrl}/v3` });
    const adapter = new AsaasPaymentAdapter(client, async (kind) => (kind === "api_token" ? API_TOKEN : WEBHOOK_SECRET));

    // --- demonstrativo closed (R$ 100) ---
    const statements = new InMemoryStatementRepository();
    const service = new StatementService(statements, { resolve: async () => ({ kind: "skip" as const, reason: "no_subscription" as const }) }, { record: async () => {} });
    // Conserto da J-530: a intenção de nota nasce na transação da baixa (o dublê ligado à outbox e à nota, abaixo).
    const settlement = new StatementSettlementService(statements, service, { issueTarget: { provider: "focusnfe", enabled: true }, enabledInvoiceProviders: ["focusnfe"] });
    const statement = await statements.transaction(TENANT, async (tx) => {
      const { statement: s } = await tx.insertIfAbsentAndLock({ tenantId: TENANT, period: "2026-11" });
      return tx.saveStatement({ ...s, status: "closed", chargeStatus: "pending", totalCents: 10000, dueDate: "2026-12-10", closedAt: new Date() });
    });

    // --- outbox + billing_statement_refs na "transação do fechamento" ---
    const charges = new InMemoryStatementChargeRepository();
    // R-OBX-5: o claim relê o demonstrativo REAL (status/reopenedAt) e a cobrança viva da tabela de cobranças.
    const outbox = new InMemoryOutboxRepository({
      readStatement: async (tenantId, statementId) => {
        const current = await statements.findStatement(tenantId, statementId);
        return current && { status: current.status, reopenedAt: current.reopenedAt, hasLiveCharge: (await charges.findLive(tenantId, statementId)) !== undefined };
      },
    });
    const invoiceStore = new InMemoryStatementInvoiceRepository(statements);
    statements.attachChannelStores({ outbox, invoices: invoiceStore });
    const refs = new InMemoryStatementRefRepository();
    // Conserto J-522 (C3-01): a intenção entra pelo caminho de PRODUÇÃO — `requestChargeCreate` trava o demonstrativo,
    // aplica a elegibilidade (R-CHG-2/D1) e grava refs + linha; o payload NÃO carrega `customerId` (R-PRF-1).
    await requestChargeCreate(
      { intents: new InMemoryChargeIntentRepository({ statements, charges, outbox, refs }) },
      { tenantId: TENANT, statementId: statement.id, provider: "asaas", payload: { amountCents: 10000, dueDate: "2026-12-10", method: "pix" }, now: new Date() },
    );

    // Perfil COMPLETO da organização: o resolver real (perfil → `ensureCustomer` do adaptador contra o fake) dá o cliente.
    const profiles = new InMemoryBillingProfileRepository();
    await profiles.upsert(
      TENANT,
      { legalName: "Org X", document: "11222333000181", email: "f@x.com", address: { postalCode: "01001000", street: "R", number: "1", district: "C", city: "SP", cityIbge: "3550308", state: "SP" }, paymentMethod: "pix" },
      new Date(),
    );

    // --- dispatcher cria a cobrança no provedor e grava subscription_statement_charges ---
    let createdChargeId = "";
    outbox.configureChargeOutcomeSink(async (charge, at) => {
      createdChargeId = charge.externalChargeId;
      await charges.insert(charge, at);
      await refs.setExternalChargeId(charge.statementId, charge.externalChargeId, at);
    });
    await runDispatchOutbox({
      repo: outbox,
      ports: { asaas: adapter },
      resolveCustomer: profileCustomerResolver(async (tenantId) => profiles.find(tenantId)),
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

    // --- reconcile: reconsulta no provedor (paid) e baixa; a organização vem do NOSSO id; pago → a NOTA entra na outbox ---
    const outcome = await reconcileWebhookEvent({ events, refs, ports: { asaas: adapter }, settlement }, reconcileQueue[0]!);
    assert.equal(outcome, "settled");
    const finalStatement = await statements.findStatement(TENANT, statement.id);
    assert.equal(finalStatement?.status, "paid");
    assert.equal(finalStatement?.paidCents, 10000);
    assert.equal(finalStatement?.chargeStatus, "confirmed");
    const invoiceIssues = (await outbox.listByStatement(TENANT, statement.id)).filter((row) => row.kind === "invoice_issue").map((row) => ({ tenantId: row.tenantId, statementId: row.statementId, provider: row.provider }));
    assert.deepEqual(invoiceIssues, [{ tenantId: TENANT, statementId: statement.id, provider: "focusnfe" }], "R-SET-2: ficou paid pela reconsulta → invoice_issue durável, na transação da baixa");

    // --- a perna da NOTA (B-ASS-08b): invoice_issue → numero_dps da sequência → 202 → webhook da nota → reconsulta → authorized ---
    const focus = await startFocusNfeFake("authorized");
    try {
      const focusClient = new BillingHttpClient({ provider: "focusnfe", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${focus.baseUrl}/v2` });
      const focusAdapter = new FocusNfeInvoiceAdapter(focusClient, async (kind) => (kind === "api_token" ? "TOK-focus" : kind === "webhook_secret" ? FOCUS_WEBHOOK_SECRET : null));
      // A linha durável `invoice_issue` (seq 1) já nasceu na transação da baixa (acima).
      const invoices = invoiceStore;
      const invoiceHandler = new InvoiceOutboxHandler({
        ports: { focusnfe: focusAdapter },
        invoices,
        statements,
        resolveIssueContext: async ({ statement: current }) => ({
          environment: "sandbox",
          serie: 7,
          emitter: { cnpj: FISCAL_SETTINGS.cnpj },
          borrower: { document: "99888777000166", name: "Organização Tomadora", municipalityCode: "3550308" },
          taxProfile: taxProfileFromSettings(FISCAL_SETTINGS),
          serviceDescription: `Assinatura Plano Essencial — competência ${current.period}`,
        }),
      });
      const issued = await runDispatchOutbox({
        repo: outbox,
        ports: { asaas: adapter },
        resolveCustomer: profileCustomerResolver(async (tenantId) => profiles.find(tenantId)),
        invoices: invoiceHandler,
      });
      assert.equal(issued.outcomes.sent, 1, "a nota foi ao provedor");
      const issuePost = focus.recorded.find((request) => request.method === "POST");
      assert.equal(issuePost?.path, `/v2/nfsen?ref=${encodeURIComponent(`${statement.id}:1`)}`, "ref = <statement_id>:<seq>");
      const issueBody = JSON.parse(issuePost!.body) as Record<string, unknown>;
      assert.equal(issueBody.numero_dps, 1, "numero_dps da sequência NOSSA (R-H)");
      assert.equal(issueBody.data_competencia, competenceDateOf("2026-11"), "competência = o período do demonstrativo");
      assert.equal(issueBody.valor_servico, 100, "o valor da nota é o total do demonstrativo (R$ 100,00)");
      const [pendingInvoice] = await invoices.listByStatement(TENANT, statement.id);
      assert.equal(pendingInvoice?.status, "pending", "2xx do provedor é processing, nunca autorizada (R-NF-2)");
      assert.equal((await statements.findStatement(TENANT, statement.id))?.invoiceStatus, "pending");

      // o falso Focus emite o webhook assinado → router → reconcile → reconsulta → authorized
      const focusTarget: WebhookTarget = {
        provider: "focusnfe",
        verify: async (input) => {
          const r = await focusAdapter.verifyWebhook({ headers: input.headers, rawBody: input.rawBody });
          return { ok: r.ok, eventId: r.eventId, externalReference: r.externalRef, kind: r.kind };
        },
      };
      const focusRouter = createSubscriptionBillingWebhookRouter({
        resolveTarget: async (p) => (p === "focusnfe" ? focusTarget : null),
        events,
        limiter: createWebhookRateLimiter(),
        enqueueReconcile: async (i) => void reconcileQueue.push(i),
        clientIp: () => "ip-1",
      });
      const focusApp = express();
      focusApp.use("/api/v1/webhooks/billing", focusRouter);
      const focusServer: Server = focusApp.listen(0);
      await new Promise<void>((resolve) => focusServer.once("listening", resolve));
      const { port: focusPort } = focusServer.address() as AddressInfo;
      const invoiceWebhook = await emitFocusNfeWebhook(
        `http://127.0.0.1:${focusPort}/api/v1/webhooks/billing/focusnfe`,
        { id: "evt_nf_flux_1", ref: `${statement.id}:1`, status: "autorizado" },
        { secret: FOCUS_WEBHOOK_SECRET },
      );
      assert.equal(invoiceWebhook.status, 200);
      await new Promise<void>((resolve) => focusServer.close(() => resolve()));
      assert.equal(reconcileQueue.length, 2);

      const invoiceOutcome = await reconcileWebhookEvent(
        { events, refs, ports: { asaas: adapter }, settlement, invoicePorts: { focusnfe: focusAdapter }, invoices },
        reconcileQueue[1]!,
      );
      assert.equal(invoiceOutcome, "invoice_authorized");
      const [authorized] = await invoices.listByStatement(TENANT, statement.id);
      assert.equal(authorized?.status, "authorized");
      assert.equal(authorized?.number, "NFSE-1001");
      assert.equal(authorized?.verificationCode, "VERIFY-1001");
      assert.match(authorized?.pdfUrl ?? "", /\.pdf$/);
      assert.match(authorized?.xmlUrl ?? "", /\.xml$/);
      const withInvoice = await statements.findStatement(TENANT, statement.id);
      assert.equal(withInvoice?.invoiceStatus, "authorized", "invoice_status = authorized é o que invoicePdfAvailable lê");
      assert.equal(withInvoice?.status, "paid");
    } finally {
      await focus.close();
    }
  } finally {
    await fake.close();
  }
});
