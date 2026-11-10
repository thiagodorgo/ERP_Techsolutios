// B-ASS-08 · F2 — tipos de `billing_webhook_events` (plano §3.2). Tabela GLOBAL da plataforma: ao receber, a
// organização ainda é desconhecida. NUNCA guarda o corpo do webhook — só o digest SHA-256 (R-WH-7).

export const WEBHOOK_EVENT_STATUSES = ["received", "processed", "ignored", "rejected", "stale"] as const;
export type WebhookEventStatus = (typeof WEBHOOK_EVENT_STATUSES)[number];

export type BillingWebhookEvent = {
  readonly id: string;
  readonly provider: string;
  /** UNIQUE (provider, externalEventId). */
  readonly externalEventId: string;
  readonly receivedAt: Date;
  /** SHA-256 hex do corpo cru — o corpo NUNCA é guardado. */
  readonly bodyDigest: string;
  readonly signatureOk: boolean;
  /** id da cobrança/nota no provedor, extraído do corpo (reconsultado depois, S11). */
  readonly externalResourceId: string | null;
  /** nosso `statement_id`, se vier no corpo — nunca decide nada sozinho (R-WH-4/5). */
  readonly externalReference: string | null;
  readonly status: WebhookEventStatus;
  readonly jobAttempts: number;
  readonly resolvedTenantId: string | null;
  readonly resolvedStatementId: string | null;
  readonly error: string | null;
};

export type NewWebhookEvent = {
  readonly provider: string;
  readonly externalEventId: string;
  readonly bodyDigest: string;
  readonly signatureOk: boolean;
  readonly externalResourceId: string | null;
  readonly externalReference: string | null;
};
