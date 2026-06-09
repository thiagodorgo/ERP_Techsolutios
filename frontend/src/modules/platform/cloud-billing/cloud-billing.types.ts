export type CloudProvider = "aws" | "azure" | "gcp";

export type CloudBillingTenantHealth = "healthy" | "high_cost" | "unallocated" | "missing_rule";

export type CloudUsageSummary = {
  generatedAt: string;
  period: string;
  totalComputeHours: number;
  totalStorageGb: number;
  totalRequests: number;
  tenants: CloudUsageTenant[];
};

export type CloudUsageTenant = {
  tenantId: string;
  tenantName: string;
  computeHours: number;
  storageGb: number;
  requests: number;
  health: CloudBillingTenantHealth;
};

export type CloudCostImportStatus = "completed" | "processing" | "failed";

export type CloudCostImport = {
  id: string;
  provider: CloudProvider;
  period: string;
  status: CloudCostImportStatus;
  importedAt: string;
  fileName: string;
  records: number;
  errorMessage?: string;
};

export type CloudCostSummary = {
  generatedAt: string;
  period: string;
  provider: CloudProvider;
  totalCost: number;
  currency: "BRL" | "USD";
  unallocatedCost: number;
  tenants: CloudCostTenant[];
};

export type CloudCostTenant = {
  tenantId: string;
  tenantName: string;
  cost: number;
  marginPercent: number;
  health: CloudBillingTenantHealth;
};

export type CloudAllocationRunStatus = "completed" | "running" | "failed";

export type CloudAllocationRun = {
  id: string;
  status: CloudAllocationRunStatus;
  period: string;
  startedAt: string;
  completedAt?: string;
  allocatedCost: number;
  unallocatedCost: number;
  ruleCoveragePercent: number;
  errorMessage?: string;
};

export type CloudAllocationSummary = {
  generatedAt: string;
  period: string;
  allocatedCost: number;
  unallocatedCost: number;
  coveragePercent: number;
  tenants: CloudAllocationTenant[];
};

export type CloudAllocationTenant = {
  tenantId: string;
  tenantName: string;
  allocatedCost: number;
  ruleKey?: string;
  health: CloudBillingTenantHealth;
};

export type CloudChargeRunStatus = "completed" | "running" | "failed";

export type CloudChargeRun = {
  id: string;
  status: CloudChargeRunStatus;
  period: string;
  startedAt: string;
  completedAt?: string;
  grossAmount: number;
  netCost: number;
  marginPercent: number;
  errorMessage?: string;
};

export type CloudChargeSummary = {
  generatedAt: string;
  period: string;
  currency: "BRL" | "USD";
  grossAmount: number;
  netCost: number;
  marginPercent: number;
  tenants: CloudChargeTenant[];
};

export type CloudChargeTenant = {
  tenantId: string;
  tenantName: string;
  amount: number;
  netCost: number;
  marginPercent: number;
  health: CloudBillingTenantHealth;
};

export type CloudChargeRuleMetric = "compute_hours" | "storage_gb" | "requests" | "allocated_cost";

export type CloudChargeRule = {
  id: string;
  name: string;
  provider: CloudProvider;
  metric: CloudChargeRuleMetric;
  markupPercent: number;
  active: boolean;
  updatedAt: string;
  appliesToTenantIds?: string[];
};

export type UpsertCloudChargeRuleInput = {
  name: string;
  provider: CloudProvider;
  metric: CloudChargeRuleMetric;
  markupPercent: number;
  active: boolean;
  appliesToTenantIds?: string[];
};
