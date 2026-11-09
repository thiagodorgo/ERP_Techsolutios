// B-ASS-08b · (c) — os EXECUTORES dos 4 jobs do canal (plano §3.8), puros e injetáveis: a composição de produção
// (channel.runtime.ts) e os testes passam os repositórios e as portas. Nenhum deles decide se o canal está ligado — quem
// chama (o handler do job) só os executa com `BILLING_PROVIDERS_ENABLED=true`; as portas são SÓ as dos provedores LIGADOS,
// então provedor desligado nunca é alcançado (R-OBX-4). O `fetch` acontece dentro das portas, nunca em transação (R-OBX-1).

import type { PaymentProviderPort } from "../providers/payment/payment-provider.port.js";
import type { StatementChargeRepository } from "../charges/charges.repository.js";
import type { StatementRepository } from "../statements/statement.repository.js";
import type { StatementSettlementService } from "../statements/statement-settlement.service.js";
import type { WebhookEventRepository } from "../webhooks/webhook-events.repository.js";
import type { StatementRefRepository } from "../webhooks/statement-refs.repository.js";
import { applyReconsultedChargeState, reconcileWebhookEvent, type ReconcileDeps, type ReconcileOutcome } from "../webhooks/reconcile.service.js";
import { runDispatchOutbox, type DispatchRunResult } from "./outbox.dispatcher.js";
import type { OutboxRepository } from "./outbox.repository.js";

/** Evento `received` sem job há mais que isto é órfão (R-WH-8); cobrança `pending` há mais que isto é reconsultada. */
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
  /** SÓ as portas dos provedores LIGADOS. */
  readonly ports: Readonly<Record<string, PaymentProviderPort>>;
  readonly settlement: StatementSettlementService;
  readonly statements: Pick<StatementRepository, "findStatement">;
  readonly resolveExpectedCustomerId?: ReconcileDeps["resolveExpectedCustomerId"];
  readonly enqueueInvoiceCancel?: ReconcileDeps["enqueueInvoiceCancel"];
  readonly resolveKeepInvoice?: ReconcileDeps["resolveKeepInvoice"];
  readonly now?: () => Date;
};

function reconcileDepsOf(deps: ChannelDeps): ReconcileDeps {
  return {
    events: deps.events,
    refs: deps.refs,
    ports: deps.ports,
    settlement: deps.settlement,
    resolveExpectedCustomerId: deps.resolveExpectedCustomerId,
    enqueueInvoiceCancel: deps.enqueueInvoiceCancel,
    resolveKeepInvoice: deps.resolveKeepInvoice,
    now: deps.now,
  };
}

/** `billing.dispatch-outbox`: claim–chamada–registro; a cobrança criada vira `subscription_statement_charges` (G11) e o
 * id do provedor entra no índice `billing_statement_refs` (para os polls a acharem). */
export async function runBillingDispatch(deps: ChannelDeps): Promise<DispatchRunResult> {
  return runDispatchOutbox({
    repo: deps.outbox,
    ports: deps.ports,
    now: deps.now,
    onChargeCreated: async (row, result, at) => {
      const dueDate = typeof row.payload.dueDate === "string" ? row.payload.dueDate : null;
      await deps.charges.insert(
        {
          tenantId: row.tenantId,
          statementId: row.statementId,
          provider: row.provider,
          externalChargeId: result.chargeId,
          // Uma cobrança recém-criada está sempre pendente; o resto do ciclo vem da reconsulta.
          status: "pending",
          payUrl: result.payUrl ?? null,
          pixCopyPaste: result.pixCopyPaste ?? null,
          boletoLine: result.boletoLine ?? null,
          boletoUrl: result.boletoUrl ?? null,
          dueDate,
        },
        at,
      );
      await deps.refs.setExternalChargeId(row.statementId, result.chargeId, at);
    },
  });
}

/** `billing.reconcile-webhook`: um evento aceito → reconsulta e efeito (R-WH-4/5). */
export async function runBillingReconcileEvent(deps: ChannelDeps, input: { provider: string; externalEventId: string }): Promise<ReconcileOutcome> {
  return reconcileWebhookEvent(reconcileDepsOf(deps), input);
}

export type PollResult = { readonly events: number; readonly charges: number; readonly outcomes: Readonly<Partial<Record<ReconcileOutcome, number>>> };

/** `billing.poll-pending`: (a) evento `received` órfão há > 30 min (o job dele se perdeu — R-WH-8) é reconciliado; (b)
 * cobrança ainda `pending` num demonstrativo `closed`, sem evento há > 30 min, é reconsultada (webhook perdido). */
export async function runBillingPollPending(deps: ChannelDeps): Promise<PollResult> {
  const now = (deps.now ?? (() => new Date()))();
  const outcomes: Partial<Record<ReconcileOutcome, number>> = {};
  const count = (outcome: ReconcileOutcome) => (outcomes[outcome] = (outcomes[outcome] ?? 0) + 1);

  let events = 0;
  for (const event of await deps.events.listStale(POLL_PENDING_STALE_MS, now)) {
    if (!deps.ports[event.provider]) continue; // provedor desligado: o evento espera o canal religar
    count(await reconcileWebhookEvent(reconcileDepsOf(deps), { provider: event.provider, externalEventId: event.externalEventId }));
    events += 1;
  }

  let charges = 0;
  const staleCutoff = now.getTime() - POLL_PENDING_STALE_MS;
  for (const ref of await deps.refs.listWithCharge(new Date(now.getTime() - POLL_PENDING_LOOKBACK_MS))) {
    if (!ref.provider || !ref.externalChargeId || !deps.ports[ref.provider]) continue;
    if (ref.createdAt.getTime() > staleCutoff) continue;
    const statement = await deps.statements.findStatement(ref.tenantId, ref.statementId);
    if (!statement || statement.status !== "closed" || statement.chargeStatus !== "pending") continue;
    count((await applyReconsultedChargeState(reconcileDepsOf(deps), { provider: ref.provider, tenantId: ref.tenantId, statementId: ref.statementId, chargeId: ref.externalChargeId })).outcome);
    charges += 1;
  }
  return { events, charges, outcomes };
}

/** Estados de cobrança que ainda podem virar chargeback/estorno tardio (G9). */
const SETTLED_STATES = new Set(["confirmed", "partially_refunded", "chargeback_disputed"]);

/** `billing.poll-settled`: reconsulta o que foi confirmado nos últimos 120 dias; `charged_back`/`refunded` achado sem
 * evento recebe o mesmo tratamento do webhook (G9). Idempotente: a reversão só tira o que ainda falta. */
export async function runBillingPollSettled(deps: ChannelDeps): Promise<PollResult> {
  const now = (deps.now ?? (() => new Date()))();
  const outcomes: Partial<Record<ReconcileOutcome, number>> = {};
  let charges = 0;
  for (const ref of await deps.refs.listWithCharge(new Date(now.getTime() - POLL_SETTLED_WINDOW_MS))) {
    if (!ref.provider || !ref.externalChargeId || !deps.ports[ref.provider]) continue;
    const statement = await deps.statements.findStatement(ref.tenantId, ref.statementId);
    if (!statement || !SETTLED_STATES.has(statement.chargeStatus)) continue;
    const { outcome } = await applyReconsultedChargeState(reconcileDepsOf(deps), {
      provider: ref.provider,
      tenantId: ref.tenantId,
      statementId: ref.statementId,
      chargeId: ref.externalChargeId,
    });
    outcomes[outcome] = (outcomes[outcome] ?? 0) + 1;
    charges += 1;
  }
  return { events: 0, charges, outcomes };
}
