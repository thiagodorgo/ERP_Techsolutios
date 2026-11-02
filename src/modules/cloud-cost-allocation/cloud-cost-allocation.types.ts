import type { CloudCostLineItem, CloudCostProvider } from "../cloud-costs/aws-cur.types.js";
import type { CloudUsageMetricKey } from "../cloud-usage/cloud-usage.types.js";

export const CLOUD_COST_ALLOCATION_STATUSES = ["pending", "processing", "completed", "failed"] as const;
export type CloudCostAllocationStatus = (typeof CLOUD_COST_ALLOCATION_STATUSES)[number];

export const CLOUD_COST_ALLOCATION_STRATEGIES = ["usage_weighted_v1", "direct_tag_then_usage_weighted_v1"] as const;
export type CloudCostAllocationStrategy = (typeof CLOUD_COST_ALLOCATION_STRATEGIES)[number];

export const CLOUD_COST_ALLOCATION_METHODS = [
  "direct_tenant_tag",
  "storage_usage_weight",
  "download_usage_weight",
  "api_request_weight",
  "job_execution_weight",
  "checklist_run_weight",
  "equal_split",
  "unallocated",
] as const;
export type CloudCostAllocationMethod = (typeof CLOUD_COST_ALLOCATION_METHODS)[number];

export type CloudCostAllocationMetadata = Record<string, unknown>;

export type CloudCostAllocationRun = {
  readonly id: string;
  readonly provider: CloudCostProvider;
  readonly status: CloudCostAllocationStatus;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly strategy: CloudCostAllocationStrategy;
  readonly totalImportedCost: number;
  readonly totalAllocatedCost: number;
  readonly totalUnallocatedCost: number;
  readonly currency?: string;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly createdBy?: string;
  readonly errorMessage?: string;
  readonly metadata: CloudCostAllocationMetadata;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type TenantCloudCostAllocation = {
  readonly id: string;
  readonly allocationRunId: string;
  readonly tenantId: string;
  readonly provider: CloudCostProvider;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly serviceCode: string;
  readonly usageType: string;
  readonly costCategory: string;
  readonly allocationMethod: CloudCostAllocationMethod;
  readonly allocationBasisMetricKey?: CloudUsageMetricKey;
  readonly allocationBasisQuantity: number;
  readonly allocationRatio: number;
  readonly allocatedCost: number;
  readonly currency: string;
  readonly sourceCostLineItemIds: readonly string[];
  readonly metadata: CloudCostAllocationMetadata;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CloudCostAllocationTenant = {
  readonly id: string;
  readonly name: string;
  readonly slug?: string;
};

export type CreateCloudCostAllocationRunInput = {
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly importId?: string;
  readonly strategy?: CloudCostAllocationStrategy;
  readonly createdBy?: string;
  readonly metadata?: CloudCostAllocationMetadata;
};

export type UpdateCloudCostAllocationRunInput = {
  readonly status: CloudCostAllocationStatus;
  readonly totalImportedCost?: number;
  readonly totalAllocatedCost?: number;
  readonly totalUnallocatedCost?: number;
  readonly currency?: string;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly errorMessage?: string;
  readonly metadata?: CloudCostAllocationMetadata;
};

export type CloudCostAllocationRunFilters = {
  readonly periodStart?: Date;
  readonly periodEnd?: Date;
  readonly status?: CloudCostAllocationStatus;
};

export type TenantCloudCostAllocationFilters = {
  readonly tenantId?: string;
  readonly serviceCode?: string;
  readonly costCategory?: string;
};

export type AllocateCostsForPeriodInput = {
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly importId?: string;
  readonly strategy?: CloudCostAllocationStrategy;
  readonly createdBy?: string;
  readonly metadata?: CloudCostAllocationMetadata;
};

// B-O6R-06 (Omega6R-DIN-005, 2.4-a do plano) — A BASE DE RATEIO VEM DA TABELA DURAVEL, NAO DA PROJECAO.
//
// `listUsageDailyAggregates` lia `cloud_usage_daily_aggregates`, uma projecao escrita SO por
// `aggregateDailyUsage`, exposta pelo job `cloud-usage.aggregate-daily` — que NINGUEM em `src/`
// enfileira (medido: nenhum `enqueue`, nenhum `enqueueInitial*` no bootstrap). Em producao a base de
// `checklist_runs_count` seria vazia por construcao -> `missing_usage_basis` -> custo `unallocated`.
// Durabilizar a metrica e continuar lendo essa projecao seria consertar o P0 no papel.
//
// Agora a base e `SUM ... GROUP BY` sobre `cloud_usage_events`, por tenant, sob o contexto RLS do
// proprio tenant. `listUsageDailyAggregates` FICA (serve `GET /platform/cloud-usage/tenants/:id/daily`);
// so deixou de ser base de dinheiro. A agenda dela virou `P-O6R-B06-AGGREGATE-DAILY-SEM-AGENDA`.
export type UsageBasisRow = {
  readonly tenantId: string;
  readonly metricKey: CloudUsageMetricKey;
  readonly quantity: number;
  readonly unit: string;
  readonly sourceType: string;
};

export type AllocationEngineInput = {
  readonly runId: string;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly strategy: CloudCostAllocationStrategy;
  readonly costLineItems: readonly CloudCostLineItem[];
  readonly usageBasis: readonly UsageBasisRow[];
  readonly tenants: readonly CloudCostAllocationTenant[];
};

/**
 * B-SAN3-03 · R8 — a organização da plataforma (mesmo critério do front, `platform-overview.types.ts`). Ela
 * PESA no rateio com a base dela e NÃO recebe alocação: a parte dela é `totalPlatformCost`, linha própria,
 * fora de `totalUnallocatedCost` (`D-SAN3-03-ORG-SISTEMA-NAO-COBRAVEL`, respondida pelo dono).
 */
export const PLATFORM_SYSTEM_ORG_SLUG = "platform";

export type PlatformCostEntry = {
  readonly serviceCode: string;
  readonly usageType: string;
  readonly costCategory: string;
  readonly platformCost: number;
  readonly currency: string;
  readonly sourceCostLineItemIds: readonly string[];
  readonly origin: "direct_tag" | "usage_share";
};

export type AllocationEngineResult = {
  readonly allocations: readonly Omit<TenantCloudCostAllocation, "id" | "createdAt" | "updatedAt">[];
  readonly platformCost: readonly PlatformCostEntry[];
  readonly totalImportedCost: number;
  readonly totalAllocatedCost: number;
  readonly totalPlatformCost: number;
  readonly totalUnallocatedCost: number;
  readonly currency?: string;
  readonly unallocated: readonly {
    readonly serviceCode: string;
    readonly usageType: string;
    readonly costCategory: string;
    readonly unallocatedCost: number;
    readonly currency: string;
    readonly sourceCostLineItemIds: readonly string[];
    readonly reason: string;
  }[];
  /** B-SAN3-03 · R11 — categorias cuja base é estimada (pelas ações), em ordem alfabética. */
  readonly estimatedCategories: readonly string[];
  /** B-SAN3-03 · R13 — `importado − alocado − plataforma − não rateado`, com sinal; fora de `totalUnallocatedCost`. */
  readonly roundingResidualCost: number;
  /** B-SAN3-03 · R13 — quantos valores o motor arredondou; o teto do resíduo em micro-unidades. */
  readonly roundingCount: number;
};

export type CloudCostAllocationSummary = {
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly currency?: string;
  readonly totalImportedCost: number;
  readonly totalAllocatedCost: number;
  readonly totalUnallocatedCost: number;
  readonly tenants: readonly {
    readonly tenantId: string;
    readonly tenantName?: string;
    readonly allocatedCost: number;
    readonly allocationRatio: number;
  }[];
  readonly services: readonly {
    readonly serviceCode: string;
    readonly allocatedCost: number;
    readonly unallocatedCost: number;
  }[];
  readonly generatedAt: string;
};

export class CloudCostAllocationError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "CloudCostAllocationError";
  }
}
