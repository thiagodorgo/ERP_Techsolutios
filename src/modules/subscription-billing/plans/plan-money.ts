// B-ASS-02 — dinheiro em centavos inteiros (padrão da casa: charge.validators). Strings decimais
// ("199.90") são a fronteira HTTP/DB; o DOMÍNIO carrega centavos inteiros (Number.isSafeInteger).
// `includedStorageGb` (quantidade, 3 casas) usa string de fronteira própria.

import { SubscriptionBillingError } from "./plan-types.js";

const MONEY_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;
const GB_PATTERN = /^\d{1,7}(\.\d{1,3})?$/;

// "199.90" | 199.9 | 199 → centavos INTEIROS (arredondado). Nunca float persistido em preço.
export function moneyToCents(value: unknown, field: string): number {
  const raw = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!raw || !MONEY_PATTERN.test(raw)) {
    throw new SubscriptionBillingError(
      400,
      "SUBSCRIPTION_BILLING_INVALID",
      "invalid_amount",
      `${field} must be a decimal with up to 2 places.`,
    );
  }
  const cents = Math.round(Number(raw) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new SubscriptionBillingError(
      400,
      "SUBSCRIPTION_BILLING_INVALID",
      "invalid_amount",
      `${field} must be a non-negative amount within safe integer cents.`,
    );
  }
  return cents;
}

export function centsToMoney(cents: number): string {
  assertSafeIntegerCents(cents);
  return (cents / 100).toFixed(2);
}

// Quantidade de armazenamento (GB, até 3 casas) → string canônica "0.000". Mantém 3 casas sem float.
export function parseStorageGb(value: unknown, field: string): number {
  const raw = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!raw || !GB_PATTERN.test(raw)) {
    throw new SubscriptionBillingError(
      400,
      "SUBSCRIPTION_BILLING_INVALID",
      "invalid_storage_gb",
      `${field} must be a decimal with up to 3 places.`,
    );
  }
  const gb = Number(raw);
  if (!Number.isFinite(gb) || gb < 0) {
    throw new SubscriptionBillingError(
      400,
      "SUBSCRIPTION_BILLING_INVALID",
      "invalid_storage_gb",
      `${field} must be a non-negative decimal.`,
    );
  }
  return Math.round(gb * 1000) / 1000;
}

export function storageGbToDecimal(gb: number): string {
  return gb.toFixed(3);
}

function assertSafeIntegerCents(cents: number): void {
  if (!Number.isSafeInteger(cents)) {
    throw new Error(`money cents must be a safe integer (got ${cents}).`);
  }
}
