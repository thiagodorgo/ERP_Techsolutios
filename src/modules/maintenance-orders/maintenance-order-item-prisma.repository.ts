import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type { MaintenanceOrderItemRepository } from "./maintenance-order-item.repository.js";
import type {
  CreateMaintenanceOrderItemInput,
  MaintenanceItemType,
  MaintenanceOrderItem,
  UpdateMaintenanceOrderItemInput,
} from "./maintenance-order-item.types.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaMaintenanceOrderItemRepository implements MaintenanceOrderItemRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateMaintenanceOrderItemInput): Promise<MaintenanceOrderItem> {
    const record = await this.client.maintenanceOrderItem.create({
      data: {
        tenant_id: input.tenantId,
        maintenance_order_id: input.maintenanceOrderId,
        item_type: input.itemType,
        description: input.description,
        unit_value: input.unitValue,
        quantity: input.quantity,
        notes: input.notes ?? null,
        created_by: input.createdBy ?? null,
        updated_by: input.updatedBy ?? null,
      },
    });
    return mapItemRecord(record);
  }

  async listByOrder(tenantId: string, maintenanceOrderId: string): Promise<MaintenanceOrderItem[]> {
    const records = await this.client.maintenanceOrderItem.findMany({
      where: { tenant_id: tenantId, maintenance_order_id: maintenanceOrderId, deleted_at: null },
      orderBy: [{ created_at: "asc" }],
    });
    return records.map(mapItemRecord);
  }

  async listByOrderIds(tenantId: string, maintenanceOrderIds: readonly string[]): Promise<MaintenanceOrderItem[]> {
    if (maintenanceOrderIds.length === 0) return [];
    const records = await this.client.maintenanceOrderItem.findMany({
      where: { tenant_id: tenantId, maintenance_order_id: { in: [...maintenanceOrderIds] }, deleted_at: null },
      orderBy: [{ created_at: "asc" }],
    });
    return records.map(mapItemRecord);
  }

  async findById(tenantId: string, itemId: string): Promise<MaintenanceOrderItem | undefined> {
    const record = await this.client.maintenanceOrderItem.findFirst({
      where: { tenant_id: tenantId, id: itemId, deleted_at: null },
    });
    return record ? mapItemRecord(record) : undefined;
  }

  async update(input: UpdateMaintenanceOrderItemInput): Promise<MaintenanceOrderItem | undefined> {
    const updated = await this.client.maintenanceOrderItem.updateManyAndReturn({
      where: { tenant_id: input.tenantId, id: input.itemId, deleted_at: null },
      data: compactRecord({
        item_type: input.itemType,
        description: input.description,
        unit_value: input.unitValue,
        quantity: input.quantity,
        notes: input.notes,
        updated_by: input.updatedBy,
      }),
    });
    return updated[0] ? mapItemRecord(updated[0]) : undefined;
  }

  async softDelete(tenantId: string, itemId: string): Promise<MaintenanceOrderItem | undefined> {
    const now = new Date();
    const updated = await this.client.maintenanceOrderItem.updateManyAndReturn({
      where: { tenant_id: tenantId, id: itemId, deleted_at: null },
      data: { is_active: false, deleted_at: now },
    });
    return updated[0] ? mapItemRecord(updated[0]) : undefined;
  }
}

export class RlsPrismaMaintenanceOrderItemRepository implements MaintenanceOrderItemRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateMaintenanceOrderItemInput): Promise<MaintenanceOrderItem> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaMaintenanceOrderItemRepository(tx).create(input),
    );
  }

  listByOrder(tenantId: string, maintenanceOrderId: string): Promise<MaintenanceOrderItem[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaMaintenanceOrderItemRepository(tx).listByOrder(tenantId, maintenanceOrderId),
    );
  }

  listByOrderIds(tenantId: string, maintenanceOrderIds: readonly string[]): Promise<MaintenanceOrderItem[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaMaintenanceOrderItemRepository(tx).listByOrderIds(tenantId, maintenanceOrderIds),
    );
  }

  findById(tenantId: string, itemId: string): Promise<MaintenanceOrderItem | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaMaintenanceOrderItemRepository(tx).findById(tenantId, itemId),
    );
  }

  update(input: UpdateMaintenanceOrderItemInput): Promise<MaintenanceOrderItem | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaMaintenanceOrderItemRepository(tx).update(input),
    );
  }

  softDelete(tenantId: string, itemId: string): Promise<MaintenanceOrderItem | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaMaintenanceOrderItemRepository(tx).softDelete(tenantId, itemId),
    );
  }
}

export async function createPrismaMaintenanceOrderItemRepository(): Promise<RlsPrismaMaintenanceOrderItemRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaMaintenanceOrderItemRepository(prisma);
}

function mapItemRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly maintenance_order_id: string;
  readonly item_type: string;
  readonly description: string;
  readonly unit_value: unknown;
  readonly quantity: unknown;
  readonly notes: string | null;
  readonly is_active: boolean;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly deleted_at: Date | null;
}): MaintenanceOrderItem {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    maintenanceOrderId: record.maintenance_order_id,
    itemType: record.item_type as MaintenanceItemType,
    description: record.description,
    unitValue: decimalToNumber(record.unit_value),
    quantity: decimalToNumber(record.quantity),
    notes: record.notes ?? undefined,
    isActive: record.is_active,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    deletedAt: record.deleted_at ?? undefined,
  };
}

function decimalToNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compactRecord<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
