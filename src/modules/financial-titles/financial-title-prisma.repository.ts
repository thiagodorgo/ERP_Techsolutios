import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  ChangeFinancialTitleStatusInput,
  CreateFinancialTitleInput,
  FinancialTitle,
  ListFinancialTitleInput,
  ListFinancialTitleResult,
  UpdateFinancialTitleInput,
} from "./financial-title.types.js";
import { FinancialTitleError } from "./financial-title.types.js";
import {
  invalidAccountReferenceError,
  workOrderAlreadyInvoicedError,
  type FinancialPeriodCloseRepository,
  type FinancialTitleRepository,
} from "./financial-title.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

const NON_FINAL_EXCLUDED = ["paid", "cancelled"];

export class PrismaFinancialTitleRepository implements FinancialTitleRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateFinancialTitleInput): Promise<FinancialTitle> {
    try {
      const record = await this.client.financialTitle.create({
        data: {
          tenant_id: input.tenantId,
          direction: input.direction,
          party_type: input.partyType,
          party_id: input.partyId ?? null,
          party_name: input.partyName,
          document: input.document ?? null,
          category: input.category ?? null,
          description: input.description ?? null,
          amount: input.amount,
          currency: input.currency,
          issue_date: input.issueDate,
          due_date: input.dueDate,
          // paid_amount nasce 0 (dirigido por pagamentos no Ω4-4). work_order_id vem do faturamento (Ω4-3);
          // service_quote_id ainda NÃO tem caminho de escrita (sempre null nesta fatia).
          paid_amount: 0,
          status: input.status,
          competencia: input.competencia,
          account_id: input.accountId ?? null,
          // Ω4-3 — proveniência + âncora da idempotência parcial. Só o faturamento popula (create público: null).
          work_order_id: input.workOrderId ?? null,
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

  async list(input: ListFinancialTitleInput): Promise<ListFinancialTitleResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.financialTitle.findMany({ where, orderBy: [{ created_at: "desc" }, { id: "desc" }], take: input.limit, skip: input.offset }),
      this.client.financialTitle.count({ where }),
    ]);
    return { items: items.map(mapRecord), total, limit: input.limit, offset: input.offset };
  }

  async findById(tenantId: string, financialTitleId: string): Promise<FinancialTitle | undefined> {
    // Retorna mesmo deletado (GET e o pré-check do chokepoint decidem 404 no serviço).
    const record = await this.client.financialTitle.findFirst({ where: { tenant_id: tenantId, id: financialTitleId } });
    return record ? mapRecord(record) : undefined;
  }

  async findActiveByWorkOrder(tenantId: string, workOrderId: string, direction: string): Promise<FinancialTitle | undefined> {
    const record = await this.client.financialTitle.findFirst({
      where: { tenant_id: tenantId, work_order_id: workOrderId, direction, deleted_at: null },
    });
    return record ? mapRecord(record) : undefined;
  }

  async update(input: UpdateFinancialTitleInput): Promise<FinancialTitle | undefined> {
    try {
      const updated = await this.client.financialTitle.updateManyAndReturn({
        // deleted_at:null → PATCH em título deletado casa 0 linhas → 404 (simétrico ao softDelete).
        where: { tenant_id: input.tenantId, id: input.financialTitleId, deleted_at: null },
        data: compactRecord({
          party_name: input.partyName,
          document: nullable(input.document),
          category: nullable(input.category),
          description: nullable(input.description),
          amount: input.amount,
          due_date: input.dueDate,
          account_id: nullable(input.accountId),
          updated_by: nullable(input.updatedBy),
        }),
      });
      return updated[0] ? mapRecord(updated[0]) : undefined;
    } catch (error) {
      throw translatePersistenceError(error);
    }
  }

  async changeStatus(input: ChangeFinancialTitleStatusInput): Promise<FinancialTitle | undefined> {
    const updated = await this.client.financialTitle.updateManyAndReturn({
      where: { tenant_id: input.tenantId, id: input.financialTitleId, deleted_at: null },
      data: compactRecord({ status: input.status, updated_by: input.updatedBy }),
    });
    return updated[0] ? mapRecord(updated[0]) : undefined;
  }

  async softDelete(tenantId: string, financialTitleId: string, deletedBy?: string): Promise<FinancialTitle | undefined> {
    // Delete LÓGICO: carimba deleted_at; a row persiste mas some dos reads (deleted_at:null → re-delete 404).
    const updated = await this.client.financialTitle.updateManyAndReturn({
      where: { tenant_id: tenantId, id: financialTitleId, deleted_at: null },
      data: compactRecord({ deleted_at: new Date(), updated_by: deletedBy }),
    });
    return updated[0] ? mapRecord(updated[0]) : undefined;
  }
}

export class PrismaFinancialPeriodCloseRepository implements FinancialPeriodCloseRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async isPeriodClosed(tenantId: string, period: string): Promise<boolean> {
    const record = await this.client.financialPeriodClose.findFirst({
      where: { tenant_id: tenantId, period, status: "closed" },
      select: { id: true },
    });
    return record != null;
  }
}

export class RlsPrismaFinancialTitleRepository implements FinancialTitleRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateFinancialTitleInput): Promise<FinancialTitle> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFinancialTitleRepository(tx).create(input));
  }
  list(input: ListFinancialTitleInput): Promise<ListFinancialTitleResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFinancialTitleRepository(tx).list(input));
  }
  findById(tenantId: string, financialTitleId: string): Promise<FinancialTitle | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFinancialTitleRepository(tx).findById(tenantId, financialTitleId));
  }
  findActiveByWorkOrder(tenantId: string, workOrderId: string, direction: string): Promise<FinancialTitle | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFinancialTitleRepository(tx).findActiveByWorkOrder(tenantId, workOrderId, direction));
  }
  update(input: UpdateFinancialTitleInput): Promise<FinancialTitle | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFinancialTitleRepository(tx).update(input));
  }
  changeStatus(input: ChangeFinancialTitleStatusInput): Promise<FinancialTitle | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFinancialTitleRepository(tx).changeStatus(input));
  }
  softDelete(tenantId: string, financialTitleId: string, deletedBy?: string): Promise<FinancialTitle | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFinancialTitleRepository(tx).softDelete(tenantId, financialTitleId, deletedBy));
  }
}

export class RlsPrismaFinancialPeriodCloseRepository implements FinancialPeriodCloseRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  isPeriodClosed(tenantId: string, period: string): Promise<boolean> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFinancialPeriodCloseRepository(tx).isPeriodClosed(tenantId, period));
  }
}

export async function createPrismaFinancialTitleRepository(): Promise<RlsPrismaFinancialTitleRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaFinancialTitleRepository(prisma);
}

export async function createPrismaFinancialPeriodCloseRepository(): Promise<RlsPrismaFinancialPeriodCloseRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaFinancialPeriodCloseRepository(prisma);
}

function buildWhere(input: ListFinancialTitleInput): Prisma.FinancialTitleWhereInput {
  const now = new Date();
  const and: Prisma.FinancialTitleWhereInput[] = [];
  if (input.direction !== undefined) and.push({ direction: input.direction });
  if (input.status !== undefined) and.push({ status: input.status });
  if (input.partyType !== undefined) and.push({ party_type: input.partyType });
  if (input.dueFrom !== undefined) and.push({ due_date: { gte: input.dueFrom } });
  if (input.dueTo !== undefined) and.push({ due_date: { lte: input.dueTo } });
  // overdue DERIVADO: vencido (due_date < agora) E status não-final. Espelha isTitleOverdue (InMemory).
  if (input.overdue === true) and.push({ due_date: { lt: now }, status: { notIn: NON_FINAL_EXCLUDED } });
  if (input.overdue === false) and.push({ OR: [{ due_date: { gte: now } }, { status: { in: NON_FINAL_EXCLUDED } }] });

  return {
    tenant_id: input.tenantId,
    ...(input.includeDeleted ? {} : { deleted_at: null }),
    ...(and.length > 0 ? { AND: and } : {}),
  };
}

function mapRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly direction: string;
  readonly party_type: string;
  readonly party_id: string | null;
  readonly party_name: string;
  readonly document: string | null;
  readonly category: string | null;
  readonly description: string | null;
  readonly amount: Prisma.Decimal;
  readonly currency: string;
  readonly issue_date: Date;
  readonly due_date: Date;
  readonly paid_amount: Prisma.Decimal;
  readonly status: string;
  readonly competencia: string;
  readonly account_id: string | null;
  readonly work_order_id: string | null;
  readonly service_quote_id: string | null;
  readonly client_action_id: string | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly deleted_at: Date | null;
}): FinancialTitle {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    direction: record.direction,
    partyType: record.party_type,
    partyId: record.party_id ?? undefined,
    partyName: record.party_name,
    document: record.document ?? undefined,
    category: record.category ?? undefined,
    description: record.description ?? undefined,
    amount: Number(record.amount),
    currency: record.currency,
    issueDate: record.issue_date,
    dueDate: record.due_date,
    paidAmount: Number(record.paid_amount),
    status: record.status,
    competencia: record.competencia,
    accountId: record.account_id ?? undefined,
    workOrderId: record.work_order_id ?? undefined,
    serviceQuoteId: record.service_quote_id ?? undefined,
    clientActionId: record.client_action_id ?? undefined,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    deletedAt: record.deleted_at ?? undefined,
  };
}

// P2003 (FK composta inválida — conta/OS inexistente ou de outro tenant). Nesta fatia só account_id é
// populado, então o alvo esperado é a conta; mapeia por target para robustez. O tenant sempre vem da claim.
function translatePersistenceError(error: unknown): unknown {
  // Ω4-3 (D-Ω4-C2) — o índice PARCIAL financial_titles_wo_direction_active_key (só existe no SQL da
  // migration) dispara P2002 no 2º faturamento ativo da mesma OS+direção → 409 (rede da idempotência).
  if (isPrismaError(error, "P2002")) {
    return workOrderAlreadyInvoicedError();
  }
  if (isPrismaError(error, "P2003")) {
    const target = foreignKeyTarget(error);
    if (target.includes("work_order")) {
      return new FinancialTitleError(400, "FINANCIAL_TITLE_INVALID", "invalid_work_order_reference", "The referenced work order does not exist for this tenant.");
    }
    return invalidAccountReferenceError();
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
