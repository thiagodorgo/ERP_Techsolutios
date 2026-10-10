import { apiRequest } from "../../../services/api/client";
import type {
  CloudAllocationRun,
  CloudAllocationSummary,
  CloudBillingPeriod,
  CloudChargeRule,
  CloudChargeRun,
  CloudChargeSummary,
  CloudCostImport,
  CloudCostSummary,
  CloudUsageSummary,
  UpsertCloudChargeRuleInput,
} from "./cloud-billing.types";

type ApiResponse<T> = { readonly data: T };

function withPeriod(path: string, period: CloudBillingPeriod): string {
  const query = new URLSearchParams({ periodStart: period.start, periodEnd: period.end });
  return `${path}?${query.toString()}`;
}

export function getCloudUsageSummaryFromApi(period: CloudBillingPeriod) {
  return apiRequest<ApiResponse<Record<string, unknown>>>(withPeriod("/platform/cloud-usage/summary", period)).then((response) => mapUsageSummary(response.data));
}

export function listCloudCostImportsFromApi(period: CloudBillingPeriod) {
  return apiRequest<ApiResponse<Record<string, unknown>[]>>(withPeriod("/platform/cloud-costs/imports", period)).then((response) => response.data.map(mapCostImport).filter((item) => item.id));
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

export function getCloudCostSummaryFromApi(period: CloudBillingPeriod) {
  return apiRequest<ApiResponse<Record<string, unknown>>>(withPeriod("/platform/cloud-costs/summary", period)).then((response) => mapCostSummary(response.data));
}

export function listCloudAllocationRunsFromApi() {
  return apiRequest<ApiResponse<Record<string, unknown>[]>>("/platform/cloud-cost-allocations/runs").then((response) => response.data.map(mapAllocationRun));
}

export function getCloudAllocationSummaryFromApi(period: CloudBillingPeriod) {
  return apiRequest<ApiResponse<Record<string, unknown>>>(withPeriod("/platform/cloud-cost-allocations/summary", period)).then((response) => mapAllocationSummary(response.data));
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

export function getCloudChargeSummaryFromApi(period: CloudBillingPeriod) {
  return apiRequest<ApiResponse<Record<string, unknown>>>(withPeriod("/platform/cloud-charges/summary", period)).then((response) => mapChargeSummary(response.data));
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

export function mapUsageSummary(data: Record<string, unknown>): CloudUsageSummary {
  return {
    periodStart: readString(data.periodStart) ?? "",
    periodEnd: readString(data.periodEnd) ?? "",
    metrics: readArray(data.metrics).map((metric) => ({
      metricKey: readString(metric.metricKey) ?? "",
      quantity: readNumber(metric.quantity),
      unit: readString(metric.unit) ?? "",
    })).filter((metric) => metric.metricKey),
    generatedAt: readString(data.generatedAt) ?? "",
  };
}

function mapCostImport(data: Record<string, unknown>): CloudCostImport {
  return {
    id: readString(data.id) ?? "",
    provider: readString(data.provider) ?? "",
    sourceType: readString(data.sourceType),
    status: readStatus(data.status, ["pending", "processing", "completed", "failed"], "pending"),
    periodStart: readString(data.periodStart),
    periodEnd: readString(data.periodEnd),
    importedAt: readString(data.importedAt),
    rowCount: readNumber(data.rowCount),
    currency: readString(data.currency),
    errorMessage: readString(data.errorMessage),
  };
}

export function mapCostSummary(data: Record<string, unknown>): CloudCostSummary {
  return {
    provider: readString(data.provider) ?? "",
    periodStart: readString(data.periodStart) ?? "",
    periodEnd: readString(data.periodEnd) ?? "",
    totalUnblendedCost: readNumber(data.totalUnblendedCost),
    totalUnblendedCostExact: readString(data.totalUnblendedCostExact),
    lineItemCount: readNumber(data.lineItemCount),
    currencies: readStringArray(data.currencies),
    services: readArray(data.services).map((service) => ({
      serviceCode: readString(service.serviceCode) ?? "",
      unblendedCost: readNumber(service.unblendedCost),
      unblendedCostExact: readString(service.unblendedCostExact),
      currency: readString(service.currency) ?? "",
    })).filter((service) => service.serviceCode),
    generatedAt: readString(data.generatedAt) ?? "",
  };
}

export function mapAllocationSummary(data: Record<string, unknown>): CloudAllocationSummary {
  return {
    periodStart: readString(data.periodStart) ?? "",
    periodEnd: readString(data.periodEnd) ?? "",
    currency: readString(data.currency),
    totalImportedCost: readNumber(data.totalImportedCost),
    totalAllocatedCost: readNumber(data.totalAllocatedCost),
    totalUnallocatedCost: readNumber(data.totalUnallocatedCost),
    tenants: readArray(data.tenants).map((tenant) => ({
      tenantId: readString(tenant.tenantId) ?? "",
      tenantName: readString(tenant.tenantName),
      allocatedCost: readNumber(tenant.allocatedCost),
      allocationRatio: readNumber(tenant.allocationRatio),
    })).filter((tenant) => tenant.tenantId),
    services: readArray(data.services).map((service) => ({
      serviceCode: readString(service.serviceCode) ?? "",
      allocatedCost: readNumber(service.allocatedCost),
      unallocatedCost: readNumber(service.unallocatedCost),
    })).filter((service) => service.serviceCode),
    generatedAt: readString(data.generatedAt) ?? "",
  };
}

export function mapChargeSummary(data: Record<string, unknown>): CloudChargeSummary {
  return {
    periodStart: readString(data.periodStart) ?? "",
    periodEnd: readString(data.periodEnd) ?? "",
    currency: readString(data.currency),
    totalAllocatedCost: readNumber(data.totalAllocatedCost),
    totalChargeAmount: readNumber(data.totalChargeAmount),
    totalMarginAmount: readNumber(data.totalMarginAmount),
    totalDiscountAmount: readNumber(data.totalDiscountAmount),
    totalMarginPercentage: readOptionalNumber(data.totalMarginPercentage),
    tenants: readArray(data.tenants).map((tenant) => ({
      tenantId: readString(tenant.tenantId) ?? "",
      tenantName: readString(tenant.tenantName),
      allocatedCost: readNumber(tenant.allocatedCost),
      finalChargeAmount: readNumber(tenant.finalChargeAmount),
      marginAmount: readNumber(tenant.marginAmount),
      marginPercentage: readOptionalNumber(tenant.marginPercentage),
      status: readString(tenant.status) ?? "unknown",
    })).filter((tenant) => tenant.tenantId),
    generatedAt: readString(data.generatedAt) ?? "",
  };
}

function mapAllocationRun(data: Record<string, unknown>): CloudAllocationRun {
  return { id: readString(data.id) ?? "", status: readStatus(data.status, ["completed", "running", "failed"], "running"), period: readLegacyPeriod(data), startedAt: readString(data.startedAt) ?? readString(data.createdAt) ?? "", completedAt: readString(data.completedAt), allocatedCost: readNumber(data.allocatedCost ?? data.totalAllocatedCost), unallocatedCost: readNumber(data.unallocatedCost ?? data.totalUnallocatedCost), ruleCoveragePercent: readNumber(data.ruleCoveragePercent), errorMessage: readString(data.errorMessage) };
}

function mapChargeRun(data: Record<string, unknown>): CloudChargeRun {
  return { id: readString(data.id) ?? "", status: readStatus(data.status, ["completed", "running", "failed"], "running"), period: readLegacyPeriod(data), startedAt: readString(data.startedAt) ?? readString(data.createdAt) ?? "", completedAt: readString(data.completedAt), grossAmount: readNumber(data.grossAmount ?? data.totalChargeAmount), netCost: readNumber(data.netCost ?? data.totalAllocatedCost), marginPercent: readNumber(data.marginPercent ?? data.totalMarginPercentage), errorMessage: readString(data.errorMessage) };
}

function mapChargeRule(data: Record<string, unknown>): CloudChargeRule {
  return { id: readString(data.id) ?? "", name: readString(data.name) ?? "Regra cloud", provider: "aws", metric: "allocated_cost", markupPercent: readNumber(data.markupPercent ?? data.markupValue), active: readBoolean(data.active) ?? readBoolean(data.isActive) ?? false, updatedAt: readString(data.updatedAt) ?? "", appliesToTenantIds: readStringArray(data.appliesToTenantIds) };
}

function toRuleApiInput(input: UpsertCloudChargeRuleInput): Record<string, unknown> {
  return { name: input.name, isActive: input.active, planCode: "default", priority: 100, effectiveFrom: new Date().toISOString().slice(0, 10), currency: "BRL", markupType: "percentage", markupValue: input.markupPercent, roundingMode: "nearest_cent", metadata: { provider: input.provider, metric: input.metric, appliesToTenantIds: input.appliesToTenantIds ?? [] } };
}

function defaultPeriodBody(): Record<string, string> {
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return { periodStart: `${month}-01`, periodEnd: `${month}-28` };
}

function readLegacyPeriod(data: Record<string, unknown>): string {
  return readString(data.period) ?? readString(data.periodStart)?.slice(0, 7) ?? "";
}
function readArray(value: unknown): Record<string, unknown>[] { return Array.isArray(value) ? value.filter(isRecord) : []; }
function readStringArray(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : []; }
function readString(value: unknown): string | undefined { return typeof value === "string" && value.trim() ? value : undefined; }
function readNumber(value: unknown): number { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
function readOptionalNumber(value: unknown): number | undefined { return typeof value === "number" && Number.isFinite(value) ? value : undefined; }
function readBoolean(value: unknown): boolean | undefined { return typeof value === "boolean" ? value : undefined; }
function readStatus<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T { return typeof value === "string" && allowed.includes(value as T) ? value as T : fallback; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
