import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  CreateServiceQuoteItemInput,
  UpdateServiceQuoteItemInput,
  ServiceQuoteItem,
} from "./service-quote-item.types.js";
import { ServiceQuoteItemError } from "./service-quote-item.types.js";
import { duplicateQuoteItemError, type ServiceQuoteItemRepository } from "./service-quote-item.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaServiceQuoteItemRepository implements ServiceQuoteItemRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateServiceQuoteItemInput): Promise<ServiceQuoteItem> {
    try {
      const record = await this.client.serviceQuoteItem.create({
        data: {
          tenant_id: input.tenantId,
          service_quote_id: input.serviceQuoteId,
          tariff_id: input.tariffId ?? null,
          price_table_id: input.priceTableId ?? null,
          description: input.description,
          quantity: input.quantity,
          unit_amount: input.unitAmount,
          total_amount: input.totalAmount,
          currency: input.currency,
          source: input.source,
          notes: input.notes ?? null,
          client_action_id: input.clientActionId ?? null,
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });
      return mapRecord(record);
    } catch (error) {
      throw translatePersistenceError(error);
    }
  }

  async listByQuote(tenantId: string, serviceQuoteId: string): Promise<readonly ServiceQuoteItem[]> {
    const items = await this.client.serviceQuoteItem.findMany({
      where: { tenant_id: tenantId, service_quote_id: serviceQuoteId, deleted_at: null },
      orderBy: [{ created_at: "asc" }],
    });
    return items.map(mapRecord);
  }

  async findById(tenantId: string, serviceQuoteId: string, itemId: string): Promise<ServiceQuoteItem | undefined> {
    const record = await this.client.serviceQuoteItem.findFirst({
      where: { tenant_id: tenantId, service_quote_id: serviceQuoteId, id: itemId, deleted_at: null },
    });
    return record ? mapRecord(record) : undefined;
  }

  async findActiveByClientActionId(tenantId: string, serviceQuoteId: string, clientActionId: string): Promise<ServiceQuoteItem | undefined> {
    const record = await this.client.serviceQuoteItem.findFirst({
      where: { tenant_id: tenantId, service_quote_id: serviceQuoteId, client_action_id: clientActionId, deleted_at: null },
    });
    return record ? mapRecord(record) : undefined;
  }

  async update(input: UpdateServiceQuoteItemInput): Promise<ServiceQuoteItem | undefined> {
    try {
      const updated = await this.client.serviceQuoteItem.updateManyAndReturn({
        where: { tenant_id: input.tenantId, service_quote_id: input.serviceQuoteId, id: input.itemId, deleted_at: null },
        data: compactRecord({
          description: input.description,
          quantity: input.quantity,
          unit_amount: input.unitAmount,
          total_amount: input.totalAmount,
          notes: nullable(input.notes),
          updated_by: nullable(input.updatedBy),
        }),
      });
      return updated[0] ? mapRecord(updated[0]) : undefined;
    } catch (error) {
      throw translatePersistenceError(error);
    }
  }

  async softDelete(tenantId: string, serviceQuoteId: string, itemId: string, deletedBy?: string): Promise<ServiceQuoteItem | undefined> {
    // Delete LÓGICO: carimba deleted_at; a row persiste mas some dos reads e do total agregado.
    const updated = await this.client.serviceQuoteItem.updateManyAndReturn({
      where: { tenant_id: tenantId, service_quote_id: serviceQuoteId, id: itemId, deleted_at: null },
      data: compactRecord({ deleted_at: new Date(), updated_by: deletedBy }),
    });
    return updated[0] ? mapRecord(updated[0]) : undefined;
  }
}

export class RlsPrismaServiceQuoteItemRepository implements ServiceQuoteItemRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateServiceQuoteItemInput): Promise<ServiceQuoteItem> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaServiceQuoteItemRepository(tx).create(input));
  }
  listByQuote(tenantId: string, serviceQuoteId: string): Promise<readonly ServiceQuoteItem[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaServiceQuoteItemRepository(tx).listByQuote(tenantId, serviceQuoteId));
  }
  findById(tenantId: string, serviceQuoteId: string, itemId: string): Promise<ServiceQuoteItem | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaServiceQuoteItemRepository(tx).findById(tenantId, serviceQuoteId, itemId));
  }
  findActiveByClientActionId(tenantId: string, serviceQuoteId: string, clientActionId: string): Promise<ServiceQuoteItem | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaServiceQuoteItemRepository(tx).findActiveByClientActionId(tenantId, serviceQuoteId, clientActionId));
  }
  update(input: UpdateServiceQuoteItemInput): Promise<ServiceQuoteItem | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaServiceQuoteItemRepository(tx).update(input));
  }
  softDelete(tenantId: string, serviceQuoteId: string, itemId: string, deletedBy?: string): Promise<ServiceQuoteItem | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaServiceQuoteItemRepository(tx).softDelete(tenantId, serviceQuoteId, itemId, deletedBy));
  }
}

export async function createPrismaServiceQuoteItemRepository(): Promise<RlsPrismaServiceQuoteItemRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaServiceQuoteItemRepository(prisma);
}

function mapRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly service_quote_id: string;
  readonly tariff_id: string | null;
  readonly price_table_id: string | null;
  readonly description: string;
  readonly quantity: Prisma.Decimal;
  readonly unit_amount: Prisma.Decimal;
  readonly total_amount: Prisma.Decimal;
  readonly currency: string;
  readonly source: string;
  readonly notes: string | null;
  readonly client_action_id: string | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly deleted_at: Date | null;
}): ServiceQuoteItem {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    serviceQuoteId: record.service_quote_id,
    tariffId: record.tariff_id ?? undefined,
    priceTableId: record.price_table_id ?? undefined,
    description: record.description,
    quantity: Number(record.quantity),
    unitAmount: Number(record.unit_amount),
    totalAmount: Number(record.total_amount),
    currency: record.currency,
    source: record.source,
    notes: record.notes ?? undefined,
    clientActionId: record.client_action_id ?? undefined,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    deletedAt: record.deleted_at ?? undefined,
  };
}

// P2002 (unique PARCIAL de idempotência) → 409 duplicate_quote_item (a constraint é a rede; o
// pre-check do service é o caminho normal). P2003 (FK composta inválida — orçamento/tarifa/tabela
// inexistente ou de outro tenant) → 400 com a referência específica.
function translatePersistenceError(error: unknown): unknown {
  if (isPrismaError(error, "P2002")) {
    return duplicateQuoteItemError();
  }
  if (isPrismaError(error, "P2003")) {
    const target = foreignKeyTarget(error);
    if (target.includes("service_quote")) {
      return new ServiceQuoteItemError(400, "SERVICE_QUOTE_ITEM_INVALID", "invalid_service_quote_reference", "The referenced service quote does not exist for this tenant.");
    }
    if (target.includes("price_table")) {
      return new ServiceQuoteItemError(400, "SERVICE_QUOTE_ITEM_INVALID", "invalid_price_table_reference", "The referenced price table does not exist for this tenant.");
    }
    if (target.includes("tariff")) {
      return new ServiceQuoteItemError(400, "SERVICE_QUOTE_ITEM_INVALID", "invalid_tariff_reference", "The referenced tariff does not exist for this tenant.");
    }
    return new ServiceQuoteItemError(400, "SERVICE_QUOTE_ITEM_INVALID", "invalid_reference", "A referenced record does not exist for this tenant.");
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
