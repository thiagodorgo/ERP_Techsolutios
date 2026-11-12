import assert from "node:assert/strict";
import test from "node:test";

import type { CloudCostImport, CloudCostLineItem } from "../src/modules/cloud-costs/index.js";
import type { CloudUsageEvent } from "../src/modules/cloud-usage/index.js";
import {
  allocateCloudCosts,
  CloudCostAllocationService,
  InMemoryCloudCostAllocationRepository,
  resolveAllocationRule,
  type CloudCostAllocationTenant,
  type UsageBasisRow,
} from "../src/modules/cloud-cost-allocation/index.js";

const periodStart = new Date("2026-06-01T00:00:00.000Z");
const periodEnd = new Date("2026-06-30T23:59:59.999Z");
const tenants: CloudCostAllocationTenant[] = [
  { id: "tenant-a", name: "Tenant A", slug: "tenant-a" },
  { id: "tenant-b", name: "Tenant B", slug: "tenant-b" },
];

test("aloca custo direto por tenant_tag", async () => {
  const { service } = createService({
    costLineItems: [
      costLine("cost-direct", {
        tenantTag: "tenant-a",
        serviceCode: "AmazonEC2",
        unblendedCost: 10,
      }),
    ],
  });

  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  const allocations = await service.listTenantAllocations(run.id);

  assert.equal(run.status, "completed");
  assert.equal(run.totalImportedCost, 10);
  assert.equal(run.totalAllocatedCost, 10);
  assert.equal(run.totalUnallocatedCost, 0);
  assert.equal(allocations.length, 1);
  assert.equal(allocations[0]?.tenantId, "tenant-a");
  assert.equal(allocations[0]?.allocationMethod, "direct_tenant_tag");
  assert.equal(allocations[0]?.allocatedCost, 10);
});

test("aloca custo S3 por metrica de storage/download", async () => {
  const { service } = createService({
    costLineItems: [
      costLine("cost-s3", {
        serviceCode: "AmazonS3",
        usageType: "TimedStorage-ByteHrs",
        unblendedCost: 30,
      }),
    ],
    usageEvents: [
      usage("tenant-a", "storage_bytes_current", 10),
      usage("tenant-b", "storage_bytes_current", 20),
    ],
  });

  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  const allocations = await service.listTenantAllocations(run.id);

  assert.equal(run.totalAllocatedCost, 30);
  assert.equal(allocations.length, 2);
  assert.equal(allocations.find((item) => item.tenantId === "tenant-a")?.allocatedCost, 10);
  assert.equal(allocations.find((item) => item.tenantId === "tenant-b")?.allocatedCost, 20);
  assert.equal(round(allocations.reduce((total, item) => total + item.allocationRatio, 0)), 1);
});

test("aloca custo jobs por job.executed", async () => {
  const { service } = createService({
    costLineItems: [
      costLine("cost-sqs", {
        serviceCode: "AmazonSQS",
        usageType: "Queue-Requests",
        unblendedCost: 8,
      }),
    ],
    usageEvents: [
      usage("tenant-a", "job.executed", 1),
      usage("tenant-b", "job.executed", 3),
    ],
  });

  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  const allocations = await service.listTenantAllocations(run.id);

  assert.equal(run.totalAllocatedCost, 8);
  assert.equal(allocations.find((item) => item.tenantId === "tenant-a")?.allocatedCost, 2);
  assert.equal(allocations.find((item) => item.tenantId === "tenant-b")?.allocatedCost, 6);
  assert.equal(allocations[0]?.allocationMethod, "job_execution_weight");
});

test("deixa custo unallocated quando nao ha metrica base", async () => {
  const { service } = createService({
    costLineItems: [
      costLine("cost-unknown", {
        serviceCode: "AmazonKMS",
        usageType: "Keys",
        unblendedCost: 4,
      }),
    ],
  });

  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  const allocations = await service.listTenantAllocations(run.id);

  assert.equal(run.totalImportedCost, 4);
  assert.equal(run.totalAllocatedCost, 0);
  assert.equal(run.totalUnallocatedCost, 4);
  assert.equal(allocations.length, 0);
  assert.equal(Array.isArray(run.metadata.unallocated), true);
});

test("aloca checklist quando ha metrica checklist_runs_count", async () => {
  const { service } = createService({
    costLineItems: [
      costLine("cost-checklist", {
        serviceCode: "ChecklistService",
        usageType: "ChecklistRuns",
        unblendedCost: 12,
      }),
    ],
    usageEvents: [
      usage("tenant-a", "checklist_runs_count", 1),
      usage("tenant-b", "checklist_runs_count", 2),
    ],
  });

  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  const allocations = await service.listTenantAllocations(run.id);

  assert.equal(run.totalAllocatedCost, 12);
  assert.equal(allocations.find((item) => item.tenantId === "tenant-a")?.allocatedCost, 4);
  assert.equal(allocations.find((item) => item.tenantId === "tenant-b")?.allocatedCost, 8);
  assert.equal(allocations[0]?.allocationMethod, "checklist_run_weight");
});

test("falha gera status failed e erro sanitizado", async () => {
  class FailingRepository extends InMemoryCloudCostAllocationRepository {
    override listCostLineItems(): Promise<readonly CloudCostLineItem[]> {
      return Promise.reject(new Error("Bearer secret-token"));
    }
  }
  const repository = new FailingRepository();
  repository.seed({
    tenants,
    imports: [costImport()],
    costLineItems: [costLine("cost-failing", {})],
  });
  const service = new CloudCostAllocationService(repository);
  const run = await service.createAllocationRun({ periodStart, periodEnd });
  const failed = await service.executeAllocationRun(run.id);

  assert.equal(failed.status, "failed");
  assert.equal(failed.errorMessage?.includes("secret-token"), false);
});

test("reexecutar run nao duplica allocations indevidamente", async () => {
  const { service } = createService({
    costLineItems: [
      costLine("cost-s3", {
        serviceCode: "AmazonS3",
        usageType: "TimedStorage-ByteHrs",
        unblendedCost: 10,
      }),
    ],
    usageEvents: [usage("tenant-a", "storage_bytes_current", 1)],
  });
  const run = await service.createAllocationRun({ periodStart, periodEnd });

  await service.executeAllocationRun(run.id);
  await service.executeAllocationRun(run.id);
  const allocations = await service.listTenantAllocations(run.id);

  assert.equal(allocations.length, 1);
  assert.equal(allocations[0]?.allocatedCost, 10);
});

// -----------------------------------------------------------------------------------------------
// B-ASS-09a · F6 — T12 (R8, P6) e T-AUTO-6 (R5, P8). Os dois foram executados VERMELHOS por asserção na
// base `a0979f51`, antes de qualquer código de produção (saída no diário do bloco).
// -----------------------------------------------------------------------------------------------

test("T12 · P6 (R8) — o banco sem medição grava o método da base usada (ações), e com medição o do espaço", () => {
  // MUTAÇÃO QUE MATA: M12 (`rule.methodByMetricKey?.[basis.metricKey] ?? rule.allocationMethod` → `rule.allocationMethod`).
  const rds = costLine("rds-1", { serviceCode: "AmazonRDS", usageType: "InstanceUsage:db.t3.micro", unblendedCost: 40 });
  const actions: UsageBasisRow[] = [
    { tenantId: "tenant-a", metricKey: "audited_actions_count", unit: "count", sourceType: "audit_log", quantity: 1 },
    { tenantId: "tenant-b", metricKey: "audited_actions_count", unit: "count", sourceType: "audit_log", quantity: 3 },
  ];
  const measured: UsageBasisRow[] = [
    { tenantId: "tenant-a", metricKey: "db_bytes_estimated", unit: "bytes", sourceType: "tenant_usage_daily", quantity: 3 },
    { tenantId: "tenant-b", metricKey: "db_bytes_estimated", unit: "bytes", sourceType: "tenant_usage_daily", quantity: 1 },
  ];

  const byActions = engine([rds], actions);
  assert.deepEqual(
    byActions.allocations.map((item) => [item.allocationMethod, item.allocationBasisMetricKey]),
    [
      ["api_request_weight", "audited_actions_count"],
      ["api_request_weight", "audited_actions_count"],
    ],
  );

  const bySpace = engine([rds], [...actions, ...measured]);
  assert.deepEqual(
    bySpace.allocations.map((item) => [item.allocationMethod, item.allocationBasisMetricKey]),
    [
      ["storage_usage_weight", "db_bytes_estimated"],
      ["storage_usage_weight", "db_bytes_estimated"],
    ],
  );
});

test("T-AUTO-6 · P8 (R5) — monitoramento, chaves, DNS e rede entram no rateio pelas ações, como estimativa", () => {
  // MUTAÇÃO QUE MATA: M5 (`["amazonvpc", "network"]` → apagado; NatGateway-Bytes volta a `storage`).
  const cases = [
    ["AmazonCloudWatch", "CW:Requests", "monitoring"],
    ["awskms", "KMS-Keys", "keys"],
    ["AWSSecretsManager", "AWSSecretsManager-Secrets", "keys"],
    ["AmazonRoute53", "DNS-Queries", "dns"],
    ["AmazonVPC", "NatGateway-Bytes", "network"],
    ["AmazonVPC", "NatGateway-Hours", "network"],
  ] as const;
  for (const [serviceCode, usageType, costCategory] of cases) {
    assert.deepEqual(
      resolveAllocationRule({ serviceCode, usageType }),
      {
        costCategory,
        allocationMethod: "api_request_weight",
        basisMetricKeys: ["audited_actions_count"],
        estimate: true,
      },
      `${serviceCode}/${usageType}`,
    );
  }
  // R2-09 — no CUR real o NAT Gateway vem com o código AmazonEC2: entra como máquina, pelas ações.
  assert.deepEqual(resolveAllocationRule({ serviceCode: "AmazonEC2", usageType: "NatGateway-Bytes" }), {
    costCategory: "compute",
    allocationMethod: "api_request_weight",
    basisMetricKeys: ["audited_actions_count"],
    estimate: true,
  });

  // No motor: a linha de rede é rateada entre as 2 organizações pelas ações (1 : 3).
  const result = engine(
    [costLine("vpc-1", { serviceCode: "AmazonVPC", usageType: "NatGateway-Bytes", unblendedCost: 8 })],
    [
      { tenantId: "tenant-a", metricKey: "audited_actions_count", unit: "count", sourceType: "audit_log", quantity: 1 },
      { tenantId: "tenant-b", metricKey: "audited_actions_count", unit: "count", sourceType: "audit_log", quantity: 3 },
    ],
  );
  assert.deepEqual(
    result.allocations.map((item) => [item.tenantId, item.allocatedCost, item.costCategory, item.allocationMethod]),
    [
      ["tenant-a", 2, "network", "api_request_weight"],
      ["tenant-b", 6, "network", "api_request_weight"],
    ],
  );
  assert.equal(result.totalUnallocatedCost, 0);
  assert.deepEqual(result.estimatedCategories, ["network"]);
});

function engine(lines: readonly CloudCostLineItem[], usageBasis: readonly UsageBasisRow[]) {
  return allocateCloudCosts({
    runId: "run-engine",
    periodStart,
    periodEnd,
    strategy: "direct_tag_then_usage_weighted_v1",
    costLineItems: lines,
    usageBasis,
    tenants,
  });
}

function createService(input: {
  readonly costLineItems?: readonly CloudCostLineItem[];
  readonly usageEvents?: readonly CloudUsageEvent[];
}) {
  const repository = new InMemoryCloudCostAllocationRepository();
  repository.seed({
    tenants,
    imports: input.costLineItems?.length ? [costImport()] : undefined,
    costLineItems: input.costLineItems,
    usageEvents: input.usageEvents,
  });
  return {
    repository,
    service: new CloudCostAllocationService(repository),
  };
}

function costImport(): CloudCostImport {
  return {
    id: "import-1",
    provider: "aws",
    sourceType: "manual_csv",
    status: "completed",
    periodStart,
    periodEnd,
    importedAt: periodEnd,
    rowCount: 1,
    totalUnblendedCost: 1,
    currency: "USD",
    metadata: {},
    createdAt: periodStart,
    updatedAt: periodEnd,
  };
}

function costLine(id: string, override: Partial<CloudCostLineItem>): CloudCostLineItem {
  return {
    id,
    importId: "import-1",
    provider: "aws",
    billingPeriodStart: periodStart,
    billingPeriodEnd: periodEnd,
    serviceCode: "AmazonEC2",
    usageType: "BoxUsage",
    unblendedCost: 1,
    currency: "USD",
    rawLineHash: id,
    metadata: {},
    createdAt: periodStart,
    ...override,
  };
}

// B-O6R-06 — a base de rateio passou a ser somada na TABELA DURAVEL de eventos (`cloud_usage_events`),
// nao mais na projecao diaria que ninguem agenda. A fixture acompanha o mecanismo: o que se semeia agora
// e o EVENTO de consumo, que e o que existe em producao.
function usage(
  tenantId: string,
  metricKey: CloudUsageEvent["metricKey"],
  quantity: number,
): CloudUsageEvent {
  return {
    id: `${tenantId}-${metricKey}`,
    tenantId,
    sourceType: "test",
    metricKey,
    quantity,
    unit: "count",
    occurredAt: new Date("2026-06-15T12:00:00.000Z"),
    metadata: {},
    createdAt: periodStart,
  };
}

function round(value: number): number {
  return Number(value.toFixed(6));
}
