import { env } from "../../config/env.js";
import { getMemoryOperatorProfileRepositoryForTests } from "../operator-profiles/operator-profile.service.js";
import { createMemoryProfessionalStatementService } from "../professional-statements/professional-statement.service.js";
import { InMemoryCommissionRepository, type CommissionRepository } from "./commission.repository.js";
import type {
  CommissionActorContext,
  CommissionBasisEvent,
  CommissionCalculation,
  CommissionPolicy,
  CommissionSettlementCollaborators,
  CommissionStatement,
  CommissionSummaryResult,
  CreateCommissionPolicyInput,
  ListResult,
  SettleCalculationsResult,
  SettlementLineResult,
} from "./commission.types.js";
import { CommissionError } from "./commission.types.js";
import {
  assertNonEmptyString,
  optionalString,
  parseBasisEventStatus,
  parseBoolean,
  parseCalculationIds,
  parseCalculationStatus,
  parseDateRange,
  parseLimit,
  parseNonNegativeNumber,
  parseOffset,
  parseOptionalDate,
  parseOptionalUuid,
  parsePolicyStatus,
  parsePositiveInteger,
  parseSettlementDate,
  parseStatementStatus,
  sanitizeJsonRecord,
} from "./commission.validators.js";

type RawRecord = Record<string, unknown>;

export class CommissionService {
  constructor(
    private readonly repository: CommissionRepository,
    private readonly settlementCollaborators?: CommissionSettlementCollaborators,
  ) {}

  listPolicies(actor: CommissionActorContext, query: RawRecord): Promise<ListResult<CommissionPolicy>> {
    return this.repository.listPolicies({
      tenantId: actor.tenantId,
      status: query.status ? parsePolicyStatus(query.status) : undefined,
      vertical: optionalString(query.vertical, 80),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    });
  }

  async createPolicy(actor: CommissionActorContext, body: RawRecord): Promise<CommissionPolicy> {
    const effectiveFrom = parseOptionalDate(body.effectiveFrom ?? body.effective_from, "effectiveFrom") ?? new Date();
    const effectiveTo = parseOptionalDate(body.effectiveTo ?? body.effective_to, "effectiveTo");

    if (effectiveTo && effectiveTo < effectiveFrom) {
      throw new CommissionError(400, "COMMISSION_INVALID", "invalid_effective_range", "effectiveTo must be after effectiveFrom.");
    }

    const input: CreateCommissionPolicyInput = {
      tenantId: actor.tenantId,
      name: assertNonEmptyString(body.name, "name", 120),
      scope: optionalString(body.scope, 80) ?? "tenant",
      vertical: optionalString(body.vertical, 80) ?? "field_services",
      status: parsePolicyStatus(body.status),
      effectiveFrom,
      effectiveTo,
      version: parsePositiveInteger(body.version, "version", 1),
      createdBy: actor.userId,
      rules: parsePolicyRules(body.rules),
    };

    return this.repository.createPolicy(input);
  }

  listBasisEvents(actor: CommissionActorContext, query: RawRecord): Promise<ListResult<CommissionBasisEvent>> {
    return this.repository.listBasisEvents({
      tenantId: actor.tenantId,
      sourceType: optionalString(query.sourceType ?? query.source_type, 80),
      sourceId: optionalString(query.sourceId ?? query.source_id, 120),
      status: query.status ? parseBasisEventStatus(query.status) : undefined,
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    });
  }

  createBasisEvent(actor: CommissionActorContext, body: RawRecord): Promise<CommissionBasisEvent> {
    return this.repository.createBasisEvent({
      tenantId: actor.tenantId,
      sourceType: assertNonEmptyString(body.sourceType ?? body.source_type, "sourceType", 80),
      sourceId: assertNonEmptyString(body.sourceId ?? body.source_id, "sourceId", 120),
      sourceEventName: assertNonEmptyString(body.sourceEventName ?? body.source_event_name, "sourceEventName", 120),
      idempotencyKey: assertNonEmptyString(body.idempotencyKey ?? body.idempotency_key, "idempotencyKey", 160),
      payload: sanitizeJsonRecord(body.payload ?? {}),
      occurredAt: parseOptionalDate(body.occurredAt ?? body.occurred_at, "occurredAt") ?? new Date(),
      status: parseBasisEventStatus(body.status),
      policyId: parseOptionalUuid(body.policyId ?? body.policy_id, "policyId"),
    });
  }

  listCalculations(actor: CommissionActorContext, query: RawRecord): Promise<ListResult<CommissionCalculation>> {
    const { from, to } = parseDateRange(query.from, query.to);

    return this.repository.listCalculations({
      tenantId: actor.tenantId,
      status: parseCalculationStatus(query.status),
      payeeId: parseOptionalUuid(query.payeeId ?? query.payee_id, "payeeId"),
      from,
      to,
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    });
  }

  // R8.2 — drill-down do próprio ator (requer commissions:read_own). payeeId FIXADO no
  // servidor; qualquer payee_id vindo do cliente é IGNORADO. Reusa o mesmo enriquecimento
  // (sourceType/sourceId) do listCalculations.
  listMyCalculations(actor: CommissionActorContext, query: RawRecord): Promise<ListResult<CommissionCalculation>> {
    const { from, to } = parseDateRange(query.from, query.to);

    return this.repository.listCalculations({
      tenantId: actor.tenantId,
      status: parseCalculationStatus(query.status),
      payeeId: actor.userId,
      from,
      to,
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    });
  }

  // R8.1 — extrato agregado por payee na janela (requer commissions:read).
  async summarizeStatements(actor: CommissionActorContext, query: RawRecord): Promise<CommissionSummaryResult> {
    const { from, to } = parseDateRange(query.from, query.to);
    const payeeId = parseOptionalUuid(query.payeeId ?? query.payee_id, "payeeId");
    const summary = await this.repository.summarizeCalculationsByPayee({
      tenantId: actor.tenantId,
      payeeId,
      from,
      to,
    });

    return { ...summary, from, to };
  }

  // R8.2 — extrato do próprio ator (requer commissions:read_own). payeeId FIXADO no servidor;
  // qualquer payee_id vindo do cliente é IGNORADO.
  async summarizeMyStatements(actor: CommissionActorContext, query: RawRecord): Promise<CommissionSummaryResult> {
    const { from, to } = parseDateRange(query.from, query.to);
    const summary = await this.repository.summarizeCalculationsByPayee({
      tenantId: actor.tenantId,
      payeeId: actor.userId,
      from,
      to,
    });

    return { ...summary, from, to };
  }

  listStatements(actor: CommissionActorContext, query: RawRecord): Promise<ListResult<CommissionStatement>> {
    return this.repository.listStatements({
      tenantId: actor.tenantId,
      status: parseStatementStatus(query.status),
      payeeId: parseOptionalUuid(query.payeeId ?? query.payee_id, "payeeId"),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    });
  }

  // Ω4C PR-10 (D-Ω4C-REM-SETTLE-RAIL, RN-REM-02/03/04/05/06) — liquidação em lote das linhas de remuneração
  // JÁ EXISTENTES. PARADA HONESTA: PR-10 NÃO computa/fabrica percentual — o valor de cada linha É
  // `CommissionCalculation.amount` (NUNCA a tarifa de venda). Para cada calculation:
  //   (1) carrega tenant-scoped (404 cross-tenant); já liquidada → skip idempotente (`already_settled`);
  //       amount ≤ 0 (arredondado a 2 casas) → skip (`skipped_zero`, sem crédito vazio);
  //   (2) mapeia payee(User) → operator_profile (sem perfil → 422 payee_not_a_professional);
  //   (3) CREDITA no extrato via o rail PR-07 (createForSource: remuneration/credit/remuneration, amount
  //       travado, installmentTotal=1, idempotente por (remuneration, calculationId)) — service→service, NÃO
  //       exige `professional_statements:create` do ator (não-amplificador);
  //   (4) marca settled_at=now, settlement_ref=<group_id do extrato>.
  // Invariante REM-03 (liquidar 2× NÃO duplica o crédito): dupla-guarda = source-idempotency do extrato +
  // guarda `settled_at`.
  async settleCalculations(actor: CommissionActorContext, body: RawRecord): Promise<SettleCalculationsResult> {
    const collaborators = this.settlementCollaborators;
    if (!collaborators) {
      throw new CommissionError(
        500,
        "COMMISSION_SETTLEMENT_UNAVAILABLE",
        "settlement_not_configured",
        "Commission settlement collaborators are not configured.",
      );
    }

    const calculationIds = parseCalculationIds(body.calculationIds ?? body.calculation_ids);
    const settlementDate = parseSettlementDate(body.settlementDate ?? body.settlement_date);
    const description = optionalString(body.description, 200);

    const calculations = await this.repository.findCalculationsByIds(actor.tenantId, calculationIds);
    const byId = new Map(calculations.map((calculation) => [calculation.id, calculation]));

    const lines: SettlementLineResult[] = [];
    let settledCount = 0;
    let settledTotal = 0;

    for (const calculationId of calculationIds) {
      const calculation = byId.get(calculationId);
      // (1) 404 cross-tenant / inexistente (nunca liquida linha de outro tenant).
      if (!calculation) {
        throw calculationNotFoundError();
      }
      // Idempotência por marcador: já liquidada → não re-lança (dupla-guarda com a source-idempotency).
      if (calculation.settledAt) {
        lines.push({
          calculationId,
          outcome: "already_settled",
          statementGroupId: calculation.settlementRef,
        });
        continue;
      }
      // Valor honesto: amount = calc.amount (20,6 → 12,2 no seam). ≤ 0 → não cria crédito vazio.
      const creditAmount = roundToCents(calculation.amount);
      if (creditAmount <= 0) {
        lines.push({ calculationId, outcome: "skipped_zero" });
        continue;
      }
      // (2) payee(User) → operator_profile (a folha). Sem perfil → 422 (não credita folha inexistente).
      if (!calculation.payeeId) {
        throw payeeNotAProfessionalError();
      }
      const professional = await collaborators.resolveOperatorProfileByUser(actor.tenantId, calculation.payeeId);
      if (!professional) {
        throw payeeNotAProfessionalError();
      }
      // (3) CRÉDITO no extrato (rail PR-07). Idempotente por (remuneration, calculationId): reprocessar a MESMA
      // fonte devolve o grupo existente (nunca duplica) — a garantia de REM-03 mesmo se o settled_at não pegou.
      const { groupId } = await collaborators.postStatementCredit(actor, {
        operatorProfileId: professional.operatorProfileId,
        sourceId: calculationId,
        amount: creditAmount,
        firstDueDate: settlementDate,
        description,
      });
      // (4) marca o calculation liquidado (settled_at + settlement_ref = group_id do crédito).
      await this.repository.markSettled(actor.tenantId, calculationId, new Date(), groupId);

      lines.push({
        calculationId,
        outcome: "settled",
        statementGroupId: groupId,
        operatorProfileId: professional.operatorProfileId,
      });
      settledCount += 1;
      settledTotal = roundToCents(settledTotal + creditAmount);
    }

    return { lines, settledCount, settledTotal, settlementDate };
  }
}

function roundToCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// 404 — calculation não encontrada no tenant (isolamento cross-tenant).
function calculationNotFoundError(): CommissionError {
  return new CommissionError(
    404,
    "COMMISSION_NOT_FOUND",
    "calculation_not_found",
    "Commission calculation was not found for this tenant.",
  );
}

// 422 — o payee (User) não é um profissional de campo (sem operator_profile). Não credita folha inexistente.
function payeeNotAProfessionalError(): CommissionError {
  return new CommissionError(
    422,
    "COMMISSION_SETTLEMENT_INVALID",
    "payee_not_a_professional",
    "The commission payee is not a field professional (no operator profile) and cannot be settled to a statement.",
  );
}

// D-Ω4C-REM-SETTLE-RAIL — seam de colaboradores memory (forward, sem ciclo). O CRÉDITO é TIPADO e FIXADO
// (remuneration/credit/remuneration; amount travado; single-profissional; installmentTotal=1). O
// createForSource re-valida por allowlist e é idempotente por origem. NÃO exige `professional_statements:create`
// (efeito service→service). Resolve payee(User) → operator_profile pela unique (tenant_id, user_id).
function createMemorySettlementCollaborators(): CommissionSettlementCollaborators {
  return {
    postStatementCredit: async (actor, input) => {
      const entries = await createMemoryProfessionalStatementService().createForSource(actor, {
        operatorProfileId: input.operatorProfileId,
        entryType: "remuneration",
        direction: "credit",
        sourceType: "remuneration",
        sourceId: input.sourceId,
        amount: input.amount,
        installmentTotal: 1,
        firstDueDate: input.firstDueDate,
        description: input.description,
      });
      const groupId = entries[0]?.groupId;
      if (!groupId) {
        throw new CommissionError(
          500,
          "COMMISSION_SETTLEMENT_FAILED",
          "statement_credit_failed",
          "The professional statement credit could not be posted.",
        );
      }
      return { groupId };
    },
    resolveOperatorProfileByUser: async (tenantId, userId) => {
      const profile = await getMemoryOperatorProfileRepositoryForTests().findByUserId(tenantId, userId);
      return profile ? { operatorProfileId: profile.id } : undefined;
    },
  };
}

const memoryRepository = new InMemoryCommissionRepository();
let defaultServicePromise: Promise<CommissionService> | undefined;

export function createMemoryCommissionService(): CommissionService {
  return new CommissionService(memoryRepository, createMemorySettlementCollaborators());
}

export function getMemoryCommissionRepositoryForTests(): InMemoryCommissionRepository {
  return memoryRepository;
}

// WS-SCALE-COMISSAO — expõe o dublê do estado de cancelamento da OS para os testes semearem OS
// canceladas e provarem a supressão (`ineligible`) / hold (`pending_review`) do basis event.
export function getMemoryWorkOrderCancellationGateForTests(): InMemoryCommissionRepository["workOrderGate"] {
  return memoryRepository.workOrderGate;
}

export async function createDefaultCommissionService(): Promise<CommissionService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryCommissionService();
  }

  defaultServicePromise ??= createPrismaCommissionService();

  return defaultServicePromise;
}

export function resetCommissionRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaCommissionService(): Promise<CommissionService> {
  const { createPrismaCommissionRepository } = await import("./commission-prisma.repository.js");
  const [repository, collaborators] = await Promise.all([
    createPrismaCommissionRepository(),
    createPrismaSettlementCollaborators(),
  ]);

  return new CommissionService(repository, collaborators);
}

// D-Ω4C-REM-SETTLE-RAIL — seam de colaboradores Prisma. Reusa os serviços default (RLS) do extrato e de
// operator-profiles — forward (commissions → professional-statements / operator-profiles), sem ciclo.
async function createPrismaSettlementCollaborators(): Promise<CommissionSettlementCollaborators> {
  const [{ createDefaultProfessionalStatementService }, { createDefaultOperatorProfileService }] = await Promise.all([
    import("../professional-statements/professional-statement.service.js"),
    import("../operator-profiles/operator-profile.service.js"),
  ]);
  const [statementService, operatorProfileService] = await Promise.all([
    createDefaultProfessionalStatementService(),
    createDefaultOperatorProfileService(),
  ]);

  return {
    postStatementCredit: async (actor, input) => {
      const entries = await statementService.createForSource(actor, {
        operatorProfileId: input.operatorProfileId,
        entryType: "remuneration",
        direction: "credit",
        sourceType: "remuneration",
        sourceId: input.sourceId,
        amount: input.amount,
        installmentTotal: 1,
        firstDueDate: input.firstDueDate,
        description: input.description,
      });
      const groupId = entries[0]?.groupId;
      if (!groupId) {
        throw new CommissionError(
          500,
          "COMMISSION_SETTLEMENT_FAILED",
          "statement_credit_failed",
          "The professional statement credit could not be posted.",
        );
      }
      return { groupId };
    },
    resolveOperatorProfileByUser: async (tenantId, userId) => {
      const profile = await operatorProfileService.findByUserId(tenantId, userId);
      return profile ? { operatorProfileId: profile.id } : undefined;
    },
  };
}

function parsePolicyRules(value: unknown): CreateCommissionPolicyInput["rules"] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new CommissionError(400, "COMMISSION_INVALID", "invalid_rules", "rules must be an array.");
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new CommissionError(400, "COMMISSION_INVALID", "invalid_rule", `rules[${index}] must be an object.`);
    }

    return {
      ruleType: assertNonEmptyString(item.ruleType ?? item.rule_type, `rules[${index}].ruleType`, 80),
      basisType: assertNonEmptyString(item.basisType ?? item.basis_type, `rules[${index}].basisType`, 80),
      rateType: assertNonEmptyString(item.rateType ?? item.rate_type, `rules[${index}].rateType`, 80),
      rateValue: parseNonNegativeNumber(item.rateValue ?? item.rate_value, `rules[${index}].rateValue`),
      conditions: sanitizeJsonRecord(item.conditions ?? {}),
      priority: parsePositiveInteger(item.priority, `rules[${index}].priority`, 100),
      active: parseBoolean(item.active, true),
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
