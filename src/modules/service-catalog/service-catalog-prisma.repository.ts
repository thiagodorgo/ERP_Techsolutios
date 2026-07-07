import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  ServiceCatalog,
  CreateServiceCatalogInput,
  ListServiceCatalogInput,
  ListServiceCatalogResult,
  UpdateServiceCatalogInput,
} from "./service-catalog.types.js";
import { ServiceCatalogError } from "./service-catalog.types.js";
import type { ServiceCatalogRepository } from "./service-catalog.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaServiceCatalogRepository implements ServiceCatalogRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateServiceCatalogInput): Promise<ServiceCatalog> {
    try {
      const service = await this.client.serviceCatalog.create({
        data: {
          tenant_id: input.tenantId,
          name: input.name,
          description: input.description ?? null,
          category: input.category ?? null,
          estimated_duration_minutes: input.estimatedDurationMinutes ?? null,
          base_price: input.basePrice ?? null,
          status: input.status || "active",
          is_active: input.isActive ?? true,
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });

      return mapServiceCatalogRecord(service);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ServiceCatalogError(409, "SERVICE_CATALOG_CONFLICT", "duplicate_name", "A service with this name already exists.");
      }

      throw error;
    }
  }

  async list(input: ListServiceCatalogInput): Promise<ListServiceCatalogResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.serviceCatalog.findMany({
        where,
        orderBy: [{ created_at: "desc" }],
        take: input.limit,
        skip: input.offset,
      }),
      this.client.serviceCatalog.count({ where }),
    ]);

    return {
      items: items.map(mapServiceCatalogRecord),
      total,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, serviceId: string): Promise<ServiceCatalog | undefined> {
    const service = await this.client.serviceCatalog.findFirst({
      where: {
        tenant_id: tenantId,
        id: serviceId,
      },
    });

    return service ? mapServiceCatalogRecord(service) : undefined;
  }

  async update(input: UpdateServiceCatalogInput): Promise<ServiceCatalog | undefined> {
    try {
      const updated = await this.client.serviceCatalog.updateManyAndReturn({
        where: {
          tenant_id: input.tenantId,
          id: input.serviceId,
        },
        data: compactRecord({
          name: input.name,
          description: nullable(input.description),
          category: nullable(input.category),
          estimated_duration_minutes: nullable(input.estimatedDurationMinutes),
          base_price: nullable(input.basePrice),
          status: input.status,
          is_active: input.isActive,
          updated_by: nullable(input.updatedBy),
        }),
      });

      return updated[0] ? mapServiceCatalogRecord(updated[0]) : undefined;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ServiceCatalogError(409, "SERVICE_CATALOG_CONFLICT", "duplicate_name", "A service with this name already exists.");
      }

      throw error;
    }
  }
}

export class RlsPrismaServiceCatalogRepository implements ServiceCatalogRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateServiceCatalogInput): Promise<ServiceCatalog> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaServiceCatalogRepository(tx).create(input));
  }

  list(input: ListServiceCatalogInput): Promise<ListServiceCatalogResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaServiceCatalogRepository(tx).list(input));
  }

  findById(tenantId: string, serviceId: string): Promise<ServiceCatalog | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaServiceCatalogRepository(tx).findById(tenantId, serviceId));
  }

  update(input: UpdateServiceCatalogInput): Promise<ServiceCatalog | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaServiceCatalogRepository(tx).update(input));
  }
}

export async function createPrismaServiceCatalogRepository(): Promise<RlsPrismaServiceCatalogRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaServiceCatalogRepository(prisma);
}

function buildWhere(input: ListServiceCatalogInput): Prisma.ServiceCatalogWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { category: { contains: input.search, mode: "insensitive" } },
            { description: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function mapServiceCatalogRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly name: string;
  readonly description: string | null;
  readonly category: string | null;
  readonly estimated_duration_minutes: number | null;
  readonly base_price: Prisma.Decimal | null;
  readonly status: string;
  readonly is_active: boolean;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): ServiceCatalog {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    name: record.name,
    description: record.description ?? undefined,
    category: record.category ?? undefined,
    estimatedDurationMinutes: record.estimated_duration_minutes ?? undefined,
    basePrice: record.base_price == null ? undefined : Number(record.base_price),
    status: record.status,
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
