import { randomUUID } from "node:crypto";

import type {
  FinancialAccount,
  CreateFinancialAccountInput,
  ListFinancialAccountInput,
  ListFinancialAccountResult,
  UpdateFinancialAccountInput,
} from "./financial-account.types.js";
import { FinancialAccountError } from "./financial-account.types.js";

export interface FinancialAccountRepository {
  create(input: CreateFinancialAccountInput): Promise<FinancialAccount>;
  list(input: ListFinancialAccountInput): Promise<ListFinancialAccountResult>;
  findById(tenantId: string, financialAccountId: string): Promise<FinancialAccount | undefined>;
  update(input: UpdateFinancialAccountInput): Promise<FinancialAccount | undefined>;
  softDelete(tenantId: string, financialAccountId: string, deletedBy?: string): Promise<FinancialAccount | undefined>;
  reset?(): void;
}

export function duplicateAccountError(): FinancialAccountError {
  return new FinancialAccountError(
    409,
    "FINANCIAL_ACCOUNT_CONFLICT",
    "duplicate_account",
    "An active financial account with this name already exists.",
  );
}

export function accountNotFoundError(): FinancialAccountError {
  return new FinancialAccountError(404, "FINANCIAL_ACCOUNT_NOT_FOUND", "account_not_found", "Financial account was not found.");
}

export class InMemoryFinancialAccountRepository implements FinancialAccountRepository {
  private readonly accounts = new Map<string, FinancialAccount>();

  async create(input: CreateFinancialAccountInput): Promise<FinancialAccount> {
    // Unicidade PARCIAL: só colide com conta ATIVA de mesmo nome (espelho do índice WHERE is_active=true).
    if (this.hasActiveName(input.tenantId, input.name)) {
      throw duplicateAccountError();
    }

    const now = new Date();
    const account: FinancialAccount = {
      ...input,
      id: randomUUID(),
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.accounts.set(account.id, account);
    return account;
  }

  async list(input: ListFinancialAccountInput): Promise<ListFinancialAccountResult> {
    const filtered = this.sorted()
      .filter((account) => account.tenantId === input.tenantId)
      // Exclui inativos por is_active (NÃO por status); ?includeInactive=true traz todos.
      .filter((account) => (input.includeInactive ? true : account.isActive))
      .filter((account) => input.kind === undefined || account.kind === input.kind);

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, financialAccountId: string): Promise<FinancialAccount | undefined> {
    const account = this.accounts.get(financialAccountId);
    return account?.tenantId === tenantId ? account : undefined;
  }

  async update(input: UpdateFinancialAccountInput): Promise<FinancialAccount | undefined> {
    const current = await this.findById(input.tenantId, input.financialAccountId);
    // Conta arquivada (soft-deleted) NÃO é editável — trata como inexistente (→404), simétrico ao re-delete.
    // Editar currency/opening_balance de uma conta "excluída" corromperia o saldo quando Título/Caixa a
    // referenciarem (Ω4-2/4-4). Reativar, se um dia existir, será endpoint dedicado. (pós-análise M1)
    if (!current || !current.isActive) return undefined;

    // Paridade com o índice PARCIAL (WHERE is_active=true): renomear só colide se ESTA conta está ativa —
    // renomear uma conta INATIVA para um nome de conta ativa não fura o índice (a linha inativa não é
    // indexada), então o Prisma permitiria; o InMemory precisa permitir também.
    if (input.name !== undefined && input.name !== current.name && current.isActive && this.hasActiveName(input.tenantId, input.name)) {
      throw duplicateAccountError();
    }

    const updated: FinancialAccount = {
      ...current,
      ...definedFields({
        name: input.name,
        kind: input.kind,
        currency: input.currency,
        openingBalance: input.openingBalance,
        bankName: input.bankName,
        agency: input.agency,
        accountNumber: input.accountNumber,
        document: input.document,
        notes: input.notes,
        updatedBy: input.updatedBy,
      }),
      updatedAt: new Date(),
    };
    this.accounts.set(updated.id, updated);
    return updated;
  }

  async softDelete(tenantId: string, financialAccountId: string, deletedBy?: string): Promise<FinancialAccount | undefined> {
    const current = await this.findById(tenantId, financialAccountId);
    // Já inativa → trata como inexistente (re-delete → 404).
    if (!current || !current.isActive) return undefined;

    // Delete LÓGICO (B1): is_active=false + status='inactive'.
    const removed: FinancialAccount = {
      ...current,
      isActive: false,
      status: "inactive",
      ...(deletedBy !== undefined ? { updatedBy: deletedBy } : {}),
      updatedAt: new Date(),
    };
    this.accounts.set(removed.id, removed);
    return removed;
  }

  reset(): void {
    this.accounts.clear();
  }

  private hasActiveName(tenantId: string, name: string): boolean {
    return [...this.accounts.values()].some(
      (account) => account.tenantId === tenantId && account.name === name && account.isActive,
    );
  }

  private sorted(): FinancialAccount[] {
    // Desempate por id quando created_at empata (mesmo ms): paginação determinística e paridade com o
    // Postgres (que sem desempate devolve ordem arbitrária). (pós-análise B2)
    return [...this.accounts.values()].sort(
      (left, right) => right.createdAt.getTime() - left.createdAt.getTime() || (left.id < right.id ? 1 : left.id > right.id ? -1 : 0),
    );
  }
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
