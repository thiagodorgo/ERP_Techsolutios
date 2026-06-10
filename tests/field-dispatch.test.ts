import assert from "node:assert/strict";
import test from "node:test";

test("field dispatch service cria, lista, muda status, reatribui e isola tenants", async () => {
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
  const tenantA = core.createTenant({ name: "Tenant Dispatch A", modules: ["work_orders", "field_operations"] });
  const tenantB = core.createTenant({ name: "Tenant Dispatch B", modules: ["work_orders", "field_operations"] });
  const managerA = core.createUser({ tenantId: tenantA.id, name: "Manager A", email: "dispatch-manager-a@example.com", roles: ["manager"] });
  const managerB = core.createUser({ tenantId: tenantB.id, name: "Manager B", email: "dispatch-manager-b@example.com", roles: ["manager"] });
  const operatorA = core.createUser({ tenantId: tenantA.id, name: "Operator A", email: "dispatch-operator-a@example.com", roles: ["operator"] });
  const operatorB = core.createUser({ tenantId: tenantB.id, name: "Operator B", email: "dispatch-operator-b@example.com", roles: ["operator"] });
  const workOrderService = createMemoryWorkOrderService();
  const dispatchService = createMemoryFieldDispatchService(new MemoryCoreSaasAdapter(core));

  try {
    const workOrder = await workOrderService.create(actor(tenantA.id, managerA.id), { title: "OS para despacho" });
    const dispatch = await dispatchService.create(actor(tenantA.id, managerA.id), {
      workOrderId: workOrder.id,
      operatorUserId: operatorA.id,
      observation: "Enviar operador mais proximo.",
    });

    assert.equal(dispatch.status, "assigned");
    assert.equal(dispatch.workOrderId, workOrder.id);
    assert.equal(dispatch.operatorUserId, operatorA.id);

    const listA = await dispatchService.list(actor(tenantA.id, managerA.id), {});
    const listB = await dispatchService.list(actor(tenantB.id, managerB.id), {});
    assert.equal(listA.total, 1);
    assert.equal(listB.total, 0);

    await assert.rejects(
      () => dispatchService.create(actor(tenantA.id, managerA.id), { workOrderId: workOrder.id, operatorUserId: operatorB.id }),
      /Field operator was not found/,
    );

    const accepted = await dispatchService.changeStatus(actor(tenantA.id, managerA.id), dispatch.id, { status: "accepted" });
    const onRoute = await dispatchService.changeStatus(actor(tenantA.id, managerA.id), dispatch.id, { status: "on_route" });
    assert.equal(accepted.status, "accepted");
    assert.equal(onRoute.status, "on_route");

    const reassigned = await dispatchService.reassign(actor(tenantA.id, managerA.id), dispatch.id, {
      operatorUserId: operatorA.id,
      reason: "Ajuste operacional.",
    });
    assert.equal(reassigned.status, "reassigned");

    const timeline = await dispatchService.timeline(actor(tenantA.id, managerA.id), dispatch.id);
    assert.deepEqual(
      timeline.map((event) => event.eventType),
      [
        "field_dispatch_created",
        "field_dispatch_status_changed",
        "field_dispatch_status_changed",
        "field_dispatch_reassigned",
      ],
    );
  } finally {
    resetFieldDispatchRuntimeForTests();
    resetWorkOrderRuntimeForTests();
  }
});

test("field dispatch service exige motivo para cancelamento e valida transicoes", async () => {
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
  const tenant = core.createTenant({ name: "Tenant Dispatch Validation", modules: ["work_orders", "field_operations"] });
  const manager = core.createUser({ tenantId: tenant.id, name: "Manager", email: "dispatch-validation-manager@example.com", roles: ["manager"] });
  const operator = core.createUser({ tenantId: tenant.id, name: "Operator", email: "dispatch-validation-operator@example.com", roles: ["operator"] });
  const workOrderService = createMemoryWorkOrderService();
  const dispatchService = createMemoryFieldDispatchService(new MemoryCoreSaasAdapter(core));

  try {
    const workOrder = await workOrderService.create(actor(tenant.id, manager.id), { title: "OS valida" });
    const dispatch = await dispatchService.create(actor(tenant.id, manager.id), {
      workOrderId: workOrder.id,
      operatorUserId: operator.id,
    });

    await assert.rejects(
      () => dispatchService.changeStatus(actor(tenant.id, manager.id), dispatch.id, { status: "completed" }),
      /Cannot transition dispatch from assigned to completed/,
    );
    await assert.rejects(
      () => dispatchService.changeStatus(actor(tenant.id, manager.id), dispatch.id, { status: "cancelled" }),
      /reason is required/,
    );

    const cancelled = await dispatchService.changeStatus(actor(tenant.id, manager.id), dispatch.id, {
      status: "cancelled",
      reason: "Cliente cancelou atendimento.",
    });
    assert.equal(cancelled.status, "cancelled");
    assert.equal(cancelled.reason, "Cliente cancelou atendimento.");
  } finally {
    resetFieldDispatchRuntimeForTests();
    resetWorkOrderRuntimeForTests();
  }
});

function actor(tenantId: string, userId: string) {
  return {
    tenantId,
    userId,
    roles: ["manager"],
    permissions: [
      "field_dispatch:read",
      "field_dispatch:create",
      "field_dispatch:update",
      "field_dispatch:cancel",
      "field_dispatch:reassign",
    ],
  } as never;
}
