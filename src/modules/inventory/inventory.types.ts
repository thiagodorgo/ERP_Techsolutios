import type { Permission, Role } from "../core-saas/permissions/catalog.js";

/**
 * F7a (Estoque) + Ω4C PR-08 — movement type domain (enum-app, validated at the service layer, SEM CHECK).
 * `link`/`unlink` are the BASE↔custody TRANSFER pair (two sibling rows sharing `transferGroupId`); the other
 * types are single-row. Corrections never rewrite history — a compensating movement (`/reverse`) is posted.
 */
export const STOCK_MOVEMENT_TYPES = ["entrada", "saida", "consumo", "ajuste", "link", "unlink"] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

/**
 * Ω4C PR-08 (D-Ω4C-INV-CUSTODY-MODEL) — custody bucket a movement belongs to (enum-app, labels
 * BASE/PROFISSIONAL/VIATURA at the DTO boundary, SEM CHECK). `saldo(item, custody) = Σ quantidade_sinalizada`
 * filtered by custody — derived, NEVER a stored column.
 */
export const STOCK_CUSTODY_TYPES = ["base", "professional", "vehicle"] as const;
export type StockCustodyType = (typeof STOCK_CUSTODY_TYPES)[number];

/** Ω4C PR-08 (D-Ω4C-INV-ITEM-FIELDS) — item kind (enum-app, labels PRODUTO/EQUIPAMENTO, SEM CHECK). */
export const INVENTORY_ITEM_TYPES = ["product", "equipment"] as const;
export type InventoryItemType = (typeof INVENTORY_ITEM_TYPES)[number];

/**
 * Ω4C PR-08 — "Tipo de Saída" of an EXIT movement (enum-app allowlist v1, extensível, SEM CHECK). Only
 * "venda direta" was seen in a clean AutEM frame → we do not fabricate a taxonomy. Persisted into the
 * existing free-text `reason` column (no new column authorized for this slice).
 */
export const STOCK_EXIT_REASONS = ["direct_sale"] as const;
export type StockExitReason = (typeof STOCK_EXIT_REASONS)[number];

/**
 * The custody a movement (or a transfer leg) is attached to. App-rule (SEM CHECK, → 422 invalid_custody):
 * `base` → both refs undefined; `professional` → operatorProfileId set, vehicleId undefined; `vehicle` →
 * vehicleId set, operatorProfileId undefined.
 */
export type StockCustody = {
  readonly custodyType: StockCustodyType;
  readonly custodyOperatorProfileId?: string;
  readonly custodyVehicleId?: string;
};

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
  /** Ω4C PR-08 — AutEM item fields (additive). `salePrice`/`purchasePrice` are Decimal(12,2) attributes. */
  readonly isFuel: boolean;
  readonly itemType: InventoryItemType;
  readonly purchasePrice?: number;
  readonly salePrice?: number;
  readonly description?: string;
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
 * F7b — the item plus every DERIVED field the API surfaces (R7.5): `saldo`, the
 * `reorderPoint` (null when `leadTimeDays` is unknown) and `needsReorder`
 * (`saldo <= reorderPoint`). None of these are stored columns.
 */
export type InventoryItemView = InventoryItemWithSaldo & {
  readonly reorderPoint: number | null;
  readonly needsReorder: boolean;
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
  /** Ω4C PR-08 — custody the row belongs to (base by default), the transfer pair and the reversal link. */
  readonly custodyType: StockCustodyType;
  readonly custodyOperatorProfileId?: string;
  readonly custodyVehicleId?: string;
  readonly transferGroupId?: string;
  readonly reversesMovementId?: string;
  readonly createdBy?: string;
  readonly createdAt: Date;
};

export type ListInventoryItemsInput = {
  readonly tenantId: string;
  readonly search?: string;
  readonly isActive?: boolean;
  /** F7b — restrict to a single ABC class (used to scope a cycle count snapshot). */
  readonly abcClass?: InventoryAbcClass;
  /** Derived filter (R7.1): true → saldo < min_quantity; false → saldo >= min_quantity. */
  readonly belowMin?: boolean;
  /** Derived filter (R7.5): true → saldo <= reorder_point (needs reposição). */
  readonly needsReorder?: boolean;
  readonly limit: number;
  readonly offset: number;
};

export type ListInventoryItemsResult = {
  readonly items: readonly InventoryItemView[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

/** R7.4 — one active item and its consumption value over the ABC window. */
export type ItemConsumptionValue = {
  readonly id: string;
  readonly consumptionValue: number;
};

/** R7.4 — the class assignment applied to a single item by the ABC recalc. */
export type AbcClassAssignment = {
  readonly id: string;
  readonly abcClass: InventoryAbcClass;
};

export type CreateInventoryItemInput = Omit<
  InventoryItem,
  "id" | "abcClass" | "avgCost" | "isActive" | "isFuel" | "itemType" | "createdAt" | "updatedAt"
> & {
  readonly isActive?: boolean;
  readonly isFuel?: boolean;
  readonly itemType?: InventoryItemType;
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
    | "isFuel"
    | "itemType"
    | "purchasePrice"
    | "salePrice"
    | "description"
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
  readonly cycleCountId?: string;
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

/**
 * `quantidadeSinalizada` arrives ALREADY SIGNED (service applies the type sign). Single-row types only
 * (entrada/saida/consumo/ajuste); LINK/UNLINK go through `CreateTransferInput`. The custody the row lands in
 * is carried inline (base by default). The non-negative guard runs against THIS custody's balance.
 */
export type CreateStockMovementInput = {
  readonly tenantId: string;
  readonly itemId: string;
  readonly type: StockMovementType;
  readonly quantidadeSinalizada: number;
  readonly unitCost?: number;
  readonly workOrderId?: string;
  readonly vehicleId?: string;
  readonly reason?: string;
  /**
   * F7b — links an `ajuste` back to the cycle count that generated it (R7.6). NOT
   * settable through the public movement API (users cannot forge it); only the
   * cycle-count close flow sets it.
   */
  readonly cycleCountId?: string;
  readonly custody?: StockCustody;
  readonly createdBy?: string;
};

/**
 * Ω4C PR-08 — a BASE↔custody TRANSFER (LINK/UNLINK). It writes TWO sibling rows in ONE transaction sharing a
 * `transferGroupId` (global Σ nets to zero). `custody` is the NON-BASE side: the destination on LINK, the
 * source on UNLINK. The non-negative guard runs against the ORIGIN (BASE on LINK; the custody on UNLINK).
 */
export type CreateTransferInput = {
  readonly tenantId: string;
  readonly itemId: string;
  readonly type: "link" | "unlink";
  readonly quantity: number;
  readonly custody: StockCustody;
  readonly reason?: string;
  readonly createdBy?: string;
};

/** Ω4C PR-08 — the two sibling rows a transfer produced. */
export type StockTransferResult = {
  readonly from: StockMovement;
  readonly to: StockMovement;
};

/** Ω4C PR-08 — reverse a movement (or the whole transfer group) with a compensating movement. */
export type ReverseStockMovementInput = {
  readonly tenantId: string;
  readonly movementId: string;
  readonly reason?: string;
  readonly createdBy?: string;
};

/**
 * Ω4C PR-08 — outcome of a reverse. `not_found` → 404; `already_reversed` → 409 (a compensating movement
 * already points at the target); `ok` → the compensating movement(s). An overdraw raises 409
 * insufficient_balance from inside the transaction (the original stays intact — imutabilidade).
 */
export type ReverseStockMovementResult =
  | { readonly status: "ok"; readonly movements: readonly StockMovement[] }
  | { readonly status: "not_found" }
  | { readonly status: "already_reversed" };

/**
 * Ω4C PR-08 (D-Ω4C-INV-CUSTODY-SUMMARY) — raw per-custody aggregation (derived, never a column). The service
 * resolves the operator-profile/vehicle LABELS (name/plate — NEVER CNH) over this shape.
 */
export type CustodySummaryRaw = {
  readonly baseQty: number;
  readonly professionals: readonly { readonly operatorProfileId: string; readonly qty: number }[];
  readonly vehicles: readonly { readonly vehicleId: string; readonly qty: number }[];
};

/** Ω4C PR-08 — a resolved custody reference (LABEL only: professional name / vehicle plate — NEVER CNH). */
export type CustodyReferenceInfo = {
  readonly label: string | null;
};

/** Ω4C PR-08 — the "Resumo por custódia" tab: per-bucket quantities + labelled professionals/vehicles. */
export type CustodySummary = {
  readonly baseQty: number;
  readonly professionalTotalQty: number;
  readonly vehicleTotalQty: number;
  readonly total: number;
  readonly professionals: readonly { readonly operatorProfileId: string; readonly name: string | null; readonly qty: number }[];
  readonly vehicles: readonly { readonly vehicleId: string; readonly plate: string | null; readonly qty: number }[];
};

/** Ω4C PR-08 — the movement-create outcome: a single row, or the LINK/UNLINK sibling pair. */
export type CreateMovementOutcome =
  | { readonly kind: "single"; readonly movement: StockMovement }
  | { readonly kind: "transfer"; readonly transfer: StockTransferResult };

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

/**
 * Ω4C PR-08 — the custody triple is inconsistent (app-rule, SEM CHECK): base wants both refs empty;
 * professional wants an operator profile; vehicle wants a vehicle. 422 (semantic conflict).
 */
export function invalidCustodyError(reason: string): InventoryError {
  return new InventoryError(422, "STOCK_INVALID", "invalid_custody", reason);
}

/** Ω4C PR-08 — the custody profile/vehicle does not resolve in this tenant (dupla-camada: resolver → 400). */
export function invalidCustodyReferenceError(reason: string): InventoryError {
  return new InventoryError(400, "STOCK_INVALID", "invalid_custody_reference", reason);
}

/** Ω4C PR-08 — the movement (or its transfer group) already has a compensating reversal (idempotência do estorno). */
export function movementAlreadyReversedError(): InventoryError {
  return new InventoryError(
    409,
    "STOCK_MOVEMENT_CONFLICT",
    "movement_already_reversed",
    "Este movimento já foi estornado — o razão é imutável, não estorne duas vezes.",
  );
}
