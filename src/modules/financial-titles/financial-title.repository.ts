import { randomUUID } from "node:crypto";

import type {
  ChangeFinancialTitleStatusInput,
  CreateFinancialTitleInput,
  FinancialTitle,
  ListFinancialTitleInput,
  ListFinancialTitleResult,
  UpdateFinancialTitleInput,
} from "./financial-title.types.js";
import { FinancialTitleError } from "./financial-title.types.js";
import { isTitleOverdue } from "./financial-title.validators.js";

export interface FinancialTitleRepository {
  create(input: CreateFinancialTitleInput): Promise<FinancialTitle>;
  list(input: ListFinancialTitleInput): Promise<ListFinancialTitleResult>;
  findById(tenantId: string, financialTitleId: string): Promise<FinancialTitle | undefined>;
  update(input: UpdateFinancialTitleInput): Promise<FinancialTitle | undefined>;
  changeStatus(input: ChangeFinancialTitleStatusInput): Promise<FinancialTitle | undefined>;
  softDelete(tenantId: string, financialTitleId: string, deletedBy?: string): Promise<FinancialTitle | undefined>;
  reset?(): void;
}

// CHOKEPOINT (D-Ω4-A3) — fonte da verdade do fechamento de período. Nesta fatia NÃO há endpoint de
// escrita (Ω4-6 povoa a tabela); a fiação já é REAL: toda escrita de título consulta isPeriodClosed.
export interface FinancialPeriodCloseRepository {
  isPeriodClosed(tenantId: string, period: string): Promise<boolean>;
  reset?(): void;
}

export function titleNotFoundError(): FinancialTitleError {
  return new FinancialTitleError(404, "FINANCIAL_TITLE_NOT_FOUND", "title_not_found", "Financial title was not found.");
}

export function invalidAccountReferenceError(): FinancialTitleError {
  return new FinancialTitleError(
    400,
    "FINANCIAL_TITLE_INVALID",
    "invalid_account_reference",
    "The referenced financial account does not exist for this tenant.",
  );
}

export function periodClosedError(competencia: string): FinancialTitleError {
  return new FinancialTitleError(
    422,
    "FINANCIAL_TITLE_UNPROCESSABLE",
    "period_closed",
    `The financial period ${competencia} is closed for new entries.`,
  );
}

export class InMemoryFinancialTitleRepository implements FinancialTitleRepository {
  private readonly titles = new Map<string, FinancialTitle>();

  async create(input: CreateFinancialTitleInput): Promise<FinancialTitle> {
    const now = new Date();
    const title: FinancialTitle = {
      ...input,
      id: randomUUID(),
      // paid_amount nasce SEMPRE 0 (dirigido por pagamentos no Ω4-4); work_order/service_quote no Ω4-3.
      paidAmount: 0,
      workOrderId: undefined,
      serviceQuoteId: undefined,
      createdAt: now,
      updatedAt: now,
      deletedAt: undefined,
    };
    this.titles.set(title.id, title);
    return title;
  }

  async list(input: ListFinancialTitleInput): Promise<ListFinancialTitleResult> {
    const now = new Date();
    const filtered = this.sorted()
      .filter((title) => title.tenantId === input.tenantId)
      .filter((title) => (input.includeDeleted ? true : title.deletedAt == null))
      .filter((title) => input.direction === undefined || title.direction === input.direction)
      .filter((title) => input.status === undefined || title.status === input.status)
      .filter((title) => input.partyType === undefined || title.partyType === input.partyType)
      .filter((title) => input.overdue === undefined || isTitleOverdue(title.status, title.dueDate, now) === input.overdue)
      .filter((title) => input.dueFrom === undefined || title.dueDate.getTime() >= input.dueFrom.getTime())
      .filter((title) => input.dueTo === undefined || title.dueDate.getTime() <= input.dueTo.getTime());

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, financialTitleId: string): Promise<FinancialTitle | undefined> {
    const title = this.titles.get(financialTitleId);
    return title?.tenantId === tenantId ? title : undefined;
  }

  async update(input: UpdateFinancialTitleInput): Promise<FinancialTitle | undefined> {
    const current = await this.findById(input.tenantId, input.financialTitleId);
    // PATCH em título deletado → trata como inexistente (→404), simétrico ao re-delete (lição M1 do Ω4-1).
    if (!current || current.deletedAt != null) return undefined;

    const updated: FinancialTitle = {
      ...current,
      ...definedFields({
        partyName: input.partyName,
        document: input.document,
        category: input.category,
        description: input.description,
        amount: input.amount,
        dueDate: input.dueDate,
        accountId: input.accountId,
        updatedBy: input.updatedBy,
      }),
      updatedAt: new Date(),
    };
    this.titles.set(updated.id, updated);
    return updated;
  }

  async changeStatus(input: ChangeFinancialTitleStatusInput): Promise<FinancialTitle | undefined> {
    const current = await this.findById(input.tenantId, input.financialTitleId);
    if (!current || current.deletedAt != null) return undefined;

    const updated: FinancialTitle = {
      ...current,
      status: input.status,
      ...(input.updatedBy !== undefined ? { updatedBy: input.updatedBy } : {}),
      updatedAt: new Date(),
    };
    this.titles.set(updated.id, updated);
    return updated;
  }

  async softDelete(tenantId: string, financialTitleId: string, deletedBy?: string): Promise<FinancialTitle | undefined> {
    const current = await this.findById(tenantId, financialTitleId);
    // Já deletado → trata como inexistente (re-delete → 404).
    if (!current || current.deletedAt != null) return undefined;

    const removed: FinancialTitle = {
      ...current,
      ...(deletedBy !== undefined ? { updatedBy: deletedBy } : {}),
      updatedAt: new Date(),
      deletedAt: new Date(),
    };
    this.titles.set(removed.id, removed);
    return removed;
  }

  reset(): void {
    this.titles.clear();
  }

  private sorted(): FinancialTitle[] {
    // Desempate por id quando created_at empata (mesmo ms): paginação determinística e paridade com o
    // Postgres (que sem desempate devolve ordem arbitrária). Espelha o InMemory do Ω4-1.
    return [...this.titles.values()].sort(
      (left, right) => right.createdAt.getTime() - left.createdAt.getTime() || (left.id < right.id ? 1 : left.id > right.id ? -1 : 0),
    );
  }
}

export class InMemoryFinancialPeriodCloseRepository implements FinancialPeriodCloseRepository {
  private readonly closes = new Map<string, string>();

  async isPeriodClosed(tenantId: string, period: string): Promise<boolean> {
    return this.closes.get(closeKey(tenantId, period)) === "closed";
  }

  // Helper (testes + futura fiação do Ω4-6): registra o status de fechamento de uma competência do tenant.
  setPeriodStatus(tenantId: string, period: string, status: string): void {
    this.closes.set(closeKey(tenantId, period), status);
  }

  reset(): void {
    this.closes.clear();
  }
}

function closeKey(tenantId: string, period: string): string {
  return `${tenantId}:${period}`;
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
