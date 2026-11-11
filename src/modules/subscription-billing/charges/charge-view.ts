// B-ASS-08 · F7 — a visão de "como pagar" do CLIENTE (R-CHG-1, P12). `GET /billing/subscription` traz `payment` só com
// demonstrativo `closed` NÃO pago e cobrança viva; NENHUMA chave de dinheiro (`price`, `amount`, `cost`, `total`,
// `margin`, `value`, `cents`) — o cliente vê link/Pix/boleto, nunca o valor que a plataforma gasta.

import type { SubscriptionStatement } from "../statements/statement.types.js";
import type { SubscriptionStatementCharge } from "./charges.types.js";

export type ClientPaymentView = {
  readonly dueDate: string | null;
  readonly payUrl?: string;
  readonly pixCopyPaste?: string;
  readonly boletoLine?: string;
  readonly boletoUrl?: string;
  readonly invoicePdfAvailable: boolean;
  readonly statementId: string;
};

/** Monta o `payment` do cliente — ou `null` quando não há o que pagar (não `closed`, já pago, ou sem cobrança viva). */
export function toClientPaymentView(
  statement: SubscriptionStatement,
  charge: SubscriptionStatementCharge | undefined,
): ClientPaymentView | null {
  if (statement.status !== "closed") return null;
  if (statement.paidCents >= statement.totalCents) return null;
  if (!charge || charge.status !== "pending") return null;
  return {
    dueDate: charge.dueDate ?? statement.dueDate,
    ...(charge.payUrl ? { payUrl: charge.payUrl } : {}),
    ...(charge.pixCopyPaste ? { pixCopyPaste: charge.pixCopyPaste } : {}),
    ...(charge.boletoLine ? { boletoLine: charge.boletoLine } : {}),
    ...(charge.boletoUrl ? { boletoUrl: charge.boletoUrl } : {}),
    invoicePdfAvailable: statement.invoiceStatus === "authorized",
    statementId: statement.id,
  };
}

/** Chaves de dinheiro proibidas na visão do cliente (teste de forma — deep scan, T-CHG-3). */
export const MONEY_KEY_PATTERN = /(price|amount|cost|total|margin|value|cents|extra.*amount)/i;

/** Varre recursivamente um objeto e devolve as chaves de dinheiro encontradas (vazio = limpo). */
export function findMoneyKeys(value: unknown, path = ""): string[] {
  if (!value || typeof value !== "object") return [];
  const hits: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const here = path ? `${path}.${key}` : key;
    if (MONEY_KEY_PATTERN.test(key)) hits.push(here);
    hits.push(...findMoneyKeys(child, here));
  }
  return hits;
}
