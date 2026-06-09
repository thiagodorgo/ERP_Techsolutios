import assert from "node:assert/strict";
import test from "node:test";

import type { CloudCostLineItem } from "../src/modules/cloud-costs/index.js";
import type { CloudUsageDailyAggregate } from "../src/modules/cloud-usage/index.js";
import {
  CloudCostAllocationService,
  InMemoryCloudCostAllocationRepository,
  type CloudCostAllocationTenant,
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
    usageAggregates: [
      usage("tenant-a", "storage_gb_month", 10),
      usage("tenant-b", "storage_gb_month", 20),
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
    usageAggregates: [
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
    usageAggregates: [
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
  repository.seed({ tenants });
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
    usageAggregates: [usage("tenant-a", "storage_gb_month", 1)],
  });
  const run = await service.createAllocationRun({ periodStart, periodEnd });

  await service.executeAllocationRun(run.id);
  await service.executeAllocationRun(run.id);
  const allocations = await service.listTenantAllocations(run.id);

  assert.equal(allocations.length, 1);
  assert.equal(allocations[0]?.allocatedCost, 10);
});

function createService(input: {
  readonly costLineItems?: readonly CloudCostLineItem[];
  readonly usageAggregates?: readonly CloudUsageDailyAggregate[];
}) {
  const repository = new InMemoryCloudCostAllocationRepository();
  repository.seed({
    tenants,
    costLineItems: input.costLineItems,
    usageAggregates: input.usageAggregates,
  });
  return {
    repository,
    service: new CloudCostAllocationService(repository),
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

function usage(
  tenantId: string,
  metricKey: CloudUsageDailyAggregate["metricKey"],
  quantity: number,
): CloudUsageDailyAggregate {
  return {
    id: `${tenantId}-${metricKey}`,
    tenantId,
    date: "2026-06-15",
    metricKey,
    quantity,
    unit: "count",
    sourceType: "test",
    metadata: {},
    createdAt: periodStart,
    updatedAt: periodStart,
  };
}

function round(value: number): number {
  return Number(value.toFixed(6));
}
