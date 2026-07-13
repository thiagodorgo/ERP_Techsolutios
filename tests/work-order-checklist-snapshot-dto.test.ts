import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { toWorkOrderDto, toWorkOrderListDto } from "../src/modules/work-orders/work-order.dto.js";
import type { WorkOrder } from "../src/modules/work-orders/work-order.types.js";

function workOrder(overrides: Partial<WorkOrder> = {}): WorkOrder {
  const now = new Date("2026-07-13T00:00:00.000Z");
  return {
    id: randomUUID(),
    tenantId: randomUUID(),
    code: "OS-0001",
    title: "OS",
    priority: "medium",
    status: "open",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as WorkOrder;
}

const SNAPSHOT = { contract: "checklist_snapshot@2026-07-31.omega3c", frozen_at: "2026-07-13T00:00:00.000Z", template_id: "t1", template_version: 2, template_status: "published", template: { title: "Molde", items: [{ id: "c1", label: "ok?", type: "observation", required: true, order: 0 }] } };

// server_state do sync mobile (mobile-work-order-sync.ts) usa toWorkOrderDto → provar aqui cobre a
// entrega no payload de sync (E2a) sem simular o envelope de sync inteiro.
test("toWorkOrderDto carrega checklistSnapshot (chega no GET /:id E no server_state do sync)", () => {
  const dto = toWorkOrderDto(workOrder({ checklistSnapshot: SNAPSHOT }));
  assert.deepEqual(dto.checklistSnapshot, SNAPSHOT);
});

test("toWorkOrderDto emite checklistSnapshot null quando a OS não foi despachada", () => {
  const dto = toWorkOrderDto(workOrder());
  assert.equal(dto.checklistSnapshot, null);
});

test("toWorkOrderListDto NÃO carrega checklistSnapshot (payload de lista enxuto)", () => {
  const result = toWorkOrderListDto({ items: [workOrder({ checklistSnapshot: SNAPSHOT })], total: 1, limit: 20, offset: 0 });
  assert.equal("checklistSnapshot" in result.items[0]!, false);
});

test("buildChecklistSnapshot remove tenant_id e produz o envelope congelado", async () => {
  const { buildChecklistSnapshot } = await import("../src/modules/checklists/checklist.dto.js");
  const template = {
    id: "tpl-1",
    tenantId: "tenant-secreto",
    name: "Inspeção",
    description: null,
    type: "technical_evidence",
    status: "published" as const,
    version: 3,
    components: [
      { id: "c1", tenantId: "tenant-secreto", templateId: "tpl-1", componentKey: "k", type: "observation", label: "L", required: true, orderIndex: 0, config: {}, validationRules: {}, visibilityRules: {} },
    ],
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-02T00:00:00.000Z"),
  };
  const snap = buildChecklistSnapshot(template as never);
  assert.equal(snap.contract, "checklist_snapshot@2026-07-31.omega3c");
  assert.equal(snap.template_id, "tpl-1");
  assert.equal(snap.template_version, 3);
  assert.equal(snap.template_status, "published");
  assert.equal(typeof snap.frozen_at, "string");
  // §2.8: tenant_id não pode existir em lugar nenhum do snapshot serializado.
  assert.equal(JSON.stringify(snap).includes("tenant-secreto"), false);
  assert.equal("tenant_id" in (snap.template as Record<string, unknown>), false);
});

test("snapshotPublishedTemplate: template publicado → snapshot; draft/inexistente → null", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const { createMemoryChecklistService, resetChecklistRuntimeForTests } = await import("../src/modules/checklists/index.js");
  resetChecklistRuntimeForTests();
  const svc = createMemoryChecklistService();
  const tenantId = randomUUID();
  const actor = { tenantId, userId: randomUUID(), roles: ["tenant_admin"], permissions: ["tenant_checklists:read", "tenant_checklists:create", "tenant_checklists:update", "tenant_checklists:publish"] } as never;
  try {
    const draft = await svc.createTemplate(actor, {
      name: "Molde",
      type: "technical_evidence",
      schema: {},
      components: [{ componentKey: "k", type: "observation", label: "L", required: true, config: {}, validationRules: {}, visibilityRules: {} }],
    } as never);
    // draft → null
    assert.equal(await svc.snapshotPublishedTemplate(tenantId, draft.id), null);
    // publica → snapshot
    await svc.publishTemplate(actor, draft.id);
    const snap = await svc.snapshotPublishedTemplate(tenantId, draft.id);
    assert.ok(snap);
    assert.equal(snap!.template_id, draft.id);
    // inexistente → null
    assert.equal(await svc.snapshotPublishedTemplate(tenantId, randomUUID()), null);
    // cross-tenant → null (outro tenant não vê o template)
    assert.equal(await svc.snapshotPublishedTemplate(randomUUID(), draft.id), null);
  } finally {
    resetChecklistRuntimeForTests();
  }
});
