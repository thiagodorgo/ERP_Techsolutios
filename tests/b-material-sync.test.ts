import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import type { AuthenticatedActor } from "../src/modules/core-saas/types/core-saas.types.js";
import { InMemoryInventoryRepository } from "../src/modules/inventory/inventory.repository.js";
import { InventoryService } from "../src/modules/inventory/inventory.service.js";
import { syncMobileInventoryActions } from "../src/modules/mobile/mobile-inventory-sync.js";
import { InMemoryWorkOrderRepository } from "../src/modules/work-orders/work-order.repository.js";
import { WorkOrderService } from "../src/modules/work-orders/work-order.service.js";

const materialAction = (
  clientActionId: string,
  workOrderId: string,
  patch: Record<string, unknown> = {},
) => ({
  client_action_id: clientActionId,
  type: "work_order_material.add",
  local_created_at: "2026-11-12T12:00:00.000Z",
  payload: {
    work_order_id: workOrderId,
    work_order_local_id: "wo-local-1",
    material_local_id: "material-local-1",
    sku: "ELE-0102",
    quantity: 2,
    tenant_id: randomUUID(),
    ...patch,
  },
});

const actor = (
  tenantId: string,
  role: AuthenticatedActor["roles"][number],
  permissions: AuthenticatedActor["permissions"],
  userId = randomUUID(),
): AuthenticatedActor => ({ tenantId, userId, roles: [role], permissions, explicitPermissions: true });

async function setup() {
  const tenantId = randomUUID();
  const tenantB = randomUUID();
  const manager = actor(tenantId, "manager", ["work_orders:update"]);
  const tecA = actor(tenantId, "field_technician", ["work_orders:update"]);
  const tecB = actor(tenantId, "field_technician", ["work_orders:update"]);
  const technician = actor(tenantId, "technician", ["work_orders:update"]);
  const inventoryActor = actor(tenantId, "inventory", ["inventory.read", "inventory.manage", "inventory.consume"]);
  const auditor = actor(tenantId, "auditor", ["inventory.read"]);
  const inventoryRepository = new InMemoryInventoryRepository();
  const inventory = new InventoryService(inventoryRepository);
  const item = await inventory.createItem(inventoryActor, { sku: "ELE-0102", name: "Disjuntor", unit: "un" });
  await inventory.createMovement(inventoryActor, {
    item_id: item.id,
    type: "entrada",
    quantidade: 30,
    unit_cost: 10,
  });

  const workOrderRepository = new InMemoryWorkOrderRepository();
  const workOrders = new WorkOrderService(workOrderRepository);
  const createAssignedWorkOrder = async (assigned: AuthenticatedActor, tenant = tenantId) => {
    const created = await workOrderRepository.create({
      tenantId: tenant,
      code: `OS-${randomUUID()}`,
      title: "OS de material",
      priority: "medium",
      createdBy: manager.userId,
      updatedBy: manager.userId,
    });
    await workOrderRepository.assign({
      tenantId: tenant,
      workOrderId: created.id,
      operatorId: assigned.userId,
      userId: assigned.userId,
      message: "Atribuição de teste",
      assignedBy: manager.userId,
      event: {
        fromStatus: created.status,
        actorUserId: manager.userId,
        message: "Atribuição de teste",
        metadata: {},
      },
    });
    return created.id;
  };
  const workOrderId = await createAssignedWorkOrder(tecA);
  const deps = { inventory, workOrders };
  const run = (who: AuthenticatedActor, actions: readonly Record<string, unknown>[]) =>
    syncMobileInventoryActions(who, { client_batch_id: randomUUID(), actions }, deps);
  const movementCount = async () => (await inventory.listMovements(inventoryActor, { limit: 100, offset: 0 })).items
    .filter((movement) => movement.sourceType === "work_order_material").length;

  return {
    tenantB,
    manager,
    tecA,
    tecB,
    technician,
    inventoryActor,
    auditor,
    inventory,
    workOrderRepository,
    createAssignedWorkOrder,
    workOrderId,
    run,
    movementCount,
  };
}

test("[RC2(1)] técnico da OS aplica material uma vez e tenant_id do payload é ignorado", async () => {
  const ctx = await setup();
  const id = randomUUID();
  const response = await ctx.run(ctx.tecA, [materialAction(id, ctx.workOrderId)]);

  assert.equal(response.accepted.length, 1);
  assert.ok(response.accepted[0]?.result_ref);
  assert.equal(response.accepted[0]?.server_state?.work_order_id, ctx.workOrderId);
  assert.equal(response.accepted[0]?.work_order_local_id, "wo-local-1");
  assert.equal(response.accepted[0]?.material_local_id, "material-local-1");
  assert.equal(await ctx.movementCount(), 1);
});

test("[RC2(2)] reenvio idêntico pelo mesmo ator é already_applied", async () => {
  const ctx = await setup();
  const action = materialAction(randomUUID(), ctx.workOrderId);
  const first = await ctx.run(ctx.tecA, [action]);
  const replay = await ctx.run(ctx.tecA, [action]);

  assert.equal(replay.already_applied[0]?.result_ref, first.accepted[0]?.result_ref);
  assert.equal(await ctx.movementCount(), 1);
});

test("[RC2(3)] mesmo id com quantidade diferente conflita sem segunda baixa", async () => {
  const ctx = await setup();
  const id = randomUUID();
  await ctx.run(ctx.tecA, [materialAction(id, ctx.workOrderId)]);
  const replay = await ctx.run(ctx.tecA, [materialAction(id, ctx.workOrderId, { quantity: 3 })]);

  assert.equal(replay.conflicts[0]?.conflict?.conflict_type, "idempotency_payload_mismatch");
  assert.equal(await ctx.movementCount(), 1);
});

test("[RC2(4)] outro ator não assume a origem depois de receber a OS", async () => {
  const ctx = await setup();
  const id = randomUUID();
  await ctx.run(ctx.tecA, [materialAction(id, ctx.workOrderId)]);
  await ctx.workOrderRepository.assign({
    tenantId: ctx.tecA.tenantId,
    workOrderId: ctx.workOrderId,
    operatorId: ctx.tecB.userId,
    userId: ctx.tecB.userId,
    message: "Reatribuição",
    assignedBy: ctx.manager.userId,
    event: {
      fromStatus: "assigned",
      actorUserId: ctx.manager.userId,
      message: "Reatribuição",
      metadata: {},
    },
  });
  const replay = await ctx.run(ctx.tecB, [materialAction(id, ctx.workOrderId)]);

  assert.equal(replay.conflicts[0]?.conflict?.conflict_type, "action_owned_by_other_actor");
  assert.equal(await ctx.movementCount(), 1);
});

test("[RC2(5)] SKU inexistente é rejeitado", async () => {
  const ctx = await setup();
  const response = await ctx.run(ctx.tecA, [materialAction(randomUUID(), ctx.workOrderId, { sku: "NAO-EXISTE" })]);
  assert.equal(response.rejected[0]?.error?.reason, "inventory_item_not_found");
  assert.equal(await ctx.movementCount(), 0);
});

test("[RC2(6)] work_order_id ausente é rejeitado com razão específica", async () => {
  const ctx = await setup();
  const response = await ctx.run(ctx.tecA, [materialAction(randomUUID(), ctx.workOrderId, { work_order_id: undefined })]);
  assert.equal(response.rejected[0]?.error?.reason, "work_order_id_required");
  assert.equal(await ctx.movementCount(), 0);
});

test("[RC2(7)] auditor sem permissão recebe 403 no lote", async () => {
  const ctx = await setup();
  await assert.rejects(
    ctx.run(ctx.auditor, [materialAction(randomUUID(), ctx.workOrderId)]),
    (error: unknown) => typeof error === "object" && error !== null && "statusCode" in error && error.statusCode === 403,
  );
});

test("[RC2(8)] técnico não ganha inventory.consume por alcançar material", async () => {
  const ctx = await setup();
  const response = await ctx.run(ctx.tecA, [{
    client_action_id: randomUUID(),
    type: "inventory.consume",
    local_created_at: "2026-11-12T12:00:00.000Z",
    payload: { item_id: "inv-item-tow-cable", quantity: 1 },
  }]);
  assert.equal(response.rejected[0]?.error?.reason, "permission_required");
});

test("[RC2(9)] ator de estoque preserva inventory.consume", async () => {
  const ctx = await setup();
  const response = await ctx.run(ctx.inventoryActor, [{
    client_action_id: randomUUID(),
    type: "inventory.consume",
    local_created_at: "2026-11-12T12:00:00.000Z",
    payload: { item_id: "inv-item-tow-cable", quantity: 1 },
  }]);
  assert.equal(response.accepted.length, 1);
});

test("[RC2(10)] técnico nunca atribuído à OS é recusado sem movimento", async () => {
  const ctx = await setup();
  const response = await ctx.run(ctx.tecB, [materialAction(randomUUID(), ctx.workOrderId)]);
  assert.equal(response.rejected[0]?.error?.reason, "not_assigned_to_actor");
  assert.equal(await ctx.movementCount(), 0);
});

test("[RC2(11)] ex-técnico recebe conflito para revisão sem movimento", async () => {
  const ctx = await setup();
  await ctx.workOrderRepository.assign({
    tenantId: ctx.tecA.tenantId,
    workOrderId: ctx.workOrderId,
    operatorId: ctx.tecB.userId,
    userId: ctx.tecB.userId,
    message: "Reatribuição",
    assignedBy: ctx.manager.userId,
    event: {
      fromStatus: "assigned",
      actorUserId: ctx.manager.userId,
      message: "Reatribuição",
      metadata: {},
    },
  });
  const response = await ctx.run(ctx.tecA, [materialAction(randomUUID(), ctx.workOrderId)]);
  assert.equal(response.conflicts[0]?.conflict?.conflict_type, "assignment_changed_pending_review");
  assert.equal(response.conflicts[0]?.conflict?.next_action, "await_supervisor_review");
  assert.equal(await ctx.movementCount(), 0);
});

test("[RC2(12)] gestor tenant-wide aplica material na mesma OS", async () => {
  const ctx = await setup();
  const response = await ctx.run(ctx.manager, [materialAction(randomUUID(), ctx.workOrderId)]);
  assert.equal(response.accepted.length, 1);
});

test("[RC2(16)] papel technician atribuído aplica material", async () => {
  const ctx = await setup();
  const workOrderId = await ctx.createAssignedWorkOrder(ctx.technician);
  const response = await ctx.run(ctx.technician, [materialAction(randomUUID(), workOrderId)]);
  assert.equal(response.accepted.length, 1);
});

test("[RC2(17t)] OS de outra organização é not_found e não baixa", async () => {
  const ctx = await setup();
  const actorB = actor(ctx.tenantB, "field_technician", ["work_orders:update"]);
  const workOrderB = await ctx.createAssignedWorkOrder(actorB, ctx.tenantB);
  const response = await ctx.run(ctx.tecA, [materialAction(randomUUID(), workOrderB)]);
  assert.equal(response.rejected[0]?.error?.reason, "not_found");
  assert.equal(await ctx.movementCount(), 0);
});
