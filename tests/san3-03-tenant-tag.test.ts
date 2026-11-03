import assert from "node:assert/strict";
import test from "node:test";

import type { CloudCostImport, CloudCostLineItem } from "../src/modules/cloud-costs/index.js";
import {
  allocateCloudCosts,
  CloudCostAllocationService,
  InMemoryCloudCostAllocationRepository,
} from "../src/modules/cloud-cost-allocation/index.js";
import type {
  AllocationEngineResult,
  CloudCostAllocationStrategy,
  CloudCostAllocationTenant,
} from "../src/modules/cloud-cost-allocation/cloud-cost-allocation.types.js";

const periodStart = new Date("2026-11-01T00:00:00.000Z");
const periodEnd = new Date("2026-11-30T23:59:59.999Z");
const tenantA = { id: "tenant-a", name: "Duplicada", slug: "alpha" };
const tenantB = { id: "tenant-b", name: "Beta", slug: "duplicada" };
const platform = { id: "platform-id", name: "Plataforma", slug: "platform" };
const tenants = [tenantA, tenantB, platform];

test("T-TAG-1 · nome duplicado é ambíguo independentemente da ordem", () => {
  const first = run("duplicada", "direct_tag_then_usage_weighted_v1", [
    { ...tenantA, slug: "a" },
    { ...tenantB, name: "Duplicada", slug: "b" },
  ]);
  const reversed = run("duplicada", "direct_tag_then_usage_weighted_v1", [
    { ...tenantB, name: "Duplicada", slug: "b" },
    { ...tenantA, slug: "a" },
  ]);
  assertAmbiguous(first);
  assertAmbiguous(reversed);
});

test("T-TAG-2 · colisão entre nome e slug também é ambígua", () => {
  assertAmbiguous(run("duplicada"));
  assertAmbiguous(run(tenantB.id, "direct_tag_then_usage_weighted_v1", [
    { ...tenantA, name: tenantB.id }, tenantB,
  ]));
  assertAmbiguous(run(tenantA.id, "direct_tag_then_usage_weighted_v1", [
    tenantA, { ...tenantB, slug: tenantA.id },
  ]));
});

test("T-TAG-3 e T-TAG-4 · slug e id únicos continuam diretos", () => {
  const collidingNames = [tenantA, { ...tenantB, name: tenantA.name }, platform];
  for (const tag of ["alpha", tenantA.id]) {
    const result = run(tag, "direct_tag_then_usage_weighted_v1", collidingNames);
    assert.deepEqual(allocationPairs(result), [[tenantA.id, 10]]);
    assert.equal(result.totalUnallocatedCost, 0);
    assertConserved(result);
  }
});

test("T-TAG-5 · colisão com a plataforma é ambígua antes da plataforma", () => {
  const collision = [{ ...tenantA, name: "Plataforma" }, platform];
  for (const order of [collision, [...collision].reverse()]) {
    for (const strategy of ["direct_tag_then_usage_weighted_v1", "usage_weighted_v1"] as const) {
      assertAmbiguous(run("plataforma", strategy, order));
    }
  }
});

test("T-TAG-7 · estratégia só por uso também recusa tag ambígua", () => {
  assertAmbiguous(run("duplicada", "usage_weighted_v1"));
});

test("T-TAG-8 · grafias equivalentes não contornam ambiguidade", () => {
  for (const strategy of ["direct_tag_then_usage_weighted_v1", "usage_weighted_v1"] as const) {
    for (const tag of [" Duplicada ", "Duplicada\t", "DUPLICADA\u00a0", "ＤＵＰＬＩＣＡＤＡ"]) {
      assertAmbiguous(run(tag, strategy));
    }
    assertAmbiguous(run("  DUPLICADA  NORTE ", strategy, [
      { ...tenantA, name: "Duplicada Norte" },
      { ...tenantB, name: "Ｄｕｐｌｉｃａｄａ   Norte", slug: "beta" },
      platform,
    ]));
  }
});

test("T-TAG-9 · slug único normalizado continua direto", () => {
  assert.deepEqual(allocationPairs(run("  alpha ")), [[tenantA.id, 10]]);
});

test("T-TAG-10 · tag desconhecida falha fechada na estratégia direta", () => {
  for (const tag of ["nao-existe", "Duplicada\u200b"]) {
    const result = run(tag);
    assert.equal(result.totalAllocatedCost, 0);
    assert.equal(result.totalPlatformCost, 0);
    assert.deepEqual(result.unallocated.map((item) => [item.reason, item.unallocatedCost]), [["unknown_tenant_tag", 10]]);
    assertConserved(result);
  }
});

test("T-TAG-11 · estratégia só por uso ignora tag desconhecida", () => {
  const result = run("nao-existe", "usage_weighted_v1");
  assert.deepEqual(allocationPairs(result), [[tenantA.id, 2], [tenantB.id, 6]]);
  assert.equal(result.totalPlatformCost, 2);
  assert.equal(result.totalUnallocatedCost, 0);
  assertConserved(result);
});

test("T-TAG-12 · tag só de espaço equivale a linha sem tag", () => {
  const result = run("   ");
  assert.deepEqual(allocationPairs(result), [[tenantA.id, 2], [tenantB.id, 6]]);
  assert.equal(result.totalPlatformCost, 2);
  assert.equal(result.totalUnallocatedCost, 0);
});

test("T-TAG-6 e T-TAG-13 · resumo separa ambígua e desconhecida e fecha a soma", async () => {
  const repository = new InMemoryCloudCostAllocationRepository();
  repository.seed({
    tenants,
    imports: [costImport()],
    costLineItems: [line("ambiguous", "duplicada", 10), line("unknown", "nao-existe", 7)],
  });
  const service = new CloudCostAllocationService(repository);
  await service.allocateCostsForPeriod({ periodStart, periodEnd });
  const summary = await service.getAllocationSummary({ periodStart, periodEnd });
  assert.deepEqual(summary.unallocatedByReason, [
    { reason: "ambiguous_tenant_tag", unallocatedCost: 10 },
    { reason: "unknown_tenant_tag", unallocatedCost: 7 },
  ]);
  assert.equal(summary.totalUnallocatedCost, 17);
  assert.equal(
    summary.unallocatedByReason.reduce((total, item) => total + item.unallocatedCost, 0),
    summary.totalUnallocatedCost,
  );
});

function run(
  tenantTag: string,
  strategy: CloudCostAllocationStrategy = "direct_tag_then_usage_weighted_v1",
  inputTenants: readonly CloudCostAllocationTenant[] = tenants,
): AllocationEngineResult {
  return allocateCloudCosts({
    runId: "run-tag",
    periodStart,
    periodEnd,
    strategy,
    tenants: inputTenants,
    costLineItems: [line("cost", tenantTag, 10)],
    usageBasis: [
      { tenantId: tenantA.id, metricKey: "audited_actions_count", quantity: 1, unit: "count", sourceType: "audit" },
      { tenantId: tenantB.id, metricKey: "audited_actions_count", quantity: 3, unit: "count", sourceType: "audit" },
      { tenantId: platform.id, metricKey: "audited_actions_count", quantity: 1, unit: "count", sourceType: "audit" },
    ],
  });
}

function assertAmbiguous(result: AllocationEngineResult): void {
  assert.equal(result.totalAllocatedCost, 0);
  assert.equal(result.allocations.length, 0);
  assert.equal(result.totalPlatformCost, 0);
  assert.deepEqual(result.unallocated.map((item) => [item.reason, item.unallocatedCost]), [["ambiguous_tenant_tag", 10]]);
  assertConserved(result);
}

function assertConserved(result: AllocationEngineResult): void {
  assert.equal(
    result.totalImportedCost,
    result.totalAllocatedCost + result.totalPlatformCost + result.totalUnallocatedCost + result.roundingResidualCost,
  );
}

function allocationPairs(result: AllocationEngineResult): Array<[string, number]> {
  return result.allocations.map((item) => [item.tenantId, item.allocatedCost]).sort(([left], [right]) => left.localeCompare(right));
}

function costImport(): CloudCostImport {
  return {
    id: "import-tag",
    provider: "aws",
    sourceType: "manual_csv",
    status: "completed",
    periodStart,
    periodEnd,
    importedAt: periodEnd,
    rowCount: 2,
    totalUnblendedCost: 17,
    currency: "USD",
    metadata: {},
    createdAt: periodStart,
    updatedAt: periodEnd,
  };
}

function line(id: string, tenantTag: string, unblendedCost: number): CloudCostLineItem {
  return {
    id,
    importId: "import-tag",
    provider: "aws",
    billingPeriodStart: periodStart,
    billingPeriodEnd: periodEnd,
    serviceCode: "AmazonEC2",
    usageType: "BoxUsage",
    tenantTag,
    unblendedCost,
    currency: "USD",
    rawLineHash: id,
    metadata: {},
    createdAt: periodStart,
  };
}
