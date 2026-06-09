import { env } from "../../config/env.js";
import { allocateCloudCosts } from "./cloud-cost-allocation.engine.js";
import {
  CloudCostAllocationError,
  CLOUD_COST_ALLOCATION_STRATEGIES,
  CLOUD_COST_ALLOCATION_STATUSES,
  type AllocateCostsForPeriodInput,
  type CloudCostAllocationRun,
  type CloudCostAllocationRunFilters,
  type CloudCostAllocationSummary,
  type CloudCostAllocationStrategy,
  type TenantCloudCostAllocationFilters,
} from "./cloud-cost-allocation.types.js";
import {
  InMemoryCloudCostAllocationRepository,
  type CloudCostAllocationRepository,
} from "./cloud-cost-allocation.repository.js";

const strategySet = new Set<string>(CLOUD_COST_ALLOCATION_STRATEGIES);
const statusSet = new Set<string>(CLOUD_COST_ALLOCATION_STATUSES);

export class CloudCostAllocationService {
  constructor(private readonly repository: CloudCostAllocationRepository) {}

  createAllocationRun(input: AllocateCostsForPeriodInput): Promise<CloudCostAllocationRun> {
    validatePeriod(input.periodStart, input.periodEnd);
    return this.repository.createRun({
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      strategy: normalizeStrategy(input.strategy),
      createdBy: input.createdBy,
      metadata: sanitizeCloudCostAllocationMetadata(input.metadata),
    });
  }

  async executeAllocationRun(runId: string): Promise<CloudCostAllocationRun> {
    const run = await this.getAllocationRun(runId);

    await this.repository.updateRun(run.id, {
      status: "processing",
      startedAt: new Date(),
      metadata: {
        ...run.metadata,
        executionStartedAt: new Date().toISOString(),
      },
    });

    try {
      const [costLineItems, usageAggregates, tenants] = await Promise.all([
        this.repository.listCostLineItems(run.periodStart, run.periodEnd),
        this.repository.listUsageDailyAggregates(run.periodStart, run.periodEnd),
        this.repository.listTenants(),
      ]);
      const result = allocateCloudCosts({
        runId: run.id,
        periodStart: run.periodStart,
        periodEnd: run.periodEnd,
        strategy: run.strategy,
        costLineItems,
        usageAggregates,
        tenants,
      });

      await this.repository.replaceTenantAllocations(run.id, result.allocations);

      return this.repository.updateRun(run.id, {
        status: "completed",
        totalImportedCost: result.totalImportedCost,
        totalAllocatedCost: result.totalAllocatedCost,
        totalUnallocatedCost: result.totalUnallocatedCost,
        currency: result.currency,
        completedAt: new Date(),
        metadata: {
          ...run.metadata,
          allocationEngine: "usage_weighted_v1",
          tenantAllocationCount: result.allocations.length,
          unallocated: result.unallocated,
        },
      });
    } catch (error) {
      return this.repository.updateRun(run.id, {
        status: "failed",
        errorMessage: sanitizeCloudCostAllocationError(error),
        completedAt: new Date(),
        metadata: run.metadata,
      });
    }
  }

  async allocateCostsForPeriod(input: AllocateCostsForPeriodInput): Promise<CloudCostAllocationRun> {
    const run = await this.createAllocationRun(input);
    return this.executeAllocationRun(run.id);
  }

  listAllocationRuns(filters: CloudCostAllocationRunFilters = {}) {
    if (filters.status && !statusSet.has(filters.status)) {
      throw new CloudCostAllocationError(400, "CLOUD_COST_ALLOCATION_INVALID", "status_invalid", `Invalid allocation run status: ${filters.status}.`);
    }
    return this.repository.listRuns(filters);
  }

  async getAllocationRun(runId: string): Promise<CloudCostAllocationRun> {
    const run = await this.repository.getRun(runId);
    if (!run) {
      throw new CloudCostAllocationError(404, "CLOUD_COST_ALLOCATION_NOT_FOUND", "run_not_found", "Cloud cost allocation run was not found.");
    }
    return run;
  }

  listTenantAllocations(runId: string, filters: TenantCloudCostAllocationFilters = {}) {
    return this.repository.listTenantAllocations(runId, filters);
  }

  async getAllocationSummary(filters: CloudCostAllocationRunFilters = {}): Promise<CloudCostAllocationSummary> {
    const runs = await this.repository.listRuns({
      ...filters,
      status: "completed",
    });
    const run = runs[0];

    if (!run) {
      return {
        periodStart: filters.periodStart?.toISOString() ?? "",
        periodEnd: filters.periodEnd?.toISOString() ?? "",
        totalImportedCost: 0,
        totalAllocatedCost: 0,
        totalUnallocatedCost: 0,
        tenants: [],
        services: [],
        generatedAt: new Date().toISOString(),
      };
    }

    const [allocations, tenants] = await Promise.all([
      this.repository.listTenantAllocations(run.id),
      this.repository.listTenants(),
    ]);
    const tenantNames = new Map(tenants.map((tenant) => [tenant.id, tenant.name]));
    const tenantGroups = new Map<string, number>();
    const serviceGroups = new Map<string, { allocatedCost: number; unallocatedCost: number }>();

    for (const allocation of allocations) {
      tenantGroups.set(allocation.tenantId, (tenantGroups.get(allocation.tenantId) ?? 0) + allocation.allocatedCost);
      const service = serviceGroups.get(allocation.serviceCode) ?? { allocatedCost: 0, unallocatedCost: 0 };
      service.allocatedCost += allocation.allocatedCost;
      serviceGroups.set(allocation.serviceCode, service);
    }

    for (const item of readUnallocated(run.metadata)) {
      const service = serviceGroups.get(item.serviceCode) ?? { allocatedCost: 0, unallocatedCost: 0 };
      service.unallocatedCost += item.unallocatedCost;
      serviceGroups.set(item.serviceCode, service);
    }

    return {
      periodStart: run.periodStart.toISOString(),
      periodEnd: run.periodEnd.toISOString(),
      currency: run.currency,
      totalImportedCost: run.totalImportedCost,
      totalAllocatedCost: run.totalAllocatedCost,
      totalUnallocatedCost: run.totalUnallocatedCost,
      tenants: [...tenantGroups.entries()]
        .map(([tenantId, allocatedCost]) => ({
          tenantId,
          tenantName: tenantNames.get(tenantId),
          allocatedCost: roundCost(allocatedCost),
          allocationRatio: run.totalImportedCost > 0 ? roundRatio(allocatedCost / run.totalImportedCost) : 0,
        }))
        .sort((a, b) => b.allocatedCost - a.allocatedCost),
      services: [...serviceGroups.entries()]
        .map(([serviceCode, value]) => ({
          serviceCode,
          allocatedCost: roundCost(value.allocatedCost),
          unallocatedCost: roundCost(value.unallocatedCost),
        }))
        .sort((a, b) => a.serviceCode.localeCompare(b.serviceCode)),
      generatedAt: new Date().toISOString(),
    };
  }
}

export function sanitizeCloudCostAllocationMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!metadata) return {};
  return compactRecord(sanitizeRecord(metadata));
}

export function sanitizeCloudCostAllocationError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown cloud cost allocation error.";
  return String(sanitizeValue(message)).slice(0, 1_000);
}

export function isCloudCostAllocationStrategy(value: string): value is CloudCostAllocationStrategy {
  return strategySet.has(value);
}

const memoryRepository = new InMemoryCloudCostAllocationRepository();
let defaultServicePromise: Promise<CloudCostAllocationService> | undefined;

export function createMemoryCloudCostAllocationService(): CloudCostAllocationService {
  return new CloudCostAllocationService(memoryRepository);
}

export function getMemoryCloudCostAllocationRepositoryForTests(): InMemoryCloudCostAllocationRepository {
  return memoryRepository;
}

export async function createDefaultCloudCostAllocationService(): Promise<CloudCostAllocationService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryCloudCostAllocationService();
  }

  defaultServicePromise ??= createPrismaCloudCostAllocationService();
  return defaultServicePromise;
}

export function resetCloudCostAllocationRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaCloudCostAllocationService(): Promise<CloudCostAllocationService> {
  const { createPrismaCloudCostAllocationRepository } = await import("./cloud-cost-allocation-prisma.repository.js");
  return new CloudCostAllocationService(await createPrismaCloudCostAllocationRepository());
}

function normalizeStrategy(strategy: CloudCostAllocationStrategy | undefined): CloudCostAllocationStrategy {
  const value = strategy ?? "direct_tag_then_usage_weighted_v1";
  if (!strategySet.has(value)) {
    throw new CloudCostAllocationError(400, "CLOUD_COST_ALLOCATION_INVALID", "strategy_invalid", `Invalid allocation strategy: ${value}.`);
  }
  return value;
}

function validatePeriod(periodStart: Date, periodEnd: Date): void {
  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || periodStart > periodEnd) {
    throw new CloudCostAllocationError(400, "CLOUD_COST_ALLOCATION_INVALID", "period_invalid", "Allocation period is invalid.");
  }
}

const sensitiveKeyPattern =
  /(authorization|access_?token|refresh_?token|\btoken\b|password|passwd|pwd|secret|api_?key|token_hash|password_hash|refresh_token_hash|storage_key|storagekey|bucket|private_url|privateurl|path|body|payload|query|csv|file|content)/i;

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

function readUnallocated(metadata: Record<string, unknown>): { serviceCode: string; unallocatedCost: number }[] {
  const raw = metadata.unallocated;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item !== "object" || item === null) return undefined;
      const record = item as Record<string, unknown>;
      return {
        serviceCode: typeof record.serviceCode === "string" ? record.serviceCode : "unknown",
        unallocatedCost: typeof record.unallocatedCost === "number" ? record.unallocatedCost : 0,
      };
    })
    .filter((item): item is { serviceCode: string; unallocatedCost: number } => item !== undefined);
}

function roundCost(value: number): number {
  return Number(value.toFixed(6));
}

function roundRatio(value: number): number {
  return Number(value.toFixed(12));
}
