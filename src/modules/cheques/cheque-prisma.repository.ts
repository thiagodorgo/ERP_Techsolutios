import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import {
  invalidAccountReferenceError,
  type ChequeRepository,
} from "./cheque.repository.js";
import type {
  Cheque,
  CreateChequeInput,
  ListChequeInput,
  ListChequeResult,
  TransitionChequeInput,
  UpdateChequeInput,
} from "./cheque.types.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaChequeRepository implements ChequeRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateChequeInput): Promise<Cheque> {
    try {
      const record = await this.client.cheque.create({
        data: {
          tenant_id: input.tenantId,
          account_id: input.accountId,
          direction: input.direction,
          cheque_number: input.chequeNumber,
          bank: input.bank,
          amount: input.amount,
          currency: input.currency,
          due_date: input.dueDate ?? null,
          // status nasce 'registered' (nunca vem do corpo).
          status: "registered",
          notes: input.notes ?? null,
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });
      return mapRecord(record);
    } catch (error) {
      throw translatePersistenceError(error);
    }
  }

  async list(input: ListChequeInput): Promise<ListChequeResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.cheque.findMany({
        where,
        orderBy: [{ due_date: { sort: "desc", nulls: "last" } }, { id: "desc" }],
        take: input.limit,
        skip: input.offset,
      }),
      this.client.cheque.count({ where }),
    ]);
    return { items: items.map(mapRecord), total, limit: input.limit, offset: input.offset };
  }

  async findById(tenantId: string, chequeId: string): Promise<Cheque | undefined> {
    // Retorna mesmo deletado (GET e o pré-check das mutações decidem 404 no serviço).
    const record = await this.client.cheque.findFirst({ where: { tenant_id: tenantId, id: chequeId } });
    return record ? mapRecord(record) : undefined;
  }

  async update(input: UpdateChequeInput): Promise<Cheque | undefined> {
    const updated = await this.client.cheque.updateManyAndReturn({
      where: { tenant_id: input.tenantId, id: input.chequeId, deleted_at: null },
      data: compactRecord({
        cheque_number: input.chequeNumber,
        bank: input.bank,
        due_date: input.dueDate,
        notes: input.notes,
        updated_by: input.updatedBy,
      }),
    });
    return updated[0] ? mapRecord(updated[0]) : undefined;
  }

  async softDelete(tenantId: string, chequeId: string, deletedBy?: string): Promise<Cheque | undefined> {
    const updated = await this.client.cheque.updateManyAndReturn({
      where: { tenant_id: tenantId, id: chequeId, deleted_at: null },
      data: compactRecord({ deleted_at: new Date(), updated_by: deletedBy }),
    });
    return updated[0] ? mapRecord(updated[0]) : undefined;
  }

  // MUTEX atômico: WHERE status=fromStatus garante que só UMA transição concorrente efetiva (rowcount 1); as
  // demais casam 0 linhas → undefined (o serviço traduz para 409 transition_conflict). deleted_at IS NULL.
  async transition(input: TransitionChequeInput): Promise<Cheque | undefined> {
    const updated = await this.client.cheque.updateManyAndReturn({
      where: { tenant_id: input.tenantId, id: input.chequeId, status: input.fromStatus, deleted_at: null },
      data: {
        status: input.toStatus,
        ...(input.clearedEntryId !== undefined ? { cleared_entry_id: input.clearedEntryId } : {}),
        ...(input.bounceEntryId !== undefined ? { bounce_entry_id: input.bounceEntryId } : {}),
        ...(input.bounceReason !== undefined ? { bounce_reason: input.bounceReason } : {}),
        ...(input.updatedBy !== undefined ? { updated_by: input.updatedBy } : {}),
      },
    });
    return updated[0] ? mapRecord(updated[0]) : undefined;
  }

  async attachClearingEntry(tenantId: string, chequeId: string, entryId: string, updatedBy?: string): Promise<Cheque | undefined> {
    return this.attachEntry(tenantId, chequeId, "cleared", { cleared_entry_id: entryId }, updatedBy);
  }

  async attachBounceEntry(tenantId: string, chequeId: string, entryId: string, updatedBy?: string): Promise<Cheque | undefined> {
    return this.attachEntry(tenantId, chequeId, "bounced", { bounce_entry_id: entryId }, updatedBy);
  }

  private async attachEntry(
    tenantId: string,
    chequeId: string,
    expectedStatus: string,
    patch: { readonly cleared_entry_id?: string; readonly bounce_entry_id?: string },
    updatedBy?: string,
  ): Promise<Cheque | undefined> {
    const updated = await this.client.cheque.updateManyAndReturn({
      where: { tenant_id: tenantId, id: chequeId, status: expectedStatus, deleted_at: null },
      data: compactRecord({ ...patch, updated_by: updatedBy }),
    });
    return updated[0] ? mapRecord(updated[0]) : undefined;
  }
}

export class RlsPrismaChequeRepository implements ChequeRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateChequeInput): Promise<Cheque> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaChequeRepository(tx).create(input));
  }
  list(input: ListChequeInput): Promise<ListChequeResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaChequeRepository(tx).list(input));
  }
  findById(tenantId: string, chequeId: string): Promise<Cheque | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaChequeRepository(tx).findById(tenantId, chequeId));
  }
  update(input: UpdateChequeInput): Promise<Cheque | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaChequeRepository(tx).update(input));
  }
  softDelete(tenantId: string, chequeId: string, deletedBy?: string): Promise<Cheque | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaChequeRepository(tx).softDelete(tenantId, chequeId, deletedBy));
  }
  transition(input: TransitionChequeInput): Promise<Cheque | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaChequeRepository(tx).transition(input));
  }
  attachClearingEntry(tenantId: string, chequeId: string, entryId: string, updatedBy?: string): Promise<Cheque | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaChequeRepository(tx).attachClearingEntry(tenantId, chequeId, entryId, updatedBy));
  }
  attachBounceEntry(tenantId: string, chequeId: string, entryId: string, updatedBy?: string): Promise<Cheque | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaChequeRepository(tx).attachBounceEntry(tenantId, chequeId, entryId, updatedBy));
  }
}

export async function createPrismaChequeRepository(): Promise<RlsPrismaChequeRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaChequeRepository(prisma);
}

function buildWhere(input: ListChequeInput): Prisma.ChequeWhereInput {
  const and: Prisma.ChequeWhereInput[] = [];
  if (input.accountId !== undefined) and.push({ account_id: input.accountId });
  if (input.direction !== undefined) and.push({ direction: input.direction });
  if (input.status !== undefined) and.push({ status: input.status });

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
  readonly direction: string;
  readonly cheque_number: string;
  readonly bank: string;
  readonly amount: Prisma.Decimal;
  readonly currency: string;
  readonly due_date: Date | null;
  readonly status: string;
  readonly cleared_entry_id: string | null;
  readonly bounce_entry_id: string | null;
  readonly bounce_reason: string | null;
  readonly notes: string | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly deleted_at: Date | null;
}): Cheque {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    accountId: record.account_id,
    direction: record.direction,
    chequeNumber: record.cheque_number,
    bank: record.bank,
    amount: Number(record.amount),
    currency: record.currency,
    dueDate: record.due_date ?? undefined,
    status: record.status,
    clearedEntryId: record.cleared_entry_id ?? undefined,
    bounceEntryId: record.bounce_entry_id ?? undefined,
    bounceReason: record.bounce_reason ?? undefined,
    notes: record.notes ?? undefined,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    deletedAt: record.deleted_at ?? undefined,
  };
}

// P2003 → FK composta inválida (conta inexistente/de outro tenant) → 400 invalid_account_reference (paridade
// com o serviço, que já valida a conta ANTES via accountReader; a FK é a rede final).
function translatePersistenceError(error: unknown): unknown {
  if (isPrismaError(error, "P2003")) {
    return invalidAccountReferenceError();
  }
  return error;
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { readonly code?: unknown }).code === code;
}

function compactRecord<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
