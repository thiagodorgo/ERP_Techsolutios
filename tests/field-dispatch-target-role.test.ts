import assert from "node:assert/strict";
import test from "node:test";

// Ω3-b (R1 do crítico) — o ALVO do despacho deve ser técnico DE CAMPO (field_technician|technician).
// operator = operador web/despacho (direciona, NÃO recebe despacho). Guard único cobre create+reassign.

async function harness() {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [
    { createMemoryFieldDispatchService, resetFieldDispatchRuntimeForTests },
    { createMemoryWorkOrderService, resetWorkOrderRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/modules/field-dispatch/index.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const workOrderService = createMemoryWorkOrderService();
  const dispatchService = createMemoryFieldDispatchService(new MemoryCoreSaasAdapter(core));
  return { core, workOrderService, dispatchService, resetFieldDispatchRuntimeForTests, resetWorkOrderRuntimeForTests };
}

function actor(tenantId: string, userId: string) {
  return {
    tenantId,
    userId,
    roles: ["manager"],
    permissions: ["field_dispatch:read", "field_dispatch:create", "field_dispatch:update", "field_dispatch:cancel", "field_dispatch:reassign"],
  } as never;
}

test("D1: create para papel NÃO-field (operator) → 422 target_not_field_technician", async () => {
  const h = await harness();
  try {
    const tenant = h.core.createTenant({ name: "T", modules: ["work_orders", "field_operations"] });
    const manager = h.core.createUser({ tenantId: tenant.id, name: "M", email: "trole-mgr@example.com", roles: ["manager"] });
    const target = h.core.createUser({ tenantId: tenant.id, name: "Op Web", email: "trole-op@example.com", roles: ["operator"] });
    const wo = await h.workOrderService.create(actor(tenant.id, manager.id), { title: "OS" });
    await assert.rejects(
      () => h.dispatchService.create(actor(tenant.id, manager.id), { workOrderId: wo.id, operatorUserId: target.id }),
      (e: unknown) => (e as { statusCode?: number; reason?: string }).statusCode === 422 && (e as { reason?: string }).reason === "target_not_field_technician",
    );
  } finally {
    h.resetFieldDispatchRuntimeForTests();
    h.resetWorkOrderRuntimeForTests();
  }
});

test("D1.b: reassign para papel NÃO-field → 422 (reassign NÃO burla o guard)", async () => {
  const h = await harness();
  try {
    const tenant = h.core.createTenant({ name: "T", modules: ["work_orders", "field_operations"] });
    const manager = h.core.createUser({ tenantId: tenant.id, name: "M", email: "trole2-mgr@example.com", roles: ["manager"] });
    const tech = h.core.createUser({ tenantId: tenant.id, name: "Tec", email: "trole2-tec@example.com", roles: ["technician"] });
    const webOp = h.core.createUser({ tenantId: tenant.id, name: "Op Web", email: "trole2-op@example.com", roles: ["operator"] });
    const wo = await h.workOrderService.create(actor(tenant.id, manager.id), { title: "OS" });
    const dispatch = await h.dispatchService.create(actor(tenant.id, manager.id), { workOrderId: wo.id, operatorUserId: tech.id });
    await assert.rejects(
      () => h.dispatchService.reassign(actor(tenant.id, manager.id), dispatch.id, { operatorUserId: webOp.id }),
      (e: unknown) => (e as { statusCode?: number; reason?: string }).statusCode === 422 && (e as { reason?: string }).reason === "target_not_field_technician",
    );
  } finally {
    h.resetFieldDispatchRuntimeForTests();
    h.resetWorkOrderRuntimeForTests();
  }
});

test("happy: create para field_technician → 201/assigned", async () => {
  const h = await harness();
  try {
    const tenant = h.core.createTenant({ name: "T", modules: ["work_orders", "field_operations"] });
    const manager = h.core.createUser({ tenantId: tenant.id, name: "M", email: "trole3-mgr@example.com", roles: ["manager"] });
    const tech = h.core.createUser({ tenantId: tenant.id, name: "Tec", email: "trole3-tec@example.com", roles: ["field_technician"] });
    const wo = await h.workOrderService.create(actor(tenant.id, manager.id), { title: "OS" });
    const dispatch = await h.dispatchService.create(actor(tenant.id, manager.id), { workOrderId: wo.id, operatorUserId: tech.id });
    assert.equal(dispatch.status, "assigned");
    assert.equal(dispatch.operatorUserId, tech.id);
  } finally {
    h.resetFieldDispatchRuntimeForTests();
    h.resetWorkOrderRuntimeForTests();
  }
});

test("D1.a: alvo com roles PLURAL [operator, field_technician] → 201 (checa o CONJUNTO)", async () => {
  const h = await harness();
  try {
    const tenant = h.core.createTenant({ name: "T", modules: ["work_orders", "field_operations"] });
    const manager = h.core.createUser({ tenantId: tenant.id, name: "M", email: "trole4-mgr@example.com", roles: ["manager"] });
    const hybrid = h.core.createUser({ tenantId: tenant.id, name: "Hib", email: "trole4-hib@example.com", roles: ["operator", "field_technician"] });
    const wo = await h.workOrderService.create(actor(tenant.id, manager.id), { title: "OS" });
    const dispatch = await h.dispatchService.create(actor(tenant.id, manager.id), { workOrderId: wo.id, operatorUserId: hybrid.id });
    assert.equal(dispatch.status, "assigned");
  } finally {
    h.resetFieldDispatchRuntimeForTests();
    h.resetWorkOrderRuntimeForTests();
  }
});

test("existência ANTES do papel: alvo inexistente/cross-tenant → 404 (não 422)", async () => {
  const h = await harness();
  try {
    const tenantA = h.core.createTenant({ name: "A", modules: ["work_orders", "field_operations"] });
    const tenantB = h.core.createTenant({ name: "B", modules: ["work_orders", "field_operations"] });
    const managerA = h.core.createUser({ tenantId: tenantA.id, name: "MA", email: "trole5-ma@example.com", roles: ["manager"] });
    const techB = h.core.createUser({ tenantId: tenantB.id, name: "TB", email: "trole5-tb@example.com", roles: ["field_technician"] });
    const wo = await h.workOrderService.create(actor(tenantA.id, managerA.id), { title: "OS" });
    // techB é field_technician mas de OUTRO tenant → 404 (existência checada antes do papel)
    await assert.rejects(
      () => h.dispatchService.create(actor(tenantA.id, managerA.id), { workOrderId: wo.id, operatorUserId: techB.id }),
      (e: unknown) => (e as { statusCode?: number; reason?: string }).statusCode === 404,
    );
  } finally {
    h.resetFieldDispatchRuntimeForTests();
    h.resetWorkOrderRuntimeForTests();
  }
});

test("target = field_dispatcher (despachante, não alvo de campo) → 422", async () => {
  const h = await harness();
  try {
    const tenant = h.core.createTenant({ name: "T", modules: ["work_orders", "field_operations"] });
    const manager = h.core.createUser({ tenantId: tenant.id, name: "M", email: "trole7-mgr@example.com", roles: ["manager"] });
    const disp = h.core.createUser({ tenantId: tenant.id, name: "Disp", email: "trole7-disp@example.com", roles: ["field_dispatcher"] });
    const wo = await h.workOrderService.create(actor(tenant.id, manager.id), { title: "OS" });
    await assert.rejects(
      () => h.dispatchService.create(actor(tenant.id, manager.id), { workOrderId: wo.id, operatorUserId: disp.id }),
      (e: unknown) => (e as { statusCode?: number; reason?: string }).statusCode === 422 && (e as { reason?: string }).reason === "target_not_field_technician",
    );
  } finally {
    h.resetFieldDispatchRuntimeForTests();
    h.resetWorkOrderRuntimeForTests();
  }
});

test("happy reassign: novo alvo field_technician → reassigned", async () => {
  const h = await harness();
  try {
    const tenant = h.core.createTenant({ name: "T", modules: ["work_orders", "field_operations"] });
    const manager = h.core.createUser({ tenantId: tenant.id, name: "M", email: "trole8-mgr@example.com", roles: ["manager"] });
    const tech1 = h.core.createUser({ tenantId: tenant.id, name: "T1", email: "trole8-t1@example.com", roles: ["technician"] });
    const tech2 = h.core.createUser({ tenantId: tenant.id, name: "T2", email: "trole8-t2@example.com", roles: ["field_technician"] });
    const wo = await h.workOrderService.create(actor(tenant.id, manager.id), { title: "OS" });
    const dispatch = await h.dispatchService.create(actor(tenant.id, manager.id), { workOrderId: wo.id, operatorUserId: tech1.id });
    const reassigned = await h.dispatchService.reassign(actor(tenant.id, manager.id), dispatch.id, { operatorUserId: tech2.id });
    assert.equal(reassigned.status, "reassigned");
    assert.equal(reassigned.operatorUserId, tech2.id);
  } finally {
    h.resetFieldDispatchRuntimeForTests();
    h.resetWorkOrderRuntimeForTests();
  }
});

test("timeline do despacho: service.timeline devolve a sequência de eventos", async () => {
  const h = await harness();
  try {
    const tenant = h.core.createTenant({ name: "T", modules: ["work_orders", "field_operations"] });
    const manager = h.core.createUser({ tenantId: tenant.id, name: "M", email: "trole6-mgr@example.com", roles: ["manager"] });
    const tech = h.core.createUser({ tenantId: tenant.id, name: "Tec", email: "trole6-tec@example.com", roles: ["technician"] });
    const wo = await h.workOrderService.create(actor(tenant.id, manager.id), { title: "OS" });
    const dispatch = await h.dispatchService.create(actor(tenant.id, manager.id), { workOrderId: wo.id, operatorUserId: tech.id });
    const timeline = await h.dispatchService.timeline(actor(tenant.id, manager.id), dispatch.id);
    assert.equal(timeline[0]!.eventType, "field_dispatch_created");
    // não vaza tenantId no evento do DTO — verificado no teste de rota; aqui garantimos a leitura.
    assert.ok(timeline.length >= 1);
  } finally {
    h.resetFieldDispatchRuntimeForTests();
    h.resetWorkOrderRuntimeForTests();
  }
});
