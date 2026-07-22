import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  CreateMaintenanceOrderInput,
  ListMaintenanceOrdersInput,
  ListMaintenanceOrdersResult,
  MaintenanceOrder,
  MaintenanceStatus,
  MaintenanceType,
  UpdateMaintenanceOrderInput,
} from "./maintenance-order.types.js";
import type { MaintenanceOrderRepository } from "./maintenance-order.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaMaintenanceOrderRepository implements MaintenanceOrderRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateMaintenanceOrderInput): Promise<MaintenanceOrder> {
    const order = await this.client.maintenanceOrder.create({
      data: {
        tenant_id: input.tenantId,
        vehicle_id: input.vehicleId,
        type: input.type,
        status: input.status,
        scheduled_for: input.scheduledFor ?? null,
        completed_at: input.completedAt ?? null,
        cost: input.cost ?? null,
        supplier: input.supplier ?? null,
        odometer: input.odometer ?? null,
        next_due_at: input.nextDueAt ?? null,
        description: input.description,
        is_active: input.isActive ?? true,
        created_by: input.createdBy ?? null,
        updated_by: input.updatedBy ?? null,
      },
    });

    return mapMaintenanceOrderRecord(order);
  }

  async list(input: ListMaintenanceOrdersInput): Promise<ListMaintenanceOrdersResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.maintenanceOrder.findMany({
        where,
        orderBy: [{ created_at: "desc" }],
        take: input.limit,
        skip: input.offset,
      }),
      this.client.maintenanceOrder.count({ where }),
    ]);

    return {
      items: items.map(mapMaintenanceOrderRecord),
      total,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, maintenanceOrderId: string): Promise<MaintenanceOrder | undefined> {
    const order = await this.client.maintenanceOrder.findFirst({
      where: {
        tenant_id: tenantId,
        id: maintenanceOrderId,
      },
    });

    return order ? mapMaintenanceOrderRecord(order) : undefined;
  }

  async update(input: UpdateMaintenanceOrderInput): Promise<MaintenanceOrder | undefined> {
    const updated = await this.client.maintenanceOrder.updateManyAndReturn({
      where: {
        tenant_id: input.tenantId,
        id: input.maintenanceOrderId,
      },
      data: compactRecord({
        type: input.type,
        status: input.status,
        scheduled_for: nullable(input.scheduledFor),
        completed_at: nullable(input.completedAt),
        cost: nullable(input.cost),
        supplier: nullable(input.supplier),
        odometer: nullable(input.odometer),
        next_due_at: nullable(input.nextDueAt),
        description: input.description,
        is_active: input.isActive,
        updated_by: nullable(input.updatedBy),
      }),
    });

    return updated[0] ? mapMaintenanceOrderRecord(updated[0]) : undefined;
  }

  async maxOdometerForVehicle(tenantId: string, vehicleId: string): Promise<number | undefined> {
    const aggregate = await this.client.maintenanceOrder.aggregate({
      where: {
        tenant_id: tenantId,
        vehicle_id: vehicleId,
      },
      _max: { odometer: true },
    });

    return aggregate._max.odometer ?? undefined;
  }

  async hasActiveMaintenance(tenantId: string, vehicleId: string): Promise<boolean> {
    const count = await this.client.maintenanceOrder.count({
      where: {
        tenant_id: tenantId,
        vehicle_id: vehicleId,
        status: "em_execucao",
        is_active: true,
      },
    });

    return count > 0;
  }

  async listDuePreventive(tenantId: string, now: Date, until: Date): Promise<MaintenanceOrder[]> {
    const items = await this.client.maintenanceOrder.findMany({
      where: {
        tenant_id: tenantId,
        type: "preventiva",
        status: "agendada",
        is_active: true,
        scheduled_for: { gte: now, lte: until },
      },
      orderBy: [{ scheduled_for: "asc" }, { created_at: "asc" }],
    });

    return items.map(mapMaintenanceOrderRecord);
  }
}

export class RlsPrismaMaintenanceOrderRepository implements MaintenanceOrderRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateMaintenanceOrderInput): Promise<MaintenanceOrder> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaMaintenanceOrderRepository(tx).create(input),
    );
  }

  list(input: ListMaintenanceOrdersInput): Promise<ListMaintenanceOrdersResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaMaintenanceOrderRepository(tx).list(input),
    );
  }

  findById(tenantId: string, maintenanceOrderId: string): Promise<MaintenanceOrder | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaMaintenanceOrderRepository(tx).findById(tenantId, maintenanceOrderId),
    );
  }

  update(input: UpdateMaintenanceOrderInput): Promise<MaintenanceOrder | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaMaintenanceOrderRepository(tx).update(input),
    );
  }

  maxOdometerForVehicle(tenantId: string, vehicleId: string): Promise<number | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaMaintenanceOrderRepository(tx).maxOdometerForVehicle(tenantId, vehicleId),
    );
  }

  hasActiveMaintenance(tenantId: string, vehicleId: string): Promise<boolean> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaMaintenanceOrderRepository(tx).hasActiveMaintenance(tenantId, vehicleId),
    );
  }

  listDuePreventive(tenantId: string, now: Date, until: Date): Promise<MaintenanceOrder[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaMaintenanceOrderRepository(tx).listDuePreventive(tenantId, now, until),
    );
  }
}

export async function createPrismaMaintenanceOrderRepository(): Promise<RlsPrismaMaintenanceOrderRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaMaintenanceOrderRepository(prisma);
}

function buildWhere(input: ListMaintenanceOrdersInput): Prisma.MaintenanceOrderWhereInput {
  const scheduledFor: Prisma.DateTimeNullableFilter = {};
  if (input.scheduledFrom) scheduledFor.gte = input.scheduledFrom;
  if (input.scheduledTo) scheduledFor.lte = input.scheduledTo;

  return {
    tenant_id: input.tenantId,
    ...(input.vehicleId ? { vehicle_id: input.vehicleId } : {}),
    ...(input.type ? { type: input.type } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    ...(input.scheduledFrom || input.scheduledTo ? { scheduled_for: scheduledFor } : {}),
    ...(input.search
      ? {
          OR: [
            { description: { contains: input.search, mode: "insensitive" } },
            { supplier: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function mapMaintenanceOrderRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly vehicle_id: string;
  readonly type: string;
  readonly status: string;
  readonly scheduled_for: Date | null;
  readonly completed_at: Date | null;
  readonly cost: unknown;
  readonly supplier: string | null;
  readonly odometer: number | null;
  readonly next_due_at: Date | null;
  readonly description: string;
  readonly is_active: boolean;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): MaintenanceOrder {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    vehicleId: record.vehicle_id,
    type: record.type as MaintenanceType,
    status: record.status as MaintenanceStatus,
    scheduledFor: record.scheduled_for ?? undefined,
    completedAt: record.completed_at ?? undefined,
    cost: record.cost === null || record.cost === undefined ? undefined : decimalToNumber(record.cost),
    supplier: record.supplier ?? undefined,
    odometer: record.odometer ?? undefined,
    nextDueAt: record.next_due_at ?? undefined,
    description: record.description,
    isActive: record.is_active,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function decimalToNumber(value: unknown): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function nullable<T>(value: T | undefined): T | null | undefined {
  return value === undefined ? undefined : value ?? null;
}

function compactRecord<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
