import { randomUUID } from "node:crypto";

import type {
  Cheque,
  CreateChequeInput,
  ListChequeInput,
  ListChequeResult,
  TransitionChequeInput,
  UpdateChequeInput,
} from "./cheque.types.js";
import { CHEQUE_ENTRY_LINK_FIELDS, ChequeError } from "./cheque.types.js";

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
  // B-O6R-02 ciclo 2 · C2 (Ω6R-DIN-011) — cheque ATIVO que REFERENCIA este lançamento, por qualquer
  // das duas pontas (cleared_entry_id OU bounce_entry_id). É a leitura que sustenta o guard da
  // superfície de LANÇAMENTOS: sem ela, `delete`/`reverse` nunca souberam que o lançamento pertencia
  // à máquina de estados de um cheque, e desfaziam o dinheiro por fora dela (devolução em dobro).
  findActiveByLinkedEntry(tenantId: string, entryId: string): Promise<Cheque | undefined>;
  // B-SAN3-12a (§4.2) — o CONJUNTO "cheque pendente do título": cheques ATIVOS (deleted_at IS NULL) com
  // title_id = titleId e status ∈ {registered, deposited}. Leitura (não trava): sustenta a recusa da baixa manual
  // (fast-fail pelo pool, re-check pela unidade) e a porta estreita do título (cheque-pending-reader).
  findPendingByTitle(tenantId: string, titleId: string): Promise<readonly Cheque[]>;
  reset?(): void;
}

// B-SAN3-12a (§4.2) — os status que mantêm um cheque vinculado no conjunto pendente do título. Fonte única para as
// duas cópias do repositório (memória e Prisma) e para o resumo financeiro.
export const CHEQUE_PENDING_STATUSES = ["registered", "deposited"] as const;

// B-SAN3-12a (§4.3) — o desvínculo do título é uma escrita PRÓPRIA, fora do contrato `ChequeRepository` (não roda na
// unidade de trabalho: é um CAS de uma linha só). CAS de estado: só desvincula se o cheque ainda está pendente
// (registered|deposited), ativo e vinculado AO MESMO título que o serviço leu. 0 linhas → undefined (409 no serviço).
export interface ChequeTitleUnlinker {
  unlinkTitle(input: {
    readonly tenantId: string;
    readonly chequeId: string;
    readonly expectedTitleId: string;
    readonly updatedBy?: string;
  }): Promise<Cheque | undefined>;
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

export function invalidTitleReferenceError(): ChequeError {
  return new ChequeError(400, "CHEQUE_INVALID", "invalid_title_reference", "The referenced financial title does not exist for this tenant.");
}

export function titleDirectionMismatchError(): ChequeError {
  return new ChequeError(422, "CHEQUE_UNPROCESSABLE", "title_direction_mismatch", "The cheque direction does not match the financial title direction.");
}

export function accountInactiveError(): ChequeError {
  return new ChequeError(422, "CHEQUE_UNPROCESSABLE", "account_inactive", "The referenced financial account is inactive.");
}

// B-SAN3-12a (§4.2, decisão do dono 25/10 "Só cheque do valor exato") — o cheque só se vincula ao título se o valor
// dele for IGUAL ao saldo aberto (amount − paidAmount). `details` diz os dois números (nada de tenant/token).
export function chequeAmountMismatchError(chequeAmount: number, openBalance: number): ChequeError {
  return new ChequeError(
    422,
    "CHEQUE_UNPROCESSABLE",
    "cheque_amount_mismatch",
    "A cheque can only be linked to a financial title when its amount equals the title open balance.",
    { chequeAmount, openBalance },
  );
}

// B-SAN3-12a (§4.3, decisão do dono 25/10 "Mesmo privilégio da troca") — cancelar/excluir um cheque VINCULADO é troca
// de instrumento: só depois do desvínculo (POST /cheques/:id/unlink-title), para TODO ator.
export function chequeLinkedUnlinkFirstError(): ChequeError {
  return new ChequeError(
    422,
    "CHEQUE_UNPROCESSABLE",
    "cheque_linked_unlink_first",
    "A cheque linked to a financial title must be unlinked before it is cancelled or deleted.",
  );
}

export function chequeNotLinkedError(): ChequeError {
  return new ChequeError(422, "CHEQUE_UNPROCESSABLE", "cheque_not_linked", "The cheque is not linked to a financial title.");
}

export function chequeNotUnlinkableError(): ChequeError {
  return new ChequeError(
    422,
    "CHEQUE_UNPROCESSABLE",
    "cheque_not_unlinkable",
    "Only a registered or deposited cheque can be unlinked from its financial title.",
  );
}

export function chequeWriteConflictError(): ChequeError {
  return new ChequeError(409, "CHEQUE_CONFLICT", "cheque_write_conflict", "The cheque changed concurrently; reload and retry.");
}

export function invalidJustificationError(): ChequeError {
  return new ChequeError(400, "CHEQUE_INVALID", "invalid_justification", "justification is required (10 to 500 characters).");
}

export function unlinkRequiresPrivilegeError(): ChequeError {
  return new ChequeError(
    403,
    "CHEQUE_FORBIDDEN",
    "unlink_requires_privilege",
    "Removing or replacing the financial title of a cheque requires the cheque unlink permission.",
  );
}

export class InMemoryChequeRepository implements ChequeRepository, ChequeTitleUnlinker {
  private readonly cheques = new Map<string, Cheque>();

  async create(input: CreateChequeInput): Promise<Cheque> {
    const now = new Date();
    const cheque: Cheque = {
      id: randomUUID(),
      tenantId: input.tenantId,
      accountId: input.accountId,
      titleId: input.titleId,
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
      .filter((cheque) => input.titleId === undefined || cheque.titleId === input.titleId)
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

  // B-SAN3-20 (D1′) — check-and-set SÍNCRONO, como `transition`: nenhum await entre ler a linha e gravar.
  // Ler por `await this.findById(...)` abriria uma janela em que uma transição intercalada (deposit/clear)
  // seria sobrescrita pela cópia velha — o equivalente em memória do `WHERE status = 'registered'`.
  async update(input: UpdateChequeInput): Promise<Cheque | undefined> {
    const current = this.cheques.get(input.chequeId);
    if (!current || current.tenantId !== input.tenantId || current.deletedAt != null) return undefined;
    if (current.status !== "registered") return undefined;

    const updated: Cheque = {
      ...current,
      ...(input.chequeNumber !== undefined ? { chequeNumber: input.chequeNumber } : {}),
      ...(input.bank !== undefined ? { bank: input.bank } : {}),
      ...(input.titleId !== undefined ? { titleId: input.titleId ?? undefined } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate ?? undefined } : {}),
      ...(input.notes !== undefined ? { notes: input.notes ?? undefined } : {}),
      ...(input.updatedBy !== undefined ? { updatedBy: input.updatedBy } : {}),
      updatedAt: new Date(),
    };
    this.cheques.set(updated.id, updated);
    return updated;
  }

  async softDelete(tenantId: string, chequeId: string, deletedBy?: string): Promise<Cheque | undefined> {
    const current = this.cheques.get(chequeId);
    if (!current || current.tenantId !== tenantId || current.deletedAt != null) return undefined;
    if (current.status !== "registered") return undefined;

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

  // B-O6R-02 ciclo 3 · C2 (P5) — as pontas vêm da FONTE ÚNICA (`CHEQUE_ENTRY_LINK_FIELDS`), não de
  // um literal escrito à mão. A cópia anterior (`clearedEntryId === entryId || bounceEntryId ===
  // entryId`) e a do Prisma eram duas listas manuais que precisavam concordar: ponta nova entrava
  // numa e não na outra, e a divergência nascia PERMITIDA. Agora ponta nova aparece nas duas no
  // mesmo commit, porque as duas iteram o mesmo derivado.
  async findActiveByLinkedEntry(tenantId: string, entryId: string): Promise<Cheque | undefined> {
    return [...this.cheques.values()].find(
      (cheque) =>
        cheque.tenantId === tenantId &&
        cheque.deletedAt == null &&
        CHEQUE_ENTRY_LINK_FIELDS.some((field) => cheque[field] === entryId),
    );
  }

  async findPendingByTitle(tenantId: string, titleId: string): Promise<readonly Cheque[]> {
    return this.sorted().filter(
      (cheque) =>
        cheque.tenantId === tenantId &&
        cheque.deletedAt == null &&
        cheque.titleId === titleId &&
        (CHEQUE_PENDING_STATUSES as readonly string[]).includes(cheque.status),
    );
  }

  // Check-and-set SÍNCRONO (nenhum await entre ler e gravar), como `transition`.
  async unlinkTitle(input: {
    readonly tenantId: string;
    readonly chequeId: string;
    readonly expectedTitleId: string;
    readonly updatedBy?: string;
  }): Promise<Cheque | undefined> {
    const current = this.cheques.get(input.chequeId);
    if (!current || current.tenantId !== input.tenantId || current.deletedAt != null) return undefined;
    if (!(CHEQUE_PENDING_STATUSES as readonly string[]).includes(current.status)) return undefined;
    if (current.titleId !== input.expectedTitleId) return undefined;
    const updated: Cheque = {
      ...current,
      titleId: undefined,
      ...(input.updatedBy !== undefined ? { updatedBy: input.updatedBy } : {}),
      updatedAt: new Date(),
    };
    this.cheques.set(updated.id, updated);
    return updated;
  }

  reset(): void {
    this.cheques.clear();
  }

  // B-O6R-02 F5 — par snapshot/restore do UNDO-LOG do runner de memória (financial-uow). Dublê honesto:
  // NÃO é evidência de atomicidade (a prova real é a suíte -db contra Postgres); existe só para o
  // rollback dos fluxos multi-write do cheque (clear/bounce) manter as provas de memória vivas.
  // Escopo por tenant, cópia rasa por linha (linhas tratadas como imutáveis — sempre `set` de objeto novo).
  snapshotTenantForUow(tenantId: string): Cheque[] {
    return [...this.cheques.values()].filter((cheque) => cheque.tenantId === tenantId).map((cheque) => ({ ...cheque }));
  }

  restoreTenantForUow(tenantId: string, rows: readonly Cheque[]): void {
    for (const [id, cheque] of [...this.cheques]) {
      if (cheque.tenantId === tenantId) this.cheques.delete(id);
    }
    for (const row of rows) this.cheques.set(row.id, { ...row });
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
