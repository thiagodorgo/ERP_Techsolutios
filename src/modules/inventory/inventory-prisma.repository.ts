import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import {
  computeMovingAverage,
  roundToDecimalPrecision,
  wouldOverdraw,
} from "./inventory.calculations.js";
import {
  duplicateSkuError,
  insufficientBalanceError,
  type CreateInventoryItemInput,
  type CreateStockMovementInput,
  type InventoryAbcClass,
  type InventoryItem,
  type InventoryItemWithSaldo,
  type ListInventoryItemsInput,
  type ListInventoryItemsResult,
  type ListStockMovementsInput,
  type ListStockMovementsResult,
  type StockMovement,
  type StockMovementType,
  type UpdateInventoryItemInput,
} from "./inventory.types.js";
import type { InventoryRepository } from "./inventory.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

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

    // `below_min` is a DERIVED filter (saldo < min_quantity, R7.1): saldos for
    // every matching item come from ONE groupBy, the predicate is applied, and
    // only then the page is sliced. Without it, a plain page + ONE groupBy for
    // the page's ids resolves the saldos (no N+1 in either path).
    if (input.belowMin !== undefined) {
      const rows = await this.client.inventoryItem.findMany({
        where,
        orderBy: [{ created_at: "desc" }],
      });
      const saldoByItem = await this.sumByItem(input.tenantId, rows.map((row) => row.id));
      const filtered = rows
        .map((row) => withSaldo(mapItemRecord(row), saldoByItem))
        .filter((item) => (input.belowMin ? item.saldo < item.minQuantity : item.saldo >= item.minQuantity));

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
    const saldoByItem = await this.sumByItem(input.tenantId, rows.map((row) => row.id));

    return {
      items: rows.map((row) => withSaldo(mapItemRecord(row), saldoByItem)),
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

  async findItemWithSaldo(tenantId: string, itemId: string): Promise<InventoryItemWithSaldo | undefined> {
    const item = await this.findItemById(tenantId, itemId);
    if (!item) return undefined;

    return { ...item, saldo: await this.saldoOf(tenantId, itemId) };
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

    const saldoBefore = await this.saldoOf(input.tenantId, input.itemId);

    if (wouldOverdraw(saldoBefore, input.quantidadeSinalizada)) {
      throw insufficientBalanceError(saldoBefore);
    }

    if (input.type === "entrada" && input.unitCost !== undefined) {
      const avgCost = computeMovingAverage(saldoBefore, item.avgCost, input.quantidadeSinalizada, input.unitCost);

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
        created_by: input.createdBy ?? null,
      },
    });

    return mapMovementRecord(movement);
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

  findItemWithSaldo(tenantId: string, itemId: string): Promise<InventoryItemWithSaldo | undefined> {
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

  listMovements(input: ListStockMovementsInput): Promise<ListStockMovementsResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaInventoryRepository(tx).listMovements(input));
  }

  findMovementById(tenantId: string, movementId: string): Promise<StockMovement | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaInventoryRepository(tx).findMovementById(tenantId, movementId),
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

function withSaldo(item: InventoryItem, saldoByItem: ReadonlyMap<string, number>): InventoryItemWithSaldo {
  return { ...item, saldo: saldoByItem.get(item.id) ?? 0 };
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
