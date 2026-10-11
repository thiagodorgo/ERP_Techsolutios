import { isMockMode } from "../../../config/env";
import { ApiError } from "../../../services/api/client";
import {
  calculateCloudChargesFromApi,
  createCloudChargeRuleFromApi,
  getCloudAllocationSummaryFromApi,
  getCloudChargeSummaryFromApi,
  getCloudCostSummaryFromApi,
  getCloudUsageSummaryFromApi,
  importCloudCostsFromApi,
  listCloudAllocationRunsFromApi,
  listCloudChargeRulesFromApi,
  listCloudChargeRunsFromApi,
  listCloudCostImportsFromApi,
  runCloudAllocationFromApi,
  updateCloudChargeRuleFromApi,
} from "./cloud-billing.adapter";
import type { CloudBillingData, CloudBillingPeriod, UpsertCloudChargeRuleInput } from "./cloud-billing.types";
import { emptyCloudBilling } from "./cloud-billing.types";

export function periodForMonth(month: string): CloudBillingPeriod {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new Error("Mês de consulta inválido.");
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) throw new Error("Mês de consulta inválido.");
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, "0")}` };
}

export function currentBillingMonth(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(now);
}

export async function getCloudBilling(period: CloudBillingPeriod): Promise<CloudBillingData> {
  if (isMockMode()) return emptyCloudBilling(period, "mock");
  try {
    const [usage, costs, allocation, charges, imports] = await Promise.all([
      getCloudUsageSummaryFromApi(period),
      getCloudCostSummaryFromApi(period),
      getCloudAllocationSummaryFromApi(period),
      getCloudChargeSummaryFromApi(period),
      listCloudCostImportsFromApi(period),
    ]);
    return { period, usage, costs, allocation, charges, imports, source: "api", forbidden: false, stale: false };
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) return { ...emptyCloudBilling(period, "fallback"), forbidden: true };
    return emptyCloudBilling(period, "fallback");
  }
}

export async function getCloudCostSummary(period = periodForMonth(currentBillingMonth())) {
  if (isMockMode()) return { data: null, source: "mock" as const };
  return { data: await getCloudCostSummaryFromApi(period), source: "api" as const };
}

// Escritas permanecem isoladas neste módulo e não têm consumidor na página do B-SAN3-06b.
export const importCloudCosts = importCloudCostsFromApi;
export const runCloudAllocation = runCloudAllocationFromApi;
export const calculateCloudCharges = calculateCloudChargesFromApi;
export const createCloudChargeRule = createCloudChargeRuleFromApi;
export function updateCloudChargeRule(ruleId: string, input: UpsertCloudChargeRuleInput) { return updateCloudChargeRuleFromApi(ruleId, input); }
export const listCloudAllocationRuns = listCloudAllocationRunsFromApi;
export const listCloudChargeRuns = listCloudChargeRunsFromApi;
export const listCloudChargeRules = listCloudChargeRulesFromApi;
