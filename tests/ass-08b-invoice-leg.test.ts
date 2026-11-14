// B-ASS-08b · (c2) — a perna da NOTA (R-SET-2, R-D, R-H/G10, R-NF-2/4, R-WH-4/8): dublê em memória + adaptador Focus NFe
// REAL contra o falso. Vermelho-controle: `invoices/**` e `outbox/invoice.dispatch.ts` não existem na parte 1. Decisões do
// orquestrador (09/11) e do dono (`D-NOTA-CANCEL-CODIGO-PROVEDOR`): competência = período do demonstrativo; valor = total do
// demonstrativo; descrição = plano + competência; cancelamento com código conforme provedor (9 + motivo em texto).

import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import express from "express";

import { emitFocusNfeWebhook, startFocusNfeFake } from "./helpers/fake-providers/focusnfe.js";
import { InMemoryStatementChargeRepository } from "../src/modules/subscription-billing/charges/charges.repository.js";
import { InMemoryStatementInvoiceRepository } from "../src/modules/subscription-billing/invoices/invoices.repository.js";
import { statementIdOfInvoiceRef } from "../src/modules/subscription-billing/invoices/invoices.types.js";
import {
  POLL_PENDING_STALE_MS,
  runBillingDispatch,
  runBillingPollPending,
  runBillingPollSettled,
  runBillingReconcileEvent,
  type ChannelDeps,
} from "../src/modules/subscription-billing/outbox/channel.jobs.js";
import { competenceDateOf, INVOICE_CANCEL_CODE_OTHERS, taxProfileFromSettings, type InvoiceIssueContextResolver } from "../src/modules/subscription-billing/outbox/invoice.dispatch.js";
import { InMemoryOutboxRepository } from "../src/modules/subscription-billing/outbox/outbox.repository.js";
import { chargeCreateClaimVerdict } from "../src/modules/subscription-billing/outbox/outbox.dispatcher.js";
import { BillingHttpClient } from "../src/modules/subscription-billing/providers/http/billing-http.client.js";
import { FocusNfeInvoiceAdapter } from "../src/modules/subscription-billing/providers/invoice/focusnfe/focusnfe.adapter.js";
import type { ChargeLookup, ChargeResult, PaymentMethod, PaymentProviderPort } from "../src/modules/subscription-billing/providers/payment/payment-provider.port.js";
import { InMemoryStatementRepository } from "../src/modules/subscription-billing/statements/statement.repository.js";
import { StatementService, upToDateStatus } from "../src/modules/subscription-billing/statements/statement.service.js";
import { StatementSettlementService } from "../src/modules/subscription-billing/statements/statement-settlement.service.js";
import type { SubscriptionStatement } from "../src/modules/subscription-billing/statements/statement.types.js";
import { InMemoryStatementRefRepository } from "../src/modules/subscription-billing/webhooks/statement-refs.repository.js";
import { createSubscriptionBillingWebhookRouter, type WebhookTarget } from "../src/modules/subscription-billing/webhooks/subscription-billing.webhook.routes.js";
import { InMemoryWebhookEventRepository } from "../src/modules/subscription-billing/webhooks/webhook-events.repository.js";
import { createWebhookRateLimiter } from "../src/modules/subscription-billing/webhooks/webhook.rate-limit.js";

const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const API_TOKEN = "TOK-focus-123";
const WEBHOOK_SECRET = "WHK-focus-xyz";
const SETTINGS = {
  cnpj: "11222333000181",
  razaoSocial: "Plataforma Emissora LTDA",
  regimeTributario: "lucro_presumido",
  municipioIbge: "3550308",
  cTribNac: "010301",
  tributacaoIss: "1",
  regimeEspecialTributacao: "0",
  codigoOpcaoSimplesNacional: "1",
  serieDps: 7,
  nfseRoute: "nacional",
};

function focusAdapter(baseUrl: string): FocusNfeInvoiceAdapter {
  const client = new BillingHttpClient({ provider: "focusnfe", environment: "sandbox", channelEnabled: true, allowLocalHosts: true, nodeEnv: "test", baseUrl: `${baseUrl}/v2` });
  return new FocusNfeInvoiceAdapter(client, async (kind) => (kind === "api_token" ? API_TOKEN : kind === "webhook_secret" ? WEBHOOK_SECRET : null));
}

/** Porta de pagamento falsa (sem rede): a reconsulta devolve o estado programado. */
class ScriptedPaymentPort implements PaymentProviderPort {
  /** O `externalReference` que o provedor guardou ao criar a cobrança (o NOSSO statement_id) — o [WH-5] o confere. */
  reference: string | null = null;
  constructor(private lookup: ChargeLookup) {}
  setLookup(lookup: ChargeLookup) {
    this.lookup = lookup;
  }
  async ensureCustomer() {
    return { customerId: "cus_1" };
  }
  async createCharge(): Promise<ChargeResult> {
    return { chargeId: "pay_x", status: "pending" };
  }
  async getCharge() {
    return this.reference && this.lookup.raw.externalReference === undefined ? { ...this.lookup, raw: { ...this.lookup.raw, externalReference: this.reference } } : this.lookup;
  }
  async listChargesByExternalReference() {
    return [];
  }
  async cancelCharge(id: string) {
    return { chargeId: id, status: "cancelled" as const };
  }
  async refund(id: string) {
    return { chargeId: id, status: "refunded" as const };
  }
  async registerWebhook() {
    return { externalId: "h" };
  }
  async verifyWebhook() {
    return { ok: false };
  }
  supportedMethods(): readonly PaymentMethod[] {
    return ["pix"];
  }
  describe() {
    return { provider: "asaas", supportedMethods: this.supportedMethods(), pendingHomologation: [], webhookRegistration: "api" as const };
  }
}

type Harness = {
  readonly deps: ChannelDeps;
  readonly statements: InMemoryStatementRepository;
  readonly settlement: StatementSettlementService;
  readonly outbox: InMemoryOutboxRepository;
  readonly invoices: InMemoryStatementInvoiceRepository;
  readonly refs: InMemoryStatementRefRepository;
  readonly events: InMemoryWebhookEventRepository;
  readonly clock: { now: Date };
};

function harness(adapter: FocusNfeInvoiceAdapter | null, options: { contextReason?: string; payment?: PaymentProviderPort } = {}): Harness {
  const clock = { now: new Date("2026-12-05T12:00:00Z") };
  const statements = new InMemoryStatementRepository(() => clock.now);
  const service = new StatementService(statements, { resolve: async () => ({ kind: "skip" as const, reason: "no_subscription" as const }) }, { record: async () => {} });
  // Conserto da J-530: a intenção de nota nasce na transação do settlement (o dublê ligado à outbox e à nota, abaixo).
  const settlement = new StatementSettlementService(statements, service, { issueTarget: { provider: "focusnfe", enabled: adapter !== null }, enabledInvoiceProviders: adapter ? ["focusnfe"] : [] });
  const outbox = new InMemoryOutboxRepository({
      // R-OBX-5 (2º conserto do #522): o dublê lê o demonstrativo do MESMO repositório; `totalCents` é o V da adoção.
      readStatement: async (tenantId, statementId) => {
        const statement = await statements.findStatement(tenantId, statementId);
        return statement && { status: statement.status, reopenedAt: statement.reopenedAt, totalCents: statement.totalCents };
      },
      clock: () => clock.now,
    });
  const invoices = new InMemoryStatementInvoiceRepository(statements);
  statements.attachChannelStores({ outbox, invoices });
  const refs = new InMemoryStatementRefRepository();
  const events = new InMemoryWebhookEventRepository();
  const resolveIssueContext: InvoiceIssueContextResolver = async ({ statement }) =>
    options.contextReason
      ? { reason: options.contextReason }
      : {
          environment: "sandbox",
          serie: SETTINGS.serieDps,
          emitter: { cnpj: SETTINGS.cnpj, legalName: SETTINGS.razaoSocial },
          borrower: { document: "99888777000166", name: "Organização Tomadora", municipalityCode: "3550308" },
          taxProfile: taxProfileFromSettings(SETTINGS),
          serviceDescription: `Assinatura Plano Essencial — competência ${statement.period}`,
        };
  const deps: ChannelDeps = {
    outbox,
    events,
    refs,
    charges: new InMemoryStatementChargeRepository(),
    ports: options.payment ? { asaas: options.payment } : {},
    resolveCustomer: async () => ({ ok: true, customerId: "cus_1" }),
    invoicePorts: adapter ? { focusnfe: adapter } : {},
    invoices,
    resolveIssueContext,
    settlement,
    statements,
    now: () => clock.now,
  };
  return { deps, statements, settlement, outbox, invoices, refs, events, clock };
}

async function closedStatement(h: Harness, period: string, patch: Partial<SubscriptionStatement> = {}): Promise<SubscriptionStatement> {
  return h.statements.transaction(TENANT, async (tx) => {
    const { statement } = await tx.insertIfAbsentAndLock({ tenantId: TENANT, period });
    return tx.saveStatement({ ...statement, status: "closed", chargeStatus: "pending", totalCents: 10_000, dueDate: `${period}-10`, closedAt: h.clock.now, ...patch });
  });
}

/** Demonstrativo PAGO pelo provedor (o caminho da reconsulta), com o índice global apontando a cobrança. */
async function paidStatement(h: Harness, period: string): Promise<SubscriptionStatement> {
  const statement = await closedStatement(h, period);
  await h.refs.put({ statementId: statement.id, tenantId: TENANT, provider: "asaas", externalChargeId: `pay_${period}` }, h.clock.now);
  await h.settlement.settle({ tenantId: TENANT, statementId: statement.id, source: "asaas", externalChargeId: `pay_${period}`, paidCents: 10_000, method: null, now: h.clock.now });
  return (await h.statements.findStatement(TENANT, statement.id))!;
}

async function enqueueIssue(h: Harness, statementId: string, seq = 1) {
  return h.outbox.enqueue({ tenantId: TENANT, statementId, kind: "invoice_issue", provider: "focusnfe", seq, payload: { seq } }, h.clock.now);
}

async function withFocusWebhook(adapter: FocusNfeInvoiceAdapter, events: InMemoryWebhookEventRepository, cb: (url: string) => Promise<void>): Promise<{ provider: string; externalEventId: string }[]> {
  const enqueued: { provider: string; externalEventId: string }[] = [];
  const target: WebhookTarget = {
    provider: "focusnfe",
    verify: async (input) => {
      const r = await adapter.verifyWebhook({ headers: input.headers, rawBody: input.rawBody });
      return { ok: r.ok, eventId: r.eventId, externalReference: r.externalRef, kind: r.kind };
    },
  };
  const router = createSubscriptionBillingWebhookRouter({
    resolveTarget: async (p) => (p === "focusnfe" ? target : null),
    events,
    limiter: createWebhookRateLimiter(),
    enqueueReconcile: async (input) => void enqueued.push(input),
    clientIp: () => "ip-1",
  });
  const app = express();
  app.use("/api/v1/webhooks/billing", router);
  const server: Server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await cb(`http://127.0.0.1:${port}/api/v1/webhooks/billing/focusnfe`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  return enqueued;
}

const posts = (h: { recorded: { method: string }[] }) => h.recorded.filter((request) => request.method === "POST");

test("R-FLX-1 (nota): pago → invoice_issue → numero_dps da sequência → 202 → webhook → reconsulta → authorized; idempotente", async () => {
  const fake = await startFocusNfeFake("authorized");
  try {
    const adapter = focusAdapter(fake.baseUrl);
    const h = harness(adapter);
    // A linha durável `invoice_issue` (seq 1) nasceu na transação da baixa (conserto da J-530).
    const statement = await paidStatement(h, "2026-11");

    const dispatched = await runBillingDispatch(h.deps);
    assert.equal(dispatched.outcomes.sent, 1);
    const [post] = posts(fake);
    assert.equal((post as { path: string } | undefined)?.path, `/v2/nfsen?ref=${encodeURIComponent(`${statement.id}:1`)}`, "ref = <statement_id>:<seq>");
    const body = JSON.parse((post as { body: string }).body) as Record<string, unknown>;
    assert.equal(body.numero_dps, 1, "numero_dps da sequência NOSSA, reservado na mesma transação da linha (R-H)");
    assert.equal(body.serie_dps, 7);
    assert.equal(body.data_competencia, "2026-11-30", "competência = o período do demonstrativo (último dia), nunca a data da emissão");
    assert.equal(body.valor_servico, 100, "valor = total do demonstrativo (R$ 100,00; o adaptador manda número em reais)");
    assert.match(String(body.descricao_servico), /Plano Essencial/);
    assert.match(String(body.descricao_servico), /2026-11/);
    assert.equal(body.cnpj_prestador, SETTINGS.cnpj);
    assert.equal(body.cnpj_tomador, "99888777000166");
    assert.equal(body.ibs_cbs, undefined, "competência 2026-11 < 2026-12-01: o grupo IBS/CBS não vai (§N5)");

    const [invoice] = await h.invoices.listByStatement(TENANT, statement.id);
    assert.equal(invoice?.status, "pending", "2xx do provedor é processing, nunca autorizada (R-NF-2)");
    assert.equal(invoice?.providerInvoiceId, "nfse_1");
    assert.equal(invoice?.numeroDps, 1);
    assert.equal(invoice?.externalRef, `${statement.id}:1`);
    assert.equal((await h.statements.findStatement(TENANT, statement.id))?.invoiceStatus, "pending");
    const [row] = await h.outbox.listByStatement(TENANT, statement.id);
    assert.equal(row?.status, "SENT");
    assert.equal(row?.externalId, "nfse_1");

    // o provedor avisa → router → reconcile → RECONSULTA (o corpo não decide) → authorized
    const enqueued = await withFocusWebhook(adapter, h.events, async (url) => {
      const res = await emitFocusNfeWebhook(url, { id: "evt_nf_1", ref: `${statement.id}:1`, status: "autorizado" }, { secret: WEBHOOK_SECRET });
      assert.equal(res.status, 200);
    });
    assert.deepEqual(enqueued, [{ provider: "focusnfe", externalEventId: "evt_nf_1" }]);
    assert.equal(await runBillingReconcileEvent(h.deps, enqueued[0]!), "invoice_authorized");
    const [authorized] = await h.invoices.listByStatement(TENANT, statement.id);
    assert.equal(authorized?.status, "authorized");
    assert.equal(authorized?.number, "NFSE-1001");
    assert.equal(authorized?.verificationCode, "VERIFY-1001");
    assert.match(authorized?.pdfUrl ?? "", /nfse-1001\.pdf$/);
    assert.match(authorized?.xmlUrl ?? "", /\.xml$/);
    assert.equal(authorized?.pdfSource, "public_url");
    const final = (await h.statements.findStatement(TENANT, statement.id))!;
    assert.equal(final.invoiceStatus, "authorized");
    assert.equal(final.status, "paid");
    assert.equal(upToDateStatus([final], h.clock.now).upToDate, true);
    assert.equal((await h.events.find("focusnfe", "evt_nf_1"))?.status, "processed");

    // idempotência: enfileirar de novo (seq 1) não cria linha nem chamada; o webhook repetido não muda nada
    assert.equal((await enqueueIssue(h, statement.id)).created, false);
    assert.equal((await runBillingDispatch(h.deps)).processed, 0);
    assert.equal(posts(fake).length, 1, "uma emissão só");
    assert.equal(await runBillingReconcileEvent(h.deps, enqueued[0]!), "no_op", "evento já processado");
  } finally {
    await fake.close();
  }
});

test("rejeição → rejected com o erro visível, em dia INTACTO; reemissão com seq + 1 ganha ref e numero_dps novos (G10)", async () => {
  const fake = await startFocusNfeFake("rejected");
  try {
    const adapter = focusAdapter(fake.baseUrl);
    const h = harness(adapter);
    const statement = await paidStatement(h, "2026-11");
    await enqueueIssue(h, statement.id);
    assert.equal((await runBillingDispatch(h.deps)).outcomes.sent, 1, "o provedor aceita (202) e só rejeita depois");

    // 31 min sem retorno: o poll-pending reconsulta a nota pending → rejeitada
    h.clock.now = new Date(h.clock.now.getTime() + POLL_PENDING_STALE_MS + 60_000);
    const poll = await runBillingPollPending(h.deps);
    assert.equal(poll.invoices, 1);
    assert.equal(poll.outcomes.invoice_rejected, 1);
    const [rejected] = await h.invoices.listByStatement(TENANT, statement.id);
    assert.equal(rejected?.status, "rejected");
    assert.match(rejected?.error ?? "", /rejeição simulada/);
    const afterReject = (await h.statements.findStatement(TENANT, statement.id))!;
    assert.equal(afterReject.invoiceStatus, "rejected");
    assert.equal(afterReject.status, "paid");
    assert.equal(upToDateStatus([afterReject], h.clock.now).upToDate, true, "rejeição não afeta em dia (R-SET-2)");

    // reemissão (a rota /invoice abre seq + 1): ref nova e número novo — o falso recusa numero_dps repetido
    await enqueueIssue(h, statement.id, 2);
    assert.equal((await runBillingDispatch(h.deps)).outcomes.sent, 1);
    const [, second] = posts(fake) as { path: string; body: string }[];
    assert.equal(second?.path, `/v2/nfsen?ref=${encodeURIComponent(`${statement.id}:2`)}`);
    assert.equal((JSON.parse(second!.body) as { numero_dps: number }).numero_dps, 2);
    const invoices = await h.invoices.listByStatement(TENANT, statement.id);
    assert.deepEqual(invoices.map((row) => [row.seq, row.status, row.numeroDps]), [[1, "rejected", 1], [2, "pending", 2]]);
    assert.equal((await h.statements.findStatement(TENANT, statement.id))?.invoiceStatus, "pending");
  } finally {
    await fake.close();
  }
});

test("R-D: chargeback com nota autorizada → invoice_cancel → DELETE com a justificativa; código 9 registrado; cancel_pending → poll-settled → cancelled", async () => {
  const fake = await startFocusNfeFake("authorized");
  try {
    const adapter = focusAdapter(fake.baseUrl);
    const payment = new ScriptedPaymentPort({ status: "paid", paidCents: 10_000, raw: {} });
    const h = harness(adapter, { payment });
    const statement = await paidStatement(h, "2026-11");
    payment.reference = statement.id;
    await enqueueIssue(h, statement.id);
    await runBillingDispatch(h.deps);
    h.clock.now = new Date(h.clock.now.getTime() + POLL_PENDING_STALE_MS + 60_000);
    assert.equal((await runBillingPollPending(h.deps)).outcomes.invoice_authorized, 1);
    assert.equal((await h.statements.findStatement(TENANT, statement.id))?.invoiceStatus, "authorized");

    // chargeback tardio achado pelo poll-settled → reversão + invoice_cancel DURÁVEL
    payment.setLookup({ status: "charged_back", raw: {} });
    const settled = await runBillingPollSettled(h.deps);
    assert.equal(settled.outcomes.reversed, 1);
    const cancelRow = (await h.outbox.listByStatement(TENANT, statement.id)).find((row) => row.kind === "invoice_cancel");
    assert.ok(cancelRow, "R-SET-2/R-D: invoice_cancel enfileirado");
    assert.equal((await runBillingDispatch(h.deps)).outcomes.sent, 1);
    const del = fake.recorded.find((request) => request.method === "DELETE");
    assert.ok(del, "o cancelamento foi ao provedor");
    assert.ok(del.path.includes(statement.id), "pela ref da nota");
    assert.match((JSON.parse(del.body) as { justificativa: string }).justificativa, /estornado|chargeback/i, "justificativa em texto, sem dado pessoal");
    const [pendingCancel] = await h.invoices.listByStatement(TENANT, statement.id);
    assert.equal(pendingCancel?.status, "cancel_pending", "o provedor responde processando_cancelamento");
    assert.equal(pendingCancel?.cancelCode, INVOICE_CANCEL_CODE_OTHERS, "código 9 (outros) registrado na nossa linha — conforme provedor (R-D)");
    assert.match(pendingCancel?.cancelReason ?? "", /estornado/);
    assert.equal((await h.statements.findStatement(TENANT, statement.id))?.invoiceStatus, "cancel_pending");

    // o webhook de cancelamento não veio: o poll-settled reconsulta e conclui
    const concluded = await runBillingPollSettled(h.deps);
    assert.equal(concluded.invoices, 1);
    assert.equal(concluded.outcomes.invoice_cancelled, 1);
    const [cancelled] = await h.invoices.listByStatement(TENANT, statement.id);
    assert.equal(cancelled?.status, "cancelled");
    assert.ok(cancelled?.cancelledAt);
    const final = (await h.statements.findStatement(TENANT, statement.id))!;
    assert.equal(final.invoiceStatus, "cancelled");
    assert.equal(final.chargeStatus, "charged_back");
    assert.equal(final.paidCents, 0);
    assert.equal(final.status, "closed");
  } finally {
    await fake.close();
  }
});

test("fail-closed: não pago → NEEDS_REVIEW statement_not_paid; fiscal incompleto → NEEDS_REVIEW; provedor de nota desligado → provider_disabled visível; zero chamadas", async () => {
  const fake = await startFocusNfeFake("authorized");
  try {
    const adapter = focusAdapter(fake.baseUrl);

    const notPaid = harness(adapter);
    const closed = await closedStatement(notPaid, "2026-11");
    await enqueueIssue(notPaid, closed.id);
    assert.equal((await runBillingDispatch(notPaid.deps)).outcomes.needs_review, 1);
    const [row1] = await notPaid.outbox.listByStatement(TENANT, closed.id);
    assert.equal(row1?.status, "NEEDS_REVIEW");
    assert.equal(row1?.lastError, "statement_not_paid");
    assert.equal((await notPaid.invoices.listByStatement(TENANT, closed.id)).length, 0, "nada reservado: número e linha só depois de pago");

    const incomplete = harness(adapter, { contextReason: "fiscal_data_incomplete" });
    const paid = await paidStatement(incomplete, "2026-11");
    await enqueueIssue(incomplete, paid.id);
    assert.equal((await runBillingDispatch(incomplete.deps)).outcomes.needs_review, 1);
    const [row2] = await incomplete.outbox.listByStatement(TENANT, paid.id);
    assert.equal(row2?.lastError, "fiscal_data_incomplete");

    const off = harness(null);
    const paidOff = await paidStatement(off, "2026-11");
    await enqueueIssue(off, paidOff.id);
    assert.equal((await runBillingDispatch(off.deps)).processed, 0);
    const [row3] = await off.outbox.listByStatement(TENANT, paidOff.id);
    assert.equal(row3?.status, "PENDING");
    assert.equal(row3?.skipReason, "provider_disabled", "visível, sem rede (R-OBX-4)");

    assert.equal(fake.recorded.length, 0, "nenhuma chamada ao provedor em nenhum dos três casos");
  } finally {
    await fake.close();
  }
});

test("órfã de crash depois da chamada ao provedor: reconsulta pela ref ANTES de repetir → recovered, uma emissão só (G8)", async () => {
  const fake = await startFocusNfeFake();
  try {
    const adapter = focusAdapter(fake.baseUrl);
    const h = harness(adapter);
    const statement = await paidStatement(h, "2026-11");
    await enqueueIssue(h, statement.id);
    // o worker reclamou a linha, reservou o número, EMITIU e morreu antes do registro
    const claimed = await h.outbox.claimNext({ enabledProviders: ["focusnfe"], now: h.clock.now, claimedBy: "worker-que-caiu", orphanMs: 10 * 60_000, verdict: chargeCreateClaimVerdict });
    assert.ok(claimed);
    const { invoice } = await h.invoices.beginIssue({ tenantId: TENANT, statementId: statement.id, seq: 1, provider: "focusnfe", environment: "sandbox", serie: 7 }, h.clock.now);
    await adapter.issue({
      externalRef: invoice.externalRef,
      dpsNumber: invoice.numeroDps!,
      emitter: { cnpj: SETTINGS.cnpj },
      borrower: { document: "99888777000166", name: "Organização Tomadora", municipalityCode: "3550308" },
      serviceDescription: "Assinatura — competência 2026-11",
      amountCents: 10_000,
      competenceDate: competenceDateOf("2026-11"),
      taxProfile: taxProfileFromSettings(SETTINGS),
    });
    assert.equal(posts(fake).length, 1);

    // 11 min depois a rodada seguinte pega a órfã: reconsulta pela ref (processando) → recovered, SEM nova emissão
    h.clock.now = new Date(h.clock.now.getTime() + 11 * 60_000);
    const result = await runBillingDispatch(h.deps);
    assert.equal(result.outcomes.recovered, 1);
    assert.equal(posts(fake).length, 1, "nunca emite duas vezes");
    assert.ok(fake.recorded.some((request) => request.method === "GET"), "reconsultou antes de repetir");
    const [row] = await h.outbox.listByStatement(TENANT, statement.id);
    assert.equal(row?.status, "SENT");
    const [pending] = await h.invoices.listByStatement(TENANT, statement.id);
    assert.equal(pending?.status, "pending");
    assert.ok(pending?.issuedAt, "a emissão ficou registrada");
  } finally {
    await fake.close();
  }
});

test("R-WH-8 (nota): pending > 30 min sem webhook → poll-pending reconsulta; ainda processando é ignorada; autorizada na seguinte", async () => {
  const fake = await startFocusNfeFake(); // 1ª consulta: processando; 2ª: autorizado
  try {
    const adapter = focusAdapter(fake.baseUrl);
    const h = harness(adapter);
    const statement = await paidStatement(h, "2026-11");
    await enqueueIssue(h, statement.id);
    await runBillingDispatch(h.deps);

    const early = await runBillingPollPending(h.deps);
    assert.equal(early.invoices, 0, "antes dos 30 min nada é reconsultado");

    h.clock.now = new Date(h.clock.now.getTime() + POLL_PENDING_STALE_MS + 60_000);
    const first = await runBillingPollPending(h.deps);
    assert.equal(first.invoices, 1);
    assert.equal(first.outcomes.ignored, 1, "reconsult_processing: nada muda");
    assert.equal((await h.invoices.listByStatement(TENANT, statement.id))[0]?.status, "pending");

    const second = await runBillingPollPending(h.deps);
    assert.equal(second.outcomes.invoice_authorized, 1);
    assert.equal((await h.invoices.listByStatement(TENANT, statement.id))[0]?.status, "authorized");
    assert.equal((await h.statements.findStatement(TENANT, statement.id))?.invoiceStatus, "authorized");
  } finally {
    await fake.close();
  }
});

test("helpers: competência = último dia do período; a ref `<statement_id>:<seq>` resolve o nosso id; settings → perfil fiscal", () => {
  assert.equal(competenceDateOf("2026-02"), "2026-02-28");
  assert.equal(competenceDateOf("2028-02"), "2028-02-29");
  assert.equal(competenceDateOf("2026-12"), "2026-12-31");
  assert.equal(statementIdOfInvoiceRef(`${TENANT}:3`), TENANT);
  assert.equal(statementIdOfInvoiceRef("sem-dois-pontos"), null);
  assert.equal(statementIdOfInvoiceRef("x:nao-numero"), null);
  const profile = taxProfileFromSettings({ ...SETTINGS, ibsCbsEnviar: true, ibsCbsCst: "000", ibsCbsClassTrib: "000001", ibsCbsIndicadorDestinatario: "1", ibsCbsFinalidadeEmissao: "1", codigoNbs: "123456000" });
  assert.equal(profile.serieDps, 7);
  assert.equal(profile.nfseRoute, "nacional");
  assert.equal(profile.regimeTributario, "lucro_presumido");
  assert.deepEqual(profile.ibsCbs, { enviar: true, cst: "000", cClassTrib: "000001", indicadorDestinatario: "1", finalidadeEmissao: "1" });
  assert.equal(taxProfileFromSettings({ cnpj: "1" }).ibsCbs, undefined, "sem chaves IBS/CBS, o grupo não existe (omitir não rejeita)");
});
