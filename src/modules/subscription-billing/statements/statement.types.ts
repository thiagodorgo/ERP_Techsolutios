// B-ASS-04 — tipos do demonstrativo, pagamentos e créditos (plano §3.2, §4.4). Dinheiro em CENTAVOS INTEIROS.

import type { StatementComputation, StatementSnapshot } from "./statement.engine.js";

export const STATEMENT_STATUSES = ["open", "reopened", "closed", "paid", "cancelled"] as const;
export type StatementStatus = (typeof STATEMENT_STATUSES)[number];

export const CHARGE_STATUSES = [
  "none",
  "pending",
  "confirmed",
  "failed",
  "cancelled",
  "partially_refunded",
  "refunded",
  "chargeback_disputed",
  "charged_back",
  "needs_review",
] as const;
export type ChargeStatus = (typeof CHARGE_STATUSES)[number];

export const INVOICE_STATUSES = ["none", "pending", "authorized", "rejected", "cancel_pending", "cancelled"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_SOURCES = ["manual", "asaas", "mercadopago"] as const;
export type PaymentSource = (typeof PAYMENT_SOURCES)[number];

export const CREDIT_REASONS = [
  "overpayment",
  "duplicate_payment",
  "paid_after_cancel",
  "paid_after_manual_settlement",
  "late_fee_received",
] as const;
export type CreditReason = (typeof CREDIT_REASONS)[number];

export const CREDIT_STATUSES = ["open", "applied", "refunded", "written_off"] as const;
export type CreditStatus = (typeof CREDIT_STATUSES)[number];

export type StatementHistoryEntry = {
  readonly at: string;
  readonly event: "closed" | "reopened" | "adjusted" | "cancelled" | "credit_applied";
  readonly by: string | null;
  readonly totalCents: number;
  readonly note?: string;
};

export type StatementSnapshotEnvelope = {
  readonly latest: StatementSnapshot | null;
  readonly history: readonly StatementHistoryEntry[];
  readonly zeroTotal?: true;
  readonly warning?: "no_usage_measured";
  readonly gaps?: readonly string[];
};

export type SubscriptionStatement = {
  readonly id: string;
  readonly tenantId: string;
  /** `YYYY-MM`. */
  readonly period: string;
  readonly status: StatementStatus;
  readonly chargeStatus: ChargeStatus;
  readonly invoiceStatus: InvoiceStatus;
  readonly subscriptionId: string | null;
  readonly planVersionId: string | null;
  readonly addonPlanVersionId: string | null;
  readonly computation: StatementComputation | null;
  readonly daysInMonth: number;
  readonly daysMeasured: number;
  readonly totalCents: number;
  readonly paidCents: number;
  readonly adjustmentsCents: number;
  readonly creditsAppliedCents: number;
  readonly adjustmentNote: string | null;
  /** Data de negócio (`YYYY-MM-DD`, São Paulo) do vencimento; `null` enquanto aberto. */
  readonly dueDate: string | null;
  readonly closedAt: Date | null;
  readonly closedBy: string | null;
  readonly reopenedAt: Date | null;
  readonly reopenedBy: string | null;
  readonly reopenReason: string | null;
  readonly paidAt: Date | null;
  readonly cancelledAt: Date | null;
  readonly cancelledBy: string | null;
  readonly cancelReason: string | null;
  readonly snapshot: StatementSnapshotEnvelope;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type StatementPayment = {
  readonly id: string;
  readonly tenantId: string;
  readonly statementId: string;
  readonly source: PaymentSource;
  readonly externalChargeId: string | null;
  readonly amountCents: number;
  /** Parte que abate o saldo; o resto virou crédito (G7). */
  readonly appliedCents: number;
  readonly paidAt: Date;
  readonly method: string | null;
  readonly note: string | null;
  readonly recordedBy: string | null;
  readonly reversedCents: number;
  readonly reversedAt: Date | null;
  readonly reversedBy: string | null;
  readonly reversalReason: string | null;
  readonly reversalKind: "manual" | "refund" | "chargeback" | null;
};

export type SubscriptionCredit = {
  readonly id: string;
  readonly tenantId: string;
  readonly originStatementId: string;
  readonly originPaymentId: string | null;
  readonly amountCents: number;
  readonly reason: CreditReason;
  readonly status: CreditStatus;
  readonly appliedToStatementId: string | null;
  readonly createdBy: string | null;
  readonly resolvedBy: string | null;
  readonly resolutionNote: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type StatementAuditAction =
  | "subscription_statement.closed"
  | "subscription_statement.reopened"
  | "subscription_statement.payment_recorded"
  | "subscription_statement.payment_reversed"
  | "subscription_statement.cancelled"
  | "subscription_statement.adjusted"
  | "subscription_statement.credit_created"
  | "subscription_statement.credit_applied"
  | "subscription_statement.credit_written_off"
  | "subscription_billing_profile.updated";

/** Trilha de auditoria (§3.6): metadata SEMPRE pela allowlist — só ids, período, status e valores em centavos. */
export type StatementAuditEvent = {
  readonly tenantId: string;
  readonly actorId: string | null;
  readonly action: StatementAuditAction;
  readonly entityId: string;
  readonly metadata: Readonly<Record<string, string | number | boolean | null>>;
};

export class StatementError extends Error {
  /** Código do envelope de erro da casa (`{ error: { code, reason, message } }`). */
  readonly code = "SUBSCRIPTION_STATEMENT";

  constructor(
    readonly statusCode: number,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "StatementError";
  }
}
