import type { CloudCostLineItem } from "../cloud-costs/aws-cur.types.js";
import type { CloudUsageMetricKey } from "../cloud-usage/cloud-usage.types.js";
import { resolveAllocationRule } from "./cloud-cost-allocation.rules.js";
import type {
  AllocationEngineInput,
  AllocationEngineResult,
  CloudCostAllocationMethod,
  CloudCostAllocationTenant,
  PlatformCostEntry,
  TenantCloudCostAllocation,
} from "./cloud-cost-allocation.types.js";
import { PLATFORM_SYSTEM_ORG_SLUG } from "./cloud-cost-allocation.types.js";

const unknown = "unknown";

export function allocateCloudCosts(input: AllocationEngineInput): AllocationEngineResult {
  const tenantsByTag = new Map<string, CloudCostAllocationTenant>();
  const allocations: Omit<TenantCloudCostAllocation, "id" | "createdAt" | "updatedAt">[] = [];
  const platformCost: PlatformCostEntry[] = [];
  const unallocated: Array<AllocationEngineResult["unallocated"][number]> = [];
  const estimatedCategories = new Set<string>();
  // B-SAN3-03 · R8 — a plataforma fica no universo (casa a tag e pesa no denominador), mas nunca recebe
  // alocação: a parte dela vira `platformCost`, linha própria.
  const systemTenant = input.tenants.find((tenant) => tenant.slug?.toLowerCase() === PLATFORM_SYSTEM_ORG_SLUG);

  for (const tenant of input.tenants) {
    tenantsByTag.set(tenant.id.toLowerCase(), tenant);
    tenantsByTag.set(tenant.name.toLowerCase(), tenant);
    if (tenant.slug) tenantsByTag.set(tenant.slug.toLowerCase(), tenant);
  }

  for (const line of input.costLineItems) {
    const tenant = line.tenantTag ? tenantsByTag.get(line.tenantTag.toLowerCase()) : undefined;

    // Antes do teste de estratégia: custo marcado com a plataforma é dela nas DUAS estratégias.
    if (tenant && systemTenant && tenant.id === systemTenant.id) {
      platformCost.push(createPlatformCost(line, "direct_tag", line.unblendedCost, line.costCategory ?? "direct_tag"));
      continue;
    }

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

    if (rule.estimate) estimatedCategories.add(rule.costCategory);

    for (const tenantBasis of basis.byTenant) {
      if (tenantBasis.quantity <= 0) continue;
      const ratio = tenantBasis.quantity / basis.totalQuantity;
      if (systemTenant && tenantBasis.tenantId === systemTenant.id) {
        platformCost.push(createPlatformCost(line, "usage_share", line.unblendedCost * ratio, rule.costCategory));
        continue;
      }
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
          rule.estimate === true,
        ),
      );
    }
  }

  const totalImportedCost = roundCost(input.costLineItems.reduce((total, line) => total + line.unblendedCost, 0));
  const totalAllocatedCost = roundCost(allocations.reduce((total, item) => total + item.allocatedCost, 0));
  const totalPlatformCost = roundCost(platformCost.reduce((total, item) => total + item.platformCost, 0));
  const totalUnallocatedCost = roundCost(unallocated.reduce((total, item) => total + item.unallocatedCost, 0));
  const currencies = [...new Set(input.costLineItems.map((line) => line.currency))];

  return {
    allocations: mergeAllocations(allocations),
    platformCost: mergePlatformCost(platformCost),
    totalImportedCost,
    totalAllocatedCost,
    totalPlatformCost,
    totalUnallocatedCost,
    currency: currencies.length === 1 ? currencies[0] : undefined,
    unallocated,
    estimatedCategories: [...estimatedCategories].sort(),
  };
}

function resolveBasis(input: AllocationEngineInput, metricKeys: readonly CloudUsageMetricKey[]) {
  for (const metricKey of metricKeys) {
    const byTenant = new Map<string, number>();

    // B-O6R-06 — a fonte mudou de PROJECAO DIARIA para SOMA DA TABELA DURAVEL; o corpo nao muda,
    // porque so `tenantId`/`metricKey`/`quantity` sao lidos.
    for (const basis of input.usageBasis) {
      if (basis.metricKey !== metricKey) continue;
      byTenant.set(basis.tenantId, (byTenant.get(basis.tenantId) ?? 0) + basis.quantity);
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
  estimate = false,
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
      ...(estimate ? { estimate: true } : {}),
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

function createPlatformCost(
  line: CloudCostLineItem,
  origin: PlatformCostEntry["origin"],
  cost: number,
  costCategory: string,
): PlatformCostEntry {
  return {
    serviceCode: line.serviceCode,
    usageType: line.usageType ?? unknown,
    costCategory,
    platformCost: roundCost(cost),
    currency: line.currency,
    sourceCostLineItemIds: [line.id],
    origin,
  };
}

function mergePlatformCost(entries: readonly PlatformCostEntry[]): readonly PlatformCostEntry[] {
  const merged = new Map<string, PlatformCostEntry>();
  for (const entry of entries) {
    const key = [entry.serviceCode, entry.usageType, entry.costCategory, entry.origin, entry.currency].join("|");
    const existing = merged.get(key);
    merged.set(
      key,
      existing
        ? {
            ...existing,
            platformCost: roundCost(existing.platformCost + entry.platformCost),
            sourceCostLineItemIds: [...existing.sourceCostLineItemIds, ...entry.sourceCostLineItemIds],
          }
        : entry,
    );
  }
  return [...merged.values()];
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
