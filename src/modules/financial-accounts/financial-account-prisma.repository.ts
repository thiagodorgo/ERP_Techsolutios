import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  FinancialAccount,
  CreateFinancialAccountInput,
  ListFinancialAccountInput,
  ListFinancialAccountResult,
  UpdateFinancialAccountInput,
} from "./financial-account.types.js";
import { FinancialAccountError } from "./financial-account.types.js";
import { duplicateAccountError, type FinancialAccountRepository } from "./financial-account.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaFinancialAccountRepository implements FinancialAccountRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateFinancialAccountInput): Promise<FinancialAccount> {
    try {
      const account = await this.client.financialAccount.create({
        data: {
          tenant_id: input.tenantId,
          name: input.name,
          kind: input.kind,
          currency: input.currency,
          opening_balance: input.openingBalance,
          bank_name: input.bankName ?? null,
          agency: input.agency ?? null,
          account_number: input.accountNumber ?? null,
          document: input.document ?? null,
          notes: input.notes ?? null,
          status: input.status,
          is_active: input.isActive ?? true,
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });
      return mapRecord(account);
    } catch (error) {
      throw translatePersistenceError(error);
    }
  }

  async list(input: ListFinancialAccountInput): Promise<ListFinancialAccountResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.financialAccount.findMany({ where, orderBy: [{ created_at: "desc" }, { id: "desc" }], take: input.limit, skip: input.offset }),
      this.client.financialAccount.count({ where }),
    ]);
    return { items: items.map(mapRecord), total, limit: input.limit, offset: input.offset };
  }

  async findById(tenantId: string, financialAccountId: string): Promise<FinancialAccount | undefined> {
    const account = await this.client.financialAccount.findFirst({ where: { tenant_id: tenantId, id: financialAccountId } });
    return account ? mapRecord(account) : undefined;
  }

  async update(input: UpdateFinancialAccountInput): Promise<FinancialAccount | undefined> {
    try {
      const updated = await this.client.financialAccount.updateManyAndReturn({
        // is_active:true → PATCH em conta arquivada casa 0 linhas → 404 (pós-análise M1, simétrico ao softDelete).
        where: { tenant_id: input.tenantId, id: input.financialAccountId, is_active: true },
        data: compactRecord({
          name: input.name,
          kind: input.kind,
          currency: input.currency,
          opening_balance: input.openingBalance,
          bank_name: nullable(input.bankName),
          agency: nullable(input.agency),
          account_number: nullable(input.accountNumber),
          document: nullable(input.document),
          notes: nullable(input.notes),
          updated_by: nullable(input.updatedBy),
        }),
      });
      return updated[0] ? mapRecord(updated[0]) : undefined;
    } catch (error) {
      throw translatePersistenceError(error);
    }
  }

  async softDelete(tenantId: string, financialAccountId: string, deletedBy?: string): Promise<FinancialAccount | undefined> {
    // Delete LÓGICO: só age em conta ATIVA (is_active=true no WHERE → re-delete casa 0 linhas → 404).
    const updated = await this.client.financialAccount.updateManyAndReturn({
      where: { tenant_id: tenantId, id: financialAccountId, is_active: true },
      data: compactRecord({ is_active: false, status: "inactive", updated_by: deletedBy }),
    });
    return updated[0] ? mapRecord(updated[0]) : undefined;
  }
}

export class RlsPrismaFinancialAccountRepository implements FinancialAccountRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateFinancialAccountInput): Promise<FinancialAccount> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFinancialAccountRepository(tx).create(input));
  }

  list(input: ListFinancialAccountInput): Promise<ListFinancialAccountResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFinancialAccountRepository(tx).list(input));
  }

  findById(tenantId: string, financialAccountId: string): Promise<FinancialAccount | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFinancialAccountRepository(tx).findById(tenantId, financialAccountId));
  }

  update(input: UpdateFinancialAccountInput): Promise<FinancialAccount | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFinancialAccountRepository(tx).update(input));
  }

  softDelete(tenantId: string, financialAccountId: string, deletedBy?: string): Promise<FinancialAccount | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFinancialAccountRepository(tx).softDelete(tenantId, financialAccountId, deletedBy));
  }
}

export async function createPrismaFinancialAccountRepository(): Promise<RlsPrismaFinancialAccountRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaFinancialAccountRepository(prisma);
}

function buildWhere(input: ListFinancialAccountInput): Prisma.FinancialAccountWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.includeInactive ? {} : { is_active: true }),
    ...(input.kind !== undefined ? { kind: input.kind } : {}),
  };
}

function mapRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly name: string;
  readonly kind: string;
  readonly currency: string;
  readonly opening_balance: Prisma.Decimal;
  readonly bank_name: string | null;
  readonly agency: string | null;
  readonly account_number: string | null;
  readonly document: string | null;
  readonly notes: string | null;
  readonly status: string;
  readonly is_active: boolean;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): FinancialAccount {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    name: record.name,
    kind: record.kind,
    currency: record.currency,
    openingBalance: Number(record.opening_balance),
    bankName: record.bank_name ?? undefined,
    agency: record.agency ?? undefined,
    accountNumber: record.account_number ?? undefined,
    document: record.document ?? undefined,
    notes: record.notes ?? undefined,
    status: record.status,
    isActive: record.is_active,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

// P2002 (unique PARCIAL de nome ativo) → 409 duplicate_account. No caminho Prisma, o índice único parcial
// (WHERE is_active=true) é o ÚNICO detector de nome duplicado — não há pre-check no service (o pre-check por
// nome existe só no repositório InMemory). P2003 (FK do tenant inválida) → 400.
function translatePersistenceError(error: unknown): unknown {
  if (isPrismaError(error, "P2002")) {
    return duplicateAccountError();
  }
  if (isPrismaError(error, "P2003")) {
    return new FinancialAccountError(400, "FINANCIAL_ACCOUNT_INVALID", "invalid_tenant_reference", "The referenced tenant does not exist.");
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
