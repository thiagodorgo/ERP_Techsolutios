import { env } from "../../config/env.js";
import { calculateTenantCloudCharges } from "./cloud-charge.engine.js";
import {
  CloudChargeError,
  CLOUD_CHARGE_CALCULATION_STATUSES,
  CLOUD_CHARGE_CALCULATION_STRATEGIES,
  CLOUD_CHARGE_MARKUP_TYPES,
  CLOUD_CHARGE_ROUNDING_MODES,
  TENANT_CLOUD_CHARGE_STATUSES,
  type CloudChargeCalculationRun,
  type CloudChargeCalculationRunFilters,
  type CloudChargeCalculationStrategy,
  type CloudChargeMarkupType,
  type CloudChargeRoundingMode,
  type CloudChargeRule,
  type CloudChargeRuleFilters,
  type CloudChargeSummary,
  type CreateCloudChargeCalculationRunInput,
  type CreateCloudChargeRuleInput,
  type TenantCloudChargeFilters,
  type UpdateCloudChargeRuleInput,
} from "./cloud-charge.types.js";
import {
  InMemoryCloudChargeRepository,
  type CloudChargeRepository,
} from "./cloud-charge.repository.js";

const markupTypeSet = new Set<string>(CLOUD_CHARGE_MARKUP_TYPES);
const roundingModeSet = new Set<string>(CLOUD_CHARGE_ROUNDING_MODES);
const runStatusSet = new Set<string>(CLOUD_CHARGE_CALCULATION_STATUSES);
const chargeStatusSet = new Set<string>(TENANT_CLOUD_CHARGE_STATUSES);
const strategySet = new Set<string>(CLOUD_CHARGE_CALCULATION_STRATEGIES);

export class CloudChargeService {
  constructor(private readonly repository: CloudChargeRepository) {}

  createCloudChargeRule(input: CreateCloudChargeRuleInput): Promise<CloudChargeRule> {
    return this.repository.createRule(normalizeCreateRuleInput(input));
  }

  async updateCloudChargeRule(ruleId: string, input: UpdateCloudChargeRuleInput): Promise<CloudChargeRule> {
    await this.getCloudChargeRule(ruleId);
    return this.repository.updateRule(ruleId, normalizeUpdateRuleInput(input));
  }

  listCloudChargeRules(filters: CloudChargeRuleFilters = {}) {
    return this.repository.listRules(filters);
  }

  async getCloudChargeRule(ruleId: string): Promise<CloudChargeRule> {
    const rule = await this.repository.getRule(ruleId);
    if (!rule) {
      throw new CloudChargeError(404, "CLOUD_CHARGE_RULE_NOT_FOUND", "rule_not_found", "Cloud charge rule was not found.");
    }
    return rule;
  }

  createCalculationRun(input: CreateCloudChargeCalculationRunInput): Promise<CloudChargeCalculationRun> {
    validatePeriod(input.periodStart, input.periodEnd);
    return this.repository.createCalculationRun({
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      sourceAllocationRunId: requireNonEmpty(input.sourceAllocationRunId, "sourceAllocationRunId"),
      strategy: normalizeStrategy(input.strategy),
      createdBy: input.createdBy,
      metadata: sanitizeCloudChargeMetadata(input.metadata),
    });
  }

  async executeCalculationRun(runId: string): Promise<CloudChargeCalculationRun> {
    const run = await this.getCalculationRun(runId);

    await this.repository.updateCalculationRun(run.id, {
      status: "processing",
      startedAt: new Date(),
      metadata: {
        ...run.metadata,
        executionStartedAt: new Date().toISOString(),
      },
    });

    try {
      const [sourceAllocationRun, allocations, rules, tenants] = await Promise.all([
        this.repository.getAllocationRun(run.sourceAllocationRunId),
        this.repository.listAllocationTenantAllocations(run.sourceAllocationRunId),
        this.repository.listRules({ isActive: true }),
        this.repository.listTenants(),
      ]);

      if (!sourceAllocationRun) {
        throw new CloudChargeError(404, "CLOUD_CHARGE_ALLOCATION_NOT_FOUND", "source_allocation_run_not_found", "Source allocation run was not found.");
      }

      const result = calculateTenantCloudCharges({
        calculationRunId: run.id,
        periodStart: run.periodStart,
        periodEnd: run.periodEnd,
        sourceAllocationRun,
        allocations,
        rules,
        tenants,
      });

      await this.repository.replaceTenantCharges(run.id, result.charges);

      return this.repository.updateCalculationRun(run.id, {
        status: "completed",
        totalAllocatedCost: result.totalAllocatedCost,
        totalChargeAmount: result.totalChargeAmount,
        totalMarginAmount: result.totalMarginAmount,
        totalDiscountAmount: result.totalDiscountAmount,
        currency: result.currency,
        completedAt: new Date(),
        metadata: {
          ...run.metadata,
          chargeEngine: "markup_rules_v1",
          tenantChargeCount: result.charges.length,
          sourceAllocationRunStatus: sourceAllocationRun.status,
        },
      });
    } catch (error) {
      return this.repository.updateCalculationRun(run.id, {
        status: "failed",
        errorMessage: sanitizeCloudChargeError(error),
        completedAt: new Date(),
        metadata: run.metadata,
      });
    }
  }

  async calculateTenantChargesForAllocationRun(input: CreateCloudChargeCalculationRunInput): Promise<CloudChargeCalculationRun> {
    const run = await this.createCalculationRun(input);
    return this.executeCalculationRun(run.id);
  }

  listCalculationRuns(filters: CloudChargeCalculationRunFilters = {}) {
    if (filters.status && !runStatusSet.has(filters.status)) {
      throw new CloudChargeError(400, "CLOUD_CHARGE_INVALID", "status_invalid", `Invalid calculation run status: ${filters.status}.`);
    }
    return this.repository.listCalculationRuns(filters);
  }

  async getCalculationRun(runId: string): Promise<CloudChargeCalculationRun> {
    const run = await this.repository.getCalculationRun(runId);
    if (!run) {
      throw new CloudChargeError(404, "CLOUD_CHARGE_RUN_NOT_FOUND", "run_not_found", "Cloud charge calculation run was not found.");
    }
    return run;
  }

  listTenantCharges(runId: string, filters: TenantCloudChargeFilters = {}) {
    if (filters.status && !chargeStatusSet.has(filters.status)) {
      throw new CloudChargeError(400, "CLOUD_CHARGE_INVALID", "charge_status_invalid", `Invalid tenant charge status: ${filters.status}.`);
    }
    return this.repository.listTenantCharges(runId, filters);
  }

  async getCloudChargeSummary(filters: CloudChargeCalculationRunFilters = {}): Promise<CloudChargeSummary> {
    const runs = await this.repository.listCalculationRuns({
      ...filters,
      status: "completed",
    });
    const run = runs[0];
    if (!run) {
      return {
        periodStart: filters.periodStart?.toISOString() ?? "",
        periodEnd: filters.periodEnd?.toISOString() ?? "",
        totalAllocatedCost: 0,
        totalChargeAmount: 0,
        totalMarginAmount: 0,
        totalDiscountAmount: 0,
        tenants: [],
        generatedAt: new Date().toISOString(),
      };
    }

    const [charges, tenants] = await Promise.all([
      this.repository.listTenantCharges(run.id),
      this.repository.listTenants(),
    ]);
    const tenantNames = new Map(tenants.map((tenant) => [tenant.id, tenant.name]));

    return {
      periodStart: run.periodStart.toISOString(),
      periodEnd: run.periodEnd.toISOString(),
      currency: run.currency,
      totalAllocatedCost: run.totalAllocatedCost,
      totalChargeAmount: run.totalChargeAmount,
      totalMarginAmount: run.totalMarginAmount,
      totalDiscountAmount: run.totalDiscountAmount,
      totalMarginPercentage: run.totalAllocatedCost > 0 ? roundRatio((run.totalMarginAmount / run.totalAllocatedCost) * 100) : undefined,
      tenants: charges
        .map((charge) => ({
          tenantId: charge.tenantId,
          tenantName: tenantNames.get(charge.tenantId),
          allocatedCost: charge.allocatedCost,
          finalChargeAmount: charge.finalChargeAmount,
          marginAmount: charge.marginAmount,
          marginPercentage: charge.marginPercentage,
          status: charge.status,
        }))
        .sort((a, b) => b.finalChargeAmount - a.finalChargeAmount),
      generatedAt: new Date().toISOString(),
    };
  }
}

export function sanitizeCloudChargeMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!metadata) return {};
  return compactRecord(sanitizeRecord(metadata));
}

export function sanitizeCloudChargeError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown cloud charge error.";
  return String(sanitizeValue(message)).slice(0, 1_000);
}

export function isCloudChargeMarkupType(value: string): value is CloudChargeMarkupType {
  return markupTypeSet.has(value);
}

export function isCloudChargeRoundingMode(value: string): value is CloudChargeRoundingMode {
  return roundingModeSet.has(value);
}

export function isCloudChargeCalculationStrategy(value: string): value is CloudChargeCalculationStrategy {
  return strategySet.has(value);
}

const memoryRepository = new InMemoryCloudChargeRepository();
let defaultServicePromise: Promise<CloudChargeService> | undefined;

export function createMemoryCloudChargeService(): CloudChargeService {
  return new CloudChargeService(memoryRepository);
}

export function getMemoryCloudChargeRepositoryForTests(): InMemoryCloudChargeRepository {
  return memoryRepository;
}

export async function createDefaultCloudChargeService(): Promise<CloudChargeService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryCloudChargeService();
  }

  defaultServicePromise ??= createPrismaCloudChargeService();
  return defaultServicePromise;
}

export function resetCloudChargeRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaCloudChargeService(): Promise<CloudChargeService> {
  const { createPrismaCloudChargeRepository } = await import("./cloud-charge-prisma.repository.js");
  return new CloudChargeService(await createPrismaCloudChargeRepository());
}

function normalizeCreateRuleInput(input: CreateCloudChargeRuleInput): CreateCloudChargeRuleInput {
  validateRuleAmounts(input);
  return {
    ...input,
    tenantId: optionalString(input.tenantId),
    planCode: optionalString(input.planCode),
    name: requireNonEmpty(input.name, "name"),
    description: optionalString(input.description),
    isActive: input.isActive ?? true,
    priority: input.priority ?? 100,
    markupType: requireMarkupType(input.markupType),
    roundingMode: input.roundingMode ? requireRoundingMode(input.roundingMode) : "nearest_cent",
    metadata: sanitizeCloudChargeMetadata(input.metadata),
  };
}

function normalizeUpdateRuleInput(input: UpdateCloudChargeRuleInput): UpdateCloudChargeRuleInput {
  validateRuleAmounts(input);
  return {
    ...input,
    tenantId: input.tenantId === undefined ? undefined : optionalString(input.tenantId),
    planCode: input.planCode === undefined ? undefined : optionalString(input.planCode),
    name: input.name === undefined ? undefined : requireNonEmpty(input.name, "name"),
    description: input.description === undefined ? undefined : optionalString(input.description),
    markupType: input.markupType ? requireMarkupType(input.markupType) : undefined,
    roundingMode: input.roundingMode ? requireRoundingMode(input.roundingMode) : undefined,
    metadata: input.metadata ? sanitizeCloudChargeMetadata(input.metadata) : undefined,
  };
}

function validateRuleAmounts(input: {
  readonly effectiveFrom?: Date;
  readonly effectiveUntil?: Date;
  readonly markupValue?: number;
  readonly minimumMonthlyCharge?: number;
  readonly includedCloudCost?: number;
  readonly includedUsageAmount?: number;
  readonly overageMarkupValue?: number;
}): void {
  if (input.effectiveFrom && Number.isNaN(input.effectiveFrom.getTime())) {
    throw invalid("effective_from_invalid", "Rule effectiveFrom is invalid.");
  }
  if (input.effectiveUntil && Number.isNaN(input.effectiveUntil.getTime())) {
    throw invalid("effective_until_invalid", "Rule effectiveUntil is invalid.");
  }
  if (input.effectiveFrom && input.effectiveUntil && input.effectiveUntil < input.effectiveFrom) {
    throw invalid("effective_range_invalid", "Rule effectiveUntil cannot be before effectiveFrom.");
  }
  for (const [field, value] of Object.entries({
    markupValue: input.markupValue,
    minimumMonthlyCharge: input.minimumMonthlyCharge,
    includedCloudCost: input.includedCloudCost,
    includedUsageAmount: input.includedUsageAmount,
    overageMarkupValue: input.overageMarkupValue,
  })) {
    if (value !== undefined && (Number.isNaN(value) || value < 0)) {
      throw invalid("amount_invalid", `${field} cannot be negative.`);
    }
  }
}

function normalizeStrategy(strategy: CloudChargeCalculationStrategy | undefined): CloudChargeCalculationStrategy {
  const value = strategy ?? "markup_rules_v1";
  if (!strategySet.has(value)) throw invalid("strategy_invalid", `Invalid charge calculation strategy: ${value}.`);
  return value;
}

function requireMarkupType(value: CloudChargeMarkupType): CloudChargeMarkupType {
  if (!markupTypeSet.has(value)) throw invalid("markup_type_invalid", `Invalid markup type: ${value}.`);
  return value;
}

function requireRoundingMode(value: CloudChargeRoundingMode): CloudChargeRoundingMode {
  if (!roundingModeSet.has(value)) throw invalid("rounding_mode_invalid", `Invalid rounding mode: ${value}.`);
  return value;
}

function validatePeriod(periodStart: Date, periodEnd: Date): void {
  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || periodStart > periodEnd) {
    throw invalid("period_invalid", "Cloud charge period is invalid.");
  }
}

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) throw invalid(`${field}_required`, `${field} is required.`);
  return normalized;
}

function optionalString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function invalid(reason: string, message: string): CloudChargeError {
  return new CloudChargeError(400, "CLOUD_CHARGE_INVALID", reason, message);
}

const sensitiveKeyPattern =
  /(authorization|access_?token|refresh_?token|\btoken\b|password|passwd|pwd|secret|api_?key|token_hash|password_hash|refresh_token_hash|storage_key|storagekey|bucket|private_url|privateurl|path|body|payload|query|csv|file|content|margin_internal_note)/i;

function sanitizeRecord(metadata: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    sanitized[key] = sensitiveKeyPattern.test(key) ? "[REDACTED]" : sanitizeValue(value);
  }
  return sanitized;
}

function sanitizeValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    return value
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
      .replace(/AKIA[0-9A-Z]{16}/g, "[REDACTED_AWS_ACCESS_KEY]");
  }
  if (Array.isArray(value)) return value.map(sanitizeValue).filter((item) => item !== undefined);
  if (typeof value === "object" && value !== null) return sanitizeRecord(value as Record<string, unknown>);
  return value;
}

function compactRecord(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function roundRatio(value: number): number {
  return Number(value.toFixed(6));
}
