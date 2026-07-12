import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  Tariff,
  CreateTariffInput,
  ListTariffInput,
  ListTariffResult,
  UpdateTariffInput,
} from "./tariff.types.js";
import { TariffError } from "./tariff.types.js";
import type { TariffRepository } from "./tariff.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaTariffRepository implements TariffRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateTariffInput): Promise<Tariff> {
    try {
      const tariff = await this.client.tariff.create({
        data: {
          tenant_id: input.tenantId,
          price_table_id: input.priceTableId,
          service_catalog_id: input.serviceCatalogId ?? null,
          customer_id: input.customerId ?? null,
          name: input.name ?? null,
          unit_price: input.unitPrice,
          currency: input.currency,
          origin: input.origin,
          rule: input.rule ?? null,
          valid_from: input.validFrom ?? null,
          valid_to: input.validTo ?? null,
          status: input.status,
          is_active: input.isActive ?? true,
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });
      return mapTariffRecord(tariff);
    } catch (error) {
      throw translatePersistenceError(error);
    }
  }

  async list(input: ListTariffInput): Promise<ListTariffResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.tariff.findMany({ where, orderBy: [{ created_at: "desc" }], take: input.limit, skip: input.offset }),
      this.client.tariff.count({ where }),
    ]);
    return { items: items.map(mapTariffRecord), total, limit: input.limit, offset: input.offset };
  }

  async findById(tenantId: string, tariffId: string): Promise<Tariff | undefined> {
    const tariff = await this.client.tariff.findFirst({ where: { tenant_id: tenantId, id: tariffId } });
    return tariff ? mapTariffRecord(tariff) : undefined;
  }

  async update(input: UpdateTariffInput): Promise<Tariff | undefined> {
    try {
      const updated = await this.client.tariff.updateManyAndReturn({
        where: { tenant_id: input.tenantId, id: input.tariffId },
        data: compactRecord({
          name: nullable(input.name),
          unit_price: input.unitPrice,
          currency: input.currency,
          origin: input.origin,
          rule: nullable(input.rule),
          valid_from: nullable(input.validFrom),
          valid_to: nullable(input.validTo),
          status: input.status,
          is_active: input.isActive,
          updated_by: nullable(input.updatedBy),
        }),
      });
      return updated[0] ? mapTariffRecord(updated[0]) : undefined;
    } catch (error) {
      throw translatePersistenceError(error);
    }
  }
}

export class RlsPrismaTariffRepository implements TariffRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateTariffInput): Promise<Tariff> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaTariffRepository(tx).create(input));
  }

  list(input: ListTariffInput): Promise<ListTariffResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaTariffRepository(tx).list(input));
  }

  findById(tenantId: string, tariffId: string): Promise<Tariff | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaTariffRepository(tx).findById(tenantId, tariffId));
  }

  update(input: UpdateTariffInput): Promise<Tariff | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaTariffRepository(tx).update(input));
  }
}

export async function createPrismaTariffRepository(): Promise<RlsPrismaTariffRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaTariffRepository(prisma);
}

function buildWhere(input: ListTariffInput): Prisma.TariffWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.priceTableId !== undefined ? { price_table_id: input.priceTableId } : {}),
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { origin: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function mapTariffRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly price_table_id: string;
  readonly service_catalog_id: string | null;
  readonly customer_id: string | null;
  readonly name: string | null;
  readonly unit_price: Prisma.Decimal;
  readonly currency: string;
  readonly origin: string;
  readonly rule: string | null;
  readonly valid_from: Date | null;
  readonly valid_to: Date | null;
  readonly status: string;
  readonly is_active: boolean;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): Tariff {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    priceTableId: record.price_table_id,
    serviceCatalogId: record.service_catalog_id ?? undefined,
    customerId: record.customer_id ?? undefined,
    name: record.name ?? undefined,
    unitPrice: Number(record.unit_price),
    currency: record.currency,
    origin: record.origin,
    rule: record.rule ?? undefined,
    validFrom: record.valid_from ?? undefined,
    validTo: record.valid_to ?? undefined,
    status: record.status,
    isActive: record.is_active,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

// P2002 (índice único natural-key) → 409 duplicate_tariff. P2003 (FK inválida — price_table/
// service_catalog/customer inexistente ou de outro tenant) → 400 com a referência específica.
function translatePersistenceError(error: unknown): unknown {
  if (isPrismaError(error, "P2002")) {
    return new TariffError(409, "TARIFF_CONFLICT", "duplicate_tariff", "A tariff with this natural key already exists.");
  }
  if (isPrismaError(error, "P2003")) {
    const target = foreignKeyTarget(error);
    if (target.includes("price_table")) {
      return new TariffError(400, "TARIFF_INVALID", "invalid_price_table_reference", "The referenced price table does not exist for this tenant.");
    }
    if (target.includes("service_catalog")) {
      return new TariffError(400, "TARIFF_INVALID", "invalid_service_catalog_reference", "The referenced service does not exist for this tenant.");
    }
    if (target.includes("customer")) {
      return new TariffError(400, "TARIFF_INVALID", "invalid_customer_reference", "The referenced customer does not exist for this tenant.");
    }
    return new TariffError(400, "TARIFF_INVALID", "invalid_reference", "A referenced record does not exist for this tenant.");
  }
  return error;
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { readonly code?: unknown }).code === code;
}

function foreignKeyTarget(error: unknown): string {
  const meta = (error as { readonly meta?: Record<string, unknown> }).meta ?? {};
  return Object.values(meta).map((value) => String(value)).join(" ").toLowerCase();
}

function nullable<T>(value: T | undefined): T | null | undefined {
  return value === undefined ? undefined : value ?? null;
}

function compactRecord<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
