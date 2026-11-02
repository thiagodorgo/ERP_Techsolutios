import assert from "node:assert/strict";
import test from "node:test";

import type { CloudCostImport, CloudCostLineItem } from "../src/modules/cloud-costs/index.js";
import {
  CloudCostAllocationService,
  InMemoryCloudCostAllocationRepository,
} from "../src/modules/cloud-cost-allocation/index.js";

// B-SAN3-03 · R11 (emenda 1, §2.5) — máquina, banco e cache entram no rateio (RECOMENDACAO ADOTADA 1, não é
// fala do dono), pelas ações auditadas, com o rótulo de estimativa. Banco passa ao espaço medido no B-ASS-03.

const periodStart = new Date("2026-06-01T00:00:00.000Z");
const periodEnd = new Date("2026-06-30T23:59:59.999Z");
const tenants = [
  { id: "tenant-a", name: "Tenant A", slug: "tenant-a" },
  { id: "tenant-b", name: "Tenant B", slug: "tenant-b" },
];
const ACTIONS_3_TO_1 = [
  action("tenant-a"),
  action("tenant-a"),
  action("tenant-a"),
  action("tenant-b"),
];

test("T-RULE-1 · EC2, transferência de dados do EC2 e Fargate → compute, 75/25 pelas ações", async () => {
  const { service } = setup(
    [
      line("ec2", "AmazonEC2", "BoxUsage:t3.medium", 100),
      line("ec2-out", "AmazonEC2", "DataTransfer-Out-Bytes", 100),
      line("fargate", "AmazonECS", "Fargate-vCPU-Hours:perCPU", 100),
    ],
    ACTIONS_3_TO_1,
  );
  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  const allocations = await service.listTenantAllocations(run.id);
  assert.equal(run.totalUnallocatedCost, 0);
  assert.equal(sum(allocations, "tenant-a"), 225);
  assert.equal(sum(allocations, "tenant-b"), 75);
  assert.ok(allocations.every((item) => item.costCategory === "compute"));
  assert.ok(allocations.every((item) => item.allocationBasisMetricKey === "audited_actions_count"));
});

test("T-RULE-2 · RDS instância e GP2-Storage → database, nunca storage", async () => {
  const { service } = setup(
    [line("rds", "AmazonRDS", "InstanceUsage:db.t3.micro", 40), line("rds-gp2", "AmazonRDS", "GP2-Storage", 40)],
    ACTIONS_3_TO_1,
  );
  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  const allocations = await service.listTenantAllocations(run.id);
  assert.equal(run.totalAllocatedCost, 80);
  assert.ok(allocations.length > 0);
  assert.ok(allocations.every((item) => item.costCategory === "database"));
});

test("T-RULE-3 · ElastiCache e MemoryDB → cache", async () => {
  const { service } = setup(
    [line("cache", "AmazonElastiCache", "NodeUsage:cache.t3.micro", 20), line("memdb", "AmazonMemoryDB", "NodeUsage", 20)],
    ACTIONS_3_TO_1,
  );
  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  const allocations = await service.listTenantAllocations(run.id);
  assert.equal(run.totalAllocatedCost, 40);
  assert.ok(allocations.every((item) => item.costCategory === "cache"));
});

test("T-RULE-4 · máquina sem nenhuma ação → missing_usage_basis", async () => {
  const { service } = setup([line("ec2", "AmazonEC2", "BoxUsage", 10)], []);
  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  assert.equal(run.totalAllocatedCost, 0);
  assert.equal((run.metadata.unallocated as Array<{ reason: string }>)[0]?.reason, "missing_usage_basis");
});

test("T-RULE-5 · as três categorias saem rotuladas como estimativa", async () => {
  const { service } = setup(
    [
      line("ec2", "AmazonEC2", "BoxUsage", 10),
      line("rds", "AmazonRDS", "InstanceUsage", 10),
      line("cache", "AmazonElastiCache", "NodeUsage", 10),
      line("api", "AmazonApiGateway", "ApiGatewayRequest", 10),
    ],
    ACTIONS_3_TO_1,
  );
  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  const allocations = await service.listTenantAllocations(run.id);
  assert.deepEqual(run.metadata.estimatedCategories, ["cache", "compute", "database"]);
  const summary = await service.getAllocationSummary({ periodStart, periodEnd });
  assert.deepEqual(summary.estimatedCategories, ["cache", "compute", "database"]);
  for (const allocation of allocations) {
    const estimated = ["cache", "compute", "database"].includes(allocation.costCategory);
    assert.equal(allocation.metadata.estimate === true, estimated, allocation.costCategory);
  }
});

test("T-RULE-6 · KMS continua sem regra", async () => {
  const { service } = setup([line("kms", "AmazonKMS", "Keys", 3)], ACTIONS_3_TO_1);
  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  assert.equal(run.totalAllocatedCost, 0);
  assert.equal((run.metadata.unallocated as Array<{ reason: string }>)[0]?.reason, "no_allocation_rule");
});

function setup(lines: readonly CloudCostLineItem[], auditedActions: readonly ReturnType<typeof action>[]) {
  const repository = new InMemoryCloudCostAllocationRepository();
  repository.seed({ tenants, imports: [costImport()], costLineItems: lines, auditedActions });
  return { repository, service: new CloudCostAllocationService(repository) };
}

function action(tenantId: string) {
  return { tenantId, actorUserId: `user-${tenantId}`, action: "work_order.updated", createdAt: new Date("2026-06-15T00:00:00Z") };
}

function sum(rows: readonly { tenantId: string; allocatedCost: number }[], tenantId: string) {
  return Number(rows.filter((row) => row.tenantId === tenantId).reduce((total, row) => total + row.allocatedCost, 0).toFixed(6));
}

function costImport(): CloudCostImport {
  return { id: "import-rule", provider: "aws", sourceType: "manual_csv", status: "completed", periodStart, periodEnd, importedAt: periodEnd, rowCount: 1, totalUnblendedCost: 1, currency: "USD", metadata: {}, createdAt: periodStart, updatedAt: periodEnd };
}

function line(id: string, serviceCode: string, usageType: string, unblendedCost: number): CloudCostLineItem {
  return { id, importId: "import-rule", provider: "aws", billingPeriodStart: periodStart, billingPeriodEnd: periodEnd, serviceCode, usageType, unblendedCost, currency: "USD", rawLineHash: id, metadata: {}, createdAt: periodStart };
}
