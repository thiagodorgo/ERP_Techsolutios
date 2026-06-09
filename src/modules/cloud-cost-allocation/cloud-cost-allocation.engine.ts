import type { CloudCostLineItem } from "../cloud-costs/aws-cur.types.js";
import type { CloudUsageMetricKey } from "../cloud-usage/cloud-usage.types.js";
import { resolveAllocationRule } from "./cloud-cost-allocation.rules.js";
import type {
  AllocationEngineInput,
  AllocationEngineResult,
  CloudCostAllocationMethod,
  CloudCostAllocationTenant,
  TenantCloudCostAllocation,
} from "./cloud-cost-allocation.types.js";

const unknown = "unknown";

export function allocateCloudCosts(input: AllocationEngineInput): AllocationEngineResult {
  const tenantsByTag = new Map<string, CloudCostAllocationTenant>();
  const allocations: Omit<TenantCloudCostAllocation, "id" | "createdAt" | "updatedAt">[] = [];
  const unallocated: Array<AllocationEngineResult["unallocated"][number]> = [];

  for (const tenant of input.tenants) {
    tenantsByTag.set(tenant.id.toLowerCase(), tenant);
    tenantsByTag.set(tenant.name.toLowerCase(), tenant);
    if (tenant.slug) tenantsByTag.set(tenant.slug.toLowerCase(), tenant);
  }

  for (const line of input.costLineItems) {
    const tenant = line.tenantTag ? tenantsByTag.get(line.tenantTag.toLowerCase()) : undefined;

    if (tenant && input.strategy === "direct_tag_then_usage_weighted_v1") {
      allocations.push(createAllocation(input, line, tenant.id, "direct_tenant_tag", undefined, 1, line.unblendedCost));
      continue;
    }

    const rule = resolveAllocationRule(line);

    if (!rule) {
      unallocated.push(createUnallocated(line, "no_allocation_rule"));
      continue;
    }

    const basis = resolveBasis(input, rule.basisMetricKeys);

    if (basis.totalQuantity <= 0) {
      unallocated.push(createUnallocated(line, "missing_usage_basis"));
      continue;
    }

    for (const tenantBasis of basis.byTenant) {
      if (tenantBasis.quantity <= 0) continue;
      const ratio = tenantBasis.quantity / basis.totalQuantity;
      allocations.push(
        createAllocation(
          input,
          line,
          tenantBasis.tenantId,
          rule.allocationMethod,
          basis.metricKey,
          ratio,
          line.unblendedCost * ratio,
          tenantBasis.quantity,
          rule.costCategory,
        ),
      );
    }
  }

  const totalImportedCost = roundCost(input.costLineItems.reduce((total, line) => total + line.unblendedCost, 0));
  const totalAllocatedCost = roundCost(allocations.reduce((total, item) => total + item.allocatedCost, 0));
  const totalUnallocatedCost = roundCost(unallocated.reduce((total, item) => total + item.unallocatedCost, 0));
  const currencies = [...new Set(input.costLineItems.map((line) => line.currency))];

  return {
    allocations: mergeAllocations(allocations),
    totalImportedCost,
    totalAllocatedCost,
    totalUnallocatedCost,
    currency: currencies.length === 1 ? currencies[0] : undefined,
    unallocated,
  };
}

function resolveBasis(input: AllocationEngineInput, metricKeys: readonly CloudUsageMetricKey[]) {
  for (const metricKey of metricKeys) {
    const byTenant = new Map<string, number>();

    for (const aggregate of input.usageAggregates) {
      if (aggregate.metricKey !== metricKey) continue;
      byTenant.set(aggregate.tenantId, (byTenant.get(aggregate.tenantId) ?? 0) + aggregate.quantity);
    }

    const rows = [...byTenant.entries()].map(([tenantId, quantity]) => ({ tenantId, quantity }));
    const totalQuantity = rows.reduce((total, row) => total + row.quantity, 0);

    if (totalQuantity > 0) {
      return {
        metricKey,
        totalQuantity,
        byTenant: rows,
      };
    }
  }

  return {
    metricKey: metricKeys[0],
    totalQuantity: 0,
    byTenant: [],
  };
}

function createAllocation(
  input: AllocationEngineInput,
  line: CloudCostLineItem,
  tenantId: string,
  method: CloudCostAllocationMethod,
  basisMetricKey: CloudUsageMetricKey | undefined,
  ratio: number,
  allocatedCost: number,
  basisQuantity = method === "direct_tenant_tag" ? 1 : 0,
  costCategory = line.costCategory ?? method,
): Omit<TenantCloudCostAllocation, "id" | "createdAt" | "updatedAt"> {
  return {
    allocationRunId: input.runId,
    tenantId,
    provider: "aws",
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    serviceCode: line.serviceCode,
    usageType: line.usageType ?? unknown,
    costCategory,
    allocationMethod: method,
    allocationBasisMetricKey: basisMetricKey,
    allocationBasisQuantity: basisQuantity,
    allocationRatio: roundRatio(ratio),
    allocatedCost: roundCost(allocatedCost),
    currency: line.currency,
    sourceCostLineItemIds: [line.id],
    metadata: {
      source: "cloud-cost-allocation.engine",
    },
  };
}

function createUnallocated(line: CloudCostLineItem, reason: string): AllocationEngineResult["unallocated"][number] {
  return {
    serviceCode: line.serviceCode,
    usageType: line.usageType ?? unknown,
    costCategory: line.costCategory ?? "unallocated",
    unallocatedCost: roundCost(line.unblendedCost),
    currency: line.currency,
    sourceCostLineItemIds: [line.id],
    reason,
  };
}

function mergeAllocations(
  allocations: readonly Omit<TenantCloudCostAllocation, "id" | "createdAt" | "updatedAt">[],
): readonly Omit<TenantCloudCostAllocation, "id" | "createdAt" | "updatedAt">[] {
  const merged = new Map<string, Omit<TenantCloudCostAllocation, "id" | "createdAt" | "updatedAt">>();

  for (const allocation of allocations) {
    const key = [
      allocation.allocationRunId,
      allocation.tenantId,
      allocation.serviceCode,
      allocation.usageType,
      allocation.costCategory,
      allocation.allocationMethod,
    ].join("|");
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, allocation);
      continue;
    }

    merged.set(key, {
      ...existing,
      allocationBasisQuantity: roundCost(existing.allocationBasisQuantity + allocation.allocationBasisQuantity),
      allocationRatio: roundRatio(existing.allocationRatio + allocation.allocationRatio),
      allocatedCost: roundCost(existing.allocatedCost + allocation.allocatedCost),
      sourceCostLineItemIds: [...existing.sourceCostLineItemIds, ...allocation.sourceCostLineItemIds],
    });
  }

  return [...merged.values()];
}

function roundCost(value: number): number {
  return Number(value.toFixed(6));
}

function roundRatio(value: number): number {
  return Number(value.toFixed(12));
}
