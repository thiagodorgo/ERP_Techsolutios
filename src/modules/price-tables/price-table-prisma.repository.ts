import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  PriceTable,
  PriceTableStatus,
  CreatePriceTableInput,
  ListPriceTableInput,
  ListPriceTableResult,
  UpdatePriceTableInput,
} from "./price-table.types.js";
import { PriceTableError } from "./price-table.types.js";
import type { PriceTableRepository } from "./price-table.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaPriceTableRepository implements PriceTableRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreatePriceTableInput): Promise<PriceTable> {
    try {
      const table = await this.client.priceTable.create({
        data: {
          tenant_id: input.tenantId,
          name: input.name,
          description: input.description ?? null,
          currency: input.currency,
          version: input.version,
          valid_from: input.validFrom ?? null,
          valid_to: input.validTo ?? null,
          status: input.status,
          is_active: input.isActive ?? true,
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });
      return mapPriceTableRecord(table);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new PriceTableError(409, "PRICE_TABLE_CONFLICT", "duplicate_name", "A price table with this name already exists.");
      }
      throw error;
    }
  }

  async list(input: ListPriceTableInput): Promise<ListPriceTableResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.priceTable.findMany({ where, orderBy: [{ created_at: "desc" }], take: input.limit, skip: input.offset }),
      this.client.priceTable.count({ where }),
    ]);
    return { items: items.map(mapPriceTableRecord), total, limit: input.limit, offset: input.offset };
  }

  async findById(tenantId: string, priceTableId: string): Promise<PriceTable | undefined> {
    const table = await this.client.priceTable.findFirst({ where: { tenant_id: tenantId, id: priceTableId } });
    return table ? mapPriceTableRecord(table) : undefined;
  }

  async update(input: UpdatePriceTableInput): Promise<PriceTable | undefined> {
    try {
      const updated = await this.client.priceTable.updateManyAndReturn({
        where: { tenant_id: input.tenantId, id: input.priceTableId },
        data: compactRecord({
          name: input.name,
          description: nullable(input.description),
          currency: input.currency,
          version: input.version,
          valid_from: nullable(input.validFrom),
          valid_to: nullable(input.validTo),
          status: input.status,
          is_active: input.isActive,
          updated_by: nullable(input.updatedBy),
        }),
      });
      return updated[0] ? mapPriceTableRecord(updated[0]) : undefined;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new PriceTableError(409, "PRICE_TABLE_CONFLICT", "duplicate_name", "A price table with this name already exists.");
      }
      throw error;
    }
  }
}

export class RlsPrismaPriceTableRepository implements PriceTableRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreatePriceTableInput): Promise<PriceTable> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaPriceTableRepository(tx).create(input));
  }

  list(input: ListPriceTableInput): Promise<ListPriceTableResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaPriceTableRepository(tx).list(input));
  }

  findById(tenantId: string, priceTableId: string): Promise<PriceTable | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaPriceTableRepository(tx).findById(tenantId, priceTableId));
  }

  update(input: UpdatePriceTableInput): Promise<PriceTable | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaPriceTableRepository(tx).update(input));
  }
}

export async function createPrismaPriceTableRepository(): Promise<RlsPrismaPriceTableRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaPriceTableRepository(prisma);
}

function buildWhere(input: ListPriceTableInput): Prisma.PriceTableWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { description: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function mapPriceTableRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly name: string;
  readonly description: string | null;
  readonly currency: string;
  readonly version: number;
  readonly valid_from: Date | null;
  readonly valid_to: Date | null;
  readonly status: string;
  readonly is_active: boolean;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): PriceTable {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    name: record.name,
    description: record.description ?? undefined,
    currency: record.currency,
    version: record.version,
    validFrom: record.valid_from ?? undefined,
    validTo: record.valid_to ?? undefined,
    status: record.status as PriceTableStatus,
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
