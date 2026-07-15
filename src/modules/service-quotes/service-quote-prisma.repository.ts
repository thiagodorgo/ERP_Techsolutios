import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  ServiceQuote,
  CreateServiceQuoteInput,
  ListServiceQuoteInput,
  ListServiceQuoteResult,
  UpdateServiceQuoteInput,
} from "./service-quote.types.js";
import { ServiceQuoteError } from "./service-quote.types.js";
import type { ServiceQuoteRepository } from "./service-quote.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaServiceQuoteRepository implements ServiceQuoteRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateServiceQuoteInput): Promise<ServiceQuote> {
    try {
      const quote = await this.client.serviceQuote.create({
        data: {
          tenant_id: input.tenantId,
          work_order_id: input.workOrderId ?? null,
          customer_id: input.customerId ?? null,
          service_catalog_id: input.serviceCatalogId,
          source_tariff_id: input.sourceTariffId ?? null,
          source_price_table_id: input.sourcePriceTableId ?? null,
          frozen_unit_price: input.frozenUnitPrice,
          frozen_currency: input.frozenCurrency,
          quantity: input.quantity,
          frozen_total: input.frozenTotal,
          frozen_at: input.frozenAt,
          price_source: input.priceSource,
          status: input.status,
          is_active: input.isActive ?? true,
          notes: input.notes ?? null,
          number: input.number ?? null,
          issued_at: input.issuedAt ?? null,
          valid_until: input.validUntil ?? null,
          created_work_order_id: input.createdWorkOrderId ?? null,
          share_token: input.shareToken ?? null,
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });
      return mapServiceQuoteRecord(quote);
    } catch (error) {
      throw translatePersistenceError(error);
    }
  }

  async list(input: ListServiceQuoteInput): Promise<ListServiceQuoteResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.serviceQuote.findMany({ where, orderBy: [{ created_at: "desc" }], take: input.limit, skip: input.offset }),
      this.client.serviceQuote.count({ where }),
    ]);
    return { items: items.map(mapServiceQuoteRecord), total, limit: input.limit, offset: input.offset };
  }

  async findById(tenantId: string, serviceQuoteId: string): Promise<ServiceQuote | undefined> {
    const quote = await this.client.serviceQuote.findFirst({ where: { tenant_id: tenantId, id: serviceQuoteId } });
    return quote ? mapServiceQuoteRecord(quote) : undefined;
  }

  // CAS no banco: UPDATE ... WHERE status='draft' AND created_work_order_id IS NULL. A cláusula WHERE é
  // a guarda atômica — sob concorrência estrita só UMA transação afeta a linha; as demais recebem 0 e
  // retornam undefined (→ 409, sem criar OS). Fecha a janela TOCTOU do approve (condição critico J-Ω3F-4B).
  async claimForApproval(tenantId: string, serviceQuoteId: string): Promise<ServiceQuote | undefined> {
    const rows = await this.client.serviceQuote.updateManyAndReturn({
      where: { tenant_id: tenantId, id: serviceQuoteId, status: "draft", created_work_order_id: null },
      data: { status: "approved", updated_at: new Date() },
    });
    return rows[0] ? mapServiceQuoteRecord(rows[0]) : undefined;
  }

  async update(input: UpdateServiceQuoteInput): Promise<ServiceQuote | undefined> {
    try {
      const updated = await this.client.serviceQuote.updateManyAndReturn({
        where: { tenant_id: input.tenantId, id: input.serviceQuoteId },
        data: compactRecord({
          quantity: input.quantity,
          frozen_total: input.frozenTotal,
          notes: nullable(input.notes),
          status: input.status,
          is_active: input.isActive,
          number: nullable(input.number),
          issued_at: input.issuedAt,
          valid_until: input.validUntil,
          created_work_order_id: input.createdWorkOrderId,
          share_token: input.shareToken,
          updated_by: nullable(input.updatedBy),
        }),
      });
      return updated[0] ? mapServiceQuoteRecord(updated[0]) : undefined;
    } catch (error) {
      throw translatePersistenceError(error);
    }
  }
}

export class RlsPrismaServiceQuoteRepository implements ServiceQuoteRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateServiceQuoteInput): Promise<ServiceQuote> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaServiceQuoteRepository(tx).create(input));
  }

  list(input: ListServiceQuoteInput): Promise<ListServiceQuoteResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaServiceQuoteRepository(tx).list(input));
  }

  findById(tenantId: string, serviceQuoteId: string): Promise<ServiceQuote | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaServiceQuoteRepository(tx).findById(tenantId, serviceQuoteId));
  }

  update(input: UpdateServiceQuoteInput): Promise<ServiceQuote | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaServiceQuoteRepository(tx).update(input));
  }

  claimForApproval(tenantId: string, serviceQuoteId: string): Promise<ServiceQuote | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaServiceQuoteRepository(tx).claimForApproval(tenantId, serviceQuoteId));
  }
}

export async function createPrismaServiceQuoteRepository(): Promise<RlsPrismaServiceQuoteRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaServiceQuoteRepository(prisma);
}

function buildWhere(input: ListServiceQuoteInput): Prisma.ServiceQuoteWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.workOrderId !== undefined ? { work_order_id: input.workOrderId } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    ...(input.search
      ? {
          OR: [
            { notes: { contains: input.search, mode: "insensitive" } },
            { status: { contains: input.search, mode: "insensitive" } },
            { price_source: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function mapServiceQuoteRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly work_order_id: string | null;
  readonly customer_id: string | null;
  readonly service_catalog_id: string;
  readonly source_tariff_id: string | null;
  readonly source_price_table_id: string | null;
  readonly frozen_unit_price: Prisma.Decimal;
  readonly frozen_currency: string;
  readonly quantity: Prisma.Decimal;
  readonly frozen_total: Prisma.Decimal;
  readonly frozen_at: Date;
  readonly price_source: string;
  readonly status: string;
  readonly is_active: boolean;
  readonly notes: string | null;
  readonly number: string | null;
  readonly issued_at: Date | null;
  readonly valid_until: Date | null;
  readonly created_work_order_id: string | null;
  readonly share_token: string | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): ServiceQuote {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    workOrderId: record.work_order_id ?? undefined,
    customerId: record.customer_id ?? undefined,
    serviceCatalogId: record.service_catalog_id,
    sourceTariffId: record.source_tariff_id ?? undefined,
    sourcePriceTableId: record.source_price_table_id ?? undefined,
    frozenUnitPrice: Number(record.frozen_unit_price),
    frozenCurrency: record.frozen_currency,
    quantity: Number(record.quantity),
    frozenTotal: Number(record.frozen_total),
    frozenAt: record.frozen_at,
    priceSource: record.price_source,
    status: record.status,
    isActive: record.is_active,
    notes: record.notes ?? undefined,
    number: record.number ?? undefined,
    issuedAt: record.issued_at ?? undefined,
    validUntil: record.valid_until ?? undefined,
    createdWorkOrderId: record.created_work_order_id ?? undefined,
    shareToken: record.share_token ?? undefined,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

// P2002 (índice único parcial da chave natural ativa) → 409 duplicate_quote_for_service.
// P2003 (FK inválida — work_order/customer/service_catalog/tariff/price_table inexistente ou de
// outro tenant) → 400 com a referência específica.
function translatePersistenceError(error: unknown): unknown {
  if (isPrismaError(error, "P2002")) {
    return new ServiceQuoteError(409, "SERVICE_QUOTE_CONFLICT", "duplicate_quote_for_service", "An active quote already exists for this work order and service.");
  }
  if (isPrismaError(error, "P2003")) {
    const target = foreignKeyTarget(error);
    if (target.includes("work_order")) {
      return new ServiceQuoteError(400, "SERVICE_QUOTE_INVALID", "invalid_work_order_reference", "The referenced work order does not exist for this tenant.");
    }
    if (target.includes("service_catalog")) {
      return new ServiceQuoteError(400, "SERVICE_QUOTE_INVALID", "invalid_service_reference", "The referenced service does not exist for this tenant.");
    }
    if (target.includes("customer")) {
      return new ServiceQuoteError(400, "SERVICE_QUOTE_INVALID", "invalid_customer_reference", "The referenced customer does not exist for this tenant.");
    }
    if (target.includes("tariff")) {
      return new ServiceQuoteError(400, "SERVICE_QUOTE_INVALID", "invalid_tariff_reference", "The referenced tariff does not exist for this tenant.");
    }
    if (target.includes("price_table")) {
      return new ServiceQuoteError(400, "SERVICE_QUOTE_INVALID", "invalid_price_table_reference", "The referenced price table does not exist for this tenant.");
    }
    return new ServiceQuoteError(400, "SERVICE_QUOTE_INVALID", "invalid_reference", "A referenced record does not exist for this tenant.");
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
