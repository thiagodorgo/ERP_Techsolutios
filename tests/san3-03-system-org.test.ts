import assert from "node:assert/strict";
import test from "node:test";

import type { CloudCostImport, CloudCostLineItem } from "../src/modules/cloud-costs/index.js";
import type { CloudUsageEvent } from "../src/modules/cloud-usage/index.js";
import {
  CloudCostAllocationService,
  InMemoryCloudCostAllocationRepository,
} from "../src/modules/cloud-cost-allocation/index.js";
import type { CloudCostAllocationStrategy } from "../src/modules/cloud-cost-allocation/cloud-cost-allocation.types.js";

// B-SAN3-03 · R8 (emenda 1, §2.4) — a organização da plataforma (`slug = "platform"`) PESA no rateio com a
// base dela e NÃO recebe alocação: a parte dela vai para `totalPlatformCost`, linha própria, nunca para os
// clientes nem para `totalUnallocatedCost`.

const periodStart = new Date("2026-06-01T00:00:00.000Z");
const periodEnd = new Date("2026-06-30T23:59:59.999Z");
const PLATFORM_ID = "6f1d0c8e-0000-4000-8000-0000000001a7";
const tenantA = { id: "tenant-a", name: "Tenant A", slug: "tenant-a" };
const tenantB = { id: "tenant-b", name: "Tenant B", slug: "tenant-b" };
const platform = { id: PLATFORM_ID, name: "Plataforma", slug: "platform" };
const STRATEGIES: readonly CloudCostAllocationStrategy[] = ["direct_tag_then_usage_weighted_v1", "usage_weighted_v1"];

test("T-SYS-1 · listTenants do dublê mantém a plataforma no universo do rateio", async () => {
  const { repository } = setup({ lines: [] });
  const tenants = await repository.listTenants();
  assert.ok(tenants.some((tenant) => tenant.slug === "platform"), "a plataforma tem de continuar em listTenants()");
});

test("T-SYS-2 · tag da plataforma por id, nome e slug, em qualquer caixa, nas 2 estratégias → custo da plataforma", async () => {
  for (const strategy of STRATEGIES) {
    for (const tag of [PLATFORM_ID, PLATFORM_ID.toUpperCase(), "Plataforma", "platform", "PLATFORM"]) {
      const { service } = setup({ lines: [line("tagged", "AmazonKMS", "Keys", 10, tag)] });
      const run = await service.allocateCostsForPeriod({ periodStart, periodEnd, strategy });
      const allocations = await service.listTenantAllocations(run.id);
      const label = `${strategy} · tag ${tag}`;
      assert.equal(run.status, "completed", label);
      assert.equal(run.metadata.totalPlatformCost, 10, label);
      assert.equal(run.totalAllocatedCost, 0, label);
      assert.equal(run.totalUnallocatedCost, 0, label);
      assert.equal(allocations.length, 0, label);
      const platformCost = run.metadata.platformCost as Array<{ origin: string; platformCost: number }>;
      assert.deepEqual(platformCost.map((item) => [item.origin, item.platformCost]), [["direct_tag", 10]], label);
    }
  }
});

test("T-SYS-3 · linha sem tag: a plataforma fica no denominador e a fatia dela vira custo da plataforma", async () => {
  const { service } = setup({
    lines: [line("api", "AmazonApiGateway", "ApiGatewayRequest", 100)],
    auditedActions: [
      action(tenantA.id, "user-a"),
      action(tenantB.id, "user-b"),
      action(platform.id, "user-p"),
      action(platform.id, "user-p"),
    ],
  });
  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  const allocations = await service.listTenantAllocations(run.id);
  assert.equal(byTenant(allocations, tenantA.id), 25);
  assert.equal(byTenant(allocations, tenantB.id), 25);
  assert.equal(byTenant(allocations, platform.id), undefined, "a plataforma não recebe alocação");
  assert.equal(run.totalAllocatedCost, 50);
  assert.equal(run.metadata.totalPlatformCost, 50);
  assert.equal(run.totalUnallocatedCost, 0);
  const platformCost = run.metadata.platformCost as Array<{ origin: string; platformCost: number }>;
  assert.deepEqual(platformCost.map((item) => [item.origin, item.platformCost]), [["usage_share", 50]]);
});

test("T-SYS-8 · sem organização platform cadastrada o rateio é o de sempre e o custo da plataforma é 0", async () => {
  const { service } = setup({
    tenants: [tenantA, tenantB],
    lines: [line("api", "AmazonApiGateway", "ApiGatewayRequest", 100), line("tag-a", "AmazonKMS", "Keys", 10, "tenant-a")],
    auditedActions: [action(tenantA.id, "user-a"), action(tenantB.id, "user-b"), action(tenantB.id, "user-b")],
  });
  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  const allocations = await service.listTenantAllocations(run.id);
  assert.equal(byTenant(allocations, tenantA.id), 43.333333);
  assert.equal(byTenant(allocations, tenantB.id), 66.666667);
  assert.equal(run.metadata.totalPlatformCost, 0);
  assert.deepEqual(run.metadata.platformCost, []);
});

test("T-SYS-4 · tag da plataforma (10) + linha sem regra (5): plataforma 10, não rateado 5 por motivo", async () => {
  const { service } = setup({
    lines: [line("tag-p", "AmazonKMS", "Keys", 10, "platform"), line("rule-less", "AmazonCognito", "Metrics", 5)],
  });
  await service.allocateCostsForPeriod({ periodStart, periodEnd });
  const summary = await service.getAllocationSummary({ periodStart, periodEnd });
  assert.equal(summary.totalPlatformCost, 10);
  assert.equal(summary.totalUnallocatedCost, 5);
  assert.deepEqual(summary.unallocatedByReason, [{ reason: "no_allocation_rule", unallocatedCost: 5 }]);
  assert.deepEqual(summary.platformCostByService, [{ serviceCode: "AmazonKMS", platformCost: 10 }]);
});

test("T-SYS-5 · motivos com custos de 6 casas: soma por motivo = totalUnallocatedCost, nenhum falta", async () => {
  const { service } = setup({
    lines: [
      line("nr-1", "AmazonCognito", "Metrics", 0.1),
      line("nr-2", "AmazonCognito", "Alarms", 0.2),
      line("mb-1", "AmazonApiGateway", "ApiGatewayRequest", 0.123457),
      line("mb-2", "AmazonApiGateway", "ApiGatewayRequest", 0.000001),
    ],
  });
  await service.allocateCostsForPeriod({ periodStart, periodEnd });
  const summary = await service.getAllocationSummary({ periodStart, periodEnd });
  assert.deepEqual(summary.unallocatedByReason, [
    { reason: "missing_usage_basis", unallocatedCost: 0.123458 },
    { reason: "no_allocation_rule", unallocatedCost: 0.3 },
  ]);
  const sum = summary.unallocatedByReason.reduce((total, item) => total + BigInt(Math.round(item.unallocatedCost * 1e6)), 0n);
  assert.equal(sum, BigInt(Math.round(summary.totalUnallocatedCost * 1e6)));
});

test("T-SYS-6 · item de metadata.unallocated sem reason aparece em unspecified", async () => {
  const { repository, service } = setup({ lines: [] });
  const legacy = await repository.createRun({ periodStart, periodEnd, metadata: {} });
  await repository.updateRun(legacy.id, {
    status: "completed",
    totalImportedCost: 7,
    totalAllocatedCost: 0,
    totalUnallocatedCost: 7,
    completedAt: periodEnd,
    metadata: {
      unallocated: [
        { serviceCode: "AmazonKMS", unallocatedCost: 4 },
        { serviceCode: "AmazonKMS", unallocatedCost: 3, reason: "no_allocation_rule" },
      ],
    },
  });
  const summary = await service.getAllocationSummary({ periodStart, periodEnd });
  assert.deepEqual(summary.unallocatedByReason, [
    { reason: "no_allocation_rule", unallocatedCost: 3 },
    { reason: "unspecified", unallocatedCost: 4 },
  ]);
});

test("T-SYS-7 · período sem run: chaves presentes, listas vazias e custo da plataforma 0", async () => {
  const { service } = setup({ lines: [] });
  const summary = await service.getAllocationSummary({ periodStart, periodEnd });
  assert.deepEqual(summary.unallocatedByReason, []);
  assert.deepEqual(summary.platformCostByService, []);
  assert.deepEqual(summary.estimatedCategories, []);
  assert.equal(summary.totalPlatformCost, 0);
  assert.equal(summary.roundingResidualCost, 0);
  assert.equal(summary.coverage, "no_run");
  for (const key of ["runId", "importId", "importResolution"] as const) {
    assert.ok(key in summary, key);
    assert.equal(summary[key], null, key);
  }
});

type ActionSeed ={ tenantId: string; actorUserId?: string; action: string; createdAt: Date };

function setup(input: {
  readonly tenants?: readonly { id: string; name: string; slug: string }[];
  readonly lines: readonly CloudCostLineItem[];
  readonly auditedActions?: readonly ActionSeed[];
  readonly usageEvents?: readonly CloudUsageEvent[];
}) {
  const repository = new InMemoryCloudCostAllocationRepository();
  repository.seed({
    tenants: input.tenants ?? [tenantA, tenantB, platform],
    imports: [costImport()],
    costLineItems: input.lines,
    auditedActions: input.auditedActions ?? [],
    usageEvents: input.usageEvents ?? [],
  });
  return { repository, service: new CloudCostAllocationService(repository) };
}

function action(tenantId: string, actorUserId: string, actionName = "work_order.created"): ActionSeed {
  return { tenantId, actorUserId, action: actionName, createdAt: new Date("2026-06-15T00:00:00Z") };
}

function byTenant(rows: readonly { tenantId: string; allocatedCost: number }[], tenantId: string) {
  const matching = rows.filter((row) => row.tenantId === tenantId);
  if (matching.length === 0) return undefined;
  return Number(matching.reduce((total, row) => total + row.allocatedCost, 0).toFixed(6));
}

function costImport(): CloudCostImport {
  return { id: "import-sys", provider: "aws", sourceType: "manual_csv", status: "completed", periodStart, periodEnd, importedAt: periodEnd, rowCount: 1, totalUnblendedCost: 100, currency: "USD", metadata: {}, createdAt: periodStart, updatedAt: periodEnd };
}

function line(id: string, serviceCode: string, usageType: string, unblendedCost: number, tenantTag?: string): CloudCostLineItem {
  return { id, importId: "import-sys", provider: "aws", billingPeriodStart: periodStart, billingPeriodEnd: periodEnd, serviceCode, usageType, unblendedCost, currency: "USD", rawLineHash: id, tenantTag, metadata: {}, createdAt: periodStart };
}
