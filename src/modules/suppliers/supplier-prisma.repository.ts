import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  Supplier,
  CreateSupplierInput,
  ListSupplierInput,
  ListSupplierResult,
  UpdateSupplierInput,
} from "./supplier.types.js";
import { SupplierError } from "./supplier.types.js";
import type { SupplierRepository } from "./supplier.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaSupplierRepository implements SupplierRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateSupplierInput): Promise<Supplier> {
    try {
      const supplier = await this.client.supplier.create({
        data: {
          tenant_id: input.tenantId,
          name: input.name,
          document: input.document ?? null,
          email: input.email ?? null,
          phone: input.phone ?? null,
          address: input.address ?? null,
          category: input.category ?? null,
          notes: input.notes ?? null,
          status: input.status,
          is_active: input.isActive ?? true,
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });
      return mapSupplierRecord(supplier);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new SupplierError(409, "SUPPLIER_CONFLICT", "duplicate_name", "A supplier with this name already exists.");
      }
      throw error;
    }
  }

  async list(input: ListSupplierInput): Promise<ListSupplierResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.supplier.findMany({ where, orderBy: [{ created_at: "desc" }], take: input.limit, skip: input.offset }),
      this.client.supplier.count({ where }),
    ]);
    return { items: items.map(mapSupplierRecord), total, limit: input.limit, offset: input.offset };
  }

  async findById(tenantId: string, supplierId: string): Promise<Supplier | undefined> {
    const supplier = await this.client.supplier.findFirst({ where: { tenant_id: tenantId, id: supplierId } });
    return supplier ? mapSupplierRecord(supplier) : undefined;
  }

  async update(input: UpdateSupplierInput): Promise<Supplier | undefined> {
    try {
      const updated = await this.client.supplier.updateManyAndReturn({
        where: { tenant_id: input.tenantId, id: input.supplierId },
        data: compactRecord({
          name: input.name,
          document: nullable(input.document),
          email: nullable(input.email),
          phone: nullable(input.phone),
          address: nullable(input.address),
          category: nullable(input.category),
          notes: nullable(input.notes),
          status: input.status,
          is_active: input.isActive,
          updated_by: nullable(input.updatedBy),
        }),
      });
      return updated[0] ? mapSupplierRecord(updated[0]) : undefined;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new SupplierError(409, "SUPPLIER_CONFLICT", "duplicate_name", "A supplier with this name already exists.");
      }
      throw error;
    }
  }
}

export class RlsPrismaSupplierRepository implements SupplierRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateSupplierInput): Promise<Supplier> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaSupplierRepository(tx).create(input));
  }

  list(input: ListSupplierInput): Promise<ListSupplierResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaSupplierRepository(tx).list(input));
  }

  findById(tenantId: string, supplierId: string): Promise<Supplier | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaSupplierRepository(tx).findById(tenantId, supplierId));
  }

  update(input: UpdateSupplierInput): Promise<Supplier | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaSupplierRepository(tx).update(input));
  }
}

export async function createPrismaSupplierRepository(): Promise<RlsPrismaSupplierRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaSupplierRepository(prisma);
}

function buildWhere(input: ListSupplierInput): Prisma.SupplierWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { document: { contains: input.search, mode: "insensitive" } },
            { category: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function mapSupplierRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly name: string;
  readonly document: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly address: string | null;
  readonly category: string | null;
  readonly notes: string | null;
  readonly status: string;
  readonly is_active: boolean;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): Supplier {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    name: record.name,
    document: record.document ?? undefined,
    email: record.email ?? undefined,
    phone: record.phone ?? undefined,
    address: record.address ?? undefined,
    category: record.category ?? undefined,
    notes: record.notes ?? undefined,
    status: record.status,
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
