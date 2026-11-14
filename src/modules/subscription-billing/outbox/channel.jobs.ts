// B-ASS-08b · (c) — os EXECUTORES dos 4 jobs do canal (plano §3.8), puros e injetáveis: a composição de produção
// (channel.runtime.ts) e os testes passam os repositórios e as portas. Nenhum deles decide se o canal está ligado — quem
// chama (o handler do job) só os executa com `BILLING_PROVIDERS_ENABLED=true`; as portas são SÓ as dos provedores LIGADOS,
// então provedor desligado nunca é alcançado (R-OBX-4). O `fetch` acontece dentro das portas, nunca em transação (R-OBX-1).
// (c2): a perna da NOTA entra pelos mesmos 4 jobs — `invoice_issue`/`invoice_cancel` no dispatch, o webhook do provedor de
// nota no reconcile, a nota `pending` sem retorno no poll-pending e a `cancel_pending` no poll-settled.

import type { InvoiceProviderPort } from "../providers/invoice/invoice-provider.port.js";
import type { PaymentProviderPort } from "../providers/payment/payment-provider.port.js";
import type { StatementChargeRepository } from "../charges/charges.repository.js";
import type { StatementInvoiceRepository } from "../invoices/invoices.repository.js";
import type { SubscriptionStatementInvoice } from "../invoices/invoices.types.js";
import type { StatementRepository } from "../statements/statement.repository.js";
import type { StatementSettlementService } from "../statements/statement-settlement.service.js";
import type { WebhookEventRepository } from "../webhooks/webhook-events.repository.js";
import type { StatementRefRepository } from "../webhooks/statement-refs.repository.js";
import {
  applyReconsultedChargeState,
  applyReconsultedInvoiceState,
  reconcileWebhookEvent,
  type ReconcileDeps,
  type ReconcileOutcome,
} from "../webhooks/reconcile.service.js";
import { InvoiceOutboxHandler, type InvoiceIssueContextResolver } from "./invoice.dispatch.js";
import { runDispatchOutbox, type DispatcherDeps, type DispatchRunResult } from "./outbox.dispatcher.js";
import type { OutboxRepository } from "./outbox.repository.js";

/** Evento `received` sem job há mais que isto é órfão (R-WH-8); cobrança `pending` (ou nota `pending`) há mais que isto é reconsultada. */
export const POLL_PENDING_STALE_MS = 30 * 60 * 1000;
/** Quanto tempo atrás o poll-pending procura cobranças ainda pendentes. */
export const POLL_PENDING_LOOKBACK_MS = 45 * 24 * 60 * 60 * 1000;
/** Janela de chargeback de cartão (G9): o poll-settled reconsulta o que foi confirmado nos últimos 120 dias. */
export const POLL_SETTLED_WINDOW_MS = 120 * 24 * 60 * 60 * 1000;

export type ChannelDeps = {
  readonly outbox: OutboxRepository;
  readonly events: WebhookEventRepository;
  readonly refs: StatementRefRepository;
  readonly charges: StatementChargeRepository;
  /** SÓ as portas dos provedores de PAGAMENTO LIGADOS. */
  readonly ports: Readonly<Record<string, PaymentProviderPort>>;
  /** R-PRF-1 — OBRIGATÓRIO, como no `DispatcherDeps` (2º conserto do #522): o cliente no provedor vem do PERFIL
   * (`profileCustomerResolver`), nunca do payload; em produção, envolto em `persistingCustomerResolver` (G12). */
  readonly resolveCustomer: DispatcherDeps["resolveCustomer"];
  readonly settlement: StatementSettlementService;
  readonly statements: Pick<StatementRepository, "findStatement">;
  /** A perna da NOTA (c2): SÓ as portas dos provedores de nota LIGADOS, o repositório da nota e o contexto fiscal. Ausentes =
   * sem perna de nota (os `invoice_*` da outbox ficam visíveis como `provider_disabled`). */
  readonly invoicePorts?: Readonly<Record<string, InvoiceProviderPort>>;
  readonly invoices?: StatementInvoiceRepository;
  readonly resolveIssueContext?: InvoiceIssueContextResolver;
  readonly resolveExpectedCustomerId?: ReconcileDeps["resolveExpectedCustomerId"];
  readonly resolveKeepInvoice?: ReconcileDeps["resolveKeepInvoice"];
  readonly now?: () => Date;
};

function reconcileDepsOf(deps: ChannelDeps): ReconcileDeps {
  return {
    events: deps.events,
    refs: deps.refs,
    ports: deps.ports,
    settlement: deps.settlement,
    ...(deps.invoicePorts ? { invoicePorts: deps.invoicePorts } : {}),
    ...(deps.invoices ? { invoices: deps.invoices } : {}),
    ...(deps.resolveExpectedCustomerId ? { resolveExpectedCustomerId: deps.resolveExpectedCustomerId } : {}),
    ...(deps.resolveKeepInvoice ? { resolveKeepInvoice: deps.resolveKeepInvoice } : {}),
    ...(deps.now ? { now: deps.now } : {}),
  };
}

function invoiceHandlerOf(deps: ChannelDeps): InvoiceOutboxHandler | undefined {
  if (!deps.invoicePorts || !deps.invoices || !deps.resolveIssueContext) return undefined;
  return new InvoiceOutboxHandler({ ports: deps.invoicePorts, invoices: deps.invoices, statements: deps.statements, resolveIssueContext: deps.resolveIssueContext });
}

/** `billing.dispatch-outbox`: claim–chamada–registro; a cobrança criada vira `subscription_statement_charges` (G11) e o
 * id do provedor entra no índice `billing_statement_refs` (para os polls a acharem). A nota entra pelo mesmo claim. */
export async function runBillingDispatch(deps: ChannelDeps): Promise<DispatchRunResult> {
  const invoices = invoiceHandlerOf(deps);
  deps.outbox.configureChargeOutcomeSink?.(async (charge, at) => {
    await deps.charges.insert(charge, at);
    await deps.refs.setExternalChargeId(charge.statementId, charge.externalChargeId, at);
  });
  return runDispatchOutbox({
    repo: deps.outbox,
    ports: deps.ports,
    resolveCustomer: deps.resolveCustomer,
    ...(invoices ? { invoices } : {}),
    ...(deps.now ? { now: deps.now } : {}),
  });
}

/** `billing.reconcile-webhook`: um evento aceito → reconsulta e efeito (R-WH-4/5) — de cobrança ou de nota. */
export async function runBillingReconcileEvent(deps: ChannelDeps, input: { provider: string; externalEventId: string }): Promise<ReconcileOutcome> {
  return reconcileWebhookEvent(reconcileDepsOf(deps), input);
}

export type PollResult = {
  readonly events: number;
  readonly charges: number;
  /** Notas reconsultadas (`pending` sem retorno no poll-pending; `cancel_pending` no poll-settled). */
  readonly invoices: number;
  readonly outcomes: Readonly<Partial<Record<ReconcileOutcome, number>>>;
};

/** A nota viva do demonstrativo no estado pedido, de provedor LIGADO, e (se houver corte) parada há tempo suficiente. */
async function liveInvoiceToReconsult(
  deps: ChannelDeps,
  tenantId: string,
  statementId: string,
  status: "pending" | "cancel_pending",
  staleCutoffMs?: number,
): Promise<SubscriptionStatementInvoice | undefined> {
  if (!deps.invoices || !deps.invoicePorts) return undefined;
  const live = await deps.invoices.findLive(tenantId, statementId);
  if (!live || live.status !== status || !deps.invoicePorts[live.provider]) return undefined;
  if (staleCutoffMs !== undefined && (live.issuedAt ?? live.createdAt).getTime() > staleCutoffMs) return undefined;
  return live;
}

/** `billing.poll-pending`: (a) evento `received` órfão há > 30 min (o job dele se perdeu — R-WH-8) é reconciliado; (b)
 * cobrança ainda `pending` num demonstrativo `closed`, sem evento há > 30 min, é reconsultada (webhook perdido); (c) nota
 * `pending` emitida há > 30 min sem retorno é reconsultada (webhook perdido; cobre a janela de 6 h do PlugNotas). */
export async function runBillingPollPending(deps: ChannelDeps): Promise<PollResult> {
  const now = (deps.now ?? (() => new Date()))();
  const outcomes: Partial<Record<ReconcileOutcome, number>> = {};
  const count = (outcome: ReconcileOutcome) => (outcomes[outcome] = (outcomes[outcome] ?? 0) + 1);

  let events = 0;
  for (const event of await deps.events.listStale(POLL_PENDING_STALE_MS, now)) {
    if (!deps.ports[event.provider] && !deps.invoicePorts?.[event.provider]) continue; // provedor desligado: o evento espera o canal religar
    count(await reconcileWebhookEvent(reconcileDepsOf(deps), { provider: event.provider, externalEventId: event.externalEventId }));
    events += 1;
  }

  let charges = 0;
  let invoices = 0;
  const staleCutoff = now.getTime() - POLL_PENDING_STALE_MS;
  for (const ref of await deps.refs.listWithCharge(new Date(now.getTime() - POLL_PENDING_LOOKBACK_MS))) {
    if (ref.createdAt.getTime() > staleCutoff) continue;
    const statement = await deps.statements.findStatement(ref.tenantId, ref.statementId);
    if (!statement) continue;
    if (ref.provider && ref.externalChargeId && deps.ports[ref.provider] && statement.status === "closed" && statement.chargeStatus === "pending") {
      count((await applyReconsultedChargeState(reconcileDepsOf(deps), { provider: ref.provider, tenantId: ref.tenantId, statementId: ref.statementId, chargeId: ref.externalChargeId })).outcome);
      charges += 1;
    }
    const invoice = await liveInvoiceToReconsult(deps, ref.tenantId, ref.statementId, "pending", staleCutoff);
    if (invoice) {
      count((await applyReconsultedInvoiceState(reconcileDepsOf(deps), { provider: invoice.provider, tenantId: ref.tenantId, statementId: ref.statementId, externalRef: invoice.externalRef })).outcome);
      invoices += 1;
    }
  }
  return { events, charges, invoices, outcomes };
}

/** Estados de cobrança que ainda podem virar chargeback/estorno tardio (G9). */
const SETTLED_STATES = new Set(["confirmed", "partially_refunded", "chargeback_disputed"]);

/** `billing.poll-settled`: reconsulta o que foi confirmado nos últimos 120 dias; `charged_back`/`refunded` achado sem
 * evento recebe o mesmo tratamento do webhook (G9). Idempotente: a reversão só tira o que ainda falta. Também conclui a
 * nota `cancel_pending` cujo webhook de cancelamento não veio. */
export async function runBillingPollSettled(deps: ChannelDeps): Promise<PollResult> {
  const now = (deps.now ?? (() => new Date()))();
  const outcomes: Partial<Record<ReconcileOutcome, number>> = {};
  const count = (outcome: ReconcileOutcome) => (outcomes[outcome] = (outcomes[outcome] ?? 0) + 1);
  let charges = 0;
  let invoices = 0;
  for (const ref of await deps.refs.listWithCharge(new Date(now.getTime() - POLL_SETTLED_WINDOW_MS))) {
    const statement = await deps.statements.findStatement(ref.tenantId, ref.statementId);
    if (!statement) continue;
    if (ref.provider && ref.externalChargeId && deps.ports[ref.provider] && SETTLED_STATES.has(statement.chargeStatus)) {
      count((await applyReconsultedChargeState(reconcileDepsOf(deps), { provider: ref.provider, tenantId: ref.tenantId, statementId: ref.statementId, chargeId: ref.externalChargeId })).outcome);
      charges += 1;
    }
    const invoice = await liveInvoiceToReconsult(deps, ref.tenantId, ref.statementId, "cancel_pending");
    if (invoice) {
      count((await applyReconsultedInvoiceState(reconcileDepsOf(deps), { provider: invoice.provider, tenantId: ref.tenantId, statementId: ref.statementId, externalRef: invoice.externalRef })).outcome);
      invoices += 1;
    }
  }
  return { events: 0, charges, invoices, outcomes };
}
