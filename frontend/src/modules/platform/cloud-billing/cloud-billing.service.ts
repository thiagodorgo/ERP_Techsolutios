import { readFrontendEnv } from "../../../config/env";
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
import {
  mockCloudAllocationRuns,
  mockCloudAllocationSummary,
  mockCloudChargeRules,
  mockCloudChargeRuns,
  mockCloudChargeSummary,
  mockCloudCostImports,
  mockCloudCostSummary,
  mockCloudUsageSummary,
} from "./cloud-billing.mock";
import type {
  CloudAllocationRun,
  CloudChargeRule,
  CloudChargeRun,
  CloudCostImport,
  UpsertCloudChargeRuleInput,
} from "./cloud-billing.types";

let costImports = [...mockCloudCostImports];
let allocationRuns = [...mockCloudAllocationRuns];
let chargeRuns = [...mockCloudChargeRuns];
let chargeRules = [...mockCloudChargeRules];

export async function getCloudUsageSummary() {
  if (!shouldUseMocks()) return getCloudUsageSummaryFromApi();
  await wait();
  return mockCloudUsageSummary;
}

export async function listCloudCostImports() {
  if (!shouldUseMocks()) return listCloudCostImportsFromApi();
  await wait();
  return costImports;
}

export async function importCloudCosts(): Promise<CloudCostImport> {
  if (!shouldUseMocks()) return importCloudCostsFromApi();
  await wait();
  const item: CloudCostImport = {
    id: `cost-import-${Date.now()}`,
    provider: "aws",
    period: mockCloudCostSummary.period,
    status: "processing",
    importedAt: new Date().toISOString(),
    fileName: "aws-cur-manual.csv",
    records: 0,
  };
  costImports = [item, ...costImports];
  return item;
}

export async function getCloudCostSummary() {
  if (!shouldUseMocks()) return getCloudCostSummaryFromApi();
  await wait();
  return mockCloudCostSummary;
}

export async function listCloudAllocationRuns() {
  if (!shouldUseMocks()) return listCloudAllocationRunsFromApi();
  await wait();
  return allocationRuns;
}

export async function getCloudAllocationSummary() {
  if (!shouldUseMocks()) return getCloudAllocationSummaryFromApi();
  await wait();
  return mockCloudAllocationSummary;
}

export async function runCloudAllocation(): Promise<CloudAllocationRun> {
  if (!shouldUseMocks()) return runCloudAllocationFromApi();
  await wait();
  const run: CloudAllocationRun = {
    id: `allocation-run-${Date.now()}`,
    status: "running",
    period: mockCloudAllocationSummary.period,
    startedAt: new Date().toISOString(),
    allocatedCost: 0,
    unallocatedCost: 0,
    ruleCoveragePercent: 0,
  };
  allocationRuns = [run, ...allocationRuns];
  return run;
}

export async function listCloudChargeRuns() {
  if (!shouldUseMocks()) return listCloudChargeRunsFromApi();
  await wait();
  return chargeRuns;
}

export async function getCloudChargeSummary() {
  if (!shouldUseMocks()) return getCloudChargeSummaryFromApi();
  await wait();
  return mockCloudChargeSummary;
}

export async function calculateCloudCharges(sourceAllocationRunId?: string): Promise<CloudChargeRun> {
  if (!shouldUseMocks()) {
    if (!sourceAllocationRunId) throw new Error("Run de rateio obrigatorio para calcular cobranca.");
    return calculateCloudChargesFromApi(sourceAllocationRunId);
  }
  await wait();
  const run: CloudChargeRun = {
    id: `charge-run-${Date.now()}`,
    status: "running",
    period: mockCloudChargeSummary.period,
    startedAt: new Date().toISOString(),
    grossAmount: 0,
    netCost: 0,
    marginPercent: 0,
  };
  chargeRuns = [run, ...chargeRuns];
  return run;
}

export async function listCloudChargeRules() {
  if (!shouldUseMocks()) return listCloudChargeRulesFromApi();
  await wait();
  return chargeRules;
}

export async function createCloudChargeRule(input: UpsertCloudChargeRuleInput): Promise<CloudChargeRule> {
  if (!shouldUseMocks()) return createCloudChargeRuleFromApi(input);
  await wait();
  const rule: CloudChargeRule = {
    id: `rule-${Date.now()}`,
    ...input,
    updatedAt: new Date().toISOString(),
  };
  chargeRules = [rule, ...chargeRules];
  return rule;
}

export async function updateCloudChargeRule(ruleId: string, input: UpsertCloudChargeRuleInput): Promise<CloudChargeRule> {
  if (!shouldUseMocks()) return updateCloudChargeRuleFromApi(ruleId, input);
  await wait();
  const updated: CloudChargeRule = {
    id: ruleId,
    ...input,
    updatedAt: new Date().toISOString(),
  };
  chargeRules = chargeRules.map((rule) => (rule.id === ruleId ? updated : rule));
  return updated;
}

function shouldUseMocks(): boolean {
  return readFrontendEnv("VITE_USE_MOCKS", "true") !== "false";
}

async function wait() {
  await new Promise((resolve) => window.setTimeout(resolve, 250));
}
