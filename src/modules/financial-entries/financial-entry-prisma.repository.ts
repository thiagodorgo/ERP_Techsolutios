import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  CreateFinancialEntryInput,
  FinancialEntry,
  ListFinancialEntryInput,
  ListFinancialEntryResult,
  ReconcileFinancialEntryInput,
  UpdateFinancialEntryInput,
} from "./financial-entry.types.js";
import {
  duplicatePaymentError,
  invalidAccountReferenceError,
  type AccountReader,
  type FinancialAccountRef,
  type FinancialEntryRepository,
} from "./financial-entry.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaFinancialEntryRepository implements FinancialEntryRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateFinancialEntryInput): Promise<FinancialEntry> {
    try {
      const record = await this.client.financialEntry.create({
        data: {
          tenant_id: input.tenantId,
          account_id: input.accountId,
          title_id: input.titleId ?? null,
          direction: input.direction,
          amount: input.amount,
          currency: input.currency,
          payment_method: input.paymentMethod,
          category: input.category ?? null,
          occurred_at: input.occurredAt,
          competencia: input.competencia,
          description: input.description ?? null,
          reversal_of: input.reversalOf ?? null,
          // reconciled nasce false (conciliação é Ω4-5).
          reconciled: false,
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

  async list(input: ListFinancialEntryInput): Promise<ListFinancialEntryResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.financialEntry.findMany({ where, orderBy: [{ occurred_at: "desc" }, { id: "desc" }], take: input.limit, skip: input.offset }),
      this.client.financialEntry.count({ where }),
    ]);
    return { items: items.map(mapRecord), total, limit: input.limit, offset: input.offset };
  }

  async findById(tenantId: string, financialEntryId: string): Promise<FinancialEntry | undefined> {
    // Retorna mesmo deletado (GET e o pré-check das mutações decidem 404 no serviço).
    const record = await this.client.financialEntry.findFirst({ where: { tenant_id: tenantId, id: financialEntryId } });
    return record ? mapRecord(record) : undefined;
  }

  async update(input: UpdateFinancialEntryInput): Promise<FinancialEntry | undefined> {
    const updated = await this.client.financialEntry.updateManyAndReturn({
      // deleted_at:null → PATCH em lançamento deletado casa 0 linhas → 404 (simétrico ao softDelete).
      where: { tenant_id: input.tenantId, id: input.financialEntryId, deleted_at: null },
      data: compactRecord({ category: nullable(input.category), description: nullable(input.description), updated_by: nullable(input.updatedBy) }),
    });
    return updated[0] ? mapRecord(updated[0]) : undefined;
  }

  async softDelete(tenantId: string, financialEntryId: string, deletedBy?: string): Promise<FinancialEntry | undefined> {
    const updated = await this.client.financialEntry.updateManyAndReturn({
      where: { tenant_id: tenantId, id: financialEntryId, deleted_at: null },
      data: compactRecord({ deleted_at: new Date(), updated_by: deletedBy }),
    });
    return updated[0] ? mapRecord(updated[0]) : undefined;
  }

  async reconcile(input: ReconcileFinancialEntryInput): Promise<FinancialEntry | undefined> {
    // Objeto DIRETO (não compactRecord) para os nulos irem AO BANCO (desconciliar limpa divergence/ref/at/by).
    const updated = await this.client.financialEntry.updateManyAndReturn({
      where: { tenant_id: input.tenantId, id: input.financialEntryId, deleted_at: null },
      data: {
        reconciled: input.reconciled,
        divergence_type: input.divergenceType,
        reconciliation_ref: input.reconciliationRef,
        reconciled_at: input.reconciledAt,
        reconciled_by: input.reconciledBy,
        ...(input.updatedBy !== undefined ? { updated_by: input.updatedBy } : {}),
      },
    });
    return updated[0] ? mapRecord(updated[0]) : undefined;
  }

  async findActiveReversalOf(tenantId: string, originalEntryId: string): Promise<FinancialEntry | undefined> {
    const record = await this.client.financialEntry.findFirst({
      where: { tenant_id: tenantId, reversal_of: originalEntryId, deleted_at: null },
    });
    return record ? mapRecord(record) : undefined;
  }

  async sumByAccount(tenantId: string, accountId: string): Promise<{ readonly inflow: number; readonly outflow: number }> {
    const grouped = await this.client.financialEntry.groupBy({
      by: ["direction"],
      where: { tenant_id: tenantId, account_id: accountId, deleted_at: null },
      _sum: { amount: true },
    });
    const sumOf = (direction: string): number => {
      const bucket = grouped.find((row) => row.direction === direction);
      return bucket?._sum.amount ? Number(bucket._sum.amount) : 0;
    };
    return { inflow: sumOf("in"), outflow: sumOf("out") };
  }
}

// AccountReader Prisma — resolve a conta (moeda/atividade/saldo de abertura) dentro da RLS.
export class PrismaAccountReader implements AccountReader {
  constructor(private readonly client: PrismaExecutor) {}

  async findAccount(tenantId: string, accountId: string): Promise<FinancialAccountRef | undefined> {
    const record = await this.client.financialAccount.findFirst({
      where: { tenant_id: tenantId, id: accountId },
      select: { id: true, currency: true, is_active: true, opening_balance: true },
    });
    if (!record) return undefined;
    return { id: record.id, currency: record.currency, isActive: record.is_active, openingBalance: Number(record.opening_balance) };
  }
}

export class RlsPrismaFinancialEntryRepository implements FinancialEntryRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateFinancialEntryInput): Promise<FinancialEntry> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFinancialEntryRepository(tx).create(input));
  }
  list(input: ListFinancialEntryInput): Promise<ListFinancialEntryResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFinancialEntryRepository(tx).list(input));
  }
  findById(tenantId: string, financialEntryId: string): Promise<FinancialEntry | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFinancialEntryRepository(tx).findById(tenantId, financialEntryId));
  }
  update(input: UpdateFinancialEntryInput): Promise<FinancialEntry | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFinancialEntryRepository(tx).update(input));
  }
  softDelete(tenantId: string, financialEntryId: string, deletedBy?: string): Promise<FinancialEntry | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFinancialEntryRepository(tx).softDelete(tenantId, financialEntryId, deletedBy));
  }
  reconcile(input: ReconcileFinancialEntryInput): Promise<FinancialEntry | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFinancialEntryRepository(tx).reconcile(input));
  }
  findActiveReversalOf(tenantId: string, originalEntryId: string): Promise<FinancialEntry | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFinancialEntryRepository(tx).findActiveReversalOf(tenantId, originalEntryId));
  }
  sumByAccount(tenantId: string, accountId: string): Promise<{ readonly inflow: number; readonly outflow: number }> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFinancialEntryRepository(tx).sumByAccount(tenantId, accountId));
  }
}

export class RlsPrismaAccountReader implements AccountReader {
  constructor(private readonly prismaClient: PrismaClient) {}

  findAccount(tenantId: string, accountId: string): Promise<FinancialAccountRef | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaAccountReader(tx).findAccount(tenantId, accountId));
  }
}

export async function createPrismaFinancialEntryRepository(): Promise<RlsPrismaFinancialEntryRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaFinancialEntryRepository(prisma);
}

export async function createPrismaAccountReader(): Promise<RlsPrismaAccountReader> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaAccountReader(prisma);
}

function buildWhere(input: ListFinancialEntryInput): Prisma.FinancialEntryWhereInput {
  const and: Prisma.FinancialEntryWhereInput[] = [];
  if (input.accountId !== undefined) and.push({ account_id: input.accountId });
  if (input.direction !== undefined) and.push({ direction: input.direction });
  if (input.category !== undefined) and.push({ category: input.category });
  if (input.reconciled !== undefined) and.push({ reconciled: input.reconciled });
  if (input.divergenceType !== undefined) and.push({ divergence_type: input.divergenceType });
  if (input.occurredFrom !== undefined) and.push({ occurred_at: { gte: input.occurredFrom } });
  if (input.occurredTo !== undefined) and.push({ occurred_at: { lte: input.occurredTo } });

  return {
    tenant_id: input.tenantId,
    ...(input.includeDeleted ? {} : { deleted_at: null }),
    ...(and.length > 0 ? { AND: and } : {}),
  };
}

function mapRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly account_id: string;
  readonly title_id: string | null;
  readonly direction: string;
  readonly amount: Prisma.Decimal;
  readonly currency: string;
  readonly payment_method: string;
  readonly category: string | null;
  readonly occurred_at: Date;
  readonly competencia: string;
  readonly description: string | null;
  readonly reversal_of: string | null;
  readonly reconciled: boolean;
  readonly divergence_type: string | null;
  readonly reconciliation_ref: string | null;
  readonly reconciled_at: Date | null;
  readonly reconciled_by: string | null;
  readonly client_action_id: string | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly deleted_at: Date | null;
}): FinancialEntry {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    accountId: record.account_id,
    titleId: record.title_id ?? undefined,
    direction: record.direction,
    amount: Number(record.amount),
    currency: record.currency,
    paymentMethod: record.payment_method,
    category: record.category ?? undefined,
    occurredAt: record.occurred_at,
    competencia: record.competencia,
    description: record.description ?? undefined,
    reversalOf: record.reversal_of ?? undefined,
    reconciled: record.reconciled,
    divergenceType: record.divergence_type ?? undefined,
    reconciliationRef: record.reconciliation_ref ?? undefined,
    reconciledAt: record.reconciled_at ?? undefined,
    reconciledBy: record.reconciled_by ?? undefined,
    clientActionId: record.client_action_id ?? undefined,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    deletedAt: record.deleted_at ?? undefined,
  };
}

// P2002 → o índice PARCIAL de idempotência (só no SQL da migration) → 409 duplicate_payment (replay do
// mesmo pagamento). P2003 → FK composta inválida (conta/título inexistente ou de outro tenant); nesta
// fatia o alvo prático é a conta (o título já foi resolvido antes na liquidação) → 400.
function translatePersistenceError(error: unknown): unknown {
  if (isPrismaError(error, "P2002")) {
    return duplicatePaymentError();
  }
  if (isPrismaError(error, "P2003")) {
    return invalidAccountReferenceError();
  }
  return error;
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { readonly code?: unknown }).code === code;
}

function nullable<T>(value: T | undefined): T | null | undefined {
  return value === undefined ? undefined : value ?? null;
}

function compactRecord<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
