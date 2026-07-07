import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  Vehicle,
  CreateVehicleInput,
  ListVehiclesInput,
  ListVehiclesResult,
  UpdateVehicleInput,
} from "./vehicle.types.js";
import { VehicleError } from "./vehicle.types.js";
import type { VehicleRepository } from "./vehicle.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaVehicleRepository implements VehicleRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateVehicleInput): Promise<Vehicle> {
    try {
      const vehicle = await this.client.vehicle.create({
        data: {
          tenant_id: input.tenantId,
          plate: input.plate,
          model: input.model,
          type: input.type ?? null,
          year: input.year ?? null,
          status: input.status || "active",
          notes: input.notes ?? null,
          is_active: input.isActive ?? true,
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });

      return mapVehicleRecord(vehicle);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new VehicleError(409, "VEHICLE_CONFLICT", "duplicate_plate", "A vehicle with this plate already exists.");
      }

      throw error;
    }
  }

  async list(input: ListVehiclesInput): Promise<ListVehiclesResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.vehicle.findMany({
        where,
        orderBy: [{ created_at: "desc" }],
        take: input.limit,
        skip: input.offset,
      }),
      this.client.vehicle.count({ where }),
    ]);

    return {
      items: items.map(mapVehicleRecord),
      total,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, vehicleId: string): Promise<Vehicle | undefined> {
    const vehicle = await this.client.vehicle.findFirst({
      where: {
        tenant_id: tenantId,
        id: vehicleId,
      },
    });

    return vehicle ? mapVehicleRecord(vehicle) : undefined;
  }

  async update(input: UpdateVehicleInput): Promise<Vehicle | undefined> {
    try {
      const updated = await this.client.vehicle.updateManyAndReturn({
        where: {
          tenant_id: input.tenantId,
          id: input.vehicleId,
        },
        data: compactRecord({
          plate: input.plate,
          model: input.model,
          type: nullable(input.type),
          year: nullable(input.year),
          status: input.status,
          notes: nullable(input.notes),
          is_active: input.isActive,
          updated_by: nullable(input.updatedBy),
        }),
      });

      return updated[0] ? mapVehicleRecord(updated[0]) : undefined;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new VehicleError(409, "VEHICLE_CONFLICT", "duplicate_plate", "A vehicle with this plate already exists.");
      }

      throw error;
    }
  }
}

export class RlsPrismaVehicleRepository implements VehicleRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateVehicleInput): Promise<Vehicle> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaVehicleRepository(tx).create(input));
  }

  list(input: ListVehiclesInput): Promise<ListVehiclesResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaVehicleRepository(tx).list(input));
  }

  findById(tenantId: string, vehicleId: string): Promise<Vehicle | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaVehicleRepository(tx).findById(tenantId, vehicleId));
  }

  update(input: UpdateVehicleInput): Promise<Vehicle | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaVehicleRepository(tx).update(input));
  }
}

export async function createPrismaVehicleRepository(): Promise<RlsPrismaVehicleRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaVehicleRepository(prisma);
}

function buildWhere(input: ListVehiclesInput): Prisma.VehicleWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    ...(input.search
      ? {
          OR: [
            { plate: { contains: input.search, mode: "insensitive" } },
            { model: { contains: input.search, mode: "insensitive" } },
            { type: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function mapVehicleRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly plate: string;
  readonly model: string;
  readonly type: string | null;
  readonly year: number | null;
  readonly status: string;
  readonly notes: string | null;
  readonly is_active: boolean;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): Vehicle {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    plate: record.plate,
    model: record.model,
    type: record.type ?? undefined,
    year: record.year ?? undefined,
    status: record.status,
    notes: record.notes ?? undefined,
    isActive: record.is_active,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
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

function nullable<T>(value: T | undefined): T | null | undefined {
  return value === undefined ? undefined : value ?? null;
}

function compactRecord<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
