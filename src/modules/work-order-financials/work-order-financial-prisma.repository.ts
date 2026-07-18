import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  CreateWorkOrderFinancialItemInput,
  MarkWorkOrderFinancialItemsInvoicedInput,
  UpdateWorkOrderFinancialItemInput,
  WorkOrderFinancialItem,
} from "./work-order-financial.types.js";
import { WorkOrderFinancialError } from "./work-order-financial.types.js";
import { duplicateFinancialItemError, type WorkOrderFinancialItemRepository } from "./work-order-financial.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaWorkOrderFinancialItemRepository implements WorkOrderFinancialItemRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateWorkOrderFinancialItemInput): Promise<WorkOrderFinancialItem> {
    try {
      const record = await this.client.workOrderFinancialItem.create({
        data: {
          tenant_id: input.tenantId,
          work_order_id: input.workOrderId,
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

  async listByWorkOrder(tenantId: string, workOrderId: string): Promise<readonly WorkOrderFinancialItem[]> {
    const items = await this.client.workOrderFinancialItem.findMany({
      where: { tenant_id: tenantId, work_order_id: workOrderId, deleted_at: null },
      orderBy: [{ created_at: "asc" }],
    });
    return items.map(mapRecord);
  }

  async listInvoiceableByWorkOrder(tenantId: string, workOrderId: string): Promise<readonly WorkOrderFinancialItem[]> {
    const items = await this.client.workOrderFinancialItem.findMany({
      where: { tenant_id: tenantId, work_order_id: workOrderId, deleted_at: null, invoiced_at: null },
      orderBy: [{ created_at: "asc" }],
    });
    return items.map(mapRecord);
  }

  async findById(tenantId: string, workOrderId: string, itemId: string): Promise<WorkOrderFinancialItem | undefined> {
    const record = await this.client.workOrderFinancialItem.findFirst({
      where: { tenant_id: tenantId, work_order_id: workOrderId, id: itemId, deleted_at: null },
    });
    return record ? mapRecord(record) : undefined;
  }

  async findActiveByClientActionId(tenantId: string, workOrderId: string, clientActionId: string): Promise<WorkOrderFinancialItem | undefined> {
    const record = await this.client.workOrderFinancialItem.findFirst({
      where: { tenant_id: tenantId, work_order_id: workOrderId, client_action_id: clientActionId, deleted_at: null },
    });
    return record ? mapRecord(record) : undefined;
  }

  async update(input: UpdateWorkOrderFinancialItemInput): Promise<WorkOrderFinancialItem | undefined> {
    try {
      const updated = await this.client.workOrderFinancialItem.updateManyAndReturn({
        where: { tenant_id: input.tenantId, work_order_id: input.workOrderId, id: input.itemId, deleted_at: null },
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

  async softDelete(tenantId: string, workOrderId: string, itemId: string, deletedBy?: string): Promise<WorkOrderFinancialItem | undefined> {
    // Delete LÓGICO: carimba deleted_at; a row persiste mas some dos reads e do total agregado.
    const updated = await this.client.workOrderFinancialItem.updateManyAndReturn({
      where: { tenant_id: tenantId, work_order_id: workOrderId, id: itemId, deleted_at: null },
      data: compactRecord({ deleted_at: new Date(), updated_by: deletedBy }),
    });
    return updated[0] ? mapRecord(updated[0]) : undefined;
  }

  async markInvoiced(input: MarkWorkOrderFinancialItemsInvoicedInput): Promise<number> {
    if (input.itemIds.length === 0) return 0;
    // Carimba SÓ itens ativos e ainda não-faturados (invoiced_at:null): idempotente no replay e não
    // sobrescreve um faturamento anterior. tenant+work_order no where blindam o isolamento.
    const result = await this.client.workOrderFinancialItem.updateMany({
      where: {
        tenant_id: input.tenantId,
        work_order_id: input.workOrderId,
        id: { in: [...input.itemIds] },
        deleted_at: null,
        invoiced_at: null,
      },
      data: compactRecord({ invoiced_at: input.invoicedAt, title_id: input.titleId, updated_by: input.updatedBy }),
    });
    return result.count;
  }
}

export class RlsPrismaWorkOrderFinancialItemRepository implements WorkOrderFinancialItemRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateWorkOrderFinancialItemInput): Promise<WorkOrderFinancialItem> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaWorkOrderFinancialItemRepository(tx).create(input));
  }
  listByWorkOrder(tenantId: string, workOrderId: string): Promise<readonly WorkOrderFinancialItem[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaWorkOrderFinancialItemRepository(tx).listByWorkOrder(tenantId, workOrderId));
  }
  listInvoiceableByWorkOrder(tenantId: string, workOrderId: string): Promise<readonly WorkOrderFinancialItem[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaWorkOrderFinancialItemRepository(tx).listInvoiceableByWorkOrder(tenantId, workOrderId));
  }
  findById(tenantId: string, workOrderId: string, itemId: string): Promise<WorkOrderFinancialItem | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaWorkOrderFinancialItemRepository(tx).findById(tenantId, workOrderId, itemId));
  }
  findActiveByClientActionId(tenantId: string, workOrderId: string, clientActionId: string): Promise<WorkOrderFinancialItem | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaWorkOrderFinancialItemRepository(tx).findActiveByClientActionId(tenantId, workOrderId, clientActionId));
  }
  update(input: UpdateWorkOrderFinancialItemInput): Promise<WorkOrderFinancialItem | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaWorkOrderFinancialItemRepository(tx).update(input));
  }
  softDelete(tenantId: string, workOrderId: string, itemId: string, deletedBy?: string): Promise<WorkOrderFinancialItem | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaWorkOrderFinancialItemRepository(tx).softDelete(tenantId, workOrderId, itemId, deletedBy));
  }
  markInvoiced(input: MarkWorkOrderFinancialItemsInvoicedInput): Promise<number> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaWorkOrderFinancialItemRepository(tx).markInvoiced(input));
  }
}

export async function createPrismaWorkOrderFinancialItemRepository(): Promise<RlsPrismaWorkOrderFinancialItemRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaWorkOrderFinancialItemRepository(prisma);
}

function mapRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly work_order_id: string;
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
  readonly invoiced_at: Date | null;
  readonly title_id: string | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly deleted_at: Date | null;
}): WorkOrderFinancialItem {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    workOrderId: record.work_order_id,
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
    invoicedAt: record.invoiced_at ?? undefined,
    titleId: record.title_id ?? undefined,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    deletedAt: record.deleted_at ?? undefined,
  };
}

// P2002 (unique PARCIAL de idempotência) → 409 duplicate_financial_item (a constraint é a rede;
// o pre-check do service é o caminho normal). P2003 (FK composta inválida — OS/tarifa/tabela
// inexistente ou de outro tenant) → 400 com a referência específica.
function translatePersistenceError(error: unknown): unknown {
  if (isPrismaError(error, "P2002")) {
    return duplicateFinancialItemError();
  }
  if (isPrismaError(error, "P2003")) {
    const target = foreignKeyTarget(error);
    if (target.includes("work_order")) {
      return new WorkOrderFinancialError(400, "WORK_ORDER_FINANCIAL_INVALID", "invalid_work_order_reference", "The referenced work order does not exist for this tenant.");
    }
    if (target.includes("price_table")) {
      return new WorkOrderFinancialError(400, "WORK_ORDER_FINANCIAL_INVALID", "invalid_price_table_reference", "The referenced price table does not exist for this tenant.");
    }
    if (target.includes("tariff")) {
      return new WorkOrderFinancialError(400, "WORK_ORDER_FINANCIAL_INVALID", "invalid_tariff_reference", "The referenced tariff does not exist for this tenant.");
    }
    return new WorkOrderFinancialError(400, "WORK_ORDER_FINANCIAL_INVALID", "invalid_reference", "A referenced record does not exist for this tenant.");
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
