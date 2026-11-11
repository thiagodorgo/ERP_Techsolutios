// B-ASS-08 · F1 — tipos da fila durável (`billing_outbox`, plano §3.2/§3.8). Espelho de `impound_outbox_events`.
// Padrão claim–chamada–registro (G8): o `fetch` ao provedor NUNCA roda dentro de transação (R-OBX-1).
// Conserto J-522 (R-OBX-5, D2): o claim relê o demonstrativo e aplica uma política de elegibilidade (`ClaimVerdict`).

import type { StatementStatus } from "../statements/statement.types.js";

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

/**
 * R-OBX-5 (D2): o que o claim RELÊ do demonstrativo, na transação do claim, antes de liberar uma `charge_create`.
 * `hasLiveCharge` = já existe cobrança viva (`pending`/`confirmed` em `subscription_statement_charges`) OU outra
 * `charge_create` do mesmo demonstrativo VIVA na própria fila — o conjunto do D1: `PENDING`/`PROCESSING`/`SENT`/
 * `NEEDS_REVIEW` (E4, 2º conserto do #522; antes era só `SENT`/`PROCESSING`, o que deixava duas vivas saírem as duas).
 */
export type StatementClaimSnapshot = {
  readonly status: StatementStatus;
  readonly reopenedAt: Date | null;
  readonly hasLiveCharge: boolean;
};

/** Motivos de `NEEDS_REVIEW` decididos no claim (E3 do conserto J-522): vão em `last_error` — a lista de `skip_reason`
 * da M5 (`billing_outbox_skip_reason_check`) é fechada e `prisma/**` não muda. */
export type ClaimNeedsReviewCode = "charge_already_exists" | "statement_not_found";

/** Veredito da política de elegibilidade aplicada no claim (R-OBX-5). Puro, sem rede. */
export type ClaimVerdict =
  | { readonly kind: "eligible" }
  | { readonly kind: "skip"; readonly skipReason: OutboxSkipReason }
  | { readonly kind: "needs_review"; readonly code: ClaimNeedsReviewCode };

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
  /** Conserto da J-530 (I6): a intenção de nota nasce VISÍVEL como `provider_disabled` quando o provedor de nota está
   * desligado; o claim limpa ao retomar. Padrão `null`. */
  readonly skipReason?: OutboxSkipReason | null;
};

export function idempotencyKeyOf(kind: OutboxKind, statementId: string, seq: number): string {
  return `${kind}:${statementId}:${seq}`;
}

/** Backoff do dispatcher: 1 / 5 / 15 / 60 min; a 8ª falha vira FAILED (R-OBX-2). */
export const OUTBOX_BACKOFF_MINUTES = [1, 5, 15, 60] as const;
export const OUTBOX_MAX_ATTEMPTS = 8;
/** Uma linha PROCESSING parada por mais que isto é órfã de crash (G8): reconsulta antes de repetir. */
export const OUTBOX_ORPHAN_MS = 10 * 60 * 1000;
/** Conserto da J-530 (C): o `invoice_cancel` de uma nota ainda pendente é ADIADO por isto, sem gastar tentativa, até a
 * reconsulta decidir a nota. */
export const INVOICE_DEFER_MS = 15 * 60 * 1000;

export function backoffMsForAttempt(attempts: number): number {
  const index = Math.min(Math.max(attempts - 1, 0), OUTBOX_BACKOFF_MINUTES.length - 1);
  return OUTBOX_BACKOFF_MINUTES[index]! * 60 * 1000;
}
