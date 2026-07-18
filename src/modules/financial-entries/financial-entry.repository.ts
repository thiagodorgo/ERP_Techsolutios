import { randomUUID } from "node:crypto";

import type {
  CreateFinancialEntryInput,
  FinancialEntry,
  ListFinancialEntryInput,
  ListFinancialEntryResult,
  ReconcileFinancialEntryInput,
  UpdateFinancialEntryInput,
} from "./financial-entry.types.js";
import { FinancialEntryError } from "./financial-entry.types.js";

export interface FinancialEntryRepository {
  create(input: CreateFinancialEntryInput): Promise<FinancialEntry>;
  list(input: ListFinancialEntryInput): Promise<ListFinancialEntryResult>;
  findById(tenantId: string, financialEntryId: string): Promise<FinancialEntry | undefined>;
  update(input: UpdateFinancialEntryInput): Promise<FinancialEntry | undefined>;
  softDelete(tenantId: string, financialEntryId: string, deletedBy?: string): Promise<FinancialEntry | undefined>;
  // Conciliação bancária (Ω4-5): grava reconciled + os 4 metadados. Lançamento deletado → undefined (→404).
  reconcile(input: ReconcileFinancialEntryInput): Promise<FinancialEntry | undefined>;
  // Estorno já feito? (existe contra-lançamento ATIVO apontando este original) — sustenta a idempotência
  // do estorno (a rede real no Prisma é a mesma consulta; não há índice único porque reversal_of é app-level).
  findActiveReversalOf(tenantId: string, originalEntryId: string): Promise<FinancialEntry | undefined>;
  // Saldo/Extrato: soma dos lançamentos ATIVOS da conta por direção (deletados EXCLUÍDOS).
  sumByAccount(tenantId: string, accountId: string): Promise<{ readonly inflow: number; readonly outflow: number }>;
  reset?(): void;
}

// Leitor da Conta financeira (surrogate da FK composta): resolve moeda/atividade/saldo de abertura da
// conta que recebe/paga. InMemory lê o repositório de Contas (mesmo singleton do Ω4-1); Prisma consulta
// financial_accounts dentro da RLS. undefined ⇒ conta inexistente para o tenant.
export type FinancialAccountRef = {
  readonly id: string;
  readonly currency: string;
  readonly isActive: boolean;
  readonly openingBalance: number;
};

export interface AccountReader {
  findAccount(tenantId: string, accountId: string): Promise<FinancialAccountRef | undefined>;
}

export function entryNotFoundError(): FinancialEntryError {
  return new FinancialEntryError(404, "FINANCIAL_ENTRY_NOT_FOUND", "entry_not_found", "Financial entry was not found.");
}

export function accountNotFoundError(): FinancialEntryError {
  return new FinancialEntryError(404, "FINANCIAL_ACCOUNT_NOT_FOUND", "account_not_found", "Financial account was not found.");
}

export function invalidAccountReferenceError(): FinancialEntryError {
  return new FinancialEntryError(
    400,
    "FINANCIAL_ENTRY_INVALID",
    "invalid_account_reference",
    "The referenced financial account does not exist for this tenant.",
  );
}

export function accountInactiveError(): FinancialEntryError {
  return new FinancialEntryError(422, "FINANCIAL_ENTRY_UNPROCESSABLE", "account_inactive", "The referenced financial account is inactive.");
}

export function currencyMismatchError(): FinancialEntryError {
  return new FinancialEntryError(422, "FINANCIAL_ENTRY_UNPROCESSABLE", "currency_mismatch", "currency must match the account currency.");
}

export function periodClosedError(competencia: string): FinancialEntryError {
  return new FinancialEntryError(
    422,
    "FINANCIAL_ENTRY_UNPROCESSABLE",
    "period_closed",
    `The financial period ${competencia} is closed for new entries.`,
  );
}

// Replay do MESMO pagamento (mesmo client_action_id do título) → 409 (rede do índice parcial de idempotência).
export function duplicatePaymentError(): FinancialEntryError {
  return new FinancialEntryError(409, "FINANCIAL_ENTRY_CONFLICT", "duplicate_payment", "A payment with this client action id already exists for this title.");
}

// Estornar o MESMO lançamento 2× → 409 (idempotência por reversal_of).
export function alreadyReversedError(): FinancialEntryError {
  return new FinancialEntryError(409, "FINANCIAL_ENTRY_CONFLICT", "already_reversed", "This financial entry has already been reversed.");
}

// Ω4-4 pós-análise (A1/B1) — um lançamento que faz parte de um PAR de estorno (o original já estornado OU o
// próprio contra-lançamento) é IMUTÁVEL: deletá-lo ou re-estorná-lo desbalancearia o saldo (o outro lado do
// par continua ativo). Para desfazer, estorna-se o par inteiro por um novo ajuste, nunca por delete.
export function reversalPairImmutableError(): FinancialEntryError {
  return new FinancialEntryError(422, "FINANCIAL_ENTRY_UNPROCESSABLE", "reversal_pair_immutable", "An entry that is part of a reversal pair cannot be deleted or reversed.");
}

export class InMemoryFinancialEntryRepository implements FinancialEntryRepository {
  private readonly entries = new Map<string, FinancialEntry>();

  async create(input: CreateFinancialEntryInput): Promise<FinancialEntry> {
    // SIMULA o índice PARCIAL do Postgres (unique (tenant_id, title_id, client_action_id) WHERE
    // client_action_id IS NOT NULL AND deleted_at IS NULL): rejeita um replay do mesmo pagamento. NULLs são
    // distintos no índice → só vale para liquidação (title_id preenchido); avulso (title_id NULL) não colide.
    if (input.clientActionId != null && input.titleId != null && this.findActiveByClientAction(input.tenantId, input.titleId, input.clientActionId)) {
      throw duplicatePaymentError();
    }

    const now = new Date();
    const entry: FinancialEntry = {
      ...input,
      id: randomUUID(),
      titleId: input.titleId,
      category: input.category,
      description: input.description,
      reversalOf: input.reversalOf,
      // reconciled nasce SEMPRE false (conciliação é Ω4-5).
      reconciled: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: undefined,
    };
    this.entries.set(entry.id, entry);
    return entry;
  }

  async list(input: ListFinancialEntryInput): Promise<ListFinancialEntryResult> {
    const filtered = this.sorted()
      .filter((entry) => entry.tenantId === input.tenantId)
      .filter((entry) => (input.includeDeleted ? true : entry.deletedAt == null))
      .filter((entry) => input.accountId === undefined || entry.accountId === input.accountId)
      .filter((entry) => input.direction === undefined || entry.direction === input.direction)
      .filter((entry) => input.category === undefined || entry.category === input.category)
      .filter((entry) => input.reconciled === undefined || entry.reconciled === input.reconciled)
      .filter((entry) => input.divergenceType === undefined || entry.divergenceType === input.divergenceType)
      .filter((entry) => input.occurredFrom === undefined || entry.occurredAt.getTime() >= input.occurredFrom.getTime())
      .filter((entry) => input.occurredTo === undefined || entry.occurredAt.getTime() <= input.occurredTo.getTime());

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, financialEntryId: string): Promise<FinancialEntry | undefined> {
    const entry = this.entries.get(financialEntryId);
    return entry?.tenantId === tenantId ? entry : undefined;
  }

  async update(input: UpdateFinancialEntryInput): Promise<FinancialEntry | undefined> {
    const current = await this.findById(input.tenantId, input.financialEntryId);
    // PATCH em lançamento deletado → trata como inexistente (→404), simétrico ao re-delete.
    if (!current || current.deletedAt != null) return undefined;

    const updated: FinancialEntry = {
      ...current,
      ...definedFields({
        category: input.category,
        description: input.description,
        updatedBy: input.updatedBy,
      }),
      updatedAt: new Date(),
    };
    this.entries.set(updated.id, updated);
    return updated;
  }

  async softDelete(tenantId: string, financialEntryId: string, deletedBy?: string): Promise<FinancialEntry | undefined> {
    const current = await this.findById(tenantId, financialEntryId);
    if (!current || current.deletedAt != null) return undefined;

    const removed: FinancialEntry = {
      ...current,
      ...(deletedBy !== undefined ? { updatedBy: deletedBy } : {}),
      updatedAt: new Date(),
      deletedAt: new Date(),
    };
    this.entries.set(removed.id, removed);
    return removed;
  }

  async reconcile(input: ReconcileFinancialEntryInput): Promise<FinancialEntry | undefined> {
    const current = await this.findById(input.tenantId, input.financialEntryId);
    // reconcile em lançamento deletado → inexistente (→404), simétrico a update/softDelete.
    if (!current || current.deletedAt != null) return undefined;

    const updated: FinancialEntry = {
      ...current,
      reconciled: input.reconciled,
      // undefined (não null) para os opcionais quando limpo → some do objeto/DTO como os demais optionals.
      divergenceType: input.divergenceType ?? undefined,
      reconciliationRef: input.reconciliationRef ?? undefined,
      reconciledAt: input.reconciledAt ?? undefined,
      reconciledBy: input.reconciledBy ?? undefined,
      ...(input.updatedBy !== undefined ? { updatedBy: input.updatedBy } : {}),
      updatedAt: new Date(),
    };
    this.entries.set(updated.id, updated);
    return updated;
  }

  async findActiveReversalOf(tenantId: string, originalEntryId: string): Promise<FinancialEntry | undefined> {
    return [...this.entries.values()].find(
      (entry) => entry.tenantId === tenantId && entry.reversalOf === originalEntryId && entry.deletedAt == null,
    );
  }

  async sumByAccount(tenantId: string, accountId: string): Promise<{ readonly inflow: number; readonly outflow: number }> {
    let inflow = 0;
    let outflow = 0;
    for (const entry of this.entries.values()) {
      if (entry.tenantId !== tenantId || entry.accountId !== accountId || entry.deletedAt != null) continue;
      if (entry.direction === "in") inflow += entry.amount;
      else if (entry.direction === "out") outflow += entry.amount;
    }
    return { inflow, outflow };
  }

  reset(): void {
    this.entries.clear();
  }

  private findActiveByClientAction(tenantId: string, titleId: string, clientActionId: string): boolean {
    return [...this.entries.values()].some(
      (entry) =>
        entry.tenantId === tenantId &&
        entry.titleId === titleId &&
        entry.clientActionId === clientActionId &&
        entry.deletedAt == null,
    );
  }

  private sorted(): FinancialEntry[] {
    // Extrato ordenado por occurred_at desc, desempate por id: paginação determinística e paridade com o
    // Postgres (que sem desempate devolve ordem arbitrária). Espelha o InMemory dos vizinhos Ω4.
    return [...this.entries.values()].sort(
      (left, right) =>
        right.occurredAt.getTime() - left.occurredAt.getTime() || (left.id < right.id ? 1 : left.id > right.id ? -1 : 0),
    );
  }
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
