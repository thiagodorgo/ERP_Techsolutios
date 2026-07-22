import { randomUUID } from "node:crypto";

import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import {
  computeMovingAverage,
  deriveReorder,
  REORDER_USAGE_WINDOW_DAYS,
  roundToDecimalPrecision,
  wouldOverdraw,
} from "./inventory.calculations.js";
import {
  duplicateSkuError,
  insufficientBalanceError,
  type AbcClassAssignment,
  type CreateInventoryItemInput,
  type CreateStockMovementInput,
  type CreateTransferInput,
  type CustodySummaryRaw,
  type InventoryAbcClass,
  type InventoryItem,
  type InventoryItemType,
  type InventoryItemView,
  type ItemConsumptionValue,
  type ListInventoryItemsInput,
  type ListInventoryItemsResult,
  type ListStockMovementsInput,
  type ListStockMovementsResult,
  type ReverseStockMovementInput,
  type ReverseStockMovementResult,
  type StockCustody,
  type StockCustodyType,
  type StockMovement,
  type StockMovementType,
  type StockTransferResult,
  type UpdateInventoryItemInput,
} from "./inventory.types.js";
import type { InventoryRepository } from "./inventory.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

/** Movement types that count as OUTFLOW for the R7.5 usage window (saida + consumo). */
const OUTFLOW_TYPES = ["saida", "consumo"] as const;

/** Ω4C PR-08 — the default custody bucket (BASE): both typed refs empty. */
const BASE_CUSTODY: StockCustody = { custodyType: "base" };

export class PrismaInventoryRepository implements InventoryRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async createItem(input: CreateInventoryItemInput): Promise<InventoryItem> {
    try {
      const item = await this.client.inventoryItem.create({
        data: {
          tenant_id: input.tenantId,
          sku: input.sku,
          name: input.name,
          unit: input.unit,
          min_quantity: input.minQuantity,
          max_quantity: input.maxQuantity ?? null,
          lead_time_days: input.leadTimeDays ?? null,
          safety_stock: input.safetyStock ?? null,
          is_active: input.isActive ?? true,
          is_fuel: input.isFuel ?? false,
          item_type: input.itemType ?? "product",
          purchase_price: input.purchasePrice ?? null,
          sale_price: input.salePrice ?? null,
          description: input.description ?? null,
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });

      return mapItemRecord(item);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw duplicateSkuError();
      }

      throw error;
    }
  }

  async listItems(input: ListInventoryItemsInput): Promise<ListInventoryItemsResult> {
    const where = buildItemWhere(input);
    const now = new Date();

    // `below_min` (R7.1) and `needs_reorder` (R7.5) are DERIVED filters: the saldos
    // and the 90-day usage for every matching item come from TWO groupBys, the
    // predicate is applied, and only then the page is sliced. Without a derived
    // filter, a plain page + those groupBys for the page's ids resolves the views.
    if (input.belowMin !== undefined || input.needsReorder !== undefined) {
      const rows = await this.client.inventoryItem.findMany({
        where,
        orderBy: [{ created_at: "desc" }],
      });
      const views = await this.buildViews(input.tenantId, rows, now);
      const filtered = views
        .filter((item) =>
          input.belowMin === undefined ? true : input.belowMin ? item.saldo < item.minQuantity : item.saldo >= item.minQuantity,
        )
        .filter((item) => (input.needsReorder === undefined ? true : item.needsReorder === input.needsReorder));

      return {
        items: filtered.slice(input.offset, input.offset + input.limit),
        total: filtered.length,
        limit: input.limit,
        offset: input.offset,
      };
    }

    const [rows, total] = await Promise.all([
      this.client.inventoryItem.findMany({
        where,
        orderBy: [{ created_at: "desc" }],
        take: input.limit,
        skip: input.offset,
      }),
      this.client.inventoryItem.count({ where }),
    ]);

    return {
      items: await this.buildViews(input.tenantId, rows, now),
      total,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findItemById(tenantId: string, itemId: string): Promise<InventoryItem | undefined> {
    const item = await this.client.inventoryItem.findFirst({
      where: {
        tenant_id: tenantId,
        id: itemId,
      },
    });

    return item ? mapItemRecord(item) : undefined;
  }

  async findItemWithSaldo(tenantId: string, itemId: string): Promise<InventoryItemView | undefined> {
    const item = await this.findItemById(tenantId, itemId);
    if (!item) return undefined;

    const now = new Date();
    const saldo = await this.saldoOf(tenantId, itemId);
    const usageAbs = await this.usageOf(tenantId, itemId, now);
    const { reorderPoint, needsReorder } = deriveReorder({
      saldo,
      usageAbs,
      leadTimeDays: item.leadTimeDays,
      safetyStock: item.safetyStock,
    });

    return { ...item, saldo, reorderPoint, needsReorder };
  }

  async updateItem(input: UpdateInventoryItemInput): Promise<InventoryItem | undefined> {
    try {
      const updated = await this.client.inventoryItem.updateManyAndReturn({
        where: {
          tenant_id: input.tenantId,
          id: input.itemId,
        },
        data: compactRecord({
          sku: input.sku,
          name: input.name,
          unit: input.unit,
          min_quantity: input.minQuantity,
          max_quantity: nullable(input.maxQuantity),
          lead_time_days: nullable(input.leadTimeDays),
          safety_stock: nullable(input.safetyStock),
          is_active: input.isActive,
          is_fuel: input.isFuel,
          item_type: input.itemType,
          purchase_price: input.purchasePrice,
          sale_price: input.salePrice,
          description: input.description,
          updated_by: nullable(input.updatedBy),
        }),
      });

      return updated[0] ? mapItemRecord(updated[0]) : undefined;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw duplicateSkuError();
      }

      throw error;
    }
  }

  /**
   * R7.1/R7.3 — runs on the executor it was constructed with; wrapped by the RLS
   * repository the whole flow lives inside ONE `$transaction`: aggregate the
   * signed sum → reject an overdraw (409, nothing written) → recompute the
   * moving average on `entrada` → insert the movement + update `avg_cost`
   * atomically.
   */
  async createMovement(input: CreateStockMovementInput): Promise<StockMovement | undefined> {
    const item = await this.findItemById(input.tenantId, input.itemId);
    if (!item) return undefined;

    const custody = input.custody ?? BASE_CUSTODY;

    // Ω4C PR-08 — the non-negative guard runs against THIS custody's balance (stricter than the legacy global
    // guard). Runs inside the RLS `$transaction`; the aggregate sees the transaction's own writes.
    const custodySaldoBefore = await this.saldoOfCustody(input.tenantId, input.itemId, custody);

    if (wouldOverdraw(custodySaldoBefore, input.quantidadeSinalizada)) {
      throw insufficientBalanceError(custodySaldoBefore);
    }

    if (input.type === "entrada" && input.unitCost !== undefined) {
      const globalSaldoBefore = await this.saldoOf(input.tenantId, input.itemId);
      const avgCost = computeMovingAverage(globalSaldoBefore, item.avgCost, input.quantidadeSinalizada, input.unitCost);

      await this.client.inventoryItem.updateMany({
        where: {
          tenant_id: input.tenantId,
          id: input.itemId,
        },
        data: {
          avg_cost: avgCost,
          updated_by: input.createdBy ?? null,
        },
      });
    }

    return this.insertMovement({ ...input, custody });
  }

  async createTransfer(input: CreateTransferInput): Promise<StockTransferResult | undefined> {
    const item = await this.findItemById(input.tenantId, input.itemId);
    if (!item) return undefined;

    const origin = input.type === "link" ? BASE_CUSTODY : input.custody;
    const destination = input.type === "link" ? input.custody : BASE_CUSTODY;
    const quantity = roundToDecimalPrecision(Math.abs(input.quantity));

    const originSaldo = await this.saldoOfCustody(input.tenantId, input.itemId, origin);
    if (wouldOverdraw(originSaldo, -quantity)) {
      throw insufficientBalanceError(originSaldo);
    }

    const transferGroupId = randomUUID();
    const from = await this.insertMovement({
      tenantId: input.tenantId,
      itemId: input.itemId,
      type: input.type,
      quantidadeSinalizada: -quantity,
      reason: input.reason,
      custody: origin,
      transferGroupId,
      createdBy: input.createdBy,
    });
    const to = await this.insertMovement({
      tenantId: input.tenantId,
      itemId: input.itemId,
      type: input.type,
      quantidadeSinalizada: quantity,
      reason: input.reason,
      custody: destination,
      transferGroupId,
      createdBy: input.createdBy,
    });

    return { from, to };
  }

  async reverseMovement(input: ReverseStockMovementInput): Promise<ReverseStockMovementResult> {
    const original = await this.findMovementById(input.tenantId, input.movementId);
    if (!original) return { status: "not_found" };

    const siblings = original.transferGroupId
      ? await this.movementsInGroup(input.tenantId, original.transferGroupId)
      : [original];
    const siblingIds = siblings.map((movement) => movement.id);

    if (await this.hasReversalOf(input.tenantId, siblingIds)) {
      return { status: "already_reversed" };
    }

    // Credits (positive legs) before debits (negative legs): a legitimate reversal never trips the per-custody
    // guard on ordering; a genuine overdraw (stock already left the custody) still raises 409.
    const legs = [...siblings].sort((left, right) => right.quantidadeSinalizada - left.quantidadeSinalizada);
    const transferGroupId = legs.length > 1 ? randomUUID() : undefined;
    const movements: StockMovement[] = [];

    for (const leg of legs) {
      const signed = roundToDecimalPrecision(-leg.quantidadeSinalizada);
      const custody: StockCustody = {
        custodyType: leg.custodyType,
        custodyOperatorProfileId: leg.custodyOperatorProfileId,
        custodyVehicleId: leg.custodyVehicleId,
      };
      const custodySaldoBefore = await this.saldoOfCustody(input.tenantId, leg.itemId, custody);
      if (wouldOverdraw(custodySaldoBefore, signed)) {
        throw insufficientBalanceError(custodySaldoBefore);
      }

      movements.push(
        await this.insertMovement({
          tenantId: input.tenantId,
          itemId: leg.itemId,
          type: leg.type,
          quantidadeSinalizada: signed,
          reason: input.reason,
          custody,
          transferGroupId,
          reversesMovementId: leg.id,
          createdBy: input.createdBy,
        }),
      );
    }

    return { status: "ok", movements };
  }

  async getCustodySummary(tenantId: string, itemId: string): Promise<CustodySummaryRaw> {
    const grouped = await this.client.stockMovement.groupBy({
      by: ["custody_type", "custody_operator_profile_id", "custody_vehicle_id"],
      where: { tenant_id: tenantId, item_id: itemId },
      _sum: { quantidade_sinalizada: true },
    });

    let baseQty = 0;
    const professionals: { operatorProfileId: string; qty: number }[] = [];
    const vehicles: { vehicleId: string; qty: number }[] = [];

    for (const row of grouped) {
      const qty = roundToDecimalPrecision(decimalToNumber(row._sum.quantidade_sinalizada));
      if (row.custody_type === "professional" && row.custody_operator_profile_id) {
        if (qty !== 0) professionals.push({ operatorProfileId: row.custody_operator_profile_id, qty });
      } else if (row.custody_type === "vehicle" && row.custody_vehicle_id) {
        if (qty !== 0) vehicles.push({ vehicleId: row.custody_vehicle_id, qty });
      } else {
        baseQty += qty;
      }
    }

    return { baseQty: roundToDecimalPrecision(baseQty), professionals, vehicles };
  }

  private async insertMovement(
    input: CreateStockMovementInput & {
      readonly custody: StockCustody;
      readonly transferGroupId?: string;
      readonly reversesMovementId?: string;
    },
  ): Promise<StockMovement> {
    const movement = await this.client.stockMovement.create({
      data: {
        tenant_id: input.tenantId,
        item_id: input.itemId,
        type: input.type,
        quantidade_sinalizada: input.quantidadeSinalizada,
        unit_cost: input.unitCost ?? null,
        work_order_id: input.workOrderId ?? null,
        vehicle_id: input.vehicleId ?? null,
        reason: input.reason ?? null,
        cycle_count_id: input.cycleCountId ?? null,
        custody_type: input.custody.custodyType,
        custody_operator_profile_id: input.custody.custodyOperatorProfileId ?? null,
        custody_vehicle_id: input.custody.custodyVehicleId ?? null,
        transfer_group_id: input.transferGroupId ?? null,
        reverses_movement_id: input.reversesMovementId ?? null,
        created_by: input.createdBy ?? null,
      },
    });

    return mapMovementRecord(movement);
  }

  private async movementsInGroup(tenantId: string, transferGroupId: string): Promise<StockMovement[]> {
    const rows = await this.client.stockMovement.findMany({
      where: { tenant_id: tenantId, transfer_group_id: transferGroupId },
    });

    return rows.map(mapMovementRecord);
  }

  private async hasReversalOf(tenantId: string, movementIds: readonly string[]): Promise<boolean> {
    if (movementIds.length === 0) return false;

    const count = await this.client.stockMovement.count({
      where: { tenant_id: tenantId, reverses_movement_id: { in: [...movementIds] } },
    });

    return count > 0;
  }

  private async saldoOfCustody(tenantId: string, itemId: string, custody: StockCustody): Promise<number> {
    const aggregate = await this.client.stockMovement.aggregate({
      where: {
        tenant_id: tenantId,
        item_id: itemId,
        custody_type: custody.custodyType,
        custody_operator_profile_id: custody.custodyOperatorProfileId ?? null,
        custody_vehicle_id: custody.custodyVehicleId ?? null,
      },
      _sum: { quantidade_sinalizada: true },
    });

    return roundToDecimalPrecision(decimalToNumber(aggregate._sum.quantidade_sinalizada));
  }

  async listMovements(input: ListStockMovementsInput): Promise<ListStockMovementsResult> {
    const where = buildMovementWhere(input);
    const [items, total] = await Promise.all([
      this.client.stockMovement.findMany({
        where,
        orderBy: [{ created_at: "desc" }],
        take: input.limit,
        skip: input.offset,
      }),
      this.client.stockMovement.count({ where }),
    ]);

    return {
      items: items.map(mapMovementRecord),
      total,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findMovementById(tenantId: string, movementId: string): Promise<StockMovement | undefined> {
    const movement = await this.client.stockMovement.findFirst({
      where: {
        tenant_id: tenantId,
        id: movementId,
      },
    });

    return movement ? mapMovementRecord(movement) : undefined;
  }

  /**
   * R7.4 — consumption value per ACTIVE item over the ABC window. Movements carry a
   * unit_cost only on entrada, so consumo/saida fall back to the item avg_cost;
   * the per-movement fallback is why this reduces in JS rather than a plain groupBy.
   */
  async getConsumptionValues(tenantId: string, since: Date): Promise<readonly ItemConsumptionValue[]> {
    const items = await this.client.inventoryItem.findMany({
      where: { tenant_id: tenantId, is_active: true },
      select: { id: true, avg_cost: true },
    });
    const avgCostById = new Map(items.map((item) => [item.id, decimalToNumber(item.avg_cost)]));

    const movements = await this.client.stockMovement.findMany({
      where: {
        tenant_id: tenantId,
        type: { in: [...OUTFLOW_TYPES] },
        created_at: { gte: since },
        item_id: { in: items.map((item) => item.id) },
      },
      select: { item_id: true, quantidade_sinalizada: true, unit_cost: true },
    });

    const valueByItem = new Map<string, number>();
    for (const movement of movements) {
      const cost = movement.unit_cost !== null ? decimalToNumber(movement.unit_cost) : avgCostById.get(movement.item_id) ?? 0;
      const value = Math.abs(decimalToNumber(movement.quantidade_sinalizada)) * cost;
      valueByItem.set(movement.item_id, (valueByItem.get(movement.item_id) ?? 0) + value);
    }

    return items.map((item) => ({
      id: item.id,
      consumptionValue: roundToDecimalPrecision(valueByItem.get(item.id) ?? 0),
    }));
  }

  /** R7.4 — write the ABC class for each classified item (one updateMany per item, in-tenant). */
  async applyAbcClasses(tenantId: string, assignments: readonly AbcClassAssignment[], updatedBy?: string): Promise<void> {
    for (const assignment of assignments) {
      await this.client.inventoryItem.updateMany({
        where: { tenant_id: tenantId, id: assignment.id },
        data: { abc_class: assignment.abcClass, updated_by: updatedBy ?? null },
      });
    }
  }

  /** Builds the derived views (saldo + reorder) for a set of rows with two groupBys. */
  private async buildViews(
    tenantId: string,
    rows: readonly Parameters<typeof mapItemRecord>[0][],
    now: Date,
  ): Promise<InventoryItemView[]> {
    const ids = rows.map((row) => row.id);
    const [saldoByItem, usageByItem] = await Promise.all([
      this.sumByItem(tenantId, ids),
      this.usageByItem(tenantId, ids, now),
    ]);

    return rows.map((row) => {
      const item = mapItemRecord(row);
      const saldo = saldoByItem.get(item.id) ?? 0;
      const { reorderPoint, needsReorder } = deriveReorder({
        saldo,
        usageAbs: usageByItem.get(item.id) ?? 0,
        leadTimeDays: item.leadTimeDays,
        safetyStock: item.safetyStock,
      });

      return { ...item, saldo, reorderPoint, needsReorder };
    });
  }

  private async saldoOf(tenantId: string, itemId: string): Promise<number> {
    const aggregate = await this.client.stockMovement.aggregate({
      where: {
        tenant_id: tenantId,
        item_id: itemId,
      },
      _sum: { quantidade_sinalizada: true },
    });

    return roundToDecimalPrecision(decimalToNumber(aggregate._sum.quantidade_sinalizada));
  }

  /** ONE groupBy resolves the saldos for a whole page of items (no N+1). */
  private async sumByItem(tenantId: string, itemIds: readonly string[]): Promise<Map<string, number>> {
    if (itemIds.length === 0) return new Map();

    const sums = await this.client.stockMovement.groupBy({
      by: ["item_id"],
      where: {
        tenant_id: tenantId,
        item_id: { in: [...itemIds] },
      },
      _sum: { quantidade_sinalizada: true },
    });

    return new Map(
      sums.map((entry) => [entry.item_id, roundToDecimalPrecision(decimalToNumber(entry._sum.quantidade_sinalizada))]),
    );
  }

  /** R7.5 — absolute outflow (saida + consumo) over the last REORDER window for one item. */
  private async usageOf(tenantId: string, itemId: string, now: Date): Promise<number> {
    const aggregate = await this.client.stockMovement.aggregate({
      where: {
        tenant_id: tenantId,
        item_id: itemId,
        type: { in: [...OUTFLOW_TYPES] },
        created_at: { gte: usageSince(now) },
      },
      _sum: { quantidade_sinalizada: true },
    });

    return roundToDecimalPrecision(Math.abs(decimalToNumber(aggregate._sum.quantidade_sinalizada)));
  }

  /** R7.5 — ONE groupBy resolves the 90-day outflow for a whole page of items (no N+1). */
  private async usageByItem(tenantId: string, itemIds: readonly string[], now: Date): Promise<Map<string, number>> {
    if (itemIds.length === 0) return new Map();

    const sums = await this.client.stockMovement.groupBy({
      by: ["item_id"],
      where: {
        tenant_id: tenantId,
        item_id: { in: [...itemIds] },
        type: { in: [...OUTFLOW_TYPES] },
        created_at: { gte: usageSince(now) },
      },
      _sum: { quantidade_sinalizada: true },
    });

    return new Map(
      sums.map((entry) => [entry.item_id, roundToDecimalPrecision(Math.abs(decimalToNumber(entry._sum.quantidade_sinalizada)))]),
    );
  }
}

function usageSince(now: Date): Date {
  return new Date(now.getTime() - REORDER_USAGE_WINDOW_DAYS * MILLIS_PER_DAY);
}

export class RlsPrismaInventoryRepository implements InventoryRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  createItem(input: CreateInventoryItemInput): Promise<InventoryItem> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaInventoryRepository(tx).createItem(input));
  }

  listItems(input: ListInventoryItemsInput): Promise<ListInventoryItemsResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaInventoryRepository(tx).listItems(input));
  }

  findItemById(tenantId: string, itemId: string): Promise<InventoryItem | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaInventoryRepository(tx).findItemById(tenantId, itemId));
  }

  findItemWithSaldo(tenantId: string, itemId: string): Promise<InventoryItemView | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaInventoryRepository(tx).findItemWithSaldo(tenantId, itemId),
    );
  }

  updateItem(input: UpdateInventoryItemInput): Promise<InventoryItem | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaInventoryRepository(tx).updateItem(input));
  }

  /** R7.1 — `withTenantRls` opens the `$transaction`; check + insert + avg update commit or roll back together. */
  createMovement(input: CreateStockMovementInput): Promise<StockMovement | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaInventoryRepository(tx).createMovement(input));
  }

  /** Ω4C PR-08 — the transfer pair is written in ONE `$transaction` (guard + two inserts commit or roll back together). */
  createTransfer(input: CreateTransferInput): Promise<StockTransferResult | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaInventoryRepository(tx).createTransfer(input));
  }

  /** Ω4C PR-08 — the compensating movement(s) are written in ONE `$transaction`. */
  reverseMovement(input: ReverseStockMovementInput): Promise<ReverseStockMovementResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaInventoryRepository(tx).reverseMovement(input));
  }

  getCustodySummary(tenantId: string, itemId: string): Promise<CustodySummaryRaw> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaInventoryRepository(tx).getCustodySummary(tenantId, itemId));
  }

  listMovements(input: ListStockMovementsInput): Promise<ListStockMovementsResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaInventoryRepository(tx).listMovements(input));
  }

  findMovementById(tenantId: string, movementId: string): Promise<StockMovement | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaInventoryRepository(tx).findMovementById(tenantId, movementId),
    );
  }

  getConsumptionValues(tenantId: string, since: Date): Promise<readonly ItemConsumptionValue[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaInventoryRepository(tx).getConsumptionValues(tenantId, since),
    );
  }

  applyAbcClasses(tenantId: string, assignments: readonly AbcClassAssignment[], updatedBy?: string): Promise<void> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaInventoryRepository(tx).applyAbcClasses(tenantId, assignments, updatedBy),
    );
  }
}

export async function createPrismaInventoryRepository(): Promise<RlsPrismaInventoryRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaInventoryRepository(prisma);
}

function buildItemWhere(input: ListInventoryItemsInput): Prisma.InventoryItemWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    ...(input.abcClass !== undefined ? { abc_class: input.abcClass } : {}),
    ...(input.search
      ? {
          OR: [
            { sku: { contains: input.search, mode: "insensitive" } },
            { name: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function buildMovementWhere(input: ListStockMovementsInput): Prisma.StockMovementWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.itemId ? { item_id: input.itemId } : {}),
    ...(input.type ? { type: input.type } : {}),
    ...(input.workOrderId ? { work_order_id: input.workOrderId } : {}),
    ...(input.cycleCountId ? { cycle_count_id: input.cycleCountId } : {}),
    ...(input.from || input.to
      ? {
          created_at: {
            ...(input.from ? { gte: input.from } : {}),
            ...(input.to ? { lte: input.to } : {}),
          },
        }
      : {}),
  };
}

function mapItemRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly sku: string;
  readonly name: string;
  readonly unit: string;
  readonly min_quantity: unknown;
  readonly max_quantity: unknown;
  readonly abc_class: string | null;
  readonly avg_cost: unknown;
  readonly lead_time_days: number | null;
  readonly safety_stock: unknown;
  readonly is_active: boolean;
  readonly is_fuel: boolean;
  readonly item_type: string;
  readonly purchase_price: unknown;
  readonly sale_price: unknown;
  readonly description: string | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): InventoryItem {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    sku: record.sku,
    name: record.name,
    unit: record.unit,
    minQuantity: decimalToNumber(record.min_quantity),
    maxQuantity: optionalDecimal(record.max_quantity),
    abcClass: (record.abc_class as InventoryAbcClass | null) ?? undefined,
    avgCost: decimalToNumber(record.avg_cost),
    leadTimeDays: record.lead_time_days ?? undefined,
    safetyStock: optionalDecimal(record.safety_stock),
    isActive: record.is_active,
    isFuel: record.is_fuel,
    itemType: (record.item_type as InventoryItemType | null) ?? "product",
    purchasePrice: optionalDecimal(record.purchase_price),
    salePrice: optionalDecimal(record.sale_price),
    description: record.description ?? undefined,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapMovementRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly item_id: string;
  readonly type: string;
  readonly quantidade_sinalizada: unknown;
  readonly unit_cost: unknown;
  readonly work_order_id: string | null;
  readonly vehicle_id: string | null;
  readonly reason: string | null;
  readonly cycle_count_id: string | null;
  readonly custody_type: string;
  readonly custody_operator_profile_id: string | null;
  readonly custody_vehicle_id: string | null;
  readonly transfer_group_id: string | null;
  readonly reverses_movement_id: string | null;
  readonly created_by: string | null;
  readonly created_at: Date;
}): StockMovement {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    itemId: record.item_id,
    type: record.type as StockMovementType,
    quantidadeSinalizada: decimalToNumber(record.quantidade_sinalizada),
    unitCost: optionalDecimal(record.unit_cost),
    workOrderId: record.work_order_id ?? undefined,
    vehicleId: record.vehicle_id ?? undefined,
    reason: record.reason ?? undefined,
    cycleCountId: record.cycle_count_id ?? undefined,
    custodyType: (record.custody_type as StockCustodyType | null) ?? "base",
    custodyOperatorProfileId: record.custody_operator_profile_id ?? undefined,
    custodyVehicleId: record.custody_vehicle_id ?? undefined,
    transferGroupId: record.transfer_group_id ?? undefined,
    reversesMovementId: record.reverses_movement_id ?? undefined,
    createdBy: record.created_by ?? undefined,
    createdAt: record.created_at,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { readonly code?: unknown }).code === "P2002"
  );
}

function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalDecimal(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function nullable<T>(value: T | undefined): T | null | undefined {
  return value === undefined ? undefined : value ?? null;
}

function compactRecord<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
