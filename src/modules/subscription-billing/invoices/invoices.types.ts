// B-ASS-08b · (c2) — `subscription_statement_invoices` (G10, R-H/N11): a NOTA do demonstrativo. Uma nota VIVA
// (`pending`/`authorized`/`cancel_pending`) por demonstrativo — UNIQUE parcial no banco (M5); reemissão após `rejected` ou
// `cancelled` usa `seq + 1`, e `external_ref = <statement_id>:<seq>` é a referência que vai ao provedor (`ref` do Focus).
// Nunca guarda valor em dinheiro além do que o demonstrativo já tem; o PDF/XML são URLs do provedor (ou proxy — S12).

import type { InvoiceStatus } from "../statements/statement.types.js";

export type StatementInvoiceStatus = Exclude<InvoiceStatus, "none">;

export const LIVE_INVOICE_STATUSES: readonly StatementInvoiceStatus[] = ["pending", "authorized", "cancel_pending"];

export type SubscriptionStatementInvoice = {
  readonly id: string;
  readonly tenantId: string;
  readonly statementId: string;
  /** Tentativa: 1 na primeira emissão; `rejected`/`cancelled` → a próxima usa `seq + 1` (G10). */
  readonly seq: number;
  readonly provider: string;
  /** `<statement_id>:<seq>` — a `ref` no provedor; UNIQUE (provider, external_ref). */
  readonly externalRef: string;
  readonly providerInvoiceId: string | null;
  readonly serieDps: number | null;
  /** Da sequência NOSSA `billing_invoice_sequences` (R-H), reservado na MESMA transação da linha. */
  readonly numeroDps: number | null;
  readonly status: StatementInvoiceStatus;
  readonly number: string | null;
  readonly verificationCode: string | null;
  readonly pdfUrl: string | null;
  readonly xmlUrl: string | null;
  readonly pdfSource: "public_url" | "provider_fetch" | null;
  readonly issuedAt: Date | null;
  readonly cancelledAt: Date | null;
  readonly cancelReason: string | null;
  readonly cancelCode: string | null;
  /** Erro SANITIZADO do provedor (só mensagens de negócio, truncadas) — nunca corpo cru nem segredo. */
  readonly error: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export function invoiceExternalRef(statementId: string, seq: number): string {
  return `${statementId}:${seq}`;
}

/** `<statement_id>:<seq>` → `statement_id`; `null` quando a referência não tem essa forma (o reconcile ignora, R-WH-5). */
export function statementIdOfInvoiceRef(ref: string): string | null {
  const at = ref.lastIndexOf(":");
  if (at <= 0) return null;
  const statementId = ref.slice(0, at);
  return /^\d+$/.test(ref.slice(at + 1)) ? statementId : null;
}

/** Erros do provedor vão para a linha SANITIZADOS: só o texto de negócio, sem corpo cru, com teto de tamanho. */
export function sanitizeInvoiceError(messages: readonly string[] | undefined): string | null {
  const text = (messages ?? []).map((item) => item.replace(/\s+/g, " ").trim()).filter(Boolean).join("; ");
  return text ? text.slice(0, 500) : null;
}
