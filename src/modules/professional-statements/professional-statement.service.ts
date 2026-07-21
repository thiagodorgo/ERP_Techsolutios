import { randomUUID } from "node:crypto";

import { env } from "../../config/env.js";
import { getMemoryOperatorProfileRepositoryForTests } from "../operator-profiles/operator-profile.service.js";
import {
  InMemoryProfessionalStatementRepository,
  groupNotFoundError,
  operatorProfileNotFoundError,
  operatorProfileRequiredError,
  statementEntryLockedError,
  type ProfessionalStatementRepository,
} from "./professional-statement.repository.js";
import type {
  OperatorProfileLookup,
  ProfessionalStatementActorContext,
  ProfessionalStatementEntry,
  ProfessionalStatementSummary,
} from "./professional-statement.types.js";
import {
  buildInstallmentPlan,
  parseAmount,
  parseCurrency,
  parseDirection,
  parseFilterToken,
  parseFirstDueDate,
  parseInstallmentTotal,
  parseLimit,
  parseOffset,
  parseOptionalClientActionId,
  parseOptionalFilterDate,
  parseRequiredDescription,
  parseRequiredUuid,
  roundMoney,
} from "./professional-statement.validators.js";

type RawRecord = Record<string, unknown>;

// RN-EXT-01 — chaves de campo FINANCEIRO no PATCH: qualquer uma presente trava com 409 (só description é
// editável). Cobre snake_case e camelCase.
const LOCKED_PATCH_FIELDS = [
  "amount",
  "entry_type",
  "entryType",
  "direction",
  "installment_total",
  "installmentTotal",
  "installment_number",
  "installmentNumber",
  "first_due_date",
  "firstDueDate",
  "due_date",
  "dueDate",
  "competencia",
  "source_type",
  "sourceType",
  "source_id",
  "sourceId",
  "currency",
  "operator_profile_id",
  "operatorProfileId",
  "status",
  "settled_at",
  "settledAt",
  "settlement_ref",
  "settlementRef",
] as const;

export type ProfessionalStatementLedgerResult = {
  readonly operatorProfileId: string;
  readonly professionalName: string | undefined;
  readonly summary: ProfessionalStatementSummary;
  readonly items: readonly { readonly entry: ProfessionalStatementEntry; readonly runningBalance: number }[];
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export class ProfessionalStatementService {
  constructor(
    private readonly repository: ProfessionalStatementRepository,
    private readonly operatorProfileLookup: OperatorProfileLookup,
  ) {}

  // EXT-03/EXT-05 — extrato de UM profissional. operatorProfileId OBRIGATÓRIO (400) + validado no tenant (404
  // cross-tenant). Saldo/runningBalance DERIVADOS server-side sobre o conjunto ATIVO ordenado; página fatiada.
  async getStatement(actor: ProfessionalStatementActorContext, query: RawRecord): Promise<ProfessionalStatementLedgerResult> {
    const rawOperatorProfileId = query.operator_profile_id ?? query.operatorProfileId;
    if (rawOperatorProfileId === undefined || rawOperatorProfileId === null || rawOperatorProfileId === "") {
      throw operatorProfileRequiredError();
    }
    const operatorProfileId = parseRequiredUuid(rawOperatorProfileId, "operatorProfileId");
    const professional = await this.operatorProfileLookup(actor.tenantId, operatorProfileId);
    if (!professional) {
      throw operatorProfileNotFoundError();
    }

    const limit = parseLimit(query.limit);
    const offset = parseOffset(query.offset);
    const ledger = await this.repository.findLedger({
      tenantId: actor.tenantId,
      operatorProfileId,
      entryType: parseFilterToken(query.entry_type ?? query.entryType),
      from: parseOptionalFilterDate(query.from ?? query.dueFrom),
      to: parseOptionalFilterDate(query.to ?? query.dueTo),
    });

    const { summary, itemsWithBalance } = deriveLedger(ledger);
    return {
      operatorProfileId,
      professionalName: professional.fullName,
      summary,
      items: itemsWithBalance.slice(offset, offset + limit),
      limit,
      offset,
      total: ledger.length,
    };
  }

  async getGroup(actor: ProfessionalStatementActorContext, groupId: string): Promise<ProfessionalStatementEntry[]> {
    const group = await this.repository.findGroup(actor.tenantId, parseRequiredUuid(groupId, "groupId"));
    if (group.length === 0) {
      throw groupNotFoundError();
    }
    return group;
  }

  // D-Ω4C-EXTRATO-CREATE-SCOPE — o POST público cria SÓ adjustment (AJUSTE manual). damage/fine/remuneration
  // entram só por caminhos internos das integrações (PR-09/12/13/14/15). direction explícito (débito OU crédito).
  async createAdjustment(actor: ProfessionalStatementActorContext, body: RawRecord): Promise<ProfessionalStatementEntry[]> {
    const operatorProfileId = parseRequiredUuid(body.operator_profile_id ?? body.operatorProfileId, "operator_profile_id");
    const professional = await this.operatorProfileLookup(actor.tenantId, operatorProfileId);
    if (!professional) {
      throw operatorProfileNotFoundError();
    }

    const direction = parseDirection(body.direction);
    const description = parseRequiredDescription(body.description);
    const totalAmount = parseAmount(body.amount);
    const installmentTotal = parseInstallmentTotal(body.installment_total ?? body.installmentTotal);
    const firstDueDate = parseFirstDueDate(body.first_due_date ?? body.firstDueDate);
    const currency = parseCurrency(body.currency);
    const installments = buildInstallmentPlan(totalAmount, installmentTotal, firstDueDate);

    return this.repository.createGroup({
      tenantId: actor.tenantId,
      operatorProfileId,
      groupId: randomUUID(),
      entryType: "adjustment",
      direction,
      description,
      currency,
      // AJUSTE manual: source_type='manual', source_id NULL (sempre livre da idempotência de origem — EXT-06).
      sourceType: "manual",
      clientActionId: parseOptionalClientActionId(body.client_action_id ?? body.clientActionId),
      createdBy: actor.userId,
      updatedBy: actor.userId,
      installments,
    });
  }

  // RN-EXT-01(a) — só description é editável. Qualquer campo financeiro no corpo → 409 statement_entry_locked.
  async updateGroupDescription(actor: ProfessionalStatementActorContext, groupId: string, body: RawRecord): Promise<ProfessionalStatementEntry[]> {
    const normalizedGroupId = parseRequiredUuid(groupId, "groupId");
    if (LOCKED_PATCH_FIELDS.some((field) => body[field] !== undefined)) {
      throw statementEntryLockedError();
    }
    const description = parseRequiredDescription(body.description);
    // 404 antes de editar (grupo inexistente/retirado/cross-tenant).
    await this.getGroup(actor, normalizedGroupId);
    const updated = await this.repository.updateGroupDescription(actor.tenantId, normalizedGroupId, description, actor.userId);
    if (!updated) {
      throw groupNotFoundError();
    }
    return updated;
  }

  // RN-EXT-01(b) — DELETE (soft, "retirar do extrato"): permitido só se NENHUMA parcela do grupo estiver
  // settled; com ≥ 1 settled → 409. Soft-deleta o grupo inteiro atomicamente (withTenantRls tx no Prisma).
  async removeGroup(actor: ProfessionalStatementActorContext, groupId: string): Promise<ProfessionalStatementEntry[]> {
    const normalizedGroupId = parseRequiredUuid(groupId, "groupId");
    const group = await this.getGroup(actor, normalizedGroupId);
    if (group.some((entry) => entry.status === "settled")) {
      throw statementEntryLockedError();
    }
    const removed = await this.repository.softDeleteGroup(actor.tenantId, normalizedGroupId, actor.userId);
    if (!removed) {
      throw groupNotFoundError();
    }
    return removed;
  }
}

// EXT-05 — Saldo = Σcredit − Σdebit (DERIVADO). runningBalance acumula (credit:+ / debit:−) na ordem asc por
// due_date; parcela cancelled não move o saldo (defensivo — cancelled não é alcançável no PR-03). Tudo em 2 casas.
function deriveLedger(entries: readonly ProfessionalStatementEntry[]): {
  summary: ProfessionalStatementSummary;
  itemsWithBalance: { entry: ProfessionalStatementEntry; runningBalance: number }[];
} {
  let running = 0;
  let totalDebits = 0;
  let totalCredits = 0;
  const itemsWithBalance = entries.map((entry) => {
    if (entry.status !== "cancelled") {
      if (entry.direction === "credit") {
        running = roundMoney(running + entry.amount);
        totalCredits = roundMoney(totalCredits + entry.amount);
      } else {
        running = roundMoney(running - entry.amount);
        totalDebits = roundMoney(totalDebits + entry.amount);
      }
    }
    return { entry, runningBalance: running };
  });
  return {
    summary: {
      currentBalance: roundMoney(totalCredits - totalDebits),
      totalDebits,
      totalCredits,
      count: entries.length,
    },
    itemsWithBalance,
  };
}

const memoryRepository = new InMemoryProfessionalStatementRepository();
// Lookup InMemory: consulta o repositório InMemory de Profissionais (mesmo singleton do módulo operator-profiles);
// expõe SÓ o full_name como label (§2.8 — nunca CNH). Existe row do tenant ⇒ posse satisfeita.
const memoryOperatorProfileLookup: OperatorProfileLookup = async (tenantId, operatorProfileId) => {
  const profile = await getMemoryOperatorProfileRepositoryForTests().findById(tenantId, operatorProfileId);
  return profile ? { fullName: profile.fullName } : undefined;
};
let defaultServicePromise: Promise<ProfessionalStatementService> | undefined;

export function createMemoryProfessionalStatementService(): ProfessionalStatementService {
  return new ProfessionalStatementService(memoryRepository, memoryOperatorProfileLookup);
}

export function getMemoryProfessionalStatementRepositoryForTests(): InMemoryProfessionalStatementRepository {
  return memoryRepository;
}

export async function createDefaultProfessionalStatementService(): Promise<ProfessionalStatementService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryProfessionalStatementService();
  }
  defaultServicePromise ??= createPrismaProfessionalStatementService();
  return defaultServicePromise;
}

export function resetProfessionalStatementRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaProfessionalStatementService(): Promise<ProfessionalStatementService> {
  const { createPrismaProfessionalStatementRepository, createPrismaOperatorProfileLookup } = await import(
    "./professional-statement-prisma.repository.js"
  );
  const [repository, lookup] = await Promise.all([
    createPrismaProfessionalStatementRepository(),
    createPrismaOperatorProfileLookup(),
  ]);
  return new ProfessionalStatementService(repository, lookup);
}
