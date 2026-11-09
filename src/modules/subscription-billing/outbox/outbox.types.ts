// B-ASS-08 · F1 — tipos da fila durável (`billing_outbox`, plano §3.2/§3.8). Espelho de `impound_outbox_events`.
// Padrão claim–chamada–registro (G8): o `fetch` ao provedor NUNCA roda dentro de transação (R-OBX-1).

/** Tipo da intenção enfileirada. */
export const OUTBOX_KINDS = ["charge_create", "charge_cancel", "refund", "invoice_issue", "invoice_cancel"] as const;
export type OutboxKind = (typeof OUTBOX_KINDS)[number];

/** Estado da linha (G8). `PROCESSING` e `NEEDS_REVIEW` entram no enum; `SKIPPED` para linha que mudou de alvo (D2/D5). */
export const OUTBOX_STATUSES = ["PENDING", "PROCESSING", "SENT", "FAILED", "NEEDS_REVIEW", "SKIPPED"] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

/** Motivo de uma linha pulada, visível na tela (D2/D5). */
export type OutboxSkipReason =
  | "provider_disabled"
  | "provider_disabled_by_platform"
  | "statement_paid"
  | "statement_cancelled"
  | "statement_reopened";

export type BillingOutboxRow = {
  readonly id: string;
  readonly tenantId: string;
  readonly statementId: string;
  readonly kind: OutboxKind;
  readonly provider: string;
  /** `<kind>:<statement_id>:<seq>` — UNIQUE. */
  readonly idempotencyKey: string;
  /** uuid estável por linha (Iugu/MP reenviam a MESMA chave). */
  readonly providerIdempotencyKey: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly status: OutboxStatus;
  readonly skipReason: OutboxSkipReason | null;
  readonly claimedAt: Date | null;
  readonly claimedBy: string | null;
  /** Intenção gravada ANTES da chamada (crash entre chamada e registro → linha fica PROCESSING). */
  readonly attemptStartedAt: Date | null;
  readonly attempts: number;
  readonly nextAttemptAt: Date | null;
  readonly lastError: string | null;
  readonly externalId: string | null;
  readonly occurredAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type NewOutboxRow = {
  readonly tenantId: string;
  readonly statementId: string;
  readonly kind: OutboxKind;
  readonly provider: string;
  readonly seq: number;
  readonly payload?: Readonly<Record<string, unknown>>;
  readonly providerIdempotencyKey?: string;
};

export function idempotencyKeyOf(kind: OutboxKind, statementId: string, seq: number): string {
  return `${kind}:${statementId}:${seq}`;
}

/** Backoff do dispatcher: 1 / 5 / 15 / 60 min; a 8ª falha vira FAILED (R-OBX-2). */
export const OUTBOX_BACKOFF_MINUTES = [1, 5, 15, 60] as const;
export const OUTBOX_MAX_ATTEMPTS = 8;
/** Uma linha PROCESSING parada por mais que isto é órfã de crash (G8): reconsulta antes de repetir. */
export const OUTBOX_ORPHAN_MS = 10 * 60 * 1000;

export function backoffMsForAttempt(attempts: number): number {
  const index = Math.min(Math.max(attempts - 1, 0), OUTBOX_BACKOFF_MINUTES.length - 1);
  return OUTBOX_BACKOFF_MINUTES[index]! * 60 * 1000;
}
