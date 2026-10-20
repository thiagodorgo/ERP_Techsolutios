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

  // B-SAN3-02 (D1/D2) — SELECT … ORDER BY created_at, id FOR UPDATE dos itens faturáveis, na transação corrente.
  // O Postgres aplica o ORDER BY ANTES de travar (docs PG 16, SELECT → The Locking Clause), então as travas seguem
  // a ordem total (created_at, id) — a mesma do softDeleteAllByWorkOrder. Sob READ COMMITTED, quem bloqueia aqui
  // re-avalia o WHERE contra a versão nova da linha (EvalPlanQual): item apagado ou carimbado por quem venceu a
  // trava sai do conjunto. A Σ do título vem deste conjunto. As colunas são relidas pelo cliente tipado (Decimal
  // mapeado como nos irmãos), já sob a trava desta transação.
  async listInvoiceableByWorkOrderForUpdate(tenantId: string, workOrderId: string): Promise<readonly WorkOrderFinancialItem[]> {
    const locked = await this.client.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM work_order_financial_items
       WHERE tenant_id = ${tenantId}::uuid
         AND work_order_id = ${workOrderId}::uuid
         AND deleted_at IS NULL
         AND invoiced_at IS NULL
       ORDER BY created_at, id
         FOR UPDATE
    `;
    if (locked.length === 0) return [];
    const items = await this.client.workOrderFinancialItem.findMany({
      where: {
        tenant_id: tenantId,
        work_order_id: workOrderId,
        id: { in: locked.map((row) => row.id) },
        deleted_at: null,
        invoiced_at: null,
      },
      orderBy: [{ created_at: "asc" }, { id: "asc" }],
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
      // B-SAN3-02 (D2, P2) — CAS: `invoiced_at IS NULL` no WHERE. O PATCH que perde a corrida para o faturamento
      // re-avalia o predicado contra a linha carimbada e casa 0 linhas (o serviço relê → 422 item_invoiced).
      const updated = await this.client.workOrderFinancialItem.updateManyAndReturn({
        where: { tenant_id: input.tenantId, work_order_id: input.workOrderId, id: input.itemId, deleted_at: null, invoiced_at: null },
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
    // B-SAN3-02 (D2, P2) — CAS: `invoiced_at IS NULL` no WHERE (item carimbado nunca é apagado, mesmo que o
    // pré-check do serviço tenha passado antes do faturamento commitar).
    const updated = await this.client.workOrderFinancialItem.updateManyAndReturn({
      where: { tenant_id: tenantId, work_order_id: workOrderId, id: itemId, deleted_at: null, invoiced_at: null },
      data: compactRecord({ deleted_at: new Date(), updated_by: deletedBy }),
    });
    return updated[0] ? mapRecord(updated[0]) : undefined;
  }

  // P-Ω3F6-ZERO-ATOMICIDADE — carimba deleted_at em TODOS os itens ATIVOS e NÃO-FATURADOS da OS (o `zero` do
  // cancel), na transação corrente. invoiced_at IS NULL preserva o lastro de Título (D-Ω4-C1).
  // B-SAN3-02 (D2, A4) — mesma ORDEM TOTAL de travas do faturamento: (i) `SELECT … ORDER BY created_at, id FOR
  // UPDATE` trava as linhas na ordem (created_at, id); (ii) o UPDATE toca só as linhas que (i) travou. Um UPDATE
  // multi-linha sem ordem travaria na ordem de varredura e podia cruzar com o faturamento (ciclo → 40P01). Contrato
  // e retorno inalterados.
  async softDeleteAllByWorkOrder(tenantId: string, workOrderId: string, deletedBy?: string): Promise<number> {
    const locked = await this.client.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM work_order_financial_items
       WHERE tenant_id = ${tenantId}::uuid
         AND work_order_id = ${workOrderId}::uuid
         AND deleted_at IS NULL
         AND invoiced_at IS NULL
       ORDER BY created_at, id
         FOR UPDATE
    `;
    if (locked.length === 0) return 0;
    const result = await this.client.workOrderFinancialItem.updateMany({
      where: {
        tenant_id: tenantId,
        work_order_id: workOrderId,
        id: { in: locked.map((row) => row.id) },
        deleted_at: null,
        invoiced_at: null,
      },
      data: compactRecord({ deleted_at: new Date(), updated_by: deletedBy }),
    });
    return result.count;
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
  // Standalone a trava vale só até o commit imediato; o uso REAL é via a porta UoW (tx da unidade de faturamento).
  listInvoiceableByWorkOrderForUpdate(tenantId: string, workOrderId: string): Promise<readonly WorkOrderFinancialItem[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaWorkOrderFinancialItemRepository(tx).listInvoiceableByWorkOrderForUpdate(tenantId, workOrderId));
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
  softDeleteAllByWorkOrder(tenantId: string, workOrderId: string, deletedBy?: string): Promise<number> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaWorkOrderFinancialItemRepository(tx).softDeleteAllByWorkOrder(tenantId, workOrderId, deletedBy));
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
