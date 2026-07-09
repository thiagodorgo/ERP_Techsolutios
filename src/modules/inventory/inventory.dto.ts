import type { AbcSummary } from "./inventory.abc.js";
import type {
  InventoryItemWithSaldo,
  ListInventoryItemsResult,
  ListStockMovementsResult,
  StockMovement,
} from "./inventory.types.js";

/** Accepts the F7b derived view, tolerating the F7a saldo-only shape (reorder fields default). */
type InventoryItemDtoInput = InventoryItemWithSaldo & {
  readonly reorderPoint?: number | null;
  readonly needsReorder?: boolean;
};

/**
 * The external `tenant_id` is never exposed. `saldo` is the DERIVED balance
 * (R7.1 — Σ quantidade_sinalizada, never a stored column), `belowMin` is the
 * derived below-minimum flag (saldo < minQuantity), and `reorderPoint`/
 * `needsReorder` are the DERIVED reorder-point signals (R7.5 — never stored;
 * reorderPoint is null when leadTimeDays is unknown).
 */
export function toInventoryItemDto(item: InventoryItemDtoInput) {
  return {
    id: item.id,
    sku: item.sku,
    name: item.name,
    unit: item.unit,
    minQuantity: item.minQuantity,
    maxQuantity: item.maxQuantity ?? null,
    abcClass: item.abcClass ?? null,
    avgCost: item.avgCost,
    leadTimeDays: item.leadTimeDays ?? null,
    safetyStock: item.safetyStock ?? null,
    saldo: item.saldo,
    belowMin: item.saldo < item.minQuantity,
    reorderPoint: item.reorderPoint ?? null,
    needsReorder: item.needsReorder ?? false,
    isActive: item.isActive,
    createdBy: item.createdBy ?? null,
    updatedBy: item.updatedBy ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function toInventoryItemListDto(result: ListInventoryItemsResult) {
  return {
    items: result.items.map((item) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      unit: item.unit,
      minQuantity: item.minQuantity,
      maxQuantity: item.maxQuantity ?? null,
      abcClass: item.abcClass ?? null,
      avgCost: item.avgCost,
      leadTimeDays: item.leadTimeDays ?? null,
      safetyStock: item.safetyStock ?? null,
      saldo: item.saldo,
      belowMin: item.saldo < item.minQuantity,
      reorderPoint: item.reorderPoint ?? null,
      needsReorder: item.needsReorder,
      isActive: item.isActive,
      createdAt: item.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}

/** R7.4 — the ABC recalc summary: how many items landed in each class + when. */
export function toAbcRecalculateDto(summary: AbcSummary, recalculatedAt: Date) {
  return {
    counts: { A: summary.A, B: summary.B, C: summary.C },
    total: summary.A + summary.B + summary.C,
    recalculatedAt: recalculatedAt.toISOString(),
  };
}

/** Immutable ledger row — `tenant_id` is never exposed. */
export function toStockMovementDto(movement: StockMovement) {
  return {
    id: movement.id,
    itemId: movement.itemId,
    type: movement.type,
    quantidadeSinalizada: movement.quantidadeSinalizada,
    unitCost: movement.unitCost ?? null,
    workOrderId: movement.workOrderId ?? null,
    vehicleId: movement.vehicleId ?? null,
    reason: movement.reason ?? null,
    cycleCountId: movement.cycleCountId ?? null,
    createdBy: movement.createdBy ?? null,
    createdAt: movement.createdAt.toISOString(),
  };
}

export function toStockMovementListDto(result: ListStockMovementsResult) {
  return {
    items: result.items.map(toStockMovementDto),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}
