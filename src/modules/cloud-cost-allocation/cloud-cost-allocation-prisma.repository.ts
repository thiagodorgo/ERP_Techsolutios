import type { Prisma, PrismaClient } from "@prisma/client";

import type { CloudCostLineItem } from "../cloud-costs/aws-cur.types.js";
import type { CloudUsageDailyAggregate } from "../cloud-usage/cloud-usage.types.js";
import type {
  CloudCostAllocationRun,
  CloudCostAllocationRunFilters,
  CloudCostAllocationTenant,
  TenantCloudCostAllocation,
  TenantCloudCostAllocationFilters,
  UpdateCloudCostAllocationRunInput,
  CreateCloudCostAllocationRunInput,
} from "./cloud-cost-allocation.types.js";
import type { CloudCostAllocationRepository } from "./cloud-cost-allocation.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaCloudCostAllocationRepository implements CloudCostAllocationRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async createRun(input: CreateCloudCostAllocationRunInput): Promise<CloudCostAllocationRun> {
    const record = await this.client.cloudCostAllocationRun.create({
      data: {
        provider: "aws",
        status: "pending",
        period_start: input.periodStart,
        period_end: input.periodEnd,
        strategy: input.strategy ?? "direct_tag_then_usage_weighted_v1",
        created_by: input.createdBy ?? null,
        metadata: toJsonObject(input.metadata ?? {}),
      },
    });

    return mapRun(record);
  }

  async updateRun(runId: string, input: UpdateCloudCostAllocationRunInput): Promise<CloudCostAllocationRun> {
    const record = await this.client.cloudCostAllocationRun.update({
      where: { id: runId },
      data: {
        status: input.status,
        total_imported_cost: input.totalImportedCost,
        total_allocated_cost: input.totalAllocatedCost,
        total_unallocated_cost: input.totalUnallocatedCost,
        currency: input.currency ?? null,
        started_at: input.startedAt ?? null,
        completed_at: input.completedAt ?? null,
        error_message: input.errorMessage ?? null,
        ...(input.metadata ? { metadata: toJsonObject(input.metadata) } : {}),
      },
    });

    return mapRun(record);
  }

  async getRun(runId: string): Promise<CloudCostAllocationRun | undefined> {
    const record = await this.client.cloudCostAllocationRun.findUnique({ where: { id: runId } });
    return record ? mapRun(record) : undefined;
  }

  async listRuns(filters: CloudCostAllocationRunFilters = {}): Promise<readonly CloudCostAllocationRun[]> {
    const records = await this.client.cloudCostAllocationRun.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
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

    return records.map(mapRun);
  }

  async replaceTenantAllocations(
    runId: string,
    allocations: readonly Omit<TenantCloudCostAllocation, "id" | "createdAt" | "updatedAt">[],
  ): Promise<readonly TenantCloudCostAllocation[]> {
    await this.client.tenantCloudCostAllocation.deleteMany({ where: { allocation_run_id: runId } });
    const created: TenantCloudCostAllocation[] = [];

    for (const allocation of allocations) {
      const record = await this.client.tenantCloudCostAllocation.create({
        data: {
          allocation_run_id: runId,
          tenant_id: allocation.tenantId,
          provider: allocation.provider,
          period_start: allocation.periodStart,
          period_end: allocation.periodEnd,
          service_code: allocation.serviceCode,
          usage_type: allocation.usageType,
          cost_category: allocation.costCategory,
          allocation_method: allocation.allocationMethod,
          allocation_basis_metric_key: allocation.allocationBasisMetricKey ?? null,
          allocation_basis_quantity: allocation.allocationBasisQuantity,
          allocation_ratio: allocation.allocationRatio,
          allocated_cost: allocation.allocatedCost,
          currency: allocation.currency,
          source_cost_line_item_ids: allocation.sourceCostLineItemIds as Prisma.InputJsonArray,
          metadata: toJsonObject(allocation.metadata),
        },
      });
      created.push(mapAllocation(record));
    }

    return created;
  }

  async listTenantAllocations(runId: string, filters: TenantCloudCostAllocationFilters = {}): Promise<readonly TenantCloudCostAllocation[]> {
    const records = await this.client.tenantCloudCostAllocation.findMany({
      where: {
        allocation_run_id: runId,
        ...(filters.tenantId ? { tenant_id: filters.tenantId } : {}),
        ...(filters.serviceCode ? { service_code: filters.serviceCode } : {}),
        ...(filters.costCategory ? { cost_category: filters.costCategory } : {}),
      },
      orderBy: { created_at: "asc" },
    });

    return records.map(mapAllocation);
  }

  async listCostLineItems(periodStart: Date, periodEnd: Date): Promise<readonly CloudCostLineItem[]> {
    const records = await this.client.cloudCostLineItem.findMany({
      where: {
        billing_period_end: { gte: periodStart },
        billing_period_start: { lte: periodEnd },
      },
      orderBy: { billing_period_start: "asc" },
      take: 100_000,
    });

    return records.map(mapCostLineItem);
  }

  async listUsageDailyAggregates(periodStart: Date, periodEnd: Date): Promise<readonly CloudUsageDailyAggregate[]> {
    const records = await this.client.cloudUsageDailyAggregate.findMany({
      where: {
        date: {
          gte: dateOnly(periodStart),
          lte: dateOnly(periodEnd),
        },
      },
      orderBy: { date: "asc" },
      take: 100_000,
    });

    return records.map(mapUsageAggregate);
  }

  async listTenants(): Promise<readonly CloudCostAllocationTenant[]> {
    const records = await this.client.tenant.findMany({
      select: { id: true, name: true, slug: true },
    });

    return records;
  }
}

export async function createPrismaCloudCostAllocationRepository(): Promise<PrismaCloudCostAllocationRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new PrismaCloudCostAllocationRepository(prisma);
}

function mapRun(record: {
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

function mapAllocation(record: {
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

function mapCostLineItem(record: {
  readonly id: string;
  readonly import_id: string;
  readonly provider: string;
  readonly billing_period_start: Date;
  readonly billing_period_end: Date;
  readonly usage_start: Date | null;
  readonly usage_end: Date | null;
  readonly service_code: string;
  readonly usage_type: string | null;
  readonly operation: string | null;
  readonly region: string | null;
  readonly resource_id: string | null;
  readonly cost_category: string | null;
  readonly environment: string | null;
  readonly project: string | null;
  readonly tenant_tag: string | null;
  readonly module_tag: string | null;
  readonly usage_amount: unknown;
  readonly usage_unit: string | null;
  readonly unblended_cost: unknown;
  readonly amortized_cost: unknown;
  readonly currency: string;
  readonly raw_line_hash: string;
  readonly metadata: unknown;
  readonly created_at: Date;
}): CloudCostLineItem {
  return {
    id: record.id,
    importId: record.import_id,
    provider: "aws",
    billingPeriodStart: record.billing_period_start,
    billingPeriodEnd: record.billing_period_end,
    usageStart: record.usage_start ?? undefined,
    usageEnd: record.usage_end ?? undefined,
    serviceCode: record.service_code,
    usageType: record.usage_type ?? undefined,
    operation: record.operation ?? undefined,
    region: record.region ?? undefined,
    resourceId: record.resource_id ?? undefined,
    costCategory: record.cost_category ?? undefined,
    environment: record.environment ?? undefined,
    project: record.project ?? undefined,
    tenantTag: record.tenant_tag ?? undefined,
    moduleTag: record.module_tag ?? undefined,
    usageAmount: record.usage_amount === null ? undefined : Number(record.usage_amount),
    usageUnit: record.usage_unit ?? undefined,
    unblendedCost: Number(record.unblended_cost),
    amortizedCost: record.amortized_cost === null ? undefined : Number(record.amortized_cost),
    currency: record.currency,
    rawLineHash: record.raw_line_hash,
    metadata: isRecord(record.metadata) ? record.metadata : {},
    createdAt: record.created_at,
  };
}

function mapUsageAggregate(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly date: Date;
  readonly metric_key: string;
  readonly quantity: unknown;
  readonly unit: string;
  readonly source_type: string;
  readonly metadata: unknown;
  readonly created_at: Date;
  readonly updated_at: Date;
}): CloudUsageDailyAggregate {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    date: record.date.toISOString().slice(0, 10),
    metricKey: record.metric_key as CloudUsageDailyAggregate["metricKey"],
    quantity: Number(record.quantity),
    unit: record.unit as CloudUsageDailyAggregate["unit"],
    sourceType: record.source_type,
    metadata: isRecord(record.metadata) ? record.metadata : {},
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function toJsonObject(input: Record<string, unknown>): Prisma.InputJsonObject {
  return input as Prisma.InputJsonObject;
}

function dateOnly(date: Date): Date {
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
