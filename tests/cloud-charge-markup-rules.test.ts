import assert from "node:assert/strict";
import test from "node:test";

import type {
  CloudCostAllocationRun,
  TenantCloudCostAllocation,
} from "../src/modules/cloud-cost-allocation/index.js";
import {
  CloudChargeService,
  InMemoryCloudChargeRepository,
  type CloudChargeRule,
  type CloudChargeTenant,
} from "../src/modules/cloud-charges/index.js";

const periodStart = new Date("2026-06-01T00:00:00.000Z");
const periodEnd = new Date("2026-06-30T23:59:59.999Z");
const sourceAllocationRun = allocationRun("allocation-run-1");
const tenants: CloudChargeTenant[] = [
  { id: "tenant-a", name: "Tenant A", slug: "tenant-a", planCode: "professional" },
  { id: "tenant-b", name: "Tenant B", slug: "tenant-b", planCode: "business" },
];

test("cria regra default de markup", async () => {
  const { service } = createService();

  const rule = await service.createCloudChargeRule(ruleInput({ name: "Default cloud markup" }));

  assert.equal(rule.planCode, "default");
  assert.equal(rule.markupType, "percentage");
  assert.equal(rule.markupValue, 60);
  assert.equal(rule.roundingMode, "nearest_cent");
});

test("seleciona regra especifica por tenant antes da default", async () => {
  const { service } = createService({
    rules: [
      rule("default-rule", { markupValue: 60 }),
      rule("tenant-rule", { tenantId: "tenant-a", markupValue: 25, priority: 10 }),
    ],
    allocations: [allocation("tenant-a", 100)],
  });

  const run = await service.calculateTenantChargesForAllocationRun(runInput());
  const charges = await service.listTenantCharges(run.id);

  assert.equal(run.status, "completed");
  assert.equal(charges[0]?.cloudChargeRuleId, "tenant-rule");
  assert.equal(charges[0]?.finalChargeAmount, 125);
});

test("calcula markup percentage", async () => {
  const { service } = createService({
    rules: [rule("default-rule", { markupType: "percentage", markupValue: 60 })],
    allocations: [allocation("tenant-a", 100)],
  });

  const run = await service.calculateTenantChargesForAllocationRun(runInput());
  const charges = await service.listTenantCharges(run.id);

  assert.equal(charges[0]?.grossChargeAmount, 160);
  assert.equal(charges[0]?.finalChargeAmount, 160);
  assert.equal(charges[0]?.marginAmount, 60);
  assert.equal(charges[0]?.marginPercentage, 60);
});

test("calcula fixed_multiplier", async () => {
  const { service } = createService({
    rules: [rule("default-rule", { markupType: "fixed_multiplier", markupValue: 2 })],
    allocations: [allocation("tenant-a", 10)],
  });

  const run = await service.calculateTenantChargesForAllocationRun(runInput());
  const charges = await service.listTenantCharges(run.id);

  assert.equal(charges[0]?.finalChargeAmount, 20);
});

test("calcula fixed_amount", async () => {
  const { service } = createService({
    rules: [rule("default-rule", { markupType: "fixed_amount", markupValue: 5 })],
    allocations: [allocation("tenant-a", 10)],
  });

  const run = await service.calculateTenantChargesForAllocationRun(runInput());
  const charges = await service.listTenantCharges(run.id);

  assert.equal(charges[0]?.finalChargeAmount, 15);
});

test("aplica minimum_monthly_charge", async () => {
  const { service } = createService({
    rules: [rule("default-rule", { markupValue: 10, minimumMonthlyCharge: 50 })],
    allocations: [allocation("tenant-a", 10)],
  });

  const run = await service.calculateTenantChargesForAllocationRun(runInput());
  const charges = await service.listTenantCharges(run.id);

  assert.equal(charges[0]?.grossChargeAmount, 11);
  assert.equal(charges[0]?.finalChargeAmount, 50);
});

test("aplica included_cloud_cost", async () => {
  const { service } = createService({
    rules: [rule("default-rule", { markupValue: 100, includedCloudCost: 20 })],
    allocations: [allocation("tenant-a", 50)],
  });

  const run = await service.calculateTenantChargesForAllocationRun(runInput());
  const charges = await service.listTenantCharges(run.id);

  assert.equal(charges[0]?.includedCloudCost, 20);
  assert.equal(charges[0]?.billableCost, 30);
  assert.equal(charges[0]?.discountAmount, 20);
  assert.equal(charges[0]?.finalChargeAmount, 60);
});

test("nao permite valor final negativo por markup invalido", async () => {
  const { service } = createService();

  assert.throws(
    () => service.createCloudChargeRule(ruleInput({ markupValue: -1 })),
    /markupValue cannot be negative/,
  );
});

test("lida com allocated_cost zero", async () => {
  const { service } = createService({
    rules: [rule("default-rule", { minimumMonthlyCharge: 0 })],
    allocations: [allocation("tenant-a", 0)],
  });

  const run = await service.calculateTenantChargesForAllocationRun(runInput());
  const charges = await service.listTenantCharges(run.id);

  assert.equal(charges[0]?.finalChargeAmount, 0);
  assert.equal(charges[0]?.marginAmount, 0);
  assert.equal(charges[0]?.marginPercentage, undefined);
});

test("arredonda conforme rounding_mode", async () => {
  const { service } = createService({
    rules: [rule("default-rule", { markupValue: 33.333, roundingMode: "nearest_10_cents" })],
    allocations: [allocation("tenant-a", 10)],
  });

  const run = await service.calculateTenantChargesForAllocationRun(runInput());
  const charges = await service.listTenantCharges(run.id);

  assert.equal(charges[0]?.finalChargeAmount, 13.3);
});

test("falha gera status failed e erro sanitizado", async () => {
  class FailingRepository extends InMemoryCloudChargeRepository {
    override listRules(): Promise<readonly CloudChargeRule[]> {
      return Promise.reject(new Error("Bearer secret-token"));
    }
  }
  const repository = new FailingRepository();
  repository.seed({
    tenants,
    allocationRuns: [sourceAllocationRun],
    allocations: [allocation("tenant-a", 10)],
  });
  const service = new CloudChargeService(repository);
  const run = await service.createCalculationRun(runInput());
  const failed = await service.executeCalculationRun(run.id);

  assert.equal(failed.status, "failed");
  assert.equal(failed.errorMessage?.includes("secret-token"), false);
});

test("nao duplica charges indevidamente", async () => {
  const { service } = createService({
    rules: [rule("default-rule")],
    allocations: [allocation("tenant-a", 10)],
  });
  const run = await service.createCalculationRun(runInput());

  await service.executeCalculationRun(run.id);
  await service.executeCalculationRun(run.id);
  const charges = await service.listTenantCharges(run.id);

  assert.equal(charges.length, 1);
  assert.equal(charges[0]?.finalChargeAmount, 16);
});

function createService(input: {
  readonly rules?: readonly CloudChargeRule[];
  readonly allocations?: readonly TenantCloudCostAllocation[];
} = {}) {
  const repository = new InMemoryCloudChargeRepository();
  repository.seed({
    tenants,
    allocationRuns: [sourceAllocationRun],
    rules: input.rules ?? [rule("default-rule")],
    allocations: input.allocations ?? [allocation("tenant-a", 100)],
  });

  return {
    repository,
    service: new CloudChargeService(repository),
  };
}

function ruleInput(override: Partial<Parameters<CloudChargeService["createCloudChargeRule"]>[0]> = {}) {
  return {
    planCode: "default",
    name: "Default cloud markup",
    isActive: true,
    priority: 100,
    effectiveFrom: periodStart,
    currency: "BRL",
    markupType: "percentage" as const,
    markupValue: 60,
    minimumMonthlyCharge: 0,
    includedCloudCost: 0,
    roundingMode: "nearest_cent" as const,
    ...override,
  };
}

function rule(id: string, override: Partial<CloudChargeRule> = {}): CloudChargeRule {
  const now = periodStart;
  return {
    id,
    planCode: "default",
    name: "Default cloud markup",
    isActive: true,
    priority: 100,
    effectiveFrom: periodStart,
    currency: "BRL",
    markupType: "percentage",
    markupValue: 60,
    minimumMonthlyCharge: 0,
    includedCloudCost: 0,
    roundingMode: "nearest_cent",
    metadata: {},
    createdAt: now,
    updatedAt: now,
    ...override,
  };
}

function runInput() {
  return {
    periodStart,
    periodEnd,
    sourceAllocationRunId: sourceAllocationRun.id,
  };
}

function allocationRun(id: string): CloudCostAllocationRun {
  return {
    id,
    provider: "aws",
    status: "completed",
    periodStart,
    periodEnd,
    strategy: "direct_tag_then_usage_weighted_v1",
    totalImportedCost: 100,
    totalAllocatedCost: 100,
    totalUnallocatedCost: 0,
    currency: "USD",
    metadata: {},
    createdAt: periodStart,
    updatedAt: periodStart,
  };
}

function allocation(tenantId: string, allocatedCost: number): TenantCloudCostAllocation {
  return {
    id: `${tenantId}-${allocatedCost}`,
    allocationRunId: sourceAllocationRun.id,
    tenantId,
    provider: "aws",
    periodStart,
    periodEnd,
    serviceCode: "AmazonS3",
    usageType: "TimedStorage-ByteHrs",
    costCategory: "storage",
    allocationMethod: "storage_usage_weight",
    allocationBasisMetricKey: "storage_gb_month",
    allocationBasisQuantity: 1,
    allocationRatio: 1,
    allocatedCost,
    currency: "USD",
    sourceCostLineItemIds: [],
    metadata: {},
    createdAt: periodStart,
    updatedAt: periodStart,
  };
}
