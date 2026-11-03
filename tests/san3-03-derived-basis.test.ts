import assert from "node:assert/strict";
import test from "node:test";

import type { CloudCostImport, CloudCostLineItem } from "../src/modules/cloud-costs/index.js";
import type { CloudUsageEvent } from "../src/modules/cloud-usage/index.js";
import {
  CloudCostAllocationService,
  InMemoryCloudCostAllocationRepository,
} from "../src/modules/cloud-cost-allocation/index.js";

const periodStart = new Date("2026-06-01T00:00:00.000Z");
const periodEnd = new Date("2026-06-30T23:59:59.999Z");
const tenants = [
  { id: "tenant-a", name: "Tenant A", slug: "tenant-a" },
  { id: "tenant-b", name: "Tenant B", slug: "tenant-b" },
  { id: "platform", name: "Plataforma", slug: "platform" },
] as const;

test("T-STO-1 · dublê soma estoque das quatro tabelas por organização", async () => {
  const repository = repo({
    attachments: [
      attachment("tenant-a", "checklist_attachments", 1_000),
      attachment("tenant-a", "work_order_attachments", 2_000),
      attachment("tenant-a", "attachments", 3_000),
      attachment("tenant-b", "damage_attachments", 4_000),
    ],
  });
  const rows = await repository.sumUsageBasis(periodStart, periodEnd, tenants.map((tenant) => tenant.id));
  assert.deepEqual(storage(rows), { "tenant-a": 6_000, "tenant-b": 4_000 });
});

test("T-STO-2 · storage usa estoque 3:1, não upload do período", async () => {
  const { service } = setup({
    lines: [line("s3", "AmazonS3", "TimedStorage-ByteHrs", 100)],
    attachments: [
      attachment("tenant-a", "checklist_attachments", 3_000),
      attachment("tenant-b", "checklist_attachments", 1_000),
    ],
    usageEvents: [usage("tenant-a", "checklist_attachment.uploaded.bytes", 1), usage("tenant-b", "checklist_attachment.uploaded.bytes", 99)],
  });
  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  const allocations = await service.listTenantAllocations(run.id);
  assert.equal(byTenant(allocations, "tenant-a"), 75);
  assert.equal(byTenant(allocations, "tenant-b"), 25);
  assert.ok(allocations.every((item) => item.allocationBasisMetricKey === "storage_bytes_current"));
});

test("T-STO-3 · sem arquivo e sem upload declara missing_usage_basis", async () => {
  const { service } = setup({ lines: [line("s3-empty", "AmazonS3", "TimedStorage-ByteHrs", 10)] });
  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  assert.equal(run.totalAllocatedCost, 0);
  assert.equal((run.metadata.unallocated as Array<{ reason: string }>)[0]?.reason, "missing_usage_basis");
});

test("T-STO-4 · arquivo só em damage_attachments pesa", async () => {
  const { service } = setup({
    lines: [line("s3-damage", "AmazonS3", "TimedStorage-ByteHrs", 10)],
    attachments: [attachment("tenant-b", "damage_attachments", 8_000)],
  });
  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  const allocations = await service.listTenantAllocations(run.id);
  assert.equal(allocations.length, 1);
  assert.equal(allocations[0]?.tenantId, "tenant-b");
  assert.equal(allocations[0]?.allocatedCost, 10);
});

test("T-API-1 · dublê deriva audited_actions_count por organização", async () => {
  const repository = repo({
    auditedActions: [action("tenant-a", "user-a", "work_order.created"), action("tenant-b", "user-b", "customer.updated")],
  });
  const rows = await repository.sumUsageBasis(periodStart, periodEnd, tenants.map((tenant) => tenant.id));
  assert.deepEqual(actions(rows), { "tenant-a": 1, "tenant-b": 1 });
});

test("T-API-2 · ações fora da janela não contam", async () => {
  const repository = repo({
    auditedActions: [
      action("tenant-a", "user-a", "work_order.created", new Date("2026-06-15T00:00:00Z")),
      action("tenant-a", "user-a", "work_order.created", new Date("2026-07-01T00:00:00Z")),
    ],
  });
  const rows = await repository.sumUsageBasis(periodStart, periodEnd, ["tenant-a"]);
  assert.deepEqual(actions(rows), { "tenant-a": 1 });
});

test("T-API-3 · ApiGateway e AWSELB são alocados pela base auditada", async () => {
  const { service } = setup({
    lines: [
      line("api", "AmazonApiGateway", "ApiGatewayRequest", 10),
      line("elb", "AWSELB", "LoadBalancerUsage", 10),
      line("lcu", "AWSELB", "LCUUsage", 10),
    ],
    auditedActions: [action("tenant-a", "user-a", "work_order.created")],
  });
  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  assert.equal(run.totalAllocatedCost, 30);
  assert.equal(run.totalUnallocatedCost, 0);
});

test("T-API-4 · API sem ação declara missing_usage_basis", async () => {
  const { service } = setup({ lines: [line("api-empty", "AmazonApiGateway", "ApiGatewayRequest", 7)] });
  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  assert.equal((run.metadata.unallocated as Array<{ reason: string }>)[0]?.reason, "missing_usage_basis");
});

test("T-API-5 · auth.* não conta", async () => {
  const repository = repo({
    auditedActions: [
      action("tenant-a", "user-a", "auth.login.success"),
      action("tenant-a", "user-a", "auth.refresh.success"),
      action("tenant-a", "user-a", "auth.logout"),
      action("tenant-a", "user-a", "work_order.created"),
    ],
  });
  assert.deepEqual(actions(await repository.sumUsageBasis(periodStart, periodEnd, ["tenant-a"])), { "tenant-a": 1 });
});

test("T-API-6 · ação da plataforma no cliente pesa na plataforma", async () => {
  const repository = repo({
    users: [{ id: "platform-user", tenantId: "platform" }],
    auditedActions: [
      action("tenant-a", "platform-user", "work_order.created"),
      action("tenant-a", "user-a", "work_order.updated"),
    ],
  });
  assert.deepEqual(actions(await repository.sumUsageBasis(periodStart, periodEnd, ["tenant-a", "platform"])), {
    "tenant-a": 1,
    platform: 1,
  });
});

test("T-API-7 · ator nulo não conta", async () => {
  const repository = repo({ auditedActions: [action("tenant-a", undefined, "system.sweep")] });
  assert.deepEqual(actions(await repository.sumUsageBasis(periodStart, periodEnd, ["tenant-a"])), {});
});

type AttachmentSeed = { tenantId: string; model: "checklist_attachments" | "work_order_attachments" | "attachments" | "damage_attachments"; sizeBytes?: number; createdAt: Date; deletedAt?: Date };
type ActionSeed = { tenantId: string; actorUserId?: string; action: string; createdAt: Date };

function repo(input: { readonly attachments?: readonly AttachmentSeed[]; readonly auditedActions?: readonly ActionSeed[]; readonly users?: readonly { id: string; tenantId: string }[]; readonly usageEvents?: readonly CloudUsageEvent[] }) {
  const repository = new InMemoryCloudCostAllocationRepository();
  repository.seed({ tenants, ...input });
  return repository;
}

function setup(input: { readonly lines: readonly CloudCostLineItem[]; readonly attachments?: readonly AttachmentSeed[]; readonly auditedActions?: readonly ActionSeed[]; readonly usageEvents?: readonly CloudUsageEvent[] }) {
  const repository = repo({ ...input, usageEvents: input.usageEvents });
  repository.seed({ imports: [costImport()], costLineItems: input.lines });
  return { repository, service: new CloudCostAllocationService(repository) };
}

function attachment(tenantId: string, model: AttachmentSeed["model"], sizeBytes?: number): AttachmentSeed {
  return { tenantId, model, sizeBytes, createdAt: new Date("2026-06-15T00:00:00Z") };
}

function action(tenantId: string, actorUserId: string | undefined, actionName: string, createdAt = new Date("2026-06-15T00:00:00Z")): ActionSeed {
  return { tenantId, actorUserId, action: actionName, createdAt };
}

function storage(rows: readonly { tenantId: string; metricKey: string; quantity: number }[]) { return quantities(rows, "storage_bytes_current"); }
function actions(rows: readonly { tenantId: string; metricKey: string; quantity: number }[]) { return quantities(rows, "audited_actions_count"); }
function quantities(rows: readonly { tenantId: string; metricKey: string; quantity: number }[], key: string) {
  return Object.fromEntries(rows.filter((row) => row.metricKey === key).map((row) => [row.tenantId, row.quantity]));
}
function byTenant(rows: readonly { tenantId: string; allocatedCost: number }[], tenantId: string) { return rows.find((row) => row.tenantId === tenantId)?.allocatedCost; }

function costImport(): CloudCostImport {
  return { id: "import-derived", provider: "aws", sourceType: "manual_csv", status: "completed", periodStart, periodEnd, importedAt: periodEnd, rowCount: 3, totalUnblendedCost: 30, currency: "USD", metadata: {}, createdAt: periodStart, updatedAt: periodEnd };
}

function line(id: string, serviceCode: string, usageType: string, unblendedCost: number): CloudCostLineItem {
  return { id, importId: "import-derived", provider: "aws", billingPeriodStart: periodStart, billingPeriodEnd: periodEnd, serviceCode, usageType, unblendedCost, currency: "USD", rawLineHash: id, metadata: {}, createdAt: periodStart };
}

function usage(tenantId: string, metricKey: CloudUsageEvent["metricKey"], quantity: number): CloudUsageEvent {
  return { id: `${tenantId}-${metricKey}`, tenantId, sourceType: "test", metricKey, quantity, unit: "bytes", occurredAt: new Date("2026-06-15T00:00:00Z"), metadata: {}, createdAt: periodStart };
}
