import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  CreateFuelLogInput,
  FuelLog,
  FuelType,
  ListFuelLogsInput,
  ListFuelLogsResult,
  StationType,
  UpdateFuelLogInput,
} from "./fuel-log.types.js";
import type { FuelLogRepository } from "./fuel-log.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaFuelLogRepository implements FuelLogRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateFuelLogInput): Promise<FuelLog> {
    const fuelLog = await this.client.fuelLog.create({
      data: {
        tenant_id: input.tenantId,
        vehicle_id: input.vehicleId,
        operator_id: input.operatorId ?? null,
        work_order_id: input.workOrderId ?? null,
        fueled_at: input.fueledAt,
        fuel_type: input.fuelType,
        liters: input.liters,
        total_value: input.totalValue,
        odometer: input.odometer,
        station: input.station ?? null,
        station_type: input.stationType,
        supplier_id: input.supplierId ?? null,
        notes: input.notes ?? null,
        is_active: input.isActive ?? true,
        created_by: input.createdBy ?? null,
        updated_by: input.updatedBy ?? null,
      },
    });

    return mapFuelLogRecord(fuelLog);
  }

  async list(input: ListFuelLogsInput): Promise<ListFuelLogsResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.fuelLog.findMany({
        where,
        orderBy: [{ fueled_at: "desc" }, { created_at: "desc" }],
        take: input.limit,
        skip: input.offset,
      }),
      this.client.fuelLog.count({ where }),
    ]);

    return {
      items: items.map(mapFuelLogRecord),
      total,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, fuelLogId: string): Promise<FuelLog | undefined> {
    const fuelLog = await this.client.fuelLog.findFirst({
      where: {
        tenant_id: tenantId,
        id: fuelLogId,
      },
    });

    return fuelLog ? mapFuelLogRecord(fuelLog) : undefined;
  }

  async update(input: UpdateFuelLogInput): Promise<FuelLog | undefined> {
    const updated = await this.client.fuelLog.updateManyAndReturn({
      where: {
        tenant_id: input.tenantId,
        id: input.fuelLogId,
      },
      data: compactRecord({
        operator_id: nullable(input.operatorId),
        work_order_id: nullable(input.workOrderId),
        fuel_type: input.fuelType,
        liters: input.liters,
        total_value: input.totalValue,
        odometer: input.odometer,
        station: nullable(input.station),
        station_type: input.stationType,
        supplier_id: nullable(input.supplierId),
        notes: nullable(input.notes),
        is_active: input.isActive,
        updated_by: nullable(input.updatedBy),
      }),
    });

    return updated[0] ? mapFuelLogRecord(updated[0]) : undefined;
  }

  async maxOdometerForVehicle(tenantId: string, vehicleId: string): Promise<number | undefined> {
    const aggregate = await this.client.fuelLog.aggregate({
      where: {
        tenant_id: tenantId,
        vehicle_id: vehicleId,
      },
      _max: { odometer: true },
    });

    return aggregate._max.odometer ?? undefined;
  }

  async listByVehicleAscending(tenantId: string, vehicleId: string): Promise<FuelLog[]> {
    const items = await this.client.fuelLog.findMany({
      where: {
        tenant_id: tenantId,
        vehicle_id: vehicleId,
      },
      orderBy: [{ fueled_at: "asc" }, { created_at: "asc" }, { id: "asc" }],
    });

    return items.map(mapFuelLogRecord);
  }
}

export class RlsPrismaFuelLogRepository implements FuelLogRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateFuelLogInput): Promise<FuelLog> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFuelLogRepository(tx).create(input));
  }

  list(input: ListFuelLogsInput): Promise<ListFuelLogsResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFuelLogRepository(tx).list(input));
  }

  findById(tenantId: string, fuelLogId: string): Promise<FuelLog | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFuelLogRepository(tx).findById(tenantId, fuelLogId));
  }

  update(input: UpdateFuelLogInput): Promise<FuelLog | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFuelLogRepository(tx).update(input));
  }

  maxOdometerForVehicle(tenantId: string, vehicleId: string): Promise<number | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaFuelLogRepository(tx).maxOdometerForVehicle(tenantId, vehicleId),
    );
  }

  listByVehicleAscending(tenantId: string, vehicleId: string): Promise<FuelLog[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaFuelLogRepository(tx).listByVehicleAscending(tenantId, vehicleId),
    );
  }
}

export async function createPrismaFuelLogRepository(): Promise<RlsPrismaFuelLogRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaFuelLogRepository(prisma);
}

function buildWhere(input: ListFuelLogsInput): Prisma.FuelLogWhereInput {
  const fueledAt: Prisma.DateTimeFilter = {};
  if (input.from) fueledAt.gte = input.from;
  if (input.to) fueledAt.lte = input.to;

  return {
    tenant_id: input.tenantId,
    ...(input.vehicleId ? { vehicle_id: input.vehicleId } : {}),
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    ...(input.from || input.to ? { fueled_at: fueledAt } : {}),
    ...(input.search
      ? {
          OR: [
            { station: { contains: input.search, mode: "insensitive" } },
            { notes: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function mapFuelLogRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly vehicle_id: string;
  readonly operator_id: string | null;
  readonly work_order_id: string | null;
  readonly fueled_at: Date;
  readonly fuel_type: string;
  readonly liters: unknown;
  readonly total_value: unknown;
  readonly odometer: number;
  readonly station: string | null;
  readonly station_type: string;
  readonly supplier_id: string | null;
  readonly notes: string | null;
  readonly is_active: boolean;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): FuelLog {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    vehicleId: record.vehicle_id,
    operatorId: record.operator_id ?? undefined,
    workOrderId: record.work_order_id ?? undefined,
    fueledAt: record.fueled_at,
    fuelType: record.fuel_type as FuelType,
    liters: decimalToNumber(record.liters),
    totalValue: decimalToNumber(record.total_value),
    odometer: record.odometer,
    station: record.station ?? undefined,
    stationType: (record.station_type as StationType) ?? "external",
    supplierId: record.supplier_id ?? undefined,
    notes: record.notes ?? undefined,
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
