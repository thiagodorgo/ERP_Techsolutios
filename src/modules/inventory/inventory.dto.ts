import type { AbcSummary } from "./inventory.abc.js";
import type {
  CustodySummary,
  InventoryItemWithSaldo,
  ListInventoryItemsResult,
  ListStockMovementsResult,
  StockMovement,
  StockTransferResult,
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
    // Ω4C PR-08 — AutEM item fields (labels PT-BR na fronteira; enum-app em inglês).
    isFuel: item.isFuel,
    itemType: item.itemType,
    purchasePrice: item.purchasePrice ?? null,
    salePrice: item.salePrice ?? null,
    description: item.description ?? null,
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
      isFuel: item.isFuel,
      itemType: item.itemType,
      purchasePrice: item.purchasePrice ?? null,
      salePrice: item.salePrice ?? null,
      description: item.description ?? null,
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

/**
 * Immutable ledger row — `tenant_id` is never exposed (§2.8). Ω4C PR-08 surfaces the custody (BASE by
 * default), the transfer pair (`transferGroupId`) and the reversal link (`reversesMovementId`). Custody
 * profile/vehicle are IDs only here — the LABEL (name/plate) comes from the custody-summary (avoids N+1).
 */
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
    custodyType: movement.custodyType,
    custodyOperatorProfileId: movement.custodyOperatorProfileId ?? null,
    custodyVehicleId: movement.custodyVehicleId ?? null,
    transferGroupId: movement.transferGroupId ?? null,
    reversesMovementId: movement.reversesMovementId ?? null,
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

/** Ω4C PR-08 — the sibling pair of a LINK/UNLINK transfer (both legs share `transferGroupId`). */
export function toStockTransferDto(transfer: StockTransferResult) {
  return {
    transferGroupId: transfer.from.transferGroupId ?? null,
    movements: [toStockMovementDto(transfer.from), toStockMovementDto(transfer.to)],
  };
}

/** Ω4C PR-08 — the compensating movement(s) posted by an estorno (1 for a single row, 2 for a transfer). */
export function toStockReverseDto(movements: readonly StockMovement[]) {
  return {
    movements: movements.map(toStockMovementDto),
  };
}

/** Ω4C PR-08 (D-Ω4C-INV-CUSTODY-SUMMARY) — per-custody quantities + labelled professionals/vehicles (never CNH). */
export function toCustodySummaryDto(itemId: string, summary: CustodySummary) {
  return {
    itemId,
    baseQty: summary.baseQty,
    professionalTotalQty: summary.professionalTotalQty,
    vehicleTotalQty: summary.vehicleTotalQty,
    total: summary.total,
    professionals: summary.professionals.map((entry) => ({
      operatorProfileId: entry.operatorProfileId,
      name: entry.name,
      qty: entry.qty,
    })),
    vehicles: summary.vehicles.map((entry) => ({
      vehicleId: entry.vehicleId,
      plate: entry.plate,
      qty: entry.qty,
    })),
  };
}
