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
  CreateProfessionalStatementForSourceInput,
  OperatorProfileLookup,
  ProfessionalStatementActorContext,
  ProfessionalStatementEntry,
  ProfessionalStatementSummary,
} from "./professional-statement.types.js";
import {
  PROFESSIONAL_STATEMENT_DIRECTIONS,
  PROFESSIONAL_STATEMENT_ENTRY_TYPES,
  PROFESSIONAL_STATEMENT_SOURCE_TYPES,
  ProfessionalStatementError,
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

// Ω4C PR-07 — allowlists do caminho interno (constrange o efeito de origem: nunca tipo/direção/origem arbitrários).
const ENTRY_TYPE_ALLOWLIST = new Set<string>(PROFESSIONAL_STATEMENT_ENTRY_TYPES);
const DIRECTION_ALLOWLIST = new Set<string>(PROFESSIONAL_STATEMENT_DIRECTIONS);
const SOURCE_TYPE_ALLOWLIST = new Set<string>(PROFESSIONAL_STATEMENT_SOURCE_TYPES);

function assertAllowed(value: string, allowlist: ReadonlySet<string>, reason: string, field: string): string {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!allowlist.has(normalized)) {
    throw new ProfessionalStatementError(400, "PROFESSIONAL_STATEMENT_INVALID", reason, `${field} is invalid.`);
  }
  return normalized;
}

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

  // Ω4C PR-07 (D-Ω4C-MULSEG-STATEMENT-API) — caminho INTERNO das integrações (realiza a reserva
  // D-Ω4C-EXTRATO-CREATE-SCOPE). É um efeito de domínio service→service, NÃO a rota pública POST — logo NÃO
  // exige `professional_statements:create` do usuário (mandato §6; espelha o next-due do PR-06 que não exige
  // `notifications:create`). É TIPADO/CONSTRANGIDO: entryType/direction/sourceType vêm do allowlist (a multa
  // passa fine/debit/fine), amount é o valor REAL da fonte (parseAmount → Decimal(12,2) > 0, nunca fabricado),
  // e o efeito é single-profissional (zero fan-out). Idempotente por ORIGEM: reprocessar a MESMA fonte devolve o
  // grupo existente (pré-check findActiveBySource — garante idempotência no InMemory E no Prisma; o índice
  // parcial da 20260823000000 é o backstop DURO no Prisma → P2002 → 409 source_already_launched).
  async createForSource(
    actor: ProfessionalStatementActorContext,
    input: CreateProfessionalStatementForSourceInput,
  ): Promise<ProfessionalStatementEntry[]> {
    const entryType = assertAllowed(input.entryType, ENTRY_TYPE_ALLOWLIST, "invalid_entry_type", "entry_type");
    const direction = assertAllowed(input.direction, DIRECTION_ALLOWLIST, "invalid_direction", "direction");
    const sourceType = assertAllowed(input.sourceType, SOURCE_TYPE_ALLOWLIST, "invalid_source_type", "source_type");
    // AJUSTE (source_type='manual') não passa por aqui — é o POST público. Origem exige um alvo real.
    if (sourceType === "manual") {
      throw new ProfessionalStatementError(400, "PROFESSIONAL_STATEMENT_INVALID", "invalid_source_type", "createForSource requires a real source_type (not manual).");
    }
    const operatorProfileId = parseRequiredUuid(input.operatorProfileId, "operatorProfileId");
    const sourceId = parseRequiredUuid(input.sourceId, "sourceId");

    // Posse do profissional no tenant (defesa; o módulo-fonte já validou) → 404 cross-tenant.
    const professional = await this.operatorProfileLookup(actor.tenantId, operatorProfileId);
    if (!professional) {
      throw operatorProfileNotFoundError();
    }

    // Idempotência de origem: já existe débito ATIVO desta fonte → devolve o grupo existente (não duplica).
    const existing = await this.repository.findActiveBySource(actor.tenantId, sourceType, sourceId);
    if (existing.length > 0) {
      return existing;
    }

    const totalAmount = parseAmount(input.amount);
    const installmentTotal = parseInstallmentTotal(input.installmentTotal);
    const firstDueDate = parseFirstDueDate(input.firstDueDate);
    const installments = buildInstallmentPlan(totalAmount, installmentTotal, firstDueDate);

    return this.repository.createGroup({
      tenantId: actor.tenantId,
      operatorProfileId,
      groupId: randomUUID(),
      entryType,
      direction,
      description: input.description,
      currency: "BRL",
      sourceType,
      sourceId,
      createdBy: actor.userId,
      updatedBy: actor.userId,
      installments,
    });
  }

  // Ω4C PR-07 — desfazer o lançamento por ORIGEM (RN-MUL-01/RN-EXT-01). Sem débito ativo da fonte → no-op
  // idempotente ([]). Com ≥ 1 parcela liquidada (settled) → 409 statement_entry_locked (não se desfaz atribuição
  // já liquidada; reversão só por AJUSTE compensatório). Caso contrário soft-deleta o grupo inteiro atomicamente.
  async removeForSource(
    actor: ProfessionalStatementActorContext,
    sourceType: string,
    sourceId: string,
  ): Promise<ProfessionalStatementEntry[]> {
    const normalizedSourceId = parseRequiredUuid(sourceId, "sourceId");
    const group = await this.repository.findActiveBySource(actor.tenantId, sourceType, normalizedSourceId);
    if (group.length === 0) {
      return [];
    }
    if (group.some((entry) => entry.status === "settled")) {
      throw statementEntryLockedError();
    }
    const removed = await this.repository.softDeleteGroup(actor.tenantId, group[0]!.groupId, actor.userId);
    return removed ?? [];
  }

  // Ω4C PR-07 — parcelas ATIVAS por origem (badge/derivação de disposição + guarda either/or). Vazio = sem débito.
  async findActiveBySource(
    actor: ProfessionalStatementActorContext,
    sourceType: string,
    sourceId: string,
  ): Promise<ProfessionalStatementEntry[]> {
    return this.repository.findActiveBySource(actor.tenantId, sourceType, parseRequiredUuid(sourceId, "sourceId"));
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
