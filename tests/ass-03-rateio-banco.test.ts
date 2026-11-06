import assert from "node:assert/strict";
import test from "node:test";

import type { CloudCostImport, CloudCostLineItem } from "../src/modules/cloud-costs/index.js";
import {
  CloudCostAllocationService,
  InMemoryCloudCostAllocationRepository,
} from "../src/modules/cloud-cost-allocation/index.js";

// B-ASS-03 · R-MED-8 (emenda corrigida §3.1; Emenda 1 ao §4.3) — o banco (AmazonRDS) pesa no rateio pelo
// espaço MEDIDO (`db_bytes_estimated`, último dia medido até o fim do período), na frente das ações, com o
// método `storage_usage_weight`; sem medição, continua pelas ações (Q5 da emenda).
//
// MUTAÇÃO QUE ESTES TESTES MATAM (plano §4.3, R-MED-8): pôr `db_bytes_estimated` DEPOIS de
// `audited_actions_count` na regra `database` → T-MED-12 vermelho (as ações 1:3 venceriam os 3 GB : 1 GB).

const GB = 1024 ** 3;
const periodStart = new Date("2026-06-01T00:00:00.000Z");
const periodEnd = new Date("2026-06-30T23:59:59.999Z");
const tenants = [
  { id: "tenant-a", name: "Tenant A", slug: "tenant-a" },
  { id: "tenant-b", name: "Tenant B", slug: "tenant-b" },
];
// Ações ao CONTRÁRIO do espaço (A 1 : B 3), para provar que a medição vence as ações quando existe.
const ACTIONS_1_TO_3 = [action("tenant-a"), action("tenant-b"), action("tenant-b"), action("tenant-b")];

test("T-MED-12 · AmazonRDS com A 3 GB e B 1 GB medidos → 75/25 pelo espaço, método storage_usage_weight", async () => {
  const { service } = setup([line("rds", "AmazonRDS", "InstanceUsage:db.t3.micro", 100)], ACTIONS_1_TO_3, [
    { tenantId: "tenant-a", date: "2026-06-20", dbBytesEstimated: 3 * GB },
    { tenantId: "tenant-b", date: "2026-06-20", dbBytesEstimated: 1 * GB },
  ]);
  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  const allocations = await service.listTenantAllocations(run.id);
  assert.equal(run.totalUnallocatedCost, 0);
  assert.equal(sum(allocations, "tenant-a"), 75);
  assert.equal(sum(allocations, "tenant-b"), 25);
  assert.ok(allocations.every((item) => item.costCategory === "database"));
  assert.ok(allocations.every((item) => item.allocationBasisMetricKey === "db_bytes_estimated"));
  assert.ok(allocations.every((item) => item.allocationMethod === "storage_usage_weight"));
  assert.ok(allocations.every((item) => item.metadata.estimate === true), "o banco medido segue rotulado como estimativa");
});

test("T-MED-12b · vale o ÚLTIMO dia medido até o fim do período; dia depois do período e dia sem medida não contam", async () => {
  const { service } = setup([line("rds", "AmazonRDS", "InstanceUsage", 100)], ACTIONS_1_TO_3, [
    { tenantId: "tenant-a", date: "2026-06-05", dbBytesEstimated: 1 * GB },
    { tenantId: "tenant-a", date: "2026-06-25", dbBytesEstimated: 3 * GB },
    { tenantId: "tenant-a", date: "2026-06-28", dbBytesEstimated: null },
    { tenantId: "tenant-a", date: "2026-07-02", dbBytesEstimated: 99 * GB },
    { tenantId: "tenant-b", date: "2026-06-25", dbBytesEstimated: 1 * GB },
  ]);
  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  const allocations = await service.listTenantAllocations(run.id);
  assert.equal(sum(allocations, "tenant-a"), 75);
  assert.equal(sum(allocations, "tenant-b"), 25);
});

test("T-MED-13 · sem nenhuma medição → o banco continua pelas ações (Q5 da emenda)", async () => {
  const { service } = setup([line("rds", "AmazonRDS", "InstanceUsage", 100)], ACTIONS_1_TO_3, []);
  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  const allocations = await service.listTenantAllocations(run.id);
  assert.equal(run.totalUnallocatedCost, 0);
  assert.equal(sum(allocations, "tenant-a"), 25);
  assert.equal(sum(allocations, "tenant-b"), 75);
  assert.ok(allocations.every((item) => item.allocationBasisMetricKey === "audited_actions_count"));
});

test("T-MED-13b · a medição não vaza para máquina nem cache: EC2 segue pelas ações", async () => {
  const { service } = setup([line("ec2", "AmazonEC2", "BoxUsage:t3.medium", 100)], ACTIONS_1_TO_3, [
    { tenantId: "tenant-a", date: "2026-06-20", dbBytesEstimated: 3 * GB },
    { tenantId: "tenant-b", date: "2026-06-20", dbBytesEstimated: 1 * GB },
  ]);
  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  const allocations = await service.listTenantAllocations(run.id);
  assert.equal(sum(allocations, "tenant-a"), 25);
  assert.ok(allocations.every((item) => item.allocationBasisMetricKey === "audited_actions_count"));
});

function setup(
  lines: readonly CloudCostLineItem[],
  auditedActions: readonly ReturnType<typeof action>[],
  usageDaily: readonly { tenantId: string; date: string; dbBytesEstimated: number | null }[],
) {
  const repository = new InMemoryCloudCostAllocationRepository();
  repository.seed({ tenants, imports: [costImport()], costLineItems: lines, auditedActions, usageDaily });
  return { repository, service: new CloudCostAllocationService(repository) };
}

function action(tenantId: string) {
  return { tenantId, actorUserId: `user-${tenantId}`, action: "work_order.updated", createdAt: new Date("2026-06-15T00:00:00Z") };
}

function sum(rows: readonly { tenantId: string; allocatedCost: number }[], tenantId: string) {
  return Number(rows.filter((row) => row.tenantId === tenantId).reduce((total, row) => total + row.allocatedCost, 0).toFixed(6));
}

function costImport(): CloudCostImport {
  return { id: "import-db", provider: "aws", sourceType: "manual_csv", status: "completed", periodStart, periodEnd, importedAt: periodEnd, rowCount: 1, totalUnblendedCost: 1, currency: "USD", metadata: {}, createdAt: periodStart, updatedAt: periodEnd };
}

function line(id: string, serviceCode: string, usageType: string, unblendedCost: number): CloudCostLineItem {
  return { id, importId: "import-db", provider: "aws", billingPeriodStart: periodStart, billingPeriodEnd: periodEnd, serviceCode, usageType, unblendedCost, currency: "USD", rawLineHash: id, metadata: {}, createdAt: periodStart };
}
