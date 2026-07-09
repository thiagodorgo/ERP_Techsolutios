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

/** R7.5 — the rolling window (days) that averages consumo/saida into a daily usage. */
export const REORDER_USAGE_WINDOW_DAYS = 90;

/**
 * R7.5 — `uso_medio_diario = (Σ |consumo/saida| na janela) / janela_dias`. The
 * incoming `usageAbs` is the ABSOLUTE outflow over `windowDays` (saida + consumo).
 */
export function computeDailyUsage(usageAbs: number, windowDays: number = REORDER_USAGE_WINDOW_DAYS): number {
  if (windowDays <= 0) return 0;

  return roundToDecimalPrecision(Math.abs(usageAbs) / windowDays);
}

/**
 * R7.5 — `ponto_de_pedido = uso_medio_diario × lead_time_dias + estoque_seguranca`.
 * DERIVED, never stored. Returns `null` when `leadTimeDays` is unknown — a reorder
 * point cannot be computed without a lead time.
 */
export function computeReorderPoint(
  dailyUsage: number,
  leadTimeDays: number | undefined,
  safetyStock: number | undefined,
): number | null {
  if (leadTimeDays === undefined || leadTimeDays === null) return null;

  return roundToDecimalPrecision(dailyUsage * leadTimeDays + (safetyStock ?? 0));
}

/** R7.5 — a reorder is needed when the derived saldo is at/below the reorder point. */
export function computeNeedsReorder(saldo: number, reorderPoint: number | null): boolean {
  if (reorderPoint === null) return false;

  return roundToDecimalPrecision(saldo) <= reorderPoint;
}

/**
 * R7.5 — the full reorder derivation for one item, from its snapshot saldo and the
 * absolute outflow over the usage window. Pure so both repositories reuse it and
 * the math stays unit-testable in isolation.
 */
export function deriveReorder(params: {
  readonly saldo: number;
  readonly usageAbs: number;
  readonly leadTimeDays: number | undefined;
  readonly safetyStock: number | undefined;
  readonly windowDays?: number;
}): { readonly reorderPoint: number | null; readonly needsReorder: boolean } {
  const dailyUsage = computeDailyUsage(params.usageAbs, params.windowDays ?? REORDER_USAGE_WINDOW_DAYS);
  const reorderPoint = computeReorderPoint(dailyUsage, params.leadTimeDays, params.safetyStock);

  return { reorderPoint, needsReorder: computeNeedsReorder(params.saldo, reorderPoint) };
}
