import { randomUUID } from "node:crypto";

import {
  computeMovingAverage,
  sumSignedQuantities,
  wouldOverdraw,
} from "./inventory.calculations.js";
import {
  duplicateSkuError,
  insufficientBalanceError,
  type CreateInventoryItemInput,
  type CreateStockMovementInput,
  type InventoryItem,
  type InventoryItemWithSaldo,
  type ListInventoryItemsInput,
  type ListInventoryItemsResult,
  type ListStockMovementsInput,
  type ListStockMovementsResult,
  type StockMovement,
  type UpdateInventoryItemInput,
} from "./inventory.types.js";

export interface InventoryRepository {
  createItem(input: CreateInventoryItemInput): Promise<InventoryItem>;
  listItems(input: ListInventoryItemsInput): Promise<ListInventoryItemsResult>;
  findItemById(tenantId: string, itemId: string): Promise<InventoryItem | undefined>;
  findItemWithSaldo(tenantId: string, itemId: string): Promise<InventoryItemWithSaldo | undefined>;
  updateItem(input: UpdateInventoryItemInput): Promise<InventoryItem | undefined>;
  /**
   * R7.1/R7.3 — the transactional flow: derive saldo (Σ quantidade_sinalizada),
   * throw 409 insufficient_balance when a negative movement would overdraw,
   * recompute the moving average on `entrada` and persist movement + avg_cost
   * atomically. Returns `undefined` when the item is missing in-tenant.
   */
  createMovement(input: CreateStockMovementInput): Promise<StockMovement | undefined>;
  listMovements(input: ListStockMovementsInput): Promise<ListStockMovementsResult>;
  findMovementById(tenantId: string, movementId: string): Promise<StockMovement | undefined>;
  reset?(): void;
}

export class InMemoryInventoryRepository implements InventoryRepository {
  private readonly items = new Map<string, InventoryItem>();
  private readonly movements = new Map<string, StockMovement>();
  private movementSequence = 0;
  private readonly movementOrder = new Map<string, number>();

  async createItem(input: CreateInventoryItemInput): Promise<InventoryItem> {
    // P6 — composite unique (tenant_id, sku). Same sku in another tenant is
    // allowed; duplicate in the SAME tenant is a 409.
    if (this.hasSku(input.tenantId, input.sku)) {
      throw duplicateSkuError();
    }

    const now = new Date();
    const item: InventoryItem = {
      ...input,
      id: randomUUID(),
      abcClass: undefined,
      avgCost: 0,
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.items.set(item.id, item);

    return item;
  }

  async listItems(input: ListInventoryItemsInput): Promise<ListInventoryItemsResult> {
    const filtered = this.sortedItems()
      .filter((item) => item.tenantId === input.tenantId)
      .filter((item) => input.isActive === undefined || item.isActive === input.isActive)
      .filter((item) => matchesSearch(item, input.search))
      .map((item) => this.withSaldo(item))
      .filter((item) => matchesBelowMin(item, input.belowMin));

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findItemById(tenantId: string, itemId: string): Promise<InventoryItem | undefined> {
    const item = this.items.get(itemId);

    return item?.tenantId === tenantId ? item : undefined;
  }

  async findItemWithSaldo(tenantId: string, itemId: string): Promise<InventoryItemWithSaldo | undefined> {
    const item = await this.findItemById(tenantId, itemId);

    return item ? this.withSaldo(item) : undefined;
  }

  async updateItem(input: UpdateInventoryItemInput): Promise<InventoryItem | undefined> {
    const current = await this.findItemById(input.tenantId, input.itemId);
    if (!current) return undefined;

    if (input.sku !== undefined && input.sku !== current.sku && this.hasSku(input.tenantId, input.sku, current.id)) {
      throw duplicateSkuError();
    }

    const updated: InventoryItem = {
      ...current,
      ...definedFields(input),
      id: current.id,
      tenantId: current.tenantId,
      updatedAt: new Date(),
    };
    this.items.set(updated.id, updated);

    return updated;
  }

  async createMovement(input: CreateStockMovementInput): Promise<StockMovement | undefined> {
    const item = await this.findItemById(input.tenantId, input.itemId);
    if (!item) return undefined;

    // R7.1 — saldo derived from the ledger BEFORE inserting; a negative movement
    // that would overdraw is rejected (409) and nothing is written. The in-memory
    // check-then-write runs synchronously, mirroring the Prisma transaction.
    const saldoBefore = this.saldoOf(input.tenantId, input.itemId);

    if (wouldOverdraw(saldoBefore, input.quantidadeSinalizada)) {
      throw insufficientBalanceError(saldoBefore);
    }

    // R7.3 — moving average recalculated on `entrada`, atomically with the insert.
    if (input.type === "entrada" && input.unitCost !== undefined) {
      const avgCost = computeMovingAverage(saldoBefore, item.avgCost, input.quantidadeSinalizada, input.unitCost);
      this.items.set(item.id, { ...item, avgCost, updatedBy: input.createdBy ?? item.updatedBy, updatedAt: new Date() });
    }

    const movement: StockMovement = {
      id: randomUUID(),
      tenantId: input.tenantId,
      itemId: input.itemId,
      type: input.type,
      quantidadeSinalizada: input.quantidadeSinalizada,
      unitCost: input.unitCost,
      workOrderId: input.workOrderId,
      vehicleId: input.vehicleId,
      reason: input.reason,
      cycleCountId: undefined,
      createdBy: input.createdBy,
      createdAt: new Date(),
    };

    this.movements.set(movement.id, movement);
    this.movementSequence += 1;
    this.movementOrder.set(movement.id, this.movementSequence);

    return movement;
  }

  async listMovements(input: ListStockMovementsInput): Promise<ListStockMovementsResult> {
    const filtered = this.sortedMovements()
      .filter((movement) => movement.tenantId === input.tenantId)
      .filter((movement) => input.itemId === undefined || movement.itemId === input.itemId)
      .filter((movement) => input.type === undefined || movement.type === input.type)
      .filter((movement) => input.workOrderId === undefined || movement.workOrderId === input.workOrderId)
      .filter((movement) => input.from === undefined || movement.createdAt.getTime() >= input.from.getTime())
      .filter((movement) => input.to === undefined || movement.createdAt.getTime() <= input.to.getTime());

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findMovementById(tenantId: string, movementId: string): Promise<StockMovement | undefined> {
    const movement = this.movements.get(movementId);

    return movement?.tenantId === tenantId ? movement : undefined;
  }

  reset(): void {
    this.items.clear();
    this.movements.clear();
    this.movementOrder.clear();
    this.movementSequence = 0;
  }

  private withSaldo(item: InventoryItem): InventoryItemWithSaldo {
    return { ...item, saldo: this.saldoOf(item.tenantId, item.id) };
  }

  private saldoOf(tenantId: string, itemId: string): number {
    return sumSignedQuantities(
      [...this.movements.values()]
        .filter((movement) => movement.tenantId === tenantId && movement.itemId === itemId)
        .map((movement) => movement.quantidadeSinalizada),
    );
  }

  private hasSku(tenantId: string, sku: string, exceptId?: string): boolean {
    const normalized = sku.toLowerCase();

    return [...this.items.values()].some(
      (item) => item.tenantId === tenantId && item.id !== exceptId && item.sku.toLowerCase() === normalized,
    );
  }

  private sortedItems(): InventoryItem[] {
    return [...this.items.values()].sort((left, right) => {
      const byCreatedAt = right.createdAt.getTime() - left.createdAt.getTime();
      if (byCreatedAt !== 0) return byCreatedAt;

      return right.updatedAt.getTime() - left.updatedAt.getTime();
    });
  }

  private sortedMovements(): StockMovement[] {
    return [...this.movements.values()].sort((left, right) => {
      const byCreatedAt = right.createdAt.getTime() - left.createdAt.getTime();
      if (byCreatedAt !== 0) return byCreatedAt;

      return (this.movementOrder.get(right.id) ?? 0) - (this.movementOrder.get(left.id) ?? 0);
    });
  }
}

function matchesSearch(item: InventoryItem, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();

  return item.sku.toLowerCase().includes(normalized) || item.name.toLowerCase().includes(normalized);
}

function matchesBelowMin(item: InventoryItemWithSaldo, belowMin: boolean | undefined): boolean {
  if (belowMin === undefined) return true;

  return belowMin ? item.saldo < item.minQuantity : item.saldo >= item.minQuantity;
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
