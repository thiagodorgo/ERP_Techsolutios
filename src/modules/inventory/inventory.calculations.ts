import type { StockMovementType } from "./inventory.types.js";

/** Storage precision is DECIMAL(20,6) — quantities/costs round to 6 decimals. */
const DECIMAL_PRECISION_FACTOR = 1_000_000;

export function roundToDecimalPrecision(value: number): number {
  return Math.round(value * DECIMAL_PRECISION_FACTOR) / DECIMAL_PRECISION_FACTOR;
}

/**
 * R7.3 — moving average recalculated on `entrada`:
 * `novo_avg = (saldo_antes×avg_atual + qtd×unit_cost) / (saldo_antes + qtd)`.
 * Guard for div-by-zero / negative history: when `saldoBefore <= 0` the incoming
 * cost IS the new average. Pure helper so the math is unit-testable in isolation;
 * both repositories call it inside the SAME transaction that inserts the movement.
 */
export function computeMovingAverage(
  saldoBefore: number,
  avgBefore: number,
  quantity: number,
  unitCost: number,
): number {
  if (saldoBefore <= 0) {
    return roundToDecimalPrecision(unitCost);
  }

  return roundToDecimalPrecision(
    (saldoBefore * avgBefore + quantity * unitCost) / (saldoBefore + quantity),
  );
}

/**
 * `quantidade_sinalizada` is stored SIGNED: entrada → +qtd; saida/consumo → −qtd;
 * ajuste keeps the caller-provided sign (positive or negative).
 */
export function signQuantity(type: StockMovementType, quantidade: number): number {
  if (type === "saida" || type === "consumo") {
    return roundToDecimalPrecision(-Math.abs(quantidade));
  }

  if (type === "entrada") {
    return roundToDecimalPrecision(Math.abs(quantidade));
  }

  return roundToDecimalPrecision(quantidade);
}

/** R7.1 — saldo = Σ quantidade_sinalizada (derived, never a column). */
export function sumSignedQuantities(quantities: readonly number[]): number {
  return roundToDecimalPrecision(quantities.reduce((total, value) => total + value, 0));
}

/** True when applying the signed movement would overdraw the balance (→ 409). */
export function wouldOverdraw(saldoBefore: number, signedQuantity: number): boolean {
  return signedQuantity < 0 && roundToDecimalPrecision(saldoBefore + signedQuantity) < 0;
}
