// B-ASS-08 · F5 — `billing.reconcile-webhook` (plano §3.8, §4.8 R-WH-4/5, R-SET-1). O CORPO do webhook NUNCA decide:
// o reconcile RECONSULTA o recurso no provedor e baixa pelo valor da reconsulta. A organização é resolvida pelo NOSSO
// `statement_id` via `billing_statement_refs` (NUNCA pelo payload); o `customer id` do provedor tem de bater com o
// perfil da organização, senão `rejected` sem baixa.

import type { PaymentProviderPort } from "../providers/payment/payment-provider.port.js";
import type { ProviderSource, StatementSettlementService } from "../statements/statement-settlement.service.js";
import type { WebhookEventRepository } from "./webhook-events.repository.js";
import type { StatementRefRepository } from "./statement-refs.repository.js";

export type ReconcileDeps = {
  readonly events: WebhookEventRepository;
  readonly refs: StatementRefRepository;
  /** Um adaptador por provedor de pagamento LIGADO (para a reconsulta). */
  readonly ports: Readonly<Record<string, PaymentProviderPort>>;
  readonly settlement: StatementSettlementService;
  /** `tenant_billing_profiles.<provedor>_customer_id` — o cliente do provedor tem de bater (R-WH-5). */
  resolveExpectedCustomerId?: (tenantId: string, provider: string) => Promise<string | null>;
  /** Enfileira `invoice_cancel` na outbox quando o estorno total/chargeback derruba uma nota autorizada (R-SET-2). */
  enqueueInvoiceCancel?: (input: { tenantId: string; statementId: string; provider: string }) => Promise<void>;
  /** A organização marcou "manter a nota" na reversão (N4, R-D) — default false. */
  resolveKeepInvoice?: (tenantId: string, statementId: string) => Promise<boolean>;
  readonly now?: () => Date;
};

export type ReconcileOutcome = "settled" | "ignored" | "rejected" | "reversed" | "disputed" | "no_op";

function rawCustomerId(raw: Readonly<Record<string, unknown>>): string | null {
  const value = raw.customer ?? raw.customerId ?? raw.payer;
  return typeof value === "string" && value ? value : null;
}

export async function reconcileWebhookEvent(deps: ReconcileDeps, input: { provider: string; externalEventId: string }): Promise<ReconcileOutcome> {
  const now = deps.now ?? (() => new Date());
  const event = await deps.events.find(input.provider, input.externalEventId);
  if (!event) return "no_op";
  if (event.status !== "received") return "no_op";

  const source = input.provider as ProviderSource;
  const port = deps.ports[input.provider];
  // Provedor não ligado: deixa `received` (o poll-pending retoma ao religar). Nada de baixa.
  if (!port) {
    await deps.events.markStatus(event.id, { error: "provider_not_enabled", incrementAttempts: true });
    return "no_op";
  }

  const statementId = event.externalReference;
  if (!statementId) {
    await deps.events.markStatus(event.id, { status: "ignored", error: "no_reference", incrementAttempts: true });
    return "ignored";
  }
  // R-WH-5: a organização vem do NOSSO índice, nunca do corpo.
  const ref = await deps.refs.resolve(statementId);
  if (!ref) {
    await deps.events.markStatus(event.id, { status: "ignored", error: "unresolved_reference", incrementAttempts: true });
    return "ignored";
  }
  if (!event.externalResourceId) {
    await deps.events.markStatus(event.id, { status: "ignored", error: "no_resource", incrementAttempts: true });
    return "ignored";
  }

  // R-WH-4: RECONSULTA — o corpo não decide. A baixa/reversão usa o estado e o valor BRUTO da reconsulta.
  const lookup = await port.getCharge(event.externalResourceId);

  // R-WH-5: o cliente do provedor tem de ser o da organização dona do demonstrativo (vale antes de qualquer efeito).
  const expected = deps.resolveExpectedCustomerId ? await deps.resolveExpectedCustomerId(ref.tenantId, input.provider) : null;
  const rawCustomer = rawCustomerId(lookup.raw);
  if (expected && rawCustomer && rawCustomer !== expected) {
    await deps.events.markStatus(event.id, { status: "rejected", error: "customer_mismatch", resolvedTenantId: ref.tenantId, resolvedStatementId: statementId, incrementAttempts: true });
    return "rejected";
  }

  const markProcessed = () => deps.events.markStatus(event.id, { status: "processed", resolvedTenantId: ref.tenantId, resolvedStatementId: statementId, incrementAttempts: true });

  // Chargeback FINAL (R-CB-1): reverte e, se houver nota autorizada, enfileira o cancelamento (R-SET-2).
  if (lookup.status === "charged_back") {
    const result = await deps.settlement.applyReversal({
      tenantId: ref.tenantId,
      statementId,
      externalChargeId: event.externalResourceId,
      reversedCents: typeof lookup.paidCents === "number" && lookup.paidCents > 0 ? lookup.paidCents : Number.MAX_SAFE_INTEGER,
      kind: "chargeback",
      keepInvoice: deps.resolveKeepInvoice ? await deps.resolveKeepInvoice(ref.tenantId, statementId) : false,
      now: now(),
    });
    if ("shouldCancelInvoice" in result && result.shouldCancelInvoice && deps.enqueueInvoiceCancel) {
      await deps.enqueueInvoiceCancel({ tenantId: ref.tenantId, statementId, provider: input.provider });
    }
    await markProcessed();
    return "reversed";
  }

  // Estorno confirmado (R-CB-1 parcial/total): usa o valor estornado da reconsulta.
  if (lookup.status === "refunded") {
    await deps.settlement.applyReversal({
      tenantId: ref.tenantId,
      statementId,
      externalChargeId: event.externalResourceId,
      reversedCents: typeof lookup.paidCents === "number" && lookup.paidCents > 0 ? lookup.paidCents : Number.MAX_SAFE_INTEGER,
      kind: "refund",
      keepInvoice: deps.resolveKeepInvoice ? await deps.resolveKeepInvoice(ref.tenantId, statementId) : false,
      now: now(),
    });
    await markProcessed();
    return "reversed";
  }

  // D3/R-CB-2: disputa em aberto não derruba "em dia" nem cancela nota; só marca `chargeback_disputed`.
  if (lookup.status === "chargeback_disputed") {
    await deps.settlement.markChargebackDisputed({ tenantId: ref.tenantId, statementId, now: now() });
    await markProcessed();
    return "disputed";
  }

  const paysNow = (lookup.status === "paid" || lookup.status === "partially_paid") && typeof lookup.paidCents === "number" && lookup.paidCents > 0;
  if (!paysNow) {
    await deps.events.markStatus(event.id, { status: "ignored", error: `reconsult_${lookup.status}`, resolvedTenantId: ref.tenantId, resolvedStatementId: statementId, incrementAttempts: true });
    return "ignored";
  }

  await deps.settlement.settle({
    tenantId: ref.tenantId,
    statementId,
    source,
    externalChargeId: event.externalResourceId,
    paidCents: lookup.paidCents!,
    method: null,
    now: now(),
  });
  await markProcessed();
  return "settled";
}
