import assert from "node:assert/strict";
import test from "node:test";

import type { CloudCostImport, CloudCostLineItem } from "../src/modules/cloud-costs/index.js";
import {
  CloudCostAllocationService,
  InMemoryCloudCostAllocationRepository,
} from "../src/modules/cloud-cost-allocation/index.js";

// B-SAN3-03 · R12 (emenda 1, §2.6) — o resumo responde pelo período pedido (mesmo dia UTC de início e de fim)
// e diz quando não há custo: `coverage` ∈ imported | no_import | no_run | legacy_unscoped.

const tenants = [
  { id: "tenant-a", name: "Tenant A", slug: "tenant-a" },
  { id: "tenant-b", name: "Tenant B", slug: "tenant-b" },
];
const OCT_START = new Date("2026-10-01T00:00:00.000Z");
const OCT_END = new Date("2026-10-31T23:59:59.999Z");

test("T-SUM-1 · run de 31/10 a 30/11 e pedido de outubro → no_run, total 0", async () => {
  const start = new Date("2026-10-31T00:00:00.000Z");
  const end = new Date("2026-11-30T23:59:59.999Z");
  const { service } = setup([costImport("imp-nov", start, end)], [line("l1", "imp-nov", start, end, 7)]);
  const run = await service.allocateCostsForPeriod({ periodStart: start, periodEnd: end });
  assert.equal(run.totalImportedCost, 7);
  const summary = await service.getAllocationSummary({ periodStart: OCT_START, periodEnd: OCT_END });
  assert.equal(summary.totalImportedCost, 0);
  assert.equal(summary.coverage, "no_run");
  assert.equal(summary.runId, null);
});

test("T-SUM-2 · run boa de outubro e depois run sem import de outubro → devolve a boa", async () => {
  const { repository, service } = setup([costImport("imp-oct", OCT_START, OCT_END)], [line("l1", "imp-oct", OCT_START, OCT_END, 12)]);
  const good = await service.allocateCostsForPeriod({ periodStart: OCT_START, periodEnd: OCT_END });
  await later();
  repository.seed({ imports: [], costLineItems: [] });
  const empty = await service.allocateCostsForPeriod({ periodStart: OCT_START, periodEnd: OCT_END });
  assert.equal(empty.metadata.importResolution, "none");
  const summary = await service.getAllocationSummary({ periodStart: OCT_START, periodEnd: OCT_END });
  assert.equal(summary.totalImportedCost, 12);
  assert.equal(summary.coverage, "imported");
  assert.equal(summary.runId, good.id);
  assert.equal(summary.importId, "imp-oct");
});

test("T-SUM-3 · só run sem import → no_import, diferente de no_run", async () => {
  const { service } = setup([], []);
  const run = await service.allocateCostsForPeriod({ periodStart: OCT_START, periodEnd: OCT_END });
  const summary = await service.getAllocationSummary({ periodStart: OCT_START, periodEnd: OCT_END });
  assert.equal(summary.coverage, "no_import");
  assert.equal(summary.runId, run.id);
  assert.equal(summary.importResolution, "none");
  const september = await service.getAllocationSummary({
    periodStart: new Date("2026-09-01T00:00:00.000Z"),
    periodEnd: new Date("2026-09-30T23:59:59.999Z"),
  });
  assert.equal(september.coverage, "no_run");
});

test("T-SUM-4 · run anterior ao bloco (sem importResolution) → legacy_unscoped, com os valores dela", async () => {
  const { repository, service } = setup([], []);
  const legacy = await repository.createRun({ periodStart: OCT_START, periodEnd: OCT_END, metadata: {} });
  await repository.updateRun(legacy.id, {
    status: "completed",
    totalImportedCost: 33,
    totalAllocatedCost: 30,
    totalUnallocatedCost: 3,
    currency: "USD",
    completedAt: OCT_END,
    metadata: { unallocated: [{ serviceCode: "AmazonKMS", unallocatedCost: 3, reason: "no_allocation_rule" }] },
  });
  const summary = await service.getAllocationSummary({ periodStart: OCT_START, periodEnd: OCT_END });
  assert.equal(summary.coverage, "legacy_unscoped");
  assert.equal(summary.totalImportedCost, 33);
  assert.equal(summary.importId, null);
  assert.equal(summary.importResolution, null);
});

test("T-SUM-5 · run até 23:59:59.999Z casa com pedido da mesma data", async () => {
  const { service } = setup([costImport("imp-oct", OCT_START, OCT_END)], [line("l1", "imp-oct", OCT_START, OCT_END, 4)]);
  await service.allocateCostsForPeriod({ periodStart: OCT_START, periodEnd: OCT_END });
  const summary = await service.getAllocationSummary({
    periodStart: new Date("2026-10-01T00:00:00.000Z"),
    periodEnd: new Date("2026-10-31T00:00:00.000Z"),
  });
  assert.equal(summary.coverage, "imported");
  assert.equal(summary.totalImportedCost, 4);
});

test("T-SUM-6 · sem período → a mais nova com import, com runId e importId", async () => {
  const { repository, service } = setup([costImport("imp-oct", OCT_START, OCT_END)], [line("l1", "imp-oct", OCT_START, OCT_END, 9)]);
  const good = await service.allocateCostsForPeriod({ periodStart: OCT_START, periodEnd: OCT_END });
  await later();
  repository.seed({ imports: [], costLineItems: [] });
  await service.allocateCostsForPeriod({ periodStart: OCT_START, periodEnd: OCT_END });
  const summary = await service.getAllocationSummary();
  assert.equal(summary.runId, good.id);
  assert.equal(summary.importId, "imp-oct");
  assert.equal(summary.coverage, "imported");
});

function setup(imports: readonly CloudCostImport[], lines: readonly CloudCostLineItem[]) {
  const repository = new InMemoryCloudCostAllocationRepository();
  repository.seed({ tenants, imports, costLineItems: lines, auditedActions: [] });
  return { repository, service: new CloudCostAllocationService(repository) };
}

function later(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 5));
}

function costImport(id: string, periodStart: Date, periodEnd: Date): CloudCostImport {
  return { id, provider: "aws", sourceType: "manual_csv", status: "completed", periodStart, periodEnd, importedAt: periodEnd, rowCount: 1, totalUnblendedCost: 1, currency: "USD", metadata: {}, createdAt: periodStart, updatedAt: periodEnd };
}

function line(id: string, importId: string, periodStart: Date, periodEnd: Date, unblendedCost: number): CloudCostLineItem {
  return { id, importId, provider: "aws", billingPeriodStart: periodStart, billingPeriodEnd: periodEnd, serviceCode: "AmazonKMS", usageType: "Keys", unblendedCost, currency: "USD", rawLineHash: id, tenantTag: "tenant-a", metadata: {}, createdAt: periodStart };
}
