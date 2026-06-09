import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

test("work orders service cria, lista, atualiza, atribui, muda status e isola tenants", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const { createMemoryWorkOrderService, resetWorkOrderRuntimeForTests } = await import("../src/modules/work-orders/index.js");
  const service = createMemoryWorkOrderService();
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const managerA = actor(tenantA, randomUUID(), ["manager"], [
    "work_orders:read",
    "work_orders:create",
    "work_orders:update",
    "work_orders:assign",
    "work_orders:status",
  ]);
  const managerB = actor(tenantB, randomUUID(), ["manager"], ["work_orders:read"]);
  const operatorId = randomUUID();
  const operatorUserId = randomUUID();

  try {
    const first = await service.create(managerA, {
      title: "Atendimento de guincho",
      description: "Cliente solicitou remocao do veiculo.",
      customerName: "Cliente Exemplo",
      customerPhone: "+55 41 99999-9999",
      serviceAddress: "Rua Exemplo, 123",
      serviceCity: "Curitiba",
      serviceState: "PR",
      serviceZipCode: "80000-000",
      serviceLatitude: -25.4284,
      serviceLongitude: -49.2733,
      priority: "high",
      scheduledFor: "2026-06-09T15:00:00.000Z",
    });
    const second = await service.create(managerA, {
      title: "Atendimento tecnico",
    });

    assert.equal(first.code, "OS-000001");
    assert.equal(second.code, "OS-000002");
    assert.equal(first.status, "open");
    assert.equal(first.priority, "high");

    const listA = await service.list(managerA, { limit: "20", offset: "0" });
    const listB = await service.list(managerB, { limit: "20", offset: "0" });
    assert.equal(listA.total, 2);
    assert.equal(listB.total, 0);

    const updated = await service.update(managerA, first.id, {
      title: "Atendimento de guincho atualizado",
      priority: "urgent",
    });
    assert.equal(updated.title, "Atendimento de guincho atualizado");
    assert.equal(updated.priority, "urgent");

    const assigned = await service.assign(managerA, first.id, {
      operatorId,
      userId: operatorUserId,
      message: "Atribuido ao operador mais proximo.",
    });
    assert.equal(assigned.status, "assigned");
    assert.equal(assigned.assignedOperatorId, operatorId);
    assert.equal(assigned.assignedUserId, operatorUserId);

    await assert.rejects(
      () => service.changeStatus(managerA, first.id, { status: "completed" }),
      /Cannot transition work order from assigned to completed/,
    );

    const accepted = await service.changeStatus(managerA, first.id, { status: "accepted" });
    const onRoute = await service.changeStatus(managerA, first.id, { status: "on_route", message: "Operador iniciou deslocamento." });
    assert.equal(accepted.status, "accepted");
    assert.equal(onRoute.status, "on_route");

    const timeline = await service.timeline(managerA, first.id);
    assert.deepEqual(
      timeline.map((event) => event.eventType),
      ["work_order_created", "work_order_updated", "work_order_assigned", "work_order_status_changed", "work_order_status_changed"],
    );
  } finally {
    resetWorkOrderRuntimeForTests();
  }
});

test("work orders service valida payloads e filtros", async () => {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const { createMemoryWorkOrderService, resetWorkOrderRuntimeForTests } = await import("../src/modules/work-orders/index.js");
  const service = createMemoryWorkOrderService();
  const manager = actor(randomUUID(), randomUUID(), ["manager"], ["work_orders:create", "work_orders:read"]);

  try {
    await assert.rejects(() => service.create(manager, { title: "" }), /title is required/);
    await assert.rejects(() => service.create(manager, { title: "OS", priority: "critical" }), /priority is invalid/);
    await assert.rejects(() => service.create(manager, { title: "OS", serviceLatitude: -91 }), /serviceLatitude/);
    await assert.rejects(() => service.list(manager, { limit: "0" }), /limit must be between 1 and 100/);
  } finally {
    resetWorkOrderRuntimeForTests();
  }
});

function actor(
  tenantId: string,
  userId: string,
  roles: readonly string[],
  permissions: readonly string[],
) {
  return {
    tenantId,
    userId,
    roles,
    permissions,
  } as never;
}
