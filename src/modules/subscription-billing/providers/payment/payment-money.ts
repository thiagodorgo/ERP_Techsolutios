// B-ASS-06 · F1 — dinheiro em centavos (plano §3.3 e §4.6, R-PAY-8 / sonda H).
//
//  reais (number, como o Asaas devolve em `value`) → centavos INTEIROS por `Math.round(x * 100)`.
//  NUNCA `Math.trunc` (0.29 → 28), nunca float em preço. O resultado é `Number.isSafeInteger`.

export class BillingMoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingMoneyError";
  }
}

export function toCents(reais: number): number {
  if (typeof reais !== "number" || !Number.isFinite(reais)) {
    throw new BillingMoneyError("toCents requires a finite number.");
  }
  const cents = Math.round(reais * 100);
  if (!Number.isSafeInteger(cents)) {
    throw new BillingMoneyError("toCents result must be a safe integer.");
  }
  return cents;
}

/** O inverso para o corpo do provedor: centavos → reais (number, sem formato de moeda). */
export function fromCents(cents: number): number {
  if (!Number.isSafeInteger(cents)) {
    throw new BillingMoneyError("fromCents requires a safe integer.");
  }
  return cents / 100;
}
