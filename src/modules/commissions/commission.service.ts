import { env } from "../../config/env.js";
import { InMemoryCommissionRepository, type CommissionRepository } from "./commission.repository.js";
import type {
  CommissionActorContext,
  CommissionBasisEvent,
  CommissionCalculation,
  CommissionPolicy,
  CommissionStatement,
  CreateCommissionPolicyInput,
  ListResult,
} from "./commission.types.js";
import { CommissionError } from "./commission.types.js";
import {
  assertNonEmptyString,
  optionalString,
  parseBasisEventStatus,
  parseBoolean,
  parseCalculationStatus,
  parseLimit,
  parseNonNegativeNumber,
  parseOffset,
  parseOptionalDate,
  parseOptionalUuid,
  parsePolicyStatus,
  parsePositiveInteger,
  parseStatementStatus,
  sanitizeJsonRecord,
} from "./commission.validators.js";

type RawRecord = Record<string, unknown>;

export class CommissionService {
  constructor(private readonly repository: CommissionRepository) {}

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
    return this.repository.listCalculations({
      tenantId: actor.tenantId,
      status: parseCalculationStatus(query.status),
      payeeId: parseOptionalUuid(query.payeeId ?? query.payee_id, "payeeId"),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    });
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
}

const memoryRepository = new InMemoryCommissionRepository();
let defaultServicePromise: Promise<CommissionService> | undefined;

export function createMemoryCommissionService(): CommissionService {
  return new CommissionService(memoryRepository);
}

export function getMemoryCommissionRepositoryForTests(): InMemoryCommissionRepository {
  return memoryRepository;
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
  const repository = await createPrismaCommissionRepository();

  return new CommissionService(repository);
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
