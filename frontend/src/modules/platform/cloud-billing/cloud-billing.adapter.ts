import { apiRequest } from "../../../services/api/client";
import type {
  CloudAllocationRun,
  CloudAllocationSummary,
  CloudChargeRule,
  CloudChargeRun,
  CloudChargeSummary,
  CloudCostImport,
  CloudCostSummary,
  CloudUsageSummary,
  UpsertCloudChargeRuleInput,
} from "./cloud-billing.types";

type ApiResponse<T> = {
  data: T;
};

export function getCloudUsageSummaryFromApi() {
  return apiRequest<ApiResponse<Record<string, unknown>>>("/platform/cloud-usage/summary").then((response) => mapUsageSummary(response.data));
}

export function listCloudCostImportsFromApi() {
  return apiRequest<ApiResponse<Record<string, unknown>[]>>("/platform/cloud-costs/imports").then((response) => response.data.map(mapCostImport));
}

export function importCloudCostsFromApi() {
  return apiRequest<ApiResponse<Record<string, unknown>>>("/platform/cloud-costs/imports/manual-csv", {
    method: "POST",
    body: {
      csv: "identity/LineItemId,bill/BillingPeriodStartDate,bill/BillingPeriodEndDate,lineItem/UsageStartDate,lineItem/UsageEndDate,lineItem/ProductCode,lineItem/UsageType,lineItem/Operation,product/region,lineItem/ResourceId,lineItem/UsageAmount,lineItem/UnblendedCost,lineItem/CurrencyCode,resourceTags/user:tenantId\nmanual-ui,2026-06-01,2026-06-30,2026-06-08,2026-06-08,AmazonEC2,BoxUsage,RunInstances,sa-east-1,manual-resource,1,0,BRL,manual",
      metadata: {
        source: "platform-cloud-billing-ui",
      },
    },
  }).then((response) => mapCostImport(response.data));
}

export function getCloudCostSummaryFromApi() {
  return apiRequest<ApiResponse<Record<string, unknown>>>("/platform/cloud-costs/summary").then((response) => mapCostSummary(response.data));
}

export function listCloudAllocationRunsFromApi() {
  return apiRequest<ApiResponse<Record<string, unknown>[]>>("/platform/cloud-cost-allocations/runs").then((response) => response.data.map(mapAllocationRun));
}

export function getCloudAllocationSummaryFromApi() {
  return apiRequest<ApiResponse<Record<string, unknown>>>("/platform/cloud-cost-allocations/summary").then((response) => mapAllocationSummary(response.data));
}

export function runCloudAllocationFromApi() {
  return apiRequest<ApiResponse<Record<string, unknown>>>("/platform/cloud-cost-allocations/runs", {
    method: "POST",
    body: defaultPeriodBody(),
  }).then((response) => mapAllocationRun(response.data));
}

export function listCloudChargeRunsFromApi() {
  return apiRequest<ApiResponse<Record<string, unknown>[]>>("/platform/cloud-charges/calculation-runs").then((response) => response.data.map(mapChargeRun));
}

export function getCloudChargeSummaryFromApi() {
  return apiRequest<ApiResponse<Record<string, unknown>>>("/platform/cloud-charges/summary").then((response) => mapChargeSummary(response.data));
}

export function calculateCloudChargesFromApi(sourceAllocationRunId: string) {
  return apiRequest<ApiResponse<Record<string, unknown>>>("/platform/cloud-charges/calculation-runs", {
    method: "POST",
    body: {
      ...defaultPeriodBody(),
      sourceAllocationRunId,
    },
  }).then((response) => mapChargeRun(response.data));
}

export function listCloudChargeRulesFromApi() {
  return apiRequest<ApiResponse<Record<string, unknown>[]>>("/platform/cloud-charge-rules").then((response) => response.data.map(mapChargeRule));
}

export function createCloudChargeRuleFromApi(input: UpsertCloudChargeRuleInput) {
  return apiRequest<ApiResponse<Record<string, unknown>>>("/platform/cloud-charge-rules", {
    method: "POST",
    body: toRuleApiInput(input),
  }).then((response) => mapChargeRule(response.data));
}

export function updateCloudChargeRuleFromApi(ruleId: string, input: UpsertCloudChargeRuleInput) {
  return apiRequest<ApiResponse<Record<string, unknown>>>(`/platform/cloud-charge-rules/${ruleId}`, {
    method: "PATCH",
    body: toRuleApiInput(input),
  }).then((response) => mapChargeRule(response.data));
}

function mapUsageSummary(data: Record<string, unknown>): CloudUsageSummary {
  const metrics = readArray(data.metrics);
  const totalRequests = metrics.reduce((total, metric) => total + readNumber(metric.quantity), 0);
  return {
    generatedAt: readString(data.generatedAt) ?? readString(data.updatedAt) ?? new Date().toISOString(),
    period: readPeriod(data),
    totalComputeHours: readNumber(data.totalComputeHours),
    totalStorageGb: readNumber(data.totalStorageGb),
    totalRequests,
    tenants: readArray(data.tenants).map((tenant) => ({
      tenantId: readString(tenant.tenantId) ?? "unknown",
      tenantName: readString(tenant.tenantName) ?? readString(tenant.tenantId) ?? "Tenant",
      computeHours: readNumber(tenant.computeHours),
      storageGb: readNumber(tenant.storageGb),
      requests: readNumber(tenant.requests),
      health: "healthy",
    })),
  };
}

function mapCostImport(data: Record<string, unknown>): CloudCostImport {
  return {
    id: readString(data.id) ?? "cost-import",
    provider: "aws",
    period: readPeriod(data),
    status: readStatus(data.status, ["completed", "processing", "failed"], "processing"),
    importedAt: readString(data.importedAt) ?? readString(data.createdAt) ?? new Date().toISOString(),
    fileName: readString(data.fileName) ?? readString(data.sourceUri) ?? "aws-cur.csv",
    records: readNumber(data.records) || readNumber(data.rowCount),
    errorMessage: readString(data.errorMessage),
  };
}

function mapCostSummary(data: Record<string, unknown>): CloudCostSummary {
  const totalCost = readNumber(data.totalCost) || readNumber(data.totalUnblendedCost);
  return {
    generatedAt: readString(data.generatedAt) ?? readString(data.updatedAt) ?? new Date().toISOString(),
    period: readPeriod(data),
    provider: "aws",
    totalCost,
    currency: readCurrency(data.currency),
    unallocatedCost: readNumber(data.unallocatedCost) || readNumber(data.totalUnallocatedCost),
    tenants: readArray(data.tenants).map((tenant) => ({
      tenantId: readString(tenant.tenantId) ?? "unknown",
      tenantName: readString(tenant.tenantName) ?? readString(tenant.tenantId) ?? "Tenant",
      cost: readNumber(tenant.cost) || readNumber(tenant.totalUnblendedCost),
      marginPercent: readNumber(tenant.marginPercent) || readNumber(tenant.marginPercentage),
      health: readHealth(tenant.health),
    })),
  };
}

function mapAllocationRun(data: Record<string, unknown>): CloudAllocationRun {
  return {
    id: readString(data.id) ?? "allocation-run",
    status: readStatus(data.status, ["completed", "running", "failed"], "running"),
    period: readPeriod(data),
    startedAt: readString(data.startedAt) ?? readString(data.createdAt) ?? new Date().toISOString(),
    completedAt: readString(data.completedAt),
    allocatedCost: readNumber(data.allocatedCost) || readNumber(data.totalAllocatedCost),
    unallocatedCost: readNumber(data.unallocatedCost) || readNumber(data.totalUnallocatedCost),
    ruleCoveragePercent: readNumber(data.ruleCoveragePercent),
    errorMessage: readString(data.errorMessage),
  };
}

function mapAllocationSummary(data: Record<string, unknown>): CloudAllocationSummary {
  const allocatedCost = readNumber(data.allocatedCost) || readNumber(data.totalAllocatedCost);
  const unallocatedCost = readNumber(data.unallocatedCost) || readNumber(data.totalUnallocatedCost);
  const total = allocatedCost + unallocatedCost;
  return {
    generatedAt: readString(data.generatedAt) ?? readString(data.updatedAt) ?? new Date().toISOString(),
    period: readPeriod(data),
    allocatedCost,
    unallocatedCost,
    coveragePercent: total > 0 ? (allocatedCost / total) * 100 : 0,
    tenants: readArray(data.tenants).map((tenant) => ({
      tenantId: readString(tenant.tenantId) ?? "unknown",
      tenantName: readString(tenant.tenantName) ?? readString(tenant.tenantId) ?? "Tenant",
      allocatedCost: readNumber(tenant.allocatedCost) || readNumber(tenant.totalAllocatedCost),
      ruleKey: readString(tenant.ruleKey) ?? readString(tenant.allocationMethod),
      health: readHealth(tenant.health),
    })),
  };
}

function mapChargeRun(data: Record<string, unknown>): CloudChargeRun {
  const grossAmount = readNumber(data.grossAmount) || readNumber(data.totalChargeAmount);
  const netCost = readNumber(data.netCost) || readNumber(data.totalAllocatedCost);
  return {
    id: readString(data.id) ?? "charge-run",
    status: readStatus(data.status, ["completed", "running", "failed"], "running"),
    period: readPeriod(data),
    startedAt: readString(data.startedAt) ?? readString(data.createdAt) ?? new Date().toISOString(),
    completedAt: readString(data.completedAt),
    grossAmount,
    netCost,
    marginPercent: readNumber(data.marginPercent) || readMarginPercent(grossAmount, netCost),
    errorMessage: readString(data.errorMessage),
  };
}

function mapChargeSummary(data: Record<string, unknown>): CloudChargeSummary {
  const grossAmount = readNumber(data.grossAmount) || readNumber(data.totalChargeAmount);
  const netCost = readNumber(data.netCost) || readNumber(data.totalAllocatedCost);
  return {
    generatedAt: readString(data.generatedAt) ?? readString(data.updatedAt) ?? new Date().toISOString(),
    period: readPeriod(data),
    currency: readCurrency(data.currency),
    grossAmount,
    netCost,
    marginPercent: readNumber(data.marginPercent) || readMarginPercent(grossAmount, netCost),
    tenants: readArray(data.tenants).map((tenant) => {
      const amount = readNumber(tenant.amount) || readNumber(tenant.totalChargeAmount) || readNumber(tenant.finalChargeAmount);
      const tenantCost = readNumber(tenant.netCost) || readNumber(tenant.totalAllocatedCost) || readNumber(tenant.allocatedCost);
      return {
        tenantId: readString(tenant.tenantId) ?? "unknown",
        tenantName: readString(tenant.tenantName) ?? readString(tenant.tenantId) ?? "Tenant",
        amount,
        netCost: tenantCost,
        marginPercent: readNumber(tenant.marginPercent) || readNumber(tenant.marginPercentage) || readMarginPercent(amount, tenantCost),
        health: readHealth(tenant.health),
      };
    }),
  };
}

function mapChargeRule(data: Record<string, unknown>): CloudChargeRule {
  return {
    id: readString(data.id) ?? "rule",
    name: readString(data.name) ?? "Regra cloud",
    provider: "aws",
    metric: "allocated_cost",
    markupPercent: readNumber(data.markupPercent) || readNumber(data.markupValue),
    active: readBoolean(data.active) ?? readBoolean(data.isActive) ?? false,
    updatedAt: readString(data.updatedAt) ?? new Date().toISOString(),
    appliesToTenantIds: readArray(data.appliesToTenantIds).map((item) => readStringValue(item)).filter((item): item is string => Boolean(item)),
  };
}

function toRuleApiInput(input: UpsertCloudChargeRuleInput): Record<string, unknown> {
  return {
    name: input.name,
    isActive: input.active,
    planCode: "default",
    priority: 100,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    currency: "BRL",
    markupType: "percentage",
    markupValue: input.markupPercent,
    roundingMode: "nearest_cent",
    metadata: {
      provider: input.provider,
      metric: input.metric,
      appliesToTenantIds: input.appliesToTenantIds ?? [],
    },
  };
}

function defaultPeriodBody(): Record<string, string> {
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return {
    periodStart: `${month}-01`,
    periodEnd: `${month}-28`,
  };
}

function readPeriod(data: Record<string, unknown>): string {
  const explicit = readString(data.period);
  if (explicit) return explicit;
  const start = readString(data.periodStart) ?? readString(data.billingPeriodStart);
  return start ? start.slice(0, 7) : new Date().toISOString().slice(0, 7);
}

function readArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readStringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function readCurrency(value: unknown): "BRL" | "USD" {
  return value === "USD" ? "USD" : "BRL";
}

function readHealth(value: unknown) {
  return value === "high_cost" || value === "unallocated" || value === "missing_rule" ? value : "healthy";
}

function readStatus<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;
}

function readMarginPercent(amount: number, cost: number): number {
  return amount > 0 ? ((amount - cost) / amount) * 100 : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
