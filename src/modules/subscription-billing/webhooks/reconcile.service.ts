// B-ASS-08 · F5 — `billing.reconcile-webhook` (plano §3.8, §4.8 R-WH-4/5, R-SET-1). O CORPO do webhook NUNCA decide:
// o reconcile RECONSULTA o recurso no provedor e baixa pelo valor da reconsulta. A organização é resolvida pelo NOSSO
// `statement_id` via `billing_statement_refs` (NUNCA pelo payload); o `customer id` do provedor tem de bater com o
// perfil da organização, senão `rejected` sem baixa.
// B-ASS-08b (c2): o webhook do provedor de NOTA entra pela mesma porta — a `ref` `<statement_id>:<seq>` leva ao nosso
// `statement_id`, e a reconsulta (`getInvoice`) decide `authorized`/`rejected`/`cancelled`; demonstrativo que fica `paid`
// pela reconsulta de pagamento enfileira `invoice_issue` (R-SET-2).

import type { InvoiceProviderPort } from "../providers/invoice/invoice-provider.port.js";
import type { PaymentProviderPort } from "../providers/payment/payment-provider.port.js";
import type { StatementInvoiceRepository } from "../invoices/invoices.repository.js";
import { sanitizeInvoiceError, statementIdOfInvoiceRef } from "../invoices/invoices.types.js";
import type { ProviderSource, StatementSettlementService } from "../statements/statement-settlement.service.js";
import type { WebhookEventRepository } from "./webhook-events.repository.js";
import type { BillingWebhookEvent } from "./webhook-events.types.js";
import type { StatementRefRepository } from "./statement-refs.repository.js";

export type ReconcileDeps = {
  readonly events: WebhookEventRepository;
  readonly refs: StatementRefRepository;
  /** Um adaptador por provedor de pagamento LIGADO (para a reconsulta). */
  readonly ports: Readonly<Record<string, PaymentProviderPort>>;
  readonly settlement: StatementSettlementService;
  /** A perna da NOTA: um adaptador por provedor de nota LIGADO e o repositório da nota (c2). */
  readonly invoicePorts?: Readonly<Record<string, InvoiceProviderPort>>;
  readonly invoices?: StatementInvoiceRepository;
  /** Demonstrativo que acabou de ficar `paid` pela reconsulta → `invoice_issue` DURÁVEL (R-SET-2). */
  enqueueInvoiceIssue?: (input: { tenantId: string; statementId: string }) => Promise<void>;
  /** `tenant_billing_profiles.<provedor>_customer_id` — o cliente do provedor tem de bater (R-WH-5). */
  resolveExpectedCustomerId?: (tenantId: string, provider: string) => Promise<string | null>;
  /** Enfileira `invoice_cancel` na outbox quando o estorno total/chargeback derruba uma nota autorizada (R-SET-2). */
  enqueueInvoiceCancel?: (input: { tenantId: string; statementId: string; provider: string }) => Promise<void>;
  /** A organização marcou "manter a nota" na reversão (N4, R-D) — default false. */
  resolveKeepInvoice?: (tenantId: string, statementId: string) => Promise<boolean>;
  readonly now?: () => Date;
};

export type ReconcileOutcome =
  | "settled"
  | "ignored"
  | "rejected"
  | "reversed"
  | "disputed"
  | "no_op"
  | "invoice_authorized"
  | "invoice_rejected"
  | "invoice_cancelled";

function rawCustomerId(raw: Readonly<Record<string, unknown>>): string | null {
  const value = raw.customer ?? raw.customerId ?? raw.payer;
  return typeof value === "string" && value ? value : null;
}

export async function reconcileWebhookEvent(deps: ReconcileDeps, input: { provider: string; externalEventId: string }): Promise<ReconcileOutcome> {
  const event = await deps.events.find(input.provider, input.externalEventId);
  if (!event) return "no_op";
  if (event.status !== "received") return "no_op";

  // Provedor de NOTA ligado: a referência é `<statement_id>:<seq>` e a reconsulta é da nota.
  if (deps.invoicePorts?.[input.provider]) return reconcileInvoiceEvent(deps, event);

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

/** O webhook da NOTA: `ref = <statement_id>:<seq>` → o NOSSO demonstrativo pelo índice (R-WH-5) → reconsulta (R-WH-4). */
async function reconcileInvoiceEvent(deps: ReconcileDeps, event: BillingWebhookEvent): Promise<ReconcileOutcome> {
  const externalRef = event.externalReference;
  if (!externalRef) {
    await deps.events.markStatus(event.id, { status: "ignored", error: "no_reference", incrementAttempts: true });
    return "ignored";
  }
  const statementId = statementIdOfInvoiceRef(externalRef);
  if (!statementId) {
    await deps.events.markStatus(event.id, { status: "ignored", error: "invalid_reference", incrementAttempts: true });
    return "ignored";
  }
  const ref = await deps.refs.resolve(statementId);
  if (!ref) {
    await deps.events.markStatus(event.id, { status: "ignored", error: "unresolved_reference", incrementAttempts: true });
    return "ignored";
  }
  const applied = await applyReconsultedInvoiceState(deps, { provider: event.provider, tenantId: ref.tenantId, statementId, externalRef });
  const resolved = { resolvedTenantId: ref.tenantId, resolvedStatementId: statementId, incrementAttempts: true } as const;
  if (applied.outcome === "ignored" || applied.outcome === "no_op") {
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
  deps: Pick<ReconcileDeps, "ports" | "settlement" | "resolveExpectedCustomerId" | "enqueueInvoiceCancel" | "enqueueInvoiceIssue" | "resolveKeepInvoice" | "now">,
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
    const result = await deps.settlement.applyReversal({
      tenantId: input.tenantId,
      statementId: input.statementId,
      externalChargeId: input.chargeId,
      reversedCents: reversalCeiling,
      kind: "refund",
      keepInvoice: await keepInvoice(),
      now: now(),
    });
    if ("shouldCancelInvoice" in result && result.shouldCancelInvoice && deps.enqueueInvoiceCancel) {
      await deps.enqueueInvoiceCancel({ tenantId: input.tenantId, statementId: input.statementId, provider: input.provider });
    }
    return { outcome: "reversed" };
  }

  // D3/R-CB-2: disputa em aberto não derruba "em dia" nem cancela nota; só marca `chargeback_disputed`.
  if (lookup.status === "chargeback_disputed") {
    await deps.settlement.markChargebackDisputed({ tenantId: input.tenantId, statementId: input.statementId, now: now() });
    return { outcome: "disputed" };
  }

  const paysNow = (lookup.status === "paid" || lookup.status === "partially_paid") && typeof lookup.paidCents === "number" && lookup.paidCents > 0;
  if (!paysNow) return { outcome: "ignored", reason: `reconsult_${lookup.status}` };

  const settled = await deps.settlement.settle({
    tenantId: input.tenantId,
    statementId: input.statementId,
    source,
    externalChargeId: input.chargeId,
    paidCents: lookup.paidCents!,
    method: null,
    now: now(),
  });
  // R-SET-2: ficou `paid` pela reconsulta → a nota entra na outbox (DURÁVEL; idempotente por `invoice_issue:<id>:1`).
  if (settled.kind === "settled" && settled.statement.status === "paid" && deps.enqueueInvoiceIssue) {
    await deps.enqueueInvoiceIssue({ tenantId: input.tenantId, statementId: input.statementId });
  }
  return { outcome: "settled" };
}

/**
 * A RECONSULTA DA NOTA — uma só para o webhook do provedor de nota, o `poll-pending` (nota `pending` sem retorno) e o
 * `poll-settled` (`cancel_pending` sem o webhook de cancelamento). O corpo do webhook nunca decide (R-WH-4): `getInvoice`
 * pela nossa `ref`. `authorized` só avança a partir de `pending` (uma `cancel_pending` não volta); `rejected` só de
 * `pending`; `cancelled` fecha qualquer estado. Idempotente.
 */
export async function applyReconsultedInvoiceState(
  deps: Pick<ReconcileDeps, "invoicePorts" | "invoices" | "now">,
  input: { readonly provider: string; readonly tenantId: string; readonly statementId: string; readonly externalRef: string },
): Promise<{ readonly outcome: ReconcileOutcome; readonly reason?: string }> {
  const port = deps.invoicePorts?.[input.provider];
  if (!port || !deps.invoices) return { outcome: "no_op", reason: "provider_not_enabled" };
  const invoice = await deps.invoices.findByRef(input.tenantId, input.provider, input.externalRef);
  if (!invoice || invoice.statementId !== input.statementId) return { outcome: "ignored", reason: "unknown_invoice" };
  const now = (deps.now ?? (() => new Date()))();

  // R-WH-4: RECONSULTA — o corpo não decide.
  const lookup = await port.getInvoice(input.externalRef);
  if (lookup.status === "authorized") {
    if (invoice.status === "pending") {
      await deps.invoices.markAuthorized(
        input.tenantId,
        invoice.id,
        {
          ...(lookup.number ? { number: lookup.number } : {}),
          ...(lookup.verificationCode ? { verificationCode: lookup.verificationCode } : {}),
          ...(lookup.pdfUrl ? { pdfUrl: lookup.pdfUrl } : {}),
          ...(lookup.xmlUrl ? { xmlUrl: lookup.xmlUrl } : {}),
          pdfSource: port.describe().pdfSource,
        },
        now,
      );
    }
    return { outcome: "invoice_authorized" };
  }
  if (lookup.status === "rejected") {
    if (invoice.status === "pending") await deps.invoices.markRejected(input.tenantId, invoice.id, sanitizeInvoiceError(lookup.errors), now);
    return { outcome: "invoice_rejected" };
  }
  if (lookup.status === "cancelled") {
    if (invoice.status !== "cancelled") await deps.invoices.markCancelled(input.tenantId, invoice.id, now);
    return { outcome: "invoice_cancelled" };
  }
  return { outcome: "ignored", reason: `reconsult_${lookup.status}` };
}
