import { randomUUID } from "node:crypto";

import type {
  ApplyTitlePaymentInput,
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
  // Ω4-3 (D-Ω4-C2) — título ATIVO (deleted_at NULL) de uma OS+direção. Sustenta o PRE-CHECK de
  // idempotência do faturamento (a rede real é o índice parcial → P2002).
  findActiveByWorkOrder(tenantId: string, workOrderId: string, direction: string): Promise<FinancialTitle | undefined>;
  update(input: UpdateFinancialTitleInput): Promise<FinancialTitle | undefined>;
  changeStatus(input: ChangeFinancialTitleStatusInput): Promise<FinancialTitle | undefined>;
  // Ω4-4 — WRITE-PATH da liquidação: paid_amount + status juntos (contorna a máquina de status).
  applyPayment(input: ApplyTitlePaymentInput): Promise<FinancialTitle | undefined>;
  softDelete(tenantId: string, financialTitleId: string, deletedBy?: string): Promise<FinancialTitle | undefined>;
  reset?(): void;
}

// CHOKEPOINT (D-Ω4-A3) — fonte da verdade do fechamento de período. Ω4-6 povoa a tabela (fechar/reabrir);
// a fiação é REAL: toda escrita de título/lançamento consulta isPeriodClosed.
export interface FinancialPeriodCloseRepository {
  isPeriodClosed(tenantId: string, period: string): Promise<boolean>;
  reset?(): void;
}

// Ω4-6 — LINHA COMPLETA do fechamento de período. O singleton InMemory (compartilhado pelo guard E pelo
// endpoint de Ω4-6) guarda o record inteiro; a definição vive AQUI (financial-titles é importado PELO módulo
// de fechamento, nunca o contrário → sem ciclo). `snapshot` é JSON opaco (o módulo de fechamento tipa como
// StoredSnapshot). `closingStartedAt` é reservado (defensivo/futuro; v1 nunca o escreve).
export type FinancialPeriodCloseRow = {
  id: string;
  tenantId: string;
  period: string;
  status: string;
  closedAt?: Date;
  closedBy?: string;
  reopenedAt?: Date;
  reopenedBy?: string;
  reopenReason?: string;
  closingStartedAt?: Date;
  snapshot?: unknown;
  createdAt: Date;
  updatedAt: Date;
};

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

// Ω4-4 — guards da LIQUIDAÇÃO (dinheiro entra/sai contra um título).
export function titleCancelledError(): FinancialTitleError {
  return new FinancialTitleError(422, "FINANCIAL_TITLE_UNPROCESSABLE", "title_cancelled", "A cancelled financial title cannot be settled.");
}

export function titleAlreadyPaidError(): FinancialTitleError {
  return new FinancialTitleError(422, "FINANCIAL_TITLE_UNPROCESSABLE", "title_already_paid", "This financial title is already fully paid.");
}

export function overpaymentError(): FinancialTitleError {
  return new FinancialTitleError(422, "FINANCIAL_TITLE_UNPROCESSABLE", "overpayment", "Payment amount exceeds the outstanding balance of the title.");
}

// Ω4-3 (D-Ω4-C2) — rede do índice PARCIAL de idempotência: um 2º título ATIVO para a mesma OS+direção.
// 409 no nível do título; o módulo de faturamento traduz para `already_invoiced` na resposta da rota.
export function workOrderAlreadyInvoicedError(): FinancialTitleError {
  return new FinancialTitleError(
    409,
    "FINANCIAL_TITLE_CONFLICT",
    "work_order_already_invoiced",
    "An active financial title already exists for this work order and direction.",
  );
}

export class InMemoryFinancialTitleRepository implements FinancialTitleRepository {
  private readonly titles = new Map<string, FinancialTitle>();

  async create(input: CreateFinancialTitleInput): Promise<FinancialTitle> {
    // Ω4-3 (D-Ω4-C2) — SIMULA o índice PARCIAL do Postgres (unique tenant+work_order+direction WHERE
    // deleted_at IS NULL AND work_order_id IS NOT NULL): rejeita um 2º título ATIVO da mesma OS+direção.
    // Só o caminho de faturamento popula workOrderId; o create público o deixa undefined (fora do índice).
    if (input.workOrderId && (await this.findActiveByWorkOrder(input.tenantId, input.workOrderId, input.direction))) {
      throw workOrderAlreadyInvoicedError();
    }

    const now = new Date();
    const title: FinancialTitle = {
      ...input,
      id: randomUUID(),
      // paid_amount nasce SEMPRE 0 (dirigido por pagamentos no Ω4-4). work_order_id vem do faturamento
      // (Ω4-3, createForWorkOrder); service_quote_id ainda NÃO tem caminho de escrita (sempre undefined).
      paidAmount: 0,
      workOrderId: input.workOrderId,
      serviceQuoteId: undefined,
      createdAt: now,
      updatedAt: now,
      deletedAt: undefined,
    };
    this.titles.set(title.id, title);
    return title;
  }

  async findActiveByWorkOrder(tenantId: string, workOrderId: string, direction: string): Promise<FinancialTitle | undefined> {
    return [...this.titles.values()].find(
      (title) =>
        title.tenantId === tenantId &&
        title.workOrderId === workOrderId &&
        title.direction === direction &&
        title.deletedAt == null,
    );
  }

  // Ω4-6 — leitura ESTREITA por competência (títulos ATIVOS do tenant nessa competência) que alimenta o
  // snapshot de fechamento. tenant_id filtrado EXPLICITAMENTE (g/ataque), não só por confiança em camada acima.
  async findByCompetencia(tenantId: string, competencia: string): Promise<FinancialTitle[]> {
    return [...this.titles.values()].filter(
      (title) => title.tenantId === tenantId && title.competencia === competencia && title.deletedAt == null,
    );
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

  async applyPayment(input: ApplyTitlePaymentInput): Promise<FinancialTitle | undefined> {
    const current = await this.findById(input.tenantId, input.financialTitleId);
    if (!current || current.deletedAt != null) return undefined;

    // Ω4-4 — grava paid_amount ABSOLUTO + status juntos, contornando a máquina de status (o service já
    // validou a invariante paid_amount <= amount). Único caminho a alcançar partially_paid/paid.
    const updated: FinancialTitle = {
      ...current,
      paidAmount: input.paidAmount,
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
  // Ω4-6 — o Map guarda a LINHA COMPLETA (antes era só o status). setPeriodStatus segue fazendo upsert só do
  // status → os testes existentes continuam válidos; e o guard passa a ler o record inteiro.
  private readonly closes = new Map<string, FinancialPeriodCloseRow>();

  // M2 (Ω4-6) — {closing, closed} bloqueiam a escrita; {open, reopened} liberam. reconcile NÃO chama o guard
  // (financial-entry.service.ts) → fica exento por construção mesmo com o período fechado.
  async isPeriodClosed(tenantId: string, period: string): Promise<boolean> {
    const row = this.closes.get(closeKey(tenantId, period));
    return row != null && (row.status === "closed" || row.status === "closing");
  }

  // Helper (testes + fiação do Ω4-6): registra SÓ o status de fechamento de uma competência do tenant (upsert).
  setPeriodStatus(tenantId: string, period: string, status: string): void {
    const key = closeKey(tenantId, period);
    const existing = this.closes.get(key);
    const now = new Date();
    if (existing) {
      this.closes.set(key, { ...existing, status, updatedAt: now });
      return;
    }
    this.closes.set(key, { id: randomUUID(), tenantId, period, status, createdAt: now, updatedAt: now });
  }

  // Ω4-6 STORE — find/create/update/list da linha de fechamento (o módulo financial-period-closes delega a
  // este singleton para compartilhar UM estado com o guard).
  findRow(tenantId: string, period: string): FinancialPeriodCloseRow | undefined {
    return this.closes.get(closeKey(tenantId, period));
  }

  createRow(row: FinancialPeriodCloseRow): FinancialPeriodCloseRow {
    this.closes.set(closeKey(row.tenantId, row.period), row);
    return row;
  }

  updateRow(row: FinancialPeriodCloseRow): FinancialPeriodCloseRow {
    this.closes.set(closeKey(row.tenantId, row.period), row);
    return row;
  }

  listRows(tenantId: string): FinancialPeriodCloseRow[] {
    return [...this.closes.values()]
      .filter((row) => row.tenantId === tenantId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime() || (left.id < right.id ? 1 : left.id > right.id ? -1 : 0));
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
