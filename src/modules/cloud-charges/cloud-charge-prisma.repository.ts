import type { Prisma, PrismaClient } from "@prisma/client";

import type {
  CloudCostAllocationRun,
  TenantCloudCostAllocation,
} from "../cloud-cost-allocation/cloud-cost-allocation.types.js";
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
import type { CloudChargeRepository } from "./cloud-charge.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaCloudChargeRepository implements CloudChargeRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async createRule(input: CreateCloudChargeRuleInput): Promise<CloudChargeRule> {
    const record = await this.client.cloudChargeRule.create({
      data: {
        tenant_id: input.tenantId ?? null,
        plan_code: input.planCode ?? null,
        name: input.name,
        description: input.description ?? null,
        is_active: input.isActive ?? true,
        priority: input.priority ?? 100,
        effective_from: input.effectiveFrom,
        effective_until: input.effectiveUntil ?? null,
        currency: input.currency,
        markup_type: input.markupType,
        markup_value: input.markupValue,
        minimum_monthly_charge: input.minimumMonthlyCharge ?? 0,
        included_cloud_cost: input.includedCloudCost ?? 0,
        included_usage_amount: input.includedUsageAmount ?? null,
        included_usage_metric_key: input.includedUsageMetricKey ?? null,
        overage_markup_type: input.overageMarkupType ?? null,
        overage_markup_value: input.overageMarkupValue ?? null,
        rounding_mode: input.roundingMode ?? "nearest_cent",
        metadata: toJsonObject(input.metadata ?? {}),
      },
    });

    return mapRule(record);
  }

  async updateRule(ruleId: string, input: UpdateCloudChargeRuleInput): Promise<CloudChargeRule> {
    const record = await this.client.cloudChargeRule.update({
      where: { id: ruleId },
      data: {
        ...(input.tenantId !== undefined ? { tenant_id: input.tenantId ?? null } : {}),
        ...(input.planCode !== undefined ? { plan_code: input.planCode ?? null } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description ?? null } : {}),
        ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.effectiveFrom !== undefined ? { effective_from: input.effectiveFrom } : {}),
        ...(input.effectiveUntil !== undefined ? { effective_until: input.effectiveUntil ?? null } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.markupType !== undefined ? { markup_type: input.markupType } : {}),
        ...(input.markupValue !== undefined ? { markup_value: input.markupValue } : {}),
        ...(input.minimumMonthlyCharge !== undefined ? { minimum_monthly_charge: input.minimumMonthlyCharge } : {}),
        ...(input.includedCloudCost !== undefined ? { included_cloud_cost: input.includedCloudCost } : {}),
        ...(input.includedUsageAmount !== undefined ? { included_usage_amount: input.includedUsageAmount ?? null } : {}),
        ...(input.includedUsageMetricKey !== undefined ? { included_usage_metric_key: input.includedUsageMetricKey ?? null } : {}),
        ...(input.overageMarkupType !== undefined ? { overage_markup_type: input.overageMarkupType ?? null } : {}),
        ...(input.overageMarkupValue !== undefined ? { overage_markup_value: input.overageMarkupValue ?? null } : {}),
        ...(input.roundingMode !== undefined ? { rounding_mode: input.roundingMode } : {}),
        ...(input.metadata ? { metadata: toJsonObject(input.metadata) } : {}),
      },
    });

    return mapRule(record);
  }

  async getRule(ruleId: string): Promise<CloudChargeRule | undefined> {
    const record = await this.client.cloudChargeRule.findUnique({ where: { id: ruleId } });
    return record ? mapRule(record) : undefined;
  }

  async listRules(filters: CloudChargeRuleFilters = {}): Promise<readonly CloudChargeRule[]> {
    const records = await this.client.cloudChargeRule.findMany({
      where: {
        ...(filters.tenantId ? { tenant_id: filters.tenantId } : {}),
        ...(filters.planCode ? { plan_code: filters.planCode } : {}),
        ...(filters.isActive !== undefined ? { is_active: filters.isActive } : {}),
      },
      orderBy: [{ priority: "desc" }, { created_at: "desc" }],
    });

    return records.map(mapRule);
  }

  async createCalculationRun(input: CreateCloudChargeCalculationRunInput): Promise<CloudChargeCalculationRun> {
    const record = await this.client.cloudChargeCalculationRun.create({
      data: {
        status: "pending",
        period_start: input.periodStart,
        period_end: input.periodEnd,
        source_allocation_run_id: input.sourceAllocationRunId,
        strategy: input.strategy ?? "markup_rules_v1",
        created_by: input.createdBy ?? null,
        metadata: toJsonObject(input.metadata ?? {}),
      },
    });

    return mapCalculationRun(record);
  }

  async updateCalculationRun(runId: string, input: UpdateCloudChargeCalculationRunInput): Promise<CloudChargeCalculationRun> {
    const record = await this.client.cloudChargeCalculationRun.update({
      where: { id: runId },
      data: {
        status: input.status,
        total_allocated_cost: input.totalAllocatedCost,
        total_charge_amount: input.totalChargeAmount,
        total_margin_amount: input.totalMarginAmount,
        total_discount_amount: input.totalDiscountAmount,
        currency: input.currency ?? null,
        started_at: input.startedAt ?? null,
        completed_at: input.completedAt ?? null,
        error_message: input.errorMessage ?? null,
        ...(input.metadata ? { metadata: toJsonObject(input.metadata) } : {}),
      },
    });

    return mapCalculationRun(record);
  }

  async getCalculationRun(runId: string): Promise<CloudChargeCalculationRun | undefined> {
    const record = await this.client.cloudChargeCalculationRun.findUnique({ where: { id: runId } });
    return record ? mapCalculationRun(record) : undefined;
  }

  async listCalculationRuns(filters: CloudChargeCalculationRunFilters = {}): Promise<readonly CloudChargeCalculationRun[]> {
    const records = await this.client.cloudChargeCalculationRun.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.sourceAllocationRunId ? { source_allocation_run_id: filters.sourceAllocationRunId } : {}),
        ...(filters.periodStart || filters.periodEnd
          ? {
              AND: [
                ...(filters.periodStart ? [{ period_end: { gte: filters.periodStart } }] : []),
                ...(filters.periodEnd ? [{ period_start: { lte: filters.periodEnd } }] : []),
              ],
            }
          : {}),
      },
      orderBy: { created_at: "desc" },
    });

    return records.map(mapCalculationRun);
  }

  async replaceTenantCharges(
    runId: string,
    charges: readonly Omit<TenantCloudCharge, "id" | "createdAt" | "updatedAt">[],
  ): Promise<readonly TenantCloudCharge[]> {
    await this.client.tenantCloudCharge.deleteMany({ where: { calculation_run_id: runId } });
    const created: TenantCloudCharge[] = [];

    for (const charge of charges) {
      const record = await this.client.tenantCloudCharge.create({
        data: {
          calculation_run_id: runId,
          tenant_id: charge.tenantId,
          source_allocation_run_id: charge.sourceAllocationRunId,
          cloud_charge_rule_id: charge.cloudChargeRuleId ?? null,
          period_start: charge.periodStart,
          period_end: charge.periodEnd,
          allocated_cost: charge.allocatedCost,
          included_cloud_cost: charge.includedCloudCost,
          billable_cost: charge.billableCost,
          markup_type: charge.markupType,
          markup_value: charge.markupValue,
          minimum_monthly_charge: charge.minimumMonthlyCharge,
          gross_charge_amount: charge.grossChargeAmount,
          discount_amount: charge.discountAmount,
          final_charge_amount: charge.finalChargeAmount,
          margin_amount: charge.marginAmount,
          margin_percentage: charge.marginPercentage ?? null,
          currency: charge.currency,
          status: charge.status,
          metadata: toJsonObject(charge.metadata),
        },
      });
      created.push(mapTenantCharge(record));
    }

    return created;
  }

  async listTenantCharges(runId: string, filters: TenantCloudChargeFilters = {}): Promise<readonly TenantCloudCharge[]> {
    const records = await this.client.tenantCloudCharge.findMany({
      where: {
        calculation_run_id: runId,
        ...(filters.tenantId ? { tenant_id: filters.tenantId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: { created_at: "asc" },
    });

    return records.map(mapTenantCharge);
  }

  async getAllocationRun(allocationRunId: string): Promise<CloudCostAllocationRun | undefined> {
    const record = await this.client.cloudCostAllocationRun.findUnique({ where: { id: allocationRunId } });
    return record ? mapAllocationRun(record) : undefined;
  }

  async listAllocationTenantAllocations(allocationRunId: string): Promise<readonly TenantCloudCostAllocation[]> {
    const records = await this.client.tenantCloudCostAllocation.findMany({
      where: { allocation_run_id: allocationRunId },
      orderBy: { created_at: "asc" },
      take: 100_000,
    });

    return records.map(mapCostAllocation);
  }

  async listTenants(): Promise<readonly CloudChargeTenant[]> {
    const records = await this.client.tenant.findMany({
      select: { id: true, name: true, slug: true },
    });

    return records;
  }
}

export async function createPrismaCloudChargeRepository(): Promise<PrismaCloudChargeRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new PrismaCloudChargeRepository(prisma);
}

function mapRule(record: {
  readonly id: string;
  readonly tenant_id: string | null;
  readonly plan_code: string | null;
  readonly name: string;
  readonly description: string | null;
  readonly is_active: boolean;
  readonly priority: number;
  readonly effective_from: Date;
  readonly effective_until: Date | null;
  readonly currency: string;
  readonly markup_type: string;
  readonly markup_value: unknown;
  readonly minimum_monthly_charge: unknown;
  readonly included_cloud_cost: unknown;
  readonly included_usage_amount: unknown;
  readonly included_usage_metric_key: string | null;
  readonly overage_markup_type: string | null;
  readonly overage_markup_value: unknown;
  readonly rounding_mode: string;
  readonly metadata: unknown;
  readonly created_at: Date;
  readonly updated_at: Date;
}): CloudChargeRule {
  return {
    id: record.id,
    tenantId: record.tenant_id ?? undefined,
    planCode: record.plan_code ?? undefined,
    name: record.name,
    description: record.description ?? undefined,
    isActive: record.is_active,
    priority: record.priority,
    effectiveFrom: record.effective_from,
    effectiveUntil: record.effective_until ?? undefined,
    currency: record.currency,
    markupType: record.markup_type as CloudChargeRule["markupType"],
    markupValue: Number(record.markup_value),
    minimumMonthlyCharge: Number(record.minimum_monthly_charge),
    includedCloudCost: Number(record.included_cloud_cost),
    includedUsageAmount: record.included_usage_amount === null ? undefined : Number(record.included_usage_amount),
    includedUsageMetricKey: record.included_usage_metric_key ?? undefined,
    overageMarkupType: record.overage_markup_type as CloudChargeRule["overageMarkupType"],
    overageMarkupValue: record.overage_markup_value === null ? undefined : Number(record.overage_markup_value),
    roundingMode: record.rounding_mode as CloudChargeRule["roundingMode"],
    metadata: isRecord(record.metadata) ? record.metadata : {},
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapCalculationRun(record: {
  readonly id: string;
  readonly status: string;
  readonly period_start: Date;
  readonly period_end: Date;
  readonly source_allocation_run_id: string;
  readonly strategy: string;
  readonly total_allocated_cost: unknown;
  readonly total_charge_amount: unknown;
  readonly total_margin_amount: unknown;
  readonly total_discount_amount: unknown;
  readonly currency: string | null;
  readonly started_at: Date | null;
  readonly completed_at: Date | null;
  readonly created_by: string | null;
  readonly error_message: string | null;
  readonly metadata: unknown;
  readonly created_at: Date;
  readonly updated_at: Date;
}): CloudChargeCalculationRun {
  return {
    id: record.id,
    status: record.status as CloudChargeCalculationRun["status"],
    periodStart: record.period_start,
    periodEnd: record.period_end,
    sourceAllocationRunId: record.source_allocation_run_id,
    strategy: record.strategy as CloudChargeCalculationRun["strategy"],
    totalAllocatedCost: Number(record.total_allocated_cost),
    totalChargeAmount: Number(record.total_charge_amount),
    totalMarginAmount: Number(record.total_margin_amount),
    totalDiscountAmount: Number(record.total_discount_amount),
    currency: record.currency ?? undefined,
    startedAt: record.started_at ?? undefined,
    completedAt: record.completed_at ?? undefined,
    createdBy: record.created_by ?? undefined,
    errorMessage: record.error_message ?? undefined,
    metadata: isRecord(record.metadata) ? record.metadata : {},
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapTenantCharge(record: {
  readonly id: string;
  readonly calculation_run_id: string;
  readonly tenant_id: string;
  readonly source_allocation_run_id: string;
  readonly cloud_charge_rule_id: string | null;
  readonly period_start: Date;
  readonly period_end: Date;
  readonly allocated_cost: unknown;
  readonly included_cloud_cost: unknown;
  readonly billable_cost: unknown;
  readonly markup_type: string;
  readonly markup_value: unknown;
  readonly minimum_monthly_charge: unknown;
  readonly gross_charge_amount: unknown;
  readonly discount_amount: unknown;
  readonly final_charge_amount: unknown;
  readonly margin_amount: unknown;
  readonly margin_percentage: unknown;
  readonly currency: string;
  readonly status: string;
  readonly metadata: unknown;
  readonly created_at: Date;
  readonly updated_at: Date;
}): TenantCloudCharge {
  return {
    id: record.id,
    calculationRunId: record.calculation_run_id,
    tenantId: record.tenant_id,
    sourceAllocationRunId: record.source_allocation_run_id,
    cloudChargeRuleId: record.cloud_charge_rule_id ?? undefined,
    periodStart: record.period_start,
    periodEnd: record.period_end,
    allocatedCost: Number(record.allocated_cost),
    includedCloudCost: Number(record.included_cloud_cost),
    billableCost: Number(record.billable_cost),
    markupType: record.markup_type as TenantCloudCharge["markupType"],
    markupValue: Number(record.markup_value),
    minimumMonthlyCharge: Number(record.minimum_monthly_charge),
    grossChargeAmount: Number(record.gross_charge_amount),
    discountAmount: Number(record.discount_amount),
    finalChargeAmount: Number(record.final_charge_amount),
    marginAmount: Number(record.margin_amount),
    marginPercentage: record.margin_percentage === null ? undefined : Number(record.margin_percentage),
    currency: record.currency,
    status: record.status as TenantCloudCharge["status"],
    metadata: isRecord(record.metadata) ? record.metadata : {},
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapAllocationRun(record: {
  readonly id: string;
  readonly provider: string;
  readonly status: string;
  readonly period_start: Date;
  readonly period_end: Date;
  readonly strategy: string;
  readonly total_imported_cost: unknown;
  readonly total_allocated_cost: unknown;
  readonly total_unallocated_cost: unknown;
  readonly currency: string | null;
  readonly started_at: Date | null;
  readonly completed_at: Date | null;
  readonly created_by: string | null;
  readonly error_message: string | null;
  readonly metadata: unknown;
  readonly created_at: Date;
  readonly updated_at: Date;
}): CloudCostAllocationRun {
  return {
    id: record.id,
    provider: "aws",
    status: record.status as CloudCostAllocationRun["status"],
    periodStart: record.period_start,
    periodEnd: record.period_end,
    strategy: record.strategy as CloudCostAllocationRun["strategy"],
    totalImportedCost: Number(record.total_imported_cost),
    totalAllocatedCost: Number(record.total_allocated_cost),
    totalUnallocatedCost: Number(record.total_unallocated_cost),
    currency: record.currency ?? undefined,
    startedAt: record.started_at ?? undefined,
    completedAt: record.completed_at ?? undefined,
    createdBy: record.created_by ?? undefined,
    errorMessage: record.error_message ?? undefined,
    metadata: isRecord(record.metadata) ? record.metadata : {},
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapCostAllocation(record: {
  readonly id: string;
  readonly allocation_run_id: string;
  readonly tenant_id: string;
  readonly provider: string;
  readonly period_start: Date;
  readonly period_end: Date;
  readonly service_code: string;
  readonly usage_type: string;
  readonly cost_category: string;
  readonly allocation_method: string;
  readonly allocation_basis_metric_key: string | null;
  readonly allocation_basis_quantity: unknown;
  readonly allocation_ratio: unknown;
  readonly allocated_cost: unknown;
  readonly currency: string;
  readonly source_cost_line_item_ids: unknown;
  readonly metadata: unknown;
  readonly created_at: Date;
  readonly updated_at: Date;
}): TenantCloudCostAllocation {
  return {
    id: record.id,
    allocationRunId: record.allocation_run_id,
    tenantId: record.tenant_id,
    provider: "aws",
    periodStart: record.period_start,
    periodEnd: record.period_end,
    serviceCode: record.service_code,
    usageType: record.usage_type,
    costCategory: record.cost_category,
    allocationMethod: record.allocation_method as TenantCloudCostAllocation["allocationMethod"],
    allocationBasisMetricKey: record.allocation_basis_metric_key as TenantCloudCostAllocation["allocationBasisMetricKey"],
    allocationBasisQuantity: Number(record.allocation_basis_quantity),
    allocationRatio: Number(record.allocation_ratio),
    allocatedCost: Number(record.allocated_cost),
    currency: record.currency,
    sourceCostLineItemIds: Array.isArray(record.source_cost_line_item_ids)
      ? record.source_cost_line_item_ids.filter((item): item is string => typeof item === "string")
      : [],
    metadata: isRecord(record.metadata) ? record.metadata : {},
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function toJsonObject(input: Record<string, unknown>): Prisma.InputJsonObject {
  return input as Prisma.InputJsonObject;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
