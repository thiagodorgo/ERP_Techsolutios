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
import { CloudCostAllocationError, PLATFORM_SYSTEM_ORG_SLUG } from "./cloud-cost-allocation.types.js";

const unknown = "unknown";

export function allocateCloudCosts(input: AllocationEngineInput): AllocationEngineResult {
  const tenantIdsByTag = new Map<string, Set<string>>();
  const tenantsById = new Map(input.tenants.map((tenant) => [tenant.id, tenant]));
  const allocations: Omit<TenantCloudCostAllocation, "id" | "createdAt" | "updatedAt">[] = [];
  const platformCost: PlatformCostEntry[] = [];
  const unallocated: Array<AllocationEngineResult["unallocated"][number]> = [];
  const estimatedCategories = new Set<string>();
  // B-SAN3-03 · R13 — quantos valores de dinheiro o motor arredondou nesta execução (uma fatia por par
  // linha × organização, uma por linha que cai em não rateado ou na plataforma). É o orçamento do resíduo.
  let roundingCount = 0;

  // B-SAN3-03 · R14 — moeda misturada não soma: a run falha com o motivo, sem alocação. Câmbio é do B-ASS-09.
  const lineCurrencies = [...new Set(input.costLineItems.map((line) => line.currency))];
  if (lineCurrencies.length > 1) {
    throw new CloudCostAllocationError(
      422,
      "CLOUD_COST_ALLOCATION_MIXED_CURRENCY",
      "mixed_currency",
      `mixed_currency: ${JSON.stringify({ currencies: lineCurrencies.sort() })}`,
    );
  }
  // B-SAN3-03 · R8 — a plataforma fica no universo (casa a tag e pesa no denominador), mas nunca recebe
  // alocação: a parte dela vira `platformCost`, linha própria.
  const systemTenant = input.tenants.find(
    (tenant) => tenant.slug && normalizeTenantTag(tenant.slug) === PLATFORM_SYSTEM_ORG_SLUG,
  );

  for (const tenant of input.tenants) {
    addTenantTag(tenantIdsByTag, tenant.id, tenant.id);
    addTenantTag(tenantIdsByTag, tenant.name, tenant.id);
    if (tenant.slug) addTenantTag(tenantIdsByTag, tenant.slug, tenant.id);
  }

  for (const line of input.costLineItems) {
    const normalizedTag = line.tenantTag ? normalizeTenantTag(line.tenantTag) : undefined;
    const matchedTenantIds = normalizedTag ? tenantIdsByTag.get(normalizedTag) : undefined;

    if (matchedTenantIds && matchedTenantIds.size > 1) {
      unallocated.push(createUnallocated(line, "ambiguous_tenant_tag"));
      roundingCount += 1;
      continue;
    }

    if (normalizedTag && !matchedTenantIds && input.strategy === "direct_tag_then_usage_weighted_v1") {
      unallocated.push(createUnallocated(line, "unknown_tenant_tag"));
      roundingCount += 1;
      continue;
    }

    const tenantId = matchedTenantIds?.values().next().value;
    const tenant = tenantId ? tenantsById.get(tenantId) : undefined;

    // Antes do teste de estratégia: custo marcado com a plataforma é dela nas DUAS estratégias.
    if (tenant && systemTenant && tenant.id === systemTenant.id) {
      platformCost.push(createPlatformCost(line, "direct_tag", line.unblendedCost, line.costCategory ?? "direct_tag"));
      roundingCount += 1;
      continue;
    }

    if (tenant && input.strategy === "direct_tag_then_usage_weighted_v1") {
      allocations.push(createAllocation(input, line, tenant.id, "direct_tenant_tag", undefined, 1, line.unblendedCost));
      roundingCount += 1;
      continue;
    }

    const rule = resolveAllocationRule(line);

    if (!rule) {
      unallocated.push(createUnallocated(line, "no_allocation_rule"));
      roundingCount += 1;
      continue;
    }

    const basis = resolveBasis(input, rule.basisMetricKeys);

    if (basis.totalQuantity <= 0) {
      unallocated.push(createUnallocated(line, "missing_usage_basis"));
      roundingCount += 1;
      continue;
    }

    if (rule.estimate) estimatedCategories.add(rule.costCategory);

    for (const tenantBasis of basis.byTenant) {
      if (tenantBasis.quantity <= 0) continue;
      const ratio = tenantBasis.quantity / basis.totalQuantity;
      if (systemTenant && tenantBasis.tenantId === systemTenant.id) {
        platformCost.push(createPlatformCost(line, "usage_share", line.unblendedCost * ratio, rule.costCategory));
        roundingCount += 1;
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
      roundingCount += 1;
    }
  }

  const totalImportedCost = roundCost(input.costLineItems.reduce((total, line) => total + line.unblendedCost, 0));
  const totalAllocatedCost = sumCosts(allocations.map((item) => item.allocatedCost));
  const totalPlatformCost = sumCosts(platformCost.map((item) => item.platformCost));
  const totalUnallocatedCost = sumCosts(unallocated.map((item) => item.unallocatedCost));
  const currencies = lineCurrencies;
  const roundingResidualCost = assertConservation(
    {
      importedCost: totalImportedCost,
      allocatedCost: totalAllocatedCost,
      platformCost: totalPlatformCost,
      unallocatedCost: totalUnallocatedCost,
    },
    roundingCount,
  );

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
    roundingResidualCost,
    roundingCount,
  };
}

function normalizeTenantTag(value: string): string {
  return value
    .replace(/[\p{Default_Ignorable_Code_Point}\p{Cf}]/gu, "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function addTenantTag(index: Map<string, Set<string>>, value: string, tenantId: string): void {
  const normalized = normalizeTenantTag(value);
  if (!normalized) return;
  const tenantIds = index.get(normalized) ?? new Set<string>();
  tenantIds.add(tenantId);
  index.set(normalized, tenantIds);
}

export type ConservationTerms = {
  readonly importedCost: number;
  readonly allocatedCost: number;
  readonly platformCost: number;
  readonly unallocatedCost: number;
};

/**
 * B-SAN3-03 · R13 — a soma fecha em quatro termos nomeados mais o resíduo de arredondamento, em
 * micro-unidades exatas (`BigInt`): `importado = alocado + plataforma + não rateado + resíduo`. O resíduo
 * só explica arredondamento: `|resíduo| ≤ roundingCount × 0,000001`. Acima disso é custo perdido, e a run
 * falha com `residual_exceeded` (mesmo caminho do R14). Devolve o resíduo, com sinal.
 */
export function assertConservation(terms: ConservationTerms, roundingCount: number): number {
  const residualMicro =
    toMicro(terms.importedCost) - toMicro(terms.allocatedCost) - toMicro(terms.platformCost) - toMicro(terms.unallocatedCost);
  const absolute = residualMicro < 0n ? -residualMicro : residualMicro;
  const cap = BigInt(Math.max(0, Math.trunc(roundingCount)));

  if (absolute > cap) {
    throw new CloudCostAllocationError(
      422,
      "CLOUD_COST_ALLOCATION_RESIDUAL_EXCEEDED",
      "residual_exceeded",
      `residual_exceeded: ${JSON.stringify({ residualMicro: residualMicro.toString(), capMicro: cap.toString() })}`,
    );
  }

  return Number(residualMicro) / MICRO;
}

const MICRO = 1_000_000;

function toMicro(value: number): bigint {
  return BigInt(Math.round(value * MICRO));
}

function sumCosts(values: readonly number[]): number {
  let total = 0n;
  for (const value of values) total += toMicro(value);
  return Number(total) / MICRO;
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
