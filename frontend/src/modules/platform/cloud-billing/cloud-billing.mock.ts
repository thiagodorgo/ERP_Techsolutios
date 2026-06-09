import type {
  CloudAllocationRun,
  CloudAllocationSummary,
  CloudChargeRule,
  CloudChargeRun,
  CloudChargeSummary,
  CloudCostImport,
  CloudCostSummary,
  CloudUsageSummary,
} from "./cloud-billing.types";

export const mockCloudUsageSummary: CloudUsageSummary = {
  generatedAt: "2026-06-08T09:40:00.000Z",
  period: "2026-06",
  totalComputeHours: 18240,
  totalStorageGb: 4180,
  totalRequests: 1420000,
  tenants: [
    {
      tenantId: "pten-industrial-01",
      tenantName: "Techsolutions Industrial",
      computeHours: 11200,
      storageGb: 2150,
      requests: 842000,
      health: "healthy",
    },
    {
      tenantId: "pten-mining-02",
      tenantName: "Minas Norte Service",
      computeHours: 5960,
      storageGb: 1730,
      requests: 508000,
      health: "high_cost",
    },
    {
      tenantId: "pten-field-03",
      tenantName: "Field Operations LATAM",
      computeHours: 1080,
      storageGb: 300,
      requests: 70000,
      health: "missing_rule",
    },
  ],
};

export const mockCloudCostImports: CloudCostImport[] = [
  {
    id: "cost-import-2026-06-01",
    provider: "aws",
    period: "2026-06",
    status: "completed",
    importedAt: "2026-06-08T08:00:00.000Z",
    fileName: "aws-cur-2026-06.csv",
    records: 24819,
  },
  {
    id: "cost-import-2026-05-31",
    provider: "aws",
    period: "2026-05",
    status: "failed",
    importedAt: "2026-06-01T08:00:00.000Z",
    fileName: "aws-cur-2026-05.csv",
    records: 0,
    errorMessage: "Arquivo CUR sem coluna tenant_tag.",
  },
];

export const mockCloudCostSummary: CloudCostSummary = {
  generatedAt: "2026-06-08T09:42:00.000Z",
  period: "2026-06",
  provider: "aws",
  totalCost: 42850,
  currency: "BRL",
  unallocatedCost: 3180,
  tenants: [
    {
      tenantId: "pten-industrial-01",
      tenantName: "Techsolutions Industrial",
      cost: 21400,
      marginPercent: 37.8,
      health: "healthy",
    },
    {
      tenantId: "pten-mining-02",
      tenantName: "Minas Norte Service",
      cost: 17980,
      marginPercent: 6.4,
      health: "high_cost",
    },
    {
      tenantId: "pten-field-03",
      tenantName: "Field Operations LATAM",
      cost: 290,
      marginPercent: 0,
      health: "missing_rule",
    },
  ],
};

export const mockCloudAllocationRuns: CloudAllocationRun[] = [
  {
    id: "allocation-run-2026-06-08",
    status: "completed",
    period: "2026-06",
    startedAt: "2026-06-08T08:10:00.000Z",
    completedAt: "2026-06-08T08:16:00.000Z",
    allocatedCost: 39670,
    unallocatedCost: 3180,
    ruleCoveragePercent: 92.6,
  },
  {
    id: "allocation-run-2026-06-07",
    status: "failed",
    period: "2026-06",
    startedAt: "2026-06-07T08:10:00.000Z",
    completedAt: "2026-06-07T08:11:00.000Z",
    allocatedCost: 0,
    unallocatedCost: 42850,
    ruleCoveragePercent: 0,
    errorMessage: "Regra de rateio padrao ausente para tenant sem tag.",
  },
];

export const mockCloudAllocationSummary: CloudAllocationSummary = {
  generatedAt: "2026-06-08T09:43:00.000Z",
  period: "2026-06",
  allocatedCost: 39670,
  unallocatedCost: 3180,
  coveragePercent: 92.6,
  tenants: [
    {
      tenantId: "pten-industrial-01",
      tenantName: "Techsolutions Industrial",
      allocatedCost: 21400,
      ruleKey: "compute-hours-plus-storage",
      health: "healthy",
    },
    {
      tenantId: "pten-mining-02",
      tenantName: "Minas Norte Service",
      allocatedCost: 17980,
      ruleKey: "aws-direct-cur-tags",
      health: "high_cost",
    },
    {
      tenantId: "pten-field-03",
      tenantName: "Field Operations LATAM",
      allocatedCost: 290,
      health: "missing_rule",
    },
  ],
};

export const mockCloudChargeRuns: CloudChargeRun[] = [
  {
    id: "charge-run-2026-06-08",
    status: "completed",
    period: "2026-06",
    startedAt: "2026-06-08T08:20:00.000Z",
    completedAt: "2026-06-08T08:25:00.000Z",
    grossAmount: 58680,
    netCost: 39670,
    marginPercent: 32.4,
  },
  {
    id: "charge-run-2026-06-07",
    status: "failed",
    period: "2026-06",
    startedAt: "2026-06-07T08:20:00.000Z",
    completedAt: "2026-06-07T08:21:00.000Z",
    grossAmount: 0,
    netCost: 0,
    marginPercent: 0,
    errorMessage: "Tenant Field Operations LATAM sem regra ativa.",
  },
];

export const mockCloudChargeSummary: CloudChargeSummary = {
  generatedAt: "2026-06-08T09:44:00.000Z",
  period: "2026-06",
  currency: "BRL",
  grossAmount: 58680,
  netCost: 39670,
  marginPercent: 32.4,
  tenants: [
    {
      tenantId: "pten-industrial-01",
      tenantName: "Techsolutions Industrial",
      amount: 34400,
      netCost: 21400,
      marginPercent: 37.8,
      health: "healthy",
    },
    {
      tenantId: "pten-mining-02",
      tenantName: "Minas Norte Service",
      amount: 19200,
      netCost: 17980,
      marginPercent: 6.4,
      health: "high_cost",
    },
    {
      tenantId: "pten-field-03",
      tenantName: "Field Operations LATAM",
      amount: 0,
      netCost: 290,
      marginPercent: 0,
      health: "missing_rule",
    },
  ],
};

export const mockCloudChargeRules: CloudChargeRule[] = [
  {
    id: "rule-compute-storage",
    name: "Compute + storage com margem",
    provider: "aws",
    metric: "allocated_cost",
    markupPercent: 42,
    active: true,
    updatedAt: "2026-06-08T08:00:00.000Z",
    appliesToTenantIds: ["pten-industrial-01"],
  },
  {
    id: "rule-direct-cur-tags",
    name: "CUR por tags AWS",
    provider: "aws",
    metric: "allocated_cost",
    markupPercent: 8,
    active: true,
    updatedAt: "2026-06-08T08:00:00.000Z",
    appliesToTenantIds: ["pten-mining-02"],
  },
  {
    id: "rule-default-unallocated",
    name: "Fallback sem tag",
    provider: "aws",
    metric: "requests",
    markupPercent: 0,
    active: false,
    updatedAt: "2026-06-07T08:00:00.000Z",
  },
];
