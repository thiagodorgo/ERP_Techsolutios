// B-ASS-08 · F1 — o dispatcher `billing.dispatch-outbox` (plano §3.8, §4.8 R-OBX-*). Padrão claim–chamada–registro (G8):
//
//   (1) CLAIM em transação curta (`claimNext`) → a linha vira PROCESSING; nenhuma rede aqui.
//   (2) CHAMADA ao provedor FORA de transação (`port.createCharge`/reconsulta) — R-OBX-1: o `fetch` NUNCA roda dentro
//       de `withTenantRls`/transação. Por isso este arquivo não abre transação nenhuma em volta da chamada ao `port`.
//   (3) REGISTRO em transação curta (`markSent`/`reschedule`/`markFailed`/`markNeedsReview`).
//
// Provedor desligado nunca é alcançado (R-OBX-4): o claim só enxerga `enabledProviders`, e as PENDING de provedor
// desligado ganham `skip_reason = provider_disabled` visível, sem rede. Crash entre (2) e (3) deixa a linha PROCESSING;
// a rodada seguinte reconsulta por referência ANTES de repetir (nunca cobra 2×) e só vai a NEEDS_REVIEW se a reconsulta
// falhar (R-OBX-1). Backoff 1/5/15/60 min; 8 falhas → FAILED + trilha (R-OBX-2).

import type { PaymentProviderPort, CreateChargeInput, ChargeResult } from "../providers/payment/payment-provider.port.js";
import {
  backoffMsForAttempt,
  OUTBOX_MAX_ATTEMPTS,
  OUTBOX_ORPHAN_MS,
  type BillingOutboxRow,
  type OutboxKind,
} from "./outbox.types.js";
import type { OutboxRepository } from "./outbox.repository.js";

export type DispatchOutcome =
  | "sent"
  | "recovered"
  | "needs_review"
  | "rate_limited"
  | "retry"
  | "failed"
  | "skipped";

export type DispatchAuditEvent = {
  readonly tenantId: string;
  readonly statementId: string;
  readonly kind: OutboxKind;
  readonly action: "billing_outbox.failed" | "billing_outbox.needs_review";
  readonly code: string;
};

export type DispatcherDeps = {
  readonly repo: OutboxRepository;
  /** Um adaptador por provedor LIGADO. Provedor fora deste mapa nunca é alcançado. */
  readonly ports: Readonly<Record<string, PaymentProviderPort>>;
  readonly now?: () => Date;
  readonly claimedBy?: string;
  readonly orphanMs?: number;
  /** Persiste a cobrança criada (`subscription_statement_charges`, G11) — F7. */
  readonly onChargeCreated?: (row: BillingOutboxRow, result: ChargeResult, now: Date) => Promise<void>;
  readonly onAudit?: (event: DispatchAuditEvent) => Promise<void>;
};

export type DispatchRunResult = {
  readonly processed: number;
  readonly outcomes: Readonly<Record<DispatchOutcome, number>>;
};

function rateLimitRetryMs(error: unknown): number | null {
  if (error && typeof error === "object") {
    const candidate = error as { code?: unknown; retryAfterMs?: unknown };
    if (candidate.code === "provider_rate_limited") {
      return typeof candidate.retryAfterMs === "number" && candidate.retryAfterMs > 0 ? candidate.retryAfterMs : 60_000;
    }
  }
  return null;
}

function errorCode(error: unknown): string {
  if (error && typeof error === "object") {
    const candidate = error as { code?: unknown; name?: unknown };
    if (typeof candidate.code === "string" && candidate.code) return candidate.code;
    if (typeof candidate.name === "string" && candidate.name) return candidate.name;
  }
  return "unknown_error";
}

function chargeInputFromRow(row: BillingOutboxRow): CreateChargeInput {
  const payload = row.payload as Record<string, unknown>;
  return {
    customerId: String(payload.customerId ?? ""),
    amountCents: Number(payload.amountCents ?? 0),
    dueDate: String(payload.dueDate ?? ""),
    description: typeof payload.description === "string" ? payload.description : undefined,
    externalReference: row.statementId,
    method: (payload.method as CreateChargeInput["method"]) ?? "pix",
    idempotencyKey: row.providerIdempotencyKey,
  };
}

/**
 * Processa a outbox até esgotar as linhas elegíveis dos provedores LIGADOS. Primeiro marca as PENDING de provedor
 * desligado como visíveis (sem rede), depois roda o claim–chamada–registro. Devolve a contagem por desfecho.
 */
export async function runDispatchOutbox(deps: DispatcherDeps): Promise<DispatchRunResult> {
  const clock = deps.now ?? (() => new Date());
  const claimedBy = deps.claimedBy ?? "dispatch-outbox";
  const orphanMs = deps.orphanMs ?? OUTBOX_ORPHAN_MS;
  const enabledProviders = Object.keys(deps.ports);
  const outcomes: Record<DispatchOutcome, number> = {
    sent: 0,
    recovered: 0,
    needs_review: 0,
    rate_limited: 0,
    retry: 0,
    failed: 0,
    skipped: 0,
  };

  await deps.repo.markDisabledProvidersVisible(enabledProviders, clock());

  let processed = 0;
  // Teto defensivo: no máximo uma passada por linha elegível desta rodada (evita laço infinito num re-enqueue).
  const safety = (await deps.repo.listByStatus()).length + 1;
  for (let guard = 0; guard < safety; guard += 1) {
    const claimed = await deps.repo.claimNext({ enabledProviders, now: clock(), claimedBy, orphanMs });
    if (!claimed) break;
    processed += 1;
    const outcome = await dispatchOne(deps, claimed.row, claimed.wasOrphan, clock);
    outcomes[outcome] += 1;
  }

  return { processed, outcomes };
}

async function dispatchOne(
  deps: DispatcherDeps,
  row: BillingOutboxRow,
  wasOrphan: boolean,
  clock: () => Date,
): Promise<DispatchOutcome> {
  const port = deps.ports[row.provider];
  if (!port) {
    // Nunca deveria acontecer (claim filtra por provedor ligado); fail-closed sem rede.
    await deps.repo.markSkipped(row.id, "provider_disabled", clock());
    return "skipped";
  }
  if (row.kind !== "charge_create") {
    // Outros tipos (charge_cancel/refund/invoice_*) nascem nas fatias seguintes; sem handler → NEEDS_REVIEW.
    await deps.repo.markNeedsReview(row.id, "unsupported_kind", clock());
    return "needs_review";
  }

  // (2) CHAMADA FORA de transação. Crash órfão → reconsulta por referência ANTES de repetir (nunca cobra 2×).
  if (wasOrphan) {
    const recovered = await port.findChargeByExternalReference(row.statementId);
    if (recovered) {
      await deps.repo.markSent(row.id, recovered.chargeId, clock());
      return "recovered";
    }
    await deps.repo.markNeedsReview(row.id, "orphan_recovery_not_found", clock());
    await deps.onAudit?.({ tenantId: row.tenantId, statementId: row.statementId, kind: row.kind, action: "billing_outbox.needs_review", code: "orphan_recovery_not_found" });
    return "needs_review";
  }

  try {
    const result = await port.createCharge(chargeInputFromRow(row));
    await deps.onChargeCreated?.(row, result, clock());
    await deps.repo.markSent(row.id, result.chargeId, clock());
    return "sent";
  } catch (error) {
    const retryMs = rateLimitRetryMs(error);
    if (retryMs !== null) {
      await deps.repo.reschedule(row.id, new Date(clock().getTime() + retryMs), "rate_limited", clock());
      return "rate_limited";
    }
    const code = errorCode(error);
    if (row.attempts >= OUTBOX_MAX_ATTEMPTS) {
      await deps.repo.markFailed(row.id, code, clock());
      await deps.onAudit?.({ tenantId: row.tenantId, statementId: row.statementId, kind: row.kind, action: "billing_outbox.failed", code });
      return "failed";
    }
    await deps.repo.reschedule(row.id, new Date(clock().getTime() + backoffMsForAttempt(row.attempts)), code, clock());
    return "retry";
  }
}
