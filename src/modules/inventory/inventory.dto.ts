import type {
  InventoryItemWithSaldo,
  ListInventoryItemsResult,
  ListStockMovementsResult,
  StockMovement,
} from "./inventory.types.js";

/**
 * The external `tenant_id` is never exposed. `saldo` is the DERIVED balance
 * (R7.1 — Σ quantidade_sinalizada, never a stored column) and `belowMin` is the
 * derived reorder flag (saldo < minQuantity).
 */
export function toInventoryItemDto(item: InventoryItemWithSaldo) {
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
