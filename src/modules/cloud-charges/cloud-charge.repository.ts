import { randomUUID } from "node:crypto";

import type {
  CloudChargeCalculationRun,
  CloudChargeCalculationRunFilters,
  CloudChargeRule,
  CloudChargeRuleFilters,
  CloudChargeTenant,
  CreateCloudChargeCalculationRunInput,
  CreateCloudChargeRuleInput,
  TenantCloudCharge,
  TenantCloudChargeFilters,
  UpdateCloudChargeCalculationRunInput,
  UpdateCloudChargeRuleInput,
} from "./cloud-charge.types.js";
import type {
  CloudCostAllocationRun,
  TenantCloudCostAllocation,
} from "../cloud-cost-allocation/cloud-cost-allocation.types.js";

export type CloudChargeRepository = {
  createRule(input: CreateCloudChargeRuleInput): Promise<CloudChargeRule>;
  updateRule(ruleId: string, input: UpdateCloudChargeRuleInput): Promise<CloudChargeRule>;
  getRule(ruleId: string): Promise<CloudChargeRule | undefined>;
  listRules(filters?: CloudChargeRuleFilters): Promise<readonly CloudChargeRule[]>;
  createCalculationRun(input: CreateCloudChargeCalculationRunInput): Promise<CloudChargeCalculationRun>;
  updateCalculationRun(runId: string, input: UpdateCloudChargeCalculationRunInput): Promise<CloudChargeCalculationRun>;
  getCalculationRun(runId: string): Promise<CloudChargeCalculationRun | undefined>;
  listCalculationRuns(filters?: CloudChargeCalculationRunFilters): Promise<readonly CloudChargeCalculationRun[]>;
  replaceTenantCharges(
    runId: string,
    charges: readonly Omit<TenantCloudCharge, "id" | "createdAt" | "updatedAt">[],
  ): Promise<readonly TenantCloudCharge[]>;
  listTenantCharges(runId: string, filters?: TenantCloudChargeFilters): Promise<readonly TenantCloudCharge[]>;
  getAllocationRun(allocationRunId: string): Promise<CloudCostAllocationRun | undefined>;
  listAllocationTenantAllocations(allocationRunId: string): Promise<readonly TenantCloudCostAllocation[]>;
  listTenants(): Promise<readonly CloudChargeTenant[]>;
};

export class InMemoryCloudChargeRepository implements CloudChargeRepository {
  private rules: CloudChargeRule[] = [];
  private runs: CloudChargeCalculationRun[] = [];
  private charges: TenantCloudCharge[] = [];
  private allocationRuns: CloudCostAllocationRun[] = [];
  private allocations: TenantCloudCostAllocation[] = [];
  private tenants: CloudChargeTenant[] = [];

  async createRule(input: CreateCloudChargeRuleInput): Promise<CloudChargeRule> {
    const now = new Date();
    const rule: CloudChargeRule = {
      id: randomUUID(),
      tenantId: input.tenantId,
      planCode: input.planCode,
      name: input.name,
      description: input.description,
      isActive: input.isActive ?? true,
      priority: input.priority ?? 100,
      effectiveFrom: input.effectiveFrom,
      effectiveUntil: input.effectiveUntil,
      currency: input.currency,
      markupType: input.markupType,
      markupValue: input.markupValue,
      minimumMonthlyCharge: input.minimumMonthlyCharge ?? 0,
      includedCloudCost: input.includedCloudCost ?? 0,
      includedUsageAmount: input.includedUsageAmount,
      includedUsageMetricKey: input.includedUsageMetricKey,
      overageMarkupType: input.overageMarkupType,
      overageMarkupValue: input.overageMarkupValue,
      roundingMode: input.roundingMode ?? "nearest_cent",
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };

    this.rules.push(rule);
    return rule;
  }

  async updateRule(ruleId: string, input: UpdateCloudChargeRuleInput): Promise<CloudChargeRule> {
    const existing = await this.getRequiredRule(ruleId);
    const updated: CloudChargeRule = {
      ...existing,
      tenantId: input.tenantId ?? existing.tenantId,
      planCode: input.planCode ?? existing.planCode,
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      isActive: input.isActive ?? existing.isActive,
      priority: input.priority ?? existing.priority,
      effectiveFrom: input.effectiveFrom ?? existing.effectiveFrom,
      effectiveUntil: input.effectiveUntil ?? existing.effectiveUntil,
      currency: input.currency ?? existing.currency,
      markupType: input.markupType ?? existing.markupType,
      markupValue: input.markupValue ?? existing.markupValue,
      minimumMonthlyCharge: input.minimumMonthlyCharge ?? existing.minimumMonthlyCharge,
      includedCloudCost: input.includedCloudCost ?? existing.includedCloudCost,
      includedUsageAmount: input.includedUsageAmount ?? existing.includedUsageAmount,
      includedUsageMetricKey: input.includedUsageMetricKey ?? existing.includedUsageMetricKey,
      overageMarkupType: input.overageMarkupType ?? existing.overageMarkupType,
      overageMarkupValue: input.overageMarkupValue ?? existing.overageMarkupValue,
      roundingMode: input.roundingMode ?? existing.roundingMode,
      metadata: input.metadata ?? existing.metadata,
      updatedAt: new Date(),
    };

    this.rules = this.rules.map((rule) => (rule.id === ruleId ? updated : rule));
    return updated;
  }

  async getRule(ruleId: string): Promise<CloudChargeRule | undefined> {
    return this.rules.find((rule) => rule.id === ruleId);
  }

  async listRules(filters: CloudChargeRuleFilters = {}): Promise<readonly CloudChargeRule[]> {
    return this.rules
      .filter((rule) => !filters.tenantId || rule.tenantId === filters.tenantId)
      .filter((rule) => !filters.planCode || rule.planCode === filters.planCode)
      .filter((rule) => filters.isActive === undefined || rule.isActive === filters.isActive)
      .sort((a, b) => b.priority - a.priority || b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createCalculationRun(input: CreateCloudChargeCalculationRunInput): Promise<CloudChargeCalculationRun> {
    const now = new Date();
    const run: CloudChargeCalculationRun = {
      id: randomUUID(),
      status: "pending",
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      sourceAllocationRunId: input.sourceAllocationRunId,
      strategy: input.strategy ?? "markup_rules_v1",
      totalAllocatedCost: 0,
      totalChargeAmount: 0,
      totalMarginAmount: 0,
      totalDiscountAmount: 0,
      createdBy: input.createdBy,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };

    this.runs.push(run);
    return run;
  }

  async updateCalculationRun(runId: string, input: UpdateCloudChargeCalculationRunInput): Promise<CloudChargeCalculationRun> {
    const existing = await this.getRequiredRun(runId);
    const updated: CloudChargeCalculationRun = {
      ...existing,
      status: input.status,
      totalAllocatedCost: input.totalAllocatedCost ?? existing.totalAllocatedCost,
      totalChargeAmount: input.totalChargeAmount ?? existing.totalChargeAmount,
      totalMarginAmount: input.totalMarginAmount ?? existing.totalMarginAmount,
      totalDiscountAmount: input.totalDiscountAmount ?? existing.totalDiscountAmount,
      currency: input.currency ?? existing.currency,
      startedAt: input.startedAt ?? existing.startedAt,
      completedAt: input.completedAt ?? existing.completedAt,
      errorMessage: input.errorMessage,
      metadata: input.metadata ?? existing.metadata,
      updatedAt: new Date(),
    };

    this.runs = this.runs.map((run) => (run.id === runId ? updated : run));
    return updated;
  }

  async getCalculationRun(runId: string): Promise<CloudChargeCalculationRun | undefined> {
    return this.runs.find((run) => run.id === runId);
  }

  async listCalculationRuns(filters: CloudChargeCalculationRunFilters = {}): Promise<readonly CloudChargeCalculationRun[]> {
    return this.runs
      .filter((run) => !filters.status || run.status === filters.status)
      .filter((run) => !filters.sourceAllocationRunId || run.sourceAllocationRunId === filters.sourceAllocationRunId)
      .filter((run) => !filters.periodStart || run.periodEnd >= filters.periodStart)
      .filter((run) => !filters.periodEnd || run.periodStart <= filters.periodEnd)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async replaceTenantCharges(
    runId: string,
    charges: readonly Omit<TenantCloudCharge, "id" | "createdAt" | "updatedAt">[],
  ): Promise<readonly TenantCloudCharge[]> {
    const now = new Date();
    this.charges = this.charges.filter((charge) => charge.calculationRunId !== runId);
    const created = charges.map((charge) => ({
      ...charge,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    }));
    this.charges.push(...created);
    return created;
  }

  async listTenantCharges(runId: string, filters: TenantCloudChargeFilters = {}): Promise<readonly TenantCloudCharge[]> {
    return this.charges
      .filter((charge) => charge.calculationRunId === runId)
      .filter((charge) => !filters.tenantId || charge.tenantId === filters.tenantId)
      .filter((charge) => !filters.status || charge.status === filters.status);
  }

  async getAllocationRun(allocationRunId: string): Promise<CloudCostAllocationRun | undefined> {
    return this.allocationRuns.find((run) => run.id === allocationRunId);
  }

  async listAllocationTenantAllocations(allocationRunId: string): Promise<readonly TenantCloudCostAllocation[]> {
    return this.allocations.filter((allocation) => allocation.allocationRunId === allocationRunId);
  }

  async listTenants(): Promise<readonly CloudChargeTenant[]> {
    return this.tenants;
  }

  seed(input: {
    readonly rules?: readonly CloudChargeRule[];
    readonly allocationRuns?: readonly CloudCostAllocationRun[];
    readonly allocations?: readonly TenantCloudCostAllocation[];
    readonly tenants?: readonly CloudChargeTenant[];
  }): void {
    this.rules = [...(input.rules ?? this.rules)];
    this.allocationRuns = [...(input.allocationRuns ?? this.allocationRuns)];
    this.allocations = [...(input.allocations ?? this.allocations)];
    this.tenants = [...(input.tenants ?? this.tenants)];
  }

  reset(): void {
    this.rules = [];
    this.runs = [];
    this.charges = [];
    this.allocationRuns = [];
    this.allocations = [];
    this.tenants = [];
  }

  private async getRequiredRule(ruleId: string): Promise<CloudChargeRule> {
    const rule = await this.getRule(ruleId);
    if (!rule) throw new Error(`Cloud charge rule not found: ${ruleId}`);
    return rule;
  }

  private async getRequiredRun(runId: string): Promise<CloudChargeCalculationRun> {
    const run = await this.getCalculationRun(runId);
    if (!run) throw new Error(`Cloud charge calculation run not found: ${runId}`);
    return run;
  }
}
