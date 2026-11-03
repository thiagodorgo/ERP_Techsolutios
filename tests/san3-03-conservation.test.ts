import assert from "node:assert/strict";
import test from "node:test";

import type { CloudCostImport, CloudCostLineItem } from "../src/modules/cloud-costs/index.js";
import {
  CloudCostAllocationService,
  InMemoryCloudCostAllocationRepository,
  allocateCloudCosts,
} from "../src/modules/cloud-cost-allocation/index.js";
import { assertConservation } from "../src/modules/cloud-cost-allocation/cloud-cost-allocation.engine.js";

// B-SAN3-03 · R13 e R14 (emenda 1, §2.7) — a soma fecha em micro-unidades exatas, o resíduo só explica
// arredondamento (teto `roundingCount × 0,000001`), e moeda misturada não soma.

const periodStart = new Date("2026-06-01T00:00:00.000Z");
const periodEnd = new Date("2026-06-30T23:59:59.999Z");
const PLATFORM_ID = "9c0b7a11-0000-4000-8000-0000000001a7";
const tenants = [
  { id: "tenant-a", name: "Tenant A", slug: "tenant-a" },
  { id: "tenant-b", name: "Tenant B", slug: "tenant-b" },
  { id: "tenant-c", name: "Tenant C", slug: "tenant-c" },
  { id: PLATFORM_ID, name: "Plataforma", slug: "platform" },
];

const micro = (value: unknown): bigint => BigInt(Math.round(Number(value) * 1_000_000));

test("T-CONS-1 · 1.000 linhas de 0,004567 entre 3 organizações: os 4 termos fecham e o resíduo não é zero", async () => {
  const lines = Array.from({ length: 1_000 }, (_, index) => line(`api-${index}`, "AmazonApiGateway", "ApiGatewayRequest", 0.004567));
  const { service } = setup(lines, [action("tenant-a"), action("tenant-b"), action("tenant-c")]);
  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  assert.equal(run.status, "completed", run.errorMessage);
  const residual = micro(run.metadata.roundingResidualCost);
  assert.notEqual(residual, 0n);
  assert.equal(micro(run.totalImportedCost), micro(run.totalAllocatedCost) + micro(run.metadata.totalPlatformCost) + micro(run.totalUnallocatedCost) + residual);
  assert.ok((residual < 0n ? -residual : residual) <= 3_000n);
});

test("T-CONS-2 · 1.000 linhas de 0,0000004 com tag: alocado 0 e resíduo = importado", async () => {
  const lines = Array.from({ length: 1_000 }, (_, index) => line(`tiny-${index}`, "AmazonKMS", "Keys", 0.0000004, "tenant-a"));
  const { service } = setup(lines, []);
  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  assert.equal(run.status, "completed", run.errorMessage);
  assert.equal(run.totalAllocatedCost, 0);
  assert.equal(micro(run.metadata.roundingResidualCost), micro(run.totalImportedCost));
  assert.equal(micro(run.totalImportedCost), 400n);
});

test("T-CONS-3 · o resíduo fica fora de não rateado", async () => {
  const lines = [
    ...Array.from({ length: 300 }, (_, index) => line(`api-${index}`, "AmazonApiGateway", "ApiGatewayRequest", 0.004567)),
    line("kms", "AmazonKMS", "Keys", 5),
  ];
  const { service } = setup(lines, [action("tenant-a"), action("tenant-b"), action("tenant-c")]);
  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  assert.notEqual(micro(run.metadata.roundingResidualCost), 0n);
  assert.equal(run.totalUnallocatedCost, 5);
  const unallocated = run.metadata.unallocated as Array<{ unallocatedCost: number }>;
  assert.equal(unallocated.reduce((total, item) => total + micro(item.unallocatedCost), 0n), 5_000_000n);
});

test("T-CONS-4 · 500 cenários de semente fixa (plataforma, tag, sem regra, sem base) fecham dentro do teto", () => {
  let seed = 0x5a17c9e3;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const services = [
    ["AmazonApiGateway", "ApiGatewayRequest"],
    ["AmazonEC2", "BoxUsage"],
    ["AmazonKMS", "Keys"],
    ["AmazonS3", "TimedStorage-ByteHrs"],
  ] as const;
  const tags = [undefined, undefined, "tenant-a", "PLATFORM", "Tenant B", PLATFORM_ID];
  for (let scenario = 0; scenario < 500; scenario += 1) {
    const lines = Array.from({ length: 25 }, (_, index) => {
      const [serviceCode, usageType] = services[Math.floor(random() * services.length)]!;
      const tag = tags[Math.floor(random() * tags.length)];
      return line(`s${scenario}-${index}`, serviceCode, usageType, Math.floor(random() * 10_000_000) / 1_000_0000 + 0.0000003, tag);
    });
    const usageBasis = tenants
      .filter(() => random() > 0.3)
      .map((tenant) => ({ tenantId: tenant.id, metricKey: "audited_actions_count" as const, quantity: 1 + Math.floor(random() * 7), unit: "count", sourceType: "audit_log" }));
    const result = allocateCloudCosts({ runId: `r${scenario}`, periodStart, periodEnd, strategy: "direct_tag_then_usage_weighted_v1", costLineItems: lines, usageBasis, tenants });
    const residual = micro(result.roundingResidualCost);
    assert.equal(
      micro(result.totalImportedCost),
      micro(result.totalAllocatedCost) + micro(result.totalPlatformCost) + micro(result.totalUnallocatedCost) + residual,
      `cenário ${scenario}`,
    );
    assert.ok((residual < 0n ? -residual : residual) <= BigInt(result.roundingCount), `cenário ${scenario}`);
  }
});

test("T-CONS-5 · assertConservation recusa resíduo acima do teto e aceita o teto exato", () => {
  assert.throws(
    () => assertConservation({ importedCost: 100, allocatedCost: 0, platformCost: 0, unallocatedCost: 0 }, 1_000),
    /residual_exceeded/,
  );
  assert.equal(assertConservation({ importedCost: 0.001, allocatedCost: 0, platformCost: 0, unallocatedCost: 0 }, 1_000), 0.001);
  assert.throws(
    () => assertConservation({ importedCost: 0.001001, allocatedCost: 0, platformCost: 0, unallocatedCost: 0 }, 1_000),
    /residual_exceeded/,
  );
});

test("T-CONS-6 · motor que omite uma fatia: run failed com residual_exceeded e 0 alocação", async () => {
  const lines = [line("api", "AmazonApiGateway", "ApiGatewayRequest", 1)];
  const repository = new InMemoryCloudCostAllocationRepository();
  repository.seed({ tenants, imports: [costImport()], costLineItems: lines, auditedActions: [action("tenant-a"), action("tenant-b"), action("tenant-c")] });
  const leaky: typeof allocateCloudCosts = (input) => {
    const result = allocateCloudCosts(input);
    return { ...result, allocations: result.allocations.slice(1) };
  };
  const service = new CloudCostAllocationService(repository, leaky);
  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  assert.equal(run.status, "failed");
  assert.match(run.errorMessage ?? "", /residual_exceeded/);
  assert.deepEqual(await service.listTenantAllocations(run.id), []);
});

test("T-CUR-1 · USD e BRL no mesmo import: run failed com mixed_currency e 0 alocação", async () => {
  const { service } = setup(
    [line("usd", "AmazonKMS", "Keys", 10, "tenant-a"), { ...line("brl", "AmazonKMS", "Keys", 10, "tenant-a"), currency: "BRL" }],
    [],
  );
  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  assert.equal(run.status, "failed");
  assert.match(run.errorMessage ?? "", /mixed_currency/);
  assert.deepEqual(await service.listTenantAllocations(run.id), []);
});

test("T-CUR-2 · só USD: resumo com currency USD", async () => {
  const { service } = setup([line("usd", "AmazonKMS", "Keys", 10, "tenant-a")], []);
  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  assert.equal(run.status, "completed", run.errorMessage);
  const summary = await service.getAllocationSummary({ periodStart, periodEnd });
  assert.equal(summary.currency, "USD");
});

function setup(lines: readonly CloudCostLineItem[], auditedActions: readonly ReturnType<typeof action>[]) {
  const repository = new InMemoryCloudCostAllocationRepository();
  repository.seed({ tenants, imports: [costImport()], costLineItems: lines, auditedActions });
  return { repository, service: new CloudCostAllocationService(repository) };
}

function action(tenantId: string) {
  return { tenantId, actorUserId: `user-${tenantId}`, action: "work_order.updated", createdAt: new Date("2026-06-15T00:00:00Z") };
}

function costImport(): CloudCostImport {
  return { id: "import-cons", provider: "aws", sourceType: "manual_csv", status: "completed", periodStart, periodEnd, importedAt: periodEnd, rowCount: 1, totalUnblendedCost: 1, currency: "USD", metadata: {}, createdAt: periodStart, updatedAt: periodEnd };
}

function line(id: string, serviceCode: string, usageType: string, unblendedCost: number, tenantTag?: string): CloudCostLineItem {
  return { id, importId: "import-cons", provider: "aws", billingPeriodStart: periodStart, billingPeriodEnd: periodEnd, serviceCode, usageType, unblendedCost, currency: "USD", rawLineHash: id, tenantTag, metadata: {}, createdAt: periodStart };
}
