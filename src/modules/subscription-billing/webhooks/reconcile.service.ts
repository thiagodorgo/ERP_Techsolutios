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

  const applied = await applyReconsultedChargeState(deps, {
    provider: input.provider,
    tenantId: ref.tenantId,
    statementId,
    chargeId: event.externalResourceId,
  });
  const resolved = { resolvedTenantId: ref.tenantId, resolvedStatementId: statementId, incrementAttempts: true } as const;
  if (applied.outcome === "rejected") {
    await deps.events.markStatus(event.id, { status: "rejected", error: applied.reason ?? "rejected", ...resolved });
  } else if (applied.outcome === "ignored") {
    await deps.events.markStatus(event.id, { status: "ignored", error: applied.reason ?? "ignored", ...resolved });
  } else {
    await deps.events.markStatus(event.id, { status: "processed", ...resolved });
  }
  return applied.outcome;
}

/**
 * A MÁQUINA DE ESTADO DA RECONSULTA — uma só para o webhook, o `poll-pending` e o `poll-settled` (plano §3.8: estado
 * achado sem evento recebe "o mesmo tratamento do webhook"). Reconsulta o provedor (o corpo nunca decide, R-WH-4), confere o
 * cliente do provedor contra o da organização (R-WH-5) e aplica: pago → baixa monotônica; chargeback → reversão (e
 * `invoice_cancel` se a nota estiver autorizada); estorno → reversão; disputa → `chargeback_disputed`. Idempotente: repetir a
 * mesma reconsulta não muda nada (baixa monotônica, reversão limitada ao que falta, disputa é atribuição).
 */
export async function applyReconsultedChargeState(
  deps: Pick<ReconcileDeps, "ports" | "settlement" | "resolveExpectedCustomerId" | "enqueueInvoiceCancel" | "resolveKeepInvoice" | "now">,
  input: { readonly provider: string; readonly tenantId: string; readonly statementId: string; readonly chargeId: string },
): Promise<{ readonly outcome: ReconcileOutcome; readonly reason?: string }> {
  const now = deps.now ?? (() => new Date());
  const port = deps.ports[input.provider];
  if (!port) return { outcome: "no_op", reason: "provider_not_enabled" };
  const source = input.provider as ProviderSource;

  // R-WH-4: RECONSULTA — o corpo não decide. A baixa/reversão usa o estado e o valor BRUTO da reconsulta.
  const lookup = await port.getCharge(input.chargeId);

  // R-WH-5: o cliente do provedor tem de ser o da organização dona do demonstrativo (vale antes de qualquer efeito).
  const expected = deps.resolveExpectedCustomerId ? await deps.resolveExpectedCustomerId(input.tenantId, input.provider) : null;
  const rawCustomer = rawCustomerId(lookup.raw);
  if (expected && rawCustomer && rawCustomer !== expected) return { outcome: "rejected", reason: "customer_mismatch" };

  const keepInvoice = async () => (deps.resolveKeepInvoice ? deps.resolveKeepInvoice(input.tenantId, input.statementId) : false);
  // A reconsulta de estorno/chargeback pode não trazer valor: o teto é o pagamento (a reversão limita ao que falta).
  const reversalCeiling = typeof lookup.paidCents === "number" && lookup.paidCents > 0 ? lookup.paidCents : Number.MAX_SAFE_INTEGER;

  // Chargeback FINAL (R-CB-1): reverte e, se houver nota autorizada, enfileira o cancelamento (R-SET-2).
  if (lookup.status === "charged_back") {
    const result = await deps.settlement.applyReversal({
      tenantId: input.tenantId,
      statementId: input.statementId,
      externalChargeId: input.chargeId,
      reversedCents: reversalCeiling,
      kind: "chargeback",
      keepInvoice: await keepInvoice(),
      now: now(),
    });
    if ("shouldCancelInvoice" in result && result.shouldCancelInvoice && deps.enqueueInvoiceCancel) {
      await deps.enqueueInvoiceCancel({ tenantId: input.tenantId, statementId: input.statementId, provider: input.provider });
    }
    return { outcome: "reversed" };
  }

  // Estorno confirmado (R-CB-1): reverte pelo valor da reconsulta (ou pelo pagamento, se ela não trouxer valor).
  if (lookup.status === "refunded") {
    await deps.settlement.applyReversal({
      tenantId: input.tenantId,
      statementId: input.statementId,
      externalChargeId: input.chargeId,
      reversedCents: reversalCeiling,
      kind: "refund",
      keepInvoice: await keepInvoice(),
      now: now(),
    });
    return { outcome: "reversed" };
  }

  // D3/R-CB-2: disputa em aberto não derruba "em dia" nem cancela nota; só marca `chargeback_disputed`.
  if (lookup.status === "chargeback_disputed") {
    await deps.settlement.markChargebackDisputed({ tenantId: input.tenantId, statementId: input.statementId, now: now() });
    return { outcome: "disputed" };
  }

  const paysNow = (lookup.status === "paid" || lookup.status === "partially_paid") && typeof lookup.paidCents === "number" && lookup.paidCents > 0;
  if (!paysNow) return { outcome: "ignored", reason: `reconsult_${lookup.status}` };

  await deps.settlement.settle({
    tenantId: input.tenantId,
    statementId: input.statementId,
    source,
    externalChargeId: input.chargeId,
    paidCents: lookup.paidCents!,
    method: null,
    now: now(),
  });
  return { outcome: "settled" };
}
