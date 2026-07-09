import type { Permission, Role } from "../core-saas/permissions/catalog.js";

/** F7a (Estoque) — movement type domain (validated at the service layer). */
export const STOCK_MOVEMENT_TYPES = ["entrada", "saida", "consumo", "ajuste"] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

/** F7b — ABC classes exist in the schema only; the F7a API never writes them. */
export const INVENTORY_ABC_CLASSES = ["A", "B", "C"] as const;
export type InventoryAbcClass = (typeof INVENTORY_ABC_CLASSES)[number];

export type InventoryActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

/**
 * Catalog item. The BALANCE IS NEVER A FIELD HERE (R7.1): saldo is derived from
 * the movement ledger (Σ quantidade_sinalizada) and surfaced only through
 * `InventoryItemWithSaldo`. `avgCost` is the moving average maintained on
 * `entrada` (R7.3); `abcClass` is read-only in F7a (populated by the F7b job).
 */
export type InventoryItem = {
  readonly id: string;
  readonly tenantId: string;
  readonly sku: string;
  readonly name: string;
  readonly unit: string;
  readonly minQuantity: number;
  readonly maxQuantity?: number;
  readonly abcClass?: InventoryAbcClass;
  readonly avgCost: number;
  readonly leadTimeDays?: number;
  readonly safetyStock?: number;
  readonly isActive: boolean;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

/** Item plus the derived balance (computed, never stored). */
export type InventoryItemWithSaldo = InventoryItem & {
  readonly saldo: number;
};

/**
 * IMMUTABLE ledger entry — there is no update/delete surface for movements.
 * `quantidadeSinalizada` is SIGNED: + for entrada / positive ajuste, − for
 * saida / consumo / negative ajuste.
 */
export type StockMovement = {
  readonly id: string;
  readonly tenantId: string;
  readonly itemId: string;
  readonly type: StockMovementType;
  readonly quantidadeSinalizada: number;
  readonly unitCost?: number;
  readonly workOrderId?: string;
  readonly vehicleId?: string;
  readonly reason?: string;
  readonly cycleCountId?: string;
  readonly createdBy?: string;
  readonly createdAt: Date;
};

export type ListInventoryItemsInput = {
  readonly tenantId: string;
  readonly search?: string;
  readonly isActive?: boolean;
  /** Derived filter (R7.1): true → saldo < min_quantity; false → saldo >= min_quantity. */
  readonly belowMin?: boolean;
  readonly limit: number;
  readonly offset: number;
};

export type ListInventoryItemsResult = {
  readonly items: readonly InventoryItemWithSaldo[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreateInventoryItemInput = Omit<
  InventoryItem,
  "id" | "abcClass" | "avgCost" | "isActive" | "createdAt" | "updatedAt"
> & {
  readonly isActive?: boolean;
};

export type UpdateInventoryItemInput = Partial<
  Pick<
    InventoryItem,
    | "sku"
    | "name"
    | "unit"
    | "minQuantity"
    | "maxQuantity"
    | "leadTimeDays"
    | "safetyStock"
    | "isActive"
    | "updatedBy"
  >
> & {
  readonly tenantId: string;
  readonly itemId: string;
};

export type ListStockMovementsInput = {
  readonly tenantId: string;
  readonly itemId?: string;
  readonly type?: StockMovementType;
  readonly workOrderId?: string;
  readonly from?: Date;
  readonly to?: Date;
  readonly limit: number;
  readonly offset: number;
};

export type ListStockMovementsResult = {
  readonly items: readonly StockMovement[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

/** `quantidadeSinalizada` arrives ALREADY SIGNED (service applies the type sign). */
export type CreateStockMovementInput = {
  readonly tenantId: string;
  readonly itemId: string;
  readonly type: StockMovementType;
  readonly quantidadeSinalizada: number;
  readonly unitCost?: number;
  readonly workOrderId?: string;
  readonly vehicleId?: string;
  readonly reason?: string;
  readonly createdBy?: string;
};

export class InventoryError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "InventoryError";
  }
}

/** R7.1 — the 409 raised when a negative movement would overdraw the balance. */
export function insufficientBalanceError(saldoAtual: number): InventoryError {
  return new InventoryError(
    409,
    "STOCK_INVALID",
    "insufficient_balance",
    `Saldo insuficiente para o movimento: o saldo atual do item é ${saldoAtual}.`,
  );
}

/** P6 — composite unique (tenant_id, sku): duplicate in the SAME tenant is a 409. */
export function duplicateSkuError(): InventoryError {
  return new InventoryError(
    409,
    "INVENTORY_ITEM_CONFLICT",
    "duplicate_sku",
    "An inventory item with this sku already exists in this organization.",
  );
}
