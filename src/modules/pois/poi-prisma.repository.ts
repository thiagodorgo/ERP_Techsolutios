import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  Poi,
  CreatePoiInput,
  ListPoiInput,
  ListPoiResult,
  UpdatePoiInput,
} from "./poi.types.js";
import { PoiError } from "./poi.types.js";
import type { PoiRepository } from "./poi.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaPoiRepository implements PoiRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreatePoiInput): Promise<Poi> {
    try {
      const poi = await this.client.poi.create({
        data: {
          tenant_id: input.tenantId,
          name: input.name,
          category: input.category ?? null,
          latitude: input.latitude,
          longitude: input.longitude,
          address: input.address ?? null,
          is_active: input.isActive ?? true,
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });
      return mapPoiRecord(poi);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new PoiError(409, "POI_CONFLICT", "duplicate_name", "A point of interest with this name already exists.");
      }
      throw error;
    }
  }

  async list(input: ListPoiInput): Promise<ListPoiResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.poi.findMany({ where, orderBy: [{ created_at: "desc" }], take: input.limit, skip: input.offset }),
      this.client.poi.count({ where }),
    ]);
    return { items: items.map(mapPoiRecord), total, limit: input.limit, offset: input.offset };
  }

  async findById(tenantId: string, poiId: string): Promise<Poi | undefined> {
    const poi = await this.client.poi.findFirst({ where: { tenant_id: tenantId, id: poiId } });
    return poi ? mapPoiRecord(poi) : undefined;
  }

  async update(input: UpdatePoiInput): Promise<Poi | undefined> {
    try {
      const updated = await this.client.poi.updateManyAndReturn({
        where: { tenant_id: input.tenantId, id: input.poiId },
        data: compactRecord({
          name: input.name,
          category: nullable(input.category),
          latitude: input.latitude,
          longitude: input.longitude,
          address: nullable(input.address),
          is_active: input.isActive,
          updated_by: nullable(input.updatedBy),
        }),
      });
      return updated[0] ? mapPoiRecord(updated[0]) : undefined;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new PoiError(409, "POI_CONFLICT", "duplicate_name", "A point of interest with this name already exists.");
      }
      throw error;
    }
  }
}

export class RlsPrismaPoiRepository implements PoiRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreatePoiInput): Promise<Poi> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaPoiRepository(tx).create(input));
  }

  list(input: ListPoiInput): Promise<ListPoiResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaPoiRepository(tx).list(input));
  }

  findById(tenantId: string, poiId: string): Promise<Poi | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaPoiRepository(tx).findById(tenantId, poiId));
  }

  update(input: UpdatePoiInput): Promise<Poi | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaPoiRepository(tx).update(input));
  }
}

export async function createPrismaPoiRepository(): Promise<RlsPrismaPoiRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaPoiRepository(prisma);
}

function buildWhere(input: ListPoiInput): Prisma.PoiWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { category: { contains: input.search, mode: "insensitive" } },
            { address: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function mapPoiRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly name: string;
  readonly category: string | null;
  readonly latitude: Prisma.Decimal;
  readonly longitude: Prisma.Decimal;
  readonly address: string | null;
  readonly is_active: boolean;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): Poi {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    name: record.name,
    category: record.category ?? undefined,
    // Ω2-d — emitido como número (Decimal(10,7) → Number) para o consumidor do mapa.
    latitude: Number(record.latitude),
    longitude: Number(record.longitude),
    address: record.address ?? undefined,
    isActive: record.is_active,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { readonly code?: unknown }).code === "P2002";
}

function nullable<T>(value: T | undefined): T | null | undefined {
  return value === undefined ? undefined : value ?? null;
}

function compactRecord<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
