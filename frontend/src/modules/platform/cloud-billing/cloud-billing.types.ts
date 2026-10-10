export type CloudProvider = "aws" | "azure" | "gcp";

export type CloudBillingPeriod = {
  readonly start: string;
  readonly end: string;
};

export type CloudUsageMetric = {
  readonly metricKey: string;
  readonly quantity: number;
  readonly unit: "bytes" | "count" | "gb_month" | string;
};

export type CloudUsageSummary = {
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly metrics: readonly CloudUsageMetric[];
  readonly generatedAt: string;
};

export type CloudCostImportStatus = "pending" | "processing" | "completed" | "failed";

export type CloudCostImport = {
  readonly id: string;
  readonly provider: string;
  readonly sourceType?: string;
  readonly status: CloudCostImportStatus;
  readonly periodStart?: string;
  readonly periodEnd?: string;
  readonly importedAt?: string;
  readonly rowCount: number;
  readonly currency?: string;
  readonly errorMessage?: string;
};

export type CloudCostService = {
  readonly serviceCode: string;
  readonly unblendedCost: number;
  readonly unblendedCostExact?: string;
  readonly currency: string;
};

export type CloudCostSummary = {
  readonly provider: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly totalUnblendedCost: number;
  readonly totalUnblendedCostExact?: string;
  readonly lineItemCount: number;
  readonly currencies: readonly string[];
  readonly services: readonly CloudCostService[];
  readonly generatedAt: string;
};

export type CloudAllocationTenant = {
  readonly tenantId: string;
  readonly tenantName?: string;
  readonly allocatedCost: number;
  readonly allocationRatio: number;
};

export type CloudAllocationSummary = {
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly currency?: string;
  readonly totalImportedCost: number;
  readonly totalAllocatedCost: number;
  readonly totalUnallocatedCost: number;
  readonly tenants: readonly CloudAllocationTenant[];
  readonly services: readonly {
    readonly serviceCode: string;
    readonly allocatedCost: number;
    readonly unallocatedCost: number;
  }[];
  readonly generatedAt: string;
};

export type CloudChargeTenant = {
  readonly tenantId: string;
  readonly tenantName?: string;
  readonly allocatedCost: number;
  readonly finalChargeAmount: number;
  readonly marginAmount: number;
  readonly marginPercentage?: number;
  readonly status: string;
};

export type CloudChargeSummary = {
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly currency?: string;
  readonly totalAllocatedCost: number;
  readonly totalChargeAmount: number;
  readonly totalMarginAmount: number;
  readonly totalDiscountAmount: number;
  readonly totalMarginPercentage?: number;
  readonly tenants: readonly CloudChargeTenant[];
  readonly generatedAt: string;
};

export type CloudBillingSource = "api" | "mock" | "fallback";

export type CloudBillingData = {
  readonly period: CloudBillingPeriod;
  readonly usage: CloudUsageSummary | null;
  readonly costs: CloudCostSummary | null;
  readonly allocation: CloudAllocationSummary | null;
  readonly charges: CloudChargeSummary | null;
  readonly imports: readonly CloudCostImport[];
  readonly source: CloudBillingSource;
  readonly forbidden: boolean;
  readonly stale: boolean;
};

export function emptyCloudBilling(period: CloudBillingPeriod, source: CloudBillingSource): CloudBillingData {
  return { period, usage: null, costs: null, allocation: null, charges: null, imports: [], source, forbidden: false, stale: false };
}

// Tipos legados das rotinas de escrita. O B-SAN3-06b não as consome nem altera sua regra.
export type CloudAllocationRunStatus = "completed" | "running" | "failed";
export type CloudAllocationRun = { readonly id: string; readonly status: CloudAllocationRunStatus; readonly period: string; readonly startedAt: string; readonly completedAt?: string; readonly allocatedCost: number; readonly unallocatedCost: number; readonly ruleCoveragePercent: number; readonly errorMessage?: string };
export type CloudChargeRunStatus = "completed" | "running" | "failed";
export type CloudChargeRun = { readonly id: string; readonly status: CloudChargeRunStatus; readonly period: string; readonly startedAt: string; readonly completedAt?: string; readonly grossAmount: number; readonly netCost: number; readonly marginPercent: number; readonly errorMessage?: string };
export type CloudChargeRuleMetric = "compute_hours" | "storage_gb" | "requests" | "allocated_cost";
export type CloudChargeRule = { readonly id: string; readonly name: string; readonly provider: CloudProvider; readonly metric: CloudChargeRuleMetric; readonly markupPercent: number; readonly active: boolean; readonly updatedAt: string; readonly appliesToTenantIds?: string[] };
export type UpsertCloudChargeRuleInput = { readonly name: string; readonly provider: CloudProvider; readonly metric: CloudChargeRuleMetric; readonly markupPercent: number; readonly active: boolean; readonly appliesToTenantIds?: string[] };
