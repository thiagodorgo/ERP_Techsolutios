import { randomUUID } from "node:crypto";

import type {
  Cheque,
  CreateChequeInput,
  ListChequeInput,
  ListChequeResult,
  TransitionChequeInput,
  UpdateChequeInput,
} from "./cheque.types.js";
import { ChequeError } from "./cheque.types.js";

export interface ChequeRepository {
  create(input: CreateChequeInput): Promise<Cheque>;
  list(input: ListChequeInput): Promise<ListChequeResult>;
  findById(tenantId: string, chequeId: string): Promise<Cheque | undefined>;
  update(input: UpdateChequeInput): Promise<Cheque | undefined>;
  softDelete(tenantId: string, chequeId: string, deletedBy?: string): Promise<Cheque | undefined>;
  // MUTEX contra dupla-postagem: flip ATÔMICO de status só efetiva se o status ATUAL == fromStatus (e não
  // deletado). Retorna a linha atualizada ou undefined (perdeu a corrida / status já mudou). No InMemory é
  // um check-and-set SÍNCRONO (sem await no meio → atômico no event-loop); no Prisma é updateMany + rowcount.
  transition(input: TransitionChequeInput): Promise<Cheque | undefined>;
  // Vincula o lançamento postado ao cheque JÁ em 'cleared' (2º passo do clear, após o create ter sucesso).
  attachClearingEntry(tenantId: string, chequeId: string, entryId: string, updatedBy?: string): Promise<Cheque | undefined>;
  // Vincula o contra-lançamento ao cheque JÁ em 'bounced' (2º passo do bounce-após-clear).
  attachBounceEntry(tenantId: string, chequeId: string, entryId: string, updatedBy?: string): Promise<Cheque | undefined>;
  reset?(): void;
}

// Leitor da Conta financeira (moeda/atividade) para validar o cheque no REGISTRO — garante que o cheque
// nasce compensável (conta existe+ativa, moeda casa). Reusa o contrato do módulo de lançamentos.
export type { AccountReader, FinancialAccountRef } from "../financial-entries/financial-entry.repository.js";

export function chequeNotFoundError(): ChequeError {
  return new ChequeError(404, "CHEQUE_NOT_FOUND", "cheque_not_found", "Cheque was not found.");
}

export function invalidTransitionError(from: string, to: string): ChequeError {
  return new ChequeError(422, "CHEQUE_UNPROCESSABLE", "invalid_transition", `A cheque in status ${from} cannot transition to ${to}.`);
}

// Perdeu a corrida: o status mudou entre a leitura e o flip condicional (dois operadores no mesmo cheque).
export function transitionConflictError(): ChequeError {
  return new ChequeError(409, "CHEQUE_CONFLICT", "transition_conflict", "The cheque status changed concurrently; retry the operation.");
}

export function chequeNotEditableError(): ChequeError {
  return new ChequeError(422, "CHEQUE_UNPROCESSABLE", "cheque_not_editable", "Only a registered cheque can be edited or deleted.");
}

export function invalidAccountReferenceError(): ChequeError {
  return new ChequeError(400, "CHEQUE_INVALID", "invalid_account_reference", "The referenced financial account does not exist for this tenant.");
}

export function accountInactiveError(): ChequeError {
  return new ChequeError(422, "CHEQUE_UNPROCESSABLE", "account_inactive", "The referenced financial account is inactive.");
}

export class InMemoryChequeRepository implements ChequeRepository {
  private readonly cheques = new Map<string, Cheque>();

  async create(input: CreateChequeInput): Promise<Cheque> {
    const now = new Date();
    const cheque: Cheque = {
      id: randomUUID(),
      tenantId: input.tenantId,
      accountId: input.accountId,
      direction: input.direction,
      chequeNumber: input.chequeNumber,
      bank: input.bank,
      amount: input.amount,
      currency: input.currency,
      dueDate: input.dueDate,
      // status nasce SEMPRE 'registered' (nunca vem do corpo).
      status: "registered",
      notes: input.notes,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
      createdAt: now,
      updatedAt: now,
      deletedAt: undefined,
    };
    this.cheques.set(cheque.id, cheque);
    return cheque;
  }

  async list(input: ListChequeInput): Promise<ListChequeResult> {
    const filtered = this.sorted()
      .filter((cheque) => cheque.tenantId === input.tenantId)
      .filter((cheque) => (input.includeDeleted ? true : cheque.deletedAt == null))
      .filter((cheque) => input.accountId === undefined || cheque.accountId === input.accountId)
      .filter((cheque) => input.direction === undefined || cheque.direction === input.direction)
      .filter((cheque) => input.status === undefined || cheque.status === input.status);

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, chequeId: string): Promise<Cheque | undefined> {
    const cheque = this.cheques.get(chequeId);
    return cheque?.tenantId === tenantId ? cheque : undefined;
  }

  async update(input: UpdateChequeInput): Promise<Cheque | undefined> {
    const current = await this.findById(input.tenantId, input.chequeId);
    if (!current || current.deletedAt != null) return undefined;
    // A checagem "editável só quando 'registered'" vive no SERVIÇO (paridade com o Prisma). Aqui só grava.

    const updated: Cheque = {
      ...current,
      ...(input.chequeNumber !== undefined ? { chequeNumber: input.chequeNumber } : {}),
      ...(input.bank !== undefined ? { bank: input.bank } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate ?? undefined } : {}),
      ...(input.notes !== undefined ? { notes: input.notes ?? undefined } : {}),
      ...(input.updatedBy !== undefined ? { updatedBy: input.updatedBy } : {}),
      updatedAt: new Date(),
    };
    this.cheques.set(updated.id, updated);
    return updated;
  }

  async softDelete(tenantId: string, chequeId: string, deletedBy?: string): Promise<Cheque | undefined> {
    const current = await this.findById(tenantId, chequeId);
    if (!current || current.deletedAt != null) return undefined;
    // "Só 'registered' pode ser removido" é checado no SERVIÇO (assertEditable → 422) antes daqui.

    const removed: Cheque = {
      ...current,
      ...(deletedBy !== undefined ? { updatedBy: deletedBy } : {}),
      updatedAt: new Date(),
      deletedAt: new Date(),
    };
    this.cheques.set(removed.id, removed);
    return removed;
  }

  // Check-and-set SÍNCRONO (nenhum await entre a leitura e a escrita → atômico no event-loop single-thread):
  // dois clears concorrentes — o 1º flipa deposited→cleared; o 2º vê status='cleared' ≠ 'deposited' → undefined.
  async transition(input: TransitionChequeInput): Promise<Cheque | undefined> {
    const current = this.cheques.get(input.chequeId);
    if (!current || current.tenantId !== input.tenantId || current.deletedAt != null) return undefined;
    if (current.status !== input.fromStatus) return undefined;

    const updated: Cheque = {
      ...current,
      status: input.toStatus,
      ...(input.clearedEntryId !== undefined ? { clearedEntryId: input.clearedEntryId ?? undefined } : {}),
      ...(input.bounceEntryId !== undefined ? { bounceEntryId: input.bounceEntryId ?? undefined } : {}),
      ...(input.bounceReason !== undefined ? { bounceReason: input.bounceReason ?? undefined } : {}),
      ...(input.updatedBy !== undefined ? { updatedBy: input.updatedBy } : {}),
      updatedAt: new Date(),
    };
    this.cheques.set(updated.id, updated);
    return updated;
  }

  async attachClearingEntry(tenantId: string, chequeId: string, entryId: string, updatedBy?: string): Promise<Cheque | undefined> {
    return this.attachEntry(tenantId, chequeId, "cleared", { clearedEntryId: entryId }, updatedBy);
  }

  async attachBounceEntry(tenantId: string, chequeId: string, entryId: string, updatedBy?: string): Promise<Cheque | undefined> {
    return this.attachEntry(tenantId, chequeId, "bounced", { bounceEntryId: entryId }, updatedBy);
  }

  reset(): void {
    this.cheques.clear();
  }

  private attachEntry(
    tenantId: string,
    chequeId: string,
    expectedStatus: string,
    patch: { readonly clearedEntryId?: string; readonly bounceEntryId?: string },
    updatedBy?: string,
  ): Cheque | undefined {
    const current = this.cheques.get(chequeId);
    // deletedAt checado para paridade estrita com o Prisma (WHERE deleted_at IS NULL) — inalcançável hoje
    // (cheque cleared/bounced não é soft-deletável) mas mantém o contrato dos dois repositórios idêntico.
    if (!current || current.tenantId !== tenantId || current.status !== expectedStatus || current.deletedAt != null) return undefined;
    const updated: Cheque = {
      ...current,
      ...patch,
      ...(updatedBy !== undefined ? { updatedBy } : {}),
      updatedAt: new Date(),
    };
    this.cheques.set(updated.id, updated);
    return updated;
  }

  private sorted(): Cheque[] {
    // due_date desc (nulls por último), desempate por id: paginação determinística e paridade com o Postgres.
    return [...this.cheques.values()].sort((left, right) => {
      const l = left.dueDate ? left.dueDate.getTime() : -Infinity;
      const r = right.dueDate ? right.dueDate.getTime() : -Infinity;
      return r - l || (left.id < right.id ? 1 : left.id > right.id ? -1 : 0);
    });
  }
}
