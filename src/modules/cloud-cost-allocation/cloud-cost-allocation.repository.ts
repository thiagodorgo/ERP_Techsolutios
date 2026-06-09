import { randomUUID } from "node:crypto";

import type { CloudCostLineItem } from "../cloud-costs/aws-cur.types.js";
import type { CloudUsageDailyAggregate } from "../cloud-usage/cloud-usage.types.js";
import type {
  CloudCostAllocationRun,
  CloudCostAllocationRunFilters,
  CloudCostAllocationTenant,
  CreateCloudCostAllocationRunInput,
  TenantCloudCostAllocation,
  TenantCloudCostAllocationFilters,
  UpdateCloudCostAllocationRunInput,
} from "./cloud-cost-allocation.types.js";

export type CloudCostAllocationRepository = {
  createRun(input: CreateCloudCostAllocationRunInput): Promise<CloudCostAllocationRun>;
  updateRun(runId: string, input: UpdateCloudCostAllocationRunInput): Promise<CloudCostAllocationRun>;
  getRun(runId: string): Promise<CloudCostAllocationRun | undefined>;
  listRuns(filters?: CloudCostAllocationRunFilters): Promise<readonly CloudCostAllocationRun[]>;
  replaceTenantAllocations(
    runId: string,
    allocations: readonly Omit<TenantCloudCostAllocation, "id" | "createdAt" | "updatedAt">[],
  ): Promise<readonly TenantCloudCostAllocation[]>;
  listTenantAllocations(runId: string, filters?: TenantCloudCostAllocationFilters): Promise<readonly TenantCloudCostAllocation[]>;
  listCostLineItems(periodStart: Date, periodEnd: Date): Promise<readonly CloudCostLineItem[]>;
  listUsageDailyAggregates(periodStart: Date, periodEnd: Date): Promise<readonly CloudUsageDailyAggregate[]>;
  listTenants(): Promise<readonly CloudCostAllocationTenant[]>;
};

export class InMemoryCloudCostAllocationRepository implements CloudCostAllocationRepository {
  private runs: CloudCostAllocationRun[] = [];
  private allocations: TenantCloudCostAllocation[] = [];
  private costLineItems: CloudCostLineItem[] = [];
  private usageAggregates: CloudUsageDailyAggregate[] = [];
  private tenants: CloudCostAllocationTenant[] = [];

  async createRun(input: CreateCloudCostAllocationRunInput): Promise<CloudCostAllocationRun> {
    const now = new Date();
    const run: CloudCostAllocationRun = {
      id: randomUUID(),
      provider: "aws",
      status: "pending",
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      strategy: input.strategy ?? "direct_tag_then_usage_weighted_v1",
      totalImportedCost: 0,
      totalAllocatedCost: 0,
      totalUnallocatedCost: 0,
      createdBy: input.createdBy,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };

    this.runs.push(run);
    return run;
  }

  async updateRun(runId: string, input: UpdateCloudCostAllocationRunInput): Promise<CloudCostAllocationRun> {
    const existing = await this.getRequiredRun(runId);
    const updated: CloudCostAllocationRun = {
      ...existing,
      status: input.status,
      totalImportedCost: input.totalImportedCost ?? existing.totalImportedCost,
      totalAllocatedCost: input.totalAllocatedCost ?? existing.totalAllocatedCost,
      totalUnallocatedCost: input.totalUnallocatedCost ?? existing.totalUnallocatedCost,
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

  async getRun(runId: string): Promise<CloudCostAllocationRun | undefined> {
    return this.runs.find((run) => run.id === runId);
  }

  async listRuns(filters: CloudCostAllocationRunFilters = {}): Promise<readonly CloudCostAllocationRun[]> {
    return this.runs
      .filter((run) => !filters.status || run.status === filters.status)
      .filter((run) => !filters.periodStart || run.periodEnd >= filters.periodStart)
      .filter((run) => !filters.periodEnd || run.periodStart <= filters.periodEnd)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async replaceTenantAllocations(
    runId: string,
    allocations: readonly Omit<TenantCloudCostAllocation, "id" | "createdAt" | "updatedAt">[],
  ): Promise<readonly TenantCloudCostAllocation[]> {
    const now = new Date();
    this.allocations = this.allocations.filter((allocation) => allocation.allocationRunId !== runId);
    const created = allocations.map((allocation) => ({
      ...allocation,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    }));

    this.allocations.push(...created);
    return created;
  }

  async listTenantAllocations(runId: string, filters: TenantCloudCostAllocationFilters = {}): Promise<readonly TenantCloudCostAllocation[]> {
    return this.allocations
      .filter((allocation) => allocation.allocationRunId === runId)
      .filter((allocation) => !filters.tenantId || allocation.tenantId === filters.tenantId)
      .filter((allocation) => !filters.serviceCode || allocation.serviceCode === filters.serviceCode)
      .filter((allocation) => !filters.costCategory || allocation.costCategory === filters.costCategory);
  }

  async listCostLineItems(periodStart: Date, periodEnd: Date): Promise<readonly CloudCostLineItem[]> {
    return this.costLineItems.filter(
      (line) => line.billingPeriodEnd >= periodStart && line.billingPeriodStart <= periodEnd,
    );
  }

  async listUsageDailyAggregates(periodStart: Date, periodEnd: Date): Promise<readonly CloudUsageDailyAggregate[]> {
    const start = periodStart.toISOString().slice(0, 10);
    const end = periodEnd.toISOString().slice(0, 10);
    return this.usageAggregates.filter((aggregate) => aggregate.date >= start && aggregate.date <= end);
  }

  async listTenants(): Promise<readonly CloudCostAllocationTenant[]> {
    return this.tenants;
  }

  seed(input: {
    readonly tenants?: readonly CloudCostAllocationTenant[];
    readonly costLineItems?: readonly CloudCostLineItem[];
    readonly usageAggregates?: readonly CloudUsageDailyAggregate[];
  }): void {
    this.tenants = [...(input.tenants ?? this.tenants)];
    this.costLineItems = [...(input.costLineItems ?? this.costLineItems)];
    this.usageAggregates = [...(input.usageAggregates ?? this.usageAggregates)];
  }

  reset(): void {
    this.runs = [];
    this.allocations = [];
    this.costLineItems = [];
    this.usageAggregates = [];
    this.tenants = [];
  }

  private async getRequiredRun(runId: string): Promise<CloudCostAllocationRun> {
    const run = await this.getRun(runId);
    if (!run) throw new Error(`Cloud cost allocation run not found: ${runId}`);
    return run;
  }
}
