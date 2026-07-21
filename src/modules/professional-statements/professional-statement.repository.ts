import { randomUUID } from "node:crypto";

import type {
  CreateProfessionalStatementGroupInput,
  ProfessionalStatementEntry,
  ProfessionalStatementLedgerQuery,
} from "./professional-statement.types.js";
import { ProfessionalStatementError } from "./professional-statement.types.js";

export interface ProfessionalStatementRepository {
  // Cria um LANÇAMENTO inteiro (N parcelas com o mesmo group_id + snapshot imutável) atomicamente.
  createGroup(input: CreateProfessionalStatementGroupInput): Promise<ProfessionalStatementEntry[]>;
  // Razão de UM profissional: parcelas ATIVAS (deleted_at NULL) filtradas, ordenadas asc por due_date,created_at,id.
  findLedger(query: ProfessionalStatementLedgerQuery): Promise<ProfessionalStatementEntry[]>;
  // Parcelas ATIVAS de um lançamento (grupo), ordenadas por installment_number. Vazio = grupo inexistente/retirado.
  findGroup(tenantId: string, groupId: string): Promise<ProfessionalStatementEntry[]>;
  // Edita SÓ a description em todas as parcelas ATIVAS do grupo (único campo editável — RN-EXT-01).
  updateGroupDescription(
    tenantId: string,
    groupId: string,
    description: string,
    updatedBy?: string,
  ): Promise<ProfessionalStatementEntry[] | undefined>;
  // Soft-delete ("retirar do extrato") de TODAS as parcelas ATIVAS do grupo, atomicamente.
  softDeleteGroup(tenantId: string, groupId: string, deletedBy?: string): Promise<ProfessionalStatementEntry[] | undefined>;
  reset?(): void;
}

export function groupNotFoundError(): ProfessionalStatementError {
  return new ProfessionalStatementError(404, "PROFESSIONAL_STATEMENT_NOT_FOUND", "statement_group_not_found", "Statement entry group was not found.");
}

export function operatorProfileNotFoundError(): ProfessionalStatementError {
  return new ProfessionalStatementError(404, "PROFESSIONAL_STATEMENT_NOT_FOUND", "operator_profile_not_found", "The referenced professional was not found for this tenant.");
}

export function operatorProfileRequiredError(): ProfessionalStatementError {
  return new ProfessionalStatementError(400, "PROFESSIONAL_STATEMENT_FILTER_INVALID", "operator_profile_required", "operatorProfileId is required to read a professional statement.");
}

// RN-EXT-01 (D-Ω4C-EXTRATO-TRAVA) — trava de integridade financeira (espelha o alerta amarelo do AutEM,
// ANALISE:129). PATCH de campo financeiro sempre 409; DELETE com ≥ 1 parcela liquidada (settled) → 409.
export function statementEntryLockedError(): ProfessionalStatementError {
  return new ProfessionalStatementError(
    409,
    "PROFESSIONAL_STATEMENT_CONFLICT",
    "statement_entry_locked",
    "Este lançamento já se encontra no extrato do profissional. A exclusão e algumas alterações não podem ser feitas até que todas as parcelas sejam removidas do mesmo.",
  );
}

// Rede da idempotência de origem (índice parcial) — reservada para as integrações Multa/Dano/Remuneração; o
// AJUSTE manual tem source_id NULL e nunca colide.
export function sourceAlreadyLaunchedError(): ProfessionalStatementError {
  return new ProfessionalStatementError(409, "PROFESSIONAL_STATEMENT_CONFLICT", "source_already_launched", "An active statement entry already exists for this source installment.");
}

export function invalidOperatorProfileReferenceError(): ProfessionalStatementError {
  return new ProfessionalStatementError(400, "PROFESSIONAL_STATEMENT_INVALID", "invalid_operator_profile_reference", "The referenced professional does not exist for this tenant.");
}

export class InMemoryProfessionalStatementRepository implements ProfessionalStatementRepository {
  private readonly entries = new Map<string, ProfessionalStatementEntry>();

  async createGroup(input: CreateProfessionalStatementGroupInput): Promise<ProfessionalStatementEntry[]> {
    const now = new Date();
    const created: ProfessionalStatementEntry[] = [];
    for (const installment of input.installments) {
      const entry: ProfessionalStatementEntry = {
        id: randomUUID(),
        tenantId: input.tenantId,
        operatorProfileId: input.operatorProfileId,
        groupId: input.groupId,
        entryType: input.entryType,
        direction: input.direction,
        description: input.description,
        amount: installment.amount,
        currency: input.currency,
        installmentNumber: installment.installmentNumber,
        installmentTotal: installment.installmentTotal,
        dueDate: installment.dueDate,
        competencia: installment.competencia,
        status: "pending",
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        clientActionId: input.clientActionId,
        createdBy: input.createdBy,
        updatedBy: input.updatedBy,
        createdAt: now,
        updatedAt: now,
      };
      this.entries.set(entry.id, entry);
      created.push(entry);
    }
    return created.sort((left, right) => left.installmentNumber - right.installmentNumber);
  }

  async findLedger(query: ProfessionalStatementLedgerQuery): Promise<ProfessionalStatementEntry[]> {
    return [...this.entries.values()]
      .filter((entry) => entry.tenantId === query.tenantId)
      .filter((entry) => entry.operatorProfileId === query.operatorProfileId)
      .filter((entry) => entry.deletedAt === undefined)
      .filter((entry) => query.entryType === undefined || entry.entryType === query.entryType)
      .filter((entry) => query.from === undefined || entry.dueDate.getTime() >= query.from.getTime())
      .filter((entry) => query.to === undefined || entry.dueDate.getTime() <= query.to.getTime())
      .sort(byDueDateAscThenCreated);
  }

  async findGroup(tenantId: string, groupId: string): Promise<ProfessionalStatementEntry[]> {
    return [...this.entries.values()]
      .filter((entry) => entry.tenantId === tenantId && entry.groupId === groupId && entry.deletedAt === undefined)
      .sort((left, right) => left.installmentNumber - right.installmentNumber);
  }

  async updateGroupDescription(
    tenantId: string,
    groupId: string,
    description: string,
    updatedBy?: string,
  ): Promise<ProfessionalStatementEntry[] | undefined> {
    const group = await this.findGroup(tenantId, groupId);
    if (group.length === 0) return undefined;
    const now = new Date();
    for (const entry of group) {
      this.entries.set(entry.id, { ...entry, description, updatedBy: updatedBy ?? entry.updatedBy, updatedAt: now });
    }
    return this.findGroup(tenantId, groupId);
  }

  async softDeleteGroup(tenantId: string, groupId: string, deletedBy?: string): Promise<ProfessionalStatementEntry[] | undefined> {
    const group = await this.findGroup(tenantId, groupId);
    if (group.length === 0) return undefined;
    const now = new Date();
    const removed: ProfessionalStatementEntry[] = [];
    for (const entry of group) {
      const updated = { ...entry, deletedAt: now, updatedBy: deletedBy ?? entry.updatedBy, updatedAt: now };
      this.entries.set(entry.id, updated);
      removed.push(updated);
    }
    return removed.sort((left, right) => left.installmentNumber - right.installmentNumber);
  }

  reset(): void {
    this.entries.clear();
  }

  // Fixture-only (PR-03): marca uma parcela como liquidada (settled). A transição real pending→settled é da
  // Remuneração/folha (PR-14/15); aqui serve só para provar a trava RN-EXT-01 do DELETE (≥ 1 settled → 409).
  settleInstallmentForTests(tenantId: string, groupId: string, installmentNumber: number): boolean {
    for (const entry of this.entries.values()) {
      if (
        entry.tenantId === tenantId &&
        entry.groupId === groupId &&
        entry.installmentNumber === installmentNumber &&
        entry.deletedAt === undefined
      ) {
        this.entries.set(entry.id, { ...entry, status: "settled", settledAt: new Date() });
        return true;
      }
    }
    return false;
  }
}

function byDueDateAscThenCreated(left: ProfessionalStatementEntry, right: ProfessionalStatementEntry): number {
  const byDue = left.dueDate.getTime() - right.dueDate.getTime();
  if (byDue !== 0) return byDue;
  const byCreated = left.createdAt.getTime() - right.createdAt.getTime();
  if (byCreated !== 0) return byCreated;
  return left.id.localeCompare(right.id);
}
