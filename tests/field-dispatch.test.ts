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
  const operatorA = core.createUser({ tenantId: tenantA.id, name: "Operator A", email: "dispatch-operator-a@example.com", roles: ["technician"] });
  const operatorB = core.createUser({ tenantId: tenantB.id, name: "Operator B", email: "dispatch-operator-b@example.com", roles: ["technician"] });
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
  const operator = core.createUser({ tenantId: tenant.id, name: "Operator", email: "dispatch-validation-operator@example.com", roles: ["technician"] });
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

// D-CHK-DISPATCH-CREATE — a provisão da run é EFEITO DE DOMÍNIO do despacho e é FAIL-OPEN + AUDITADA: se o
// provisioner falha, o despacho NÃO é bloqueado (segue criado) e a falha vira evento durável na timeline.
test("field dispatch é FAIL-OPEN + auditado quando o provisioner da run do checklist falha", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [
    { FieldDispatchService, InMemoryFieldDispatchRepository },
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
  const tenant = core.createTenant({ name: "Tenant Provisioner", modules: ["work_orders", "field_operations"] });
  const manager = core.createUser({ tenantId: tenant.id, name: "Mgr Prov", email: "prov-mgr@example.com", roles: ["manager"] });
  const tech = core.createUser({ tenantId: tenant.id, name: "Tec Prov", email: "prov-tec@example.com", roles: ["field_technician"] });

  const workOrderService = createMemoryWorkOrderService();
  const repository = new InMemoryFieldDispatchRepository();
  let provisionCalls = 0;
  const notifications: Array<Record<string, unknown>> = [];

  const dispatchService = new FieldDispatchService(
    repository,
    workOrderService,
    new MemoryCoreSaasAdapter(core),
    // snapshot resolver → não-null: satisfaz a condição de provisão (checklistId E snapshot).
    async () => ({ frozen: true }),
    // provisioner que ESTOURA: simula a falha de criação da run.
    async () => {
      provisionCalls += 1;
      throw new Error("checklist run provisioner boom");
    },
    // notifier (item 3b): captura as notificações emitidas ao operador na falha.
    async (input) => {
      notifications.push(input as unknown as Record<string, unknown>);
    },
  );

  try {
    const workOrder = await workOrderService.create(actor(tenant.id, manager.id), {
      title: "OS com checklist",
      checklistId: "11111111-1111-4111-8111-111111111111",
    });
    const dispatch = await dispatchService.create(actor(tenant.id, manager.id), {
      workOrderId: workOrder.id,
      operatorUserId: tech.id,
    });

    // FAIL-OPEN: apesar do provisioner estourar, o despacho é criado.
    assert.equal(dispatch.status, "assigned");
    assert.equal(provisionCalls, 1);

    // AUDITADO: a falha vira evento durável na timeline do despacho (nunca engolida em silêncio).
    const timeline = await dispatchService.timeline(actor(tenant.id, manager.id), dispatch.id);
    const eventTypes = timeline.map((event) => event.eventType);
    assert.equal(eventTypes.includes("field_dispatch_created"), true);
    assert.equal(eventTypes.includes("field_dispatch_checklist_run_failed"), true);
    const failure = timeline.find((event) => event.eventType === "field_dispatch_checklist_run_failed");
    // item 4 — reason CODIFICADO (taxonomia curta), NUNCA o error.message cru: um Error genérico → "unexpected".
    assert.equal(failure?.metadata.reason, "unexpected");
    // §2.8 — metadado de auditoria sem o message cru ("boom"), sem stack trace e sem tenant externo.
    assert.equal(JSON.stringify(failure?.metadata).includes("boom"), false);
    assert.equal(JSON.stringify(failure?.metadata).includes("    at "), false);
    assert.equal(JSON.stringify(failure?.metadata).includes(tenant.id), false);

    // item 3b — a falha NÃO fica invisível: uma notificação vai ao operador (ator do despacho).
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].recipientUserId, manager.id);
    assert.equal(notifications[0].dispatchId, dispatch.id);
    assert.equal(notifications[0].reasonCode, "unexpected");
  } finally {
    resetWorkOrderRuntimeForTests();
  }
});

// D-CHK-DISPATCH-CREATE (achado MÉDIA do crítico, item 3a) — o reassign também PROVISIONA a run
// idempotentemente: se a provisão do create falhou, reatribuir RECRIA a run (caminho real de recuperação).
test("field dispatch reassign REPROVISIONA a run e recupera quando a provisao inicial falhou", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [
    { FieldDispatchService, InMemoryFieldDispatchRepository },
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
  const tenant = core.createTenant({ name: "Tenant Reprovision", modules: ["work_orders", "field_operations"] });
  const manager = core.createUser({ tenantId: tenant.id, name: "Mgr Reprov", email: "reprov-mgr@example.com", roles: ["manager"] });
  const techA = core.createUser({ tenantId: tenant.id, name: "Tec A", email: "reprov-a@example.com", roles: ["field_technician"] });
  const techB = core.createUser({ tenantId: tenant.id, name: "Tec B", email: "reprov-b@example.com", roles: ["field_technician"] });

  const workOrderService = createMemoryWorkOrderService();
  const repository = new InMemoryFieldDispatchRepository();
  const provisionedChecklistIds: string[] = [];
  let provisionCalls = 0;
  const notifications: Array<Record<string, unknown>> = [];

  const dispatchService = new FieldDispatchService(
    repository,
    workOrderService,
    new MemoryCoreSaasAdapter(core),
    async () => ({ frozen: true }),
    // provisioner: FALHA na 1ª chamada (create) e SUCEDE na 2ª (reassign) → auto-recuperação.
    async ({ checklistId }: { checklistId: string }) => {
      provisionCalls += 1;
      if (provisionCalls === 1) {
        throw new Error("first provision boom");
      }
      provisionedChecklistIds.push(checklistId);
    },
    async (input) => {
      notifications.push(input as unknown as Record<string, unknown>);
    },
  );

  try {
    const workOrder = await workOrderService.create(actor(tenant.id, manager.id), {
      title: "OS com checklist",
      checklistId: "22222222-2222-4222-8222-222222222222",
    });

    // create: a provisão (chamada 1) FALHA → fail-open (201) + 1 notificação.
    const dispatch = await dispatchService.create(actor(tenant.id, manager.id), {
      workOrderId: workOrder.id,
      operatorUserId: techA.id,
    });
    assert.equal(dispatch.status, "assigned");
    assert.equal(provisionCalls, 1);
    assert.equal(provisionedChecklistIds.length, 0);
    assert.equal(notifications.length, 1);

    // reassign: a provisão (chamada 2) SUCEDE → a run é recriada, sem nova falha/notificação.
    const reassigned = await dispatchService.reassign(actor(tenant.id, manager.id), dispatch.id, {
      operatorUserId: techB.id,
    });
    assert.equal(reassigned.status, "reassigned");
    assert.equal(provisionCalls, 2);
    assert.equal(provisionedChecklistIds.length, 1);
    assert.equal(provisionedChecklistIds[0], "22222222-2222-4222-8222-222222222222");
    // recuperado sem nova falha → nenhuma 2ª notificação.
    assert.equal(notifications.length, 1);

    // timeline registrou a falha do create, mas o reassign NÃO adicionou nova falha.
    const timeline = await dispatchService.timeline(actor(tenant.id, manager.id), dispatch.id);
    const failures = timeline.filter((event) => event.eventType === "field_dispatch_checklist_run_failed");
    assert.equal(failures.length, 1);
    assert.equal(timeline.some((event) => event.eventType === "field_dispatch_reassigned"), true);
  } finally {
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
