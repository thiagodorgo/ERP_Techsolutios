import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import type { AuthenticatedActor } from "../src/modules/core-saas/types/core-saas.types.js";
import { InMemoryInventoryRepository } from "../src/modules/inventory/inventory.repository.js";
import { InventoryService } from "../src/modules/inventory/inventory.service.js";
import { syncMobileInventoryActions } from "../src/modules/mobile/mobile-inventory-sync.js";
import { InMemoryWorkOrderRepository } from "../src/modules/work-orders/work-order.repository.js";
import { WorkOrderService } from "../src/modules/work-orders/work-order.service.js";

const actor = (
  tenantId: string,
  role: AuthenticatedActor["roles"][number],
  permissions: AuthenticatedActor["permissions"],
): AuthenticatedActor => ({
  tenantId,
  userId: randomUUID(),
  roles: [role],
  permissions,
  explicitPermissions: true,
});

async function setup() {
  const tenantId = randomUUID();
  const manager = actor(tenantId, "manager", ["work_orders:update"]);
  const tecA = actor(tenantId, "field_technician", ["work_orders:update"]);
  const noProfile = actor(tenantId, "field_technician", ["work_orders:update"]);
  const inventoryActor = actor(tenantId, "inventory", ["inventory.read", "inventory.manage", "inventory.consume"]);
  const profileA = { id: randomUUID(), isActive: true, label: "Técnico A" };
  const inventoryRepository = new InMemoryInventoryRepository();
  const inventory = new InventoryService(inventoryRepository, {
    resolveActorOperatorProfile: async (candidate) => candidate.userId === tecA.userId ? profileA : undefined,
  });
  const x = await inventory.createItem(inventoryActor, { sku: "X-0001", name: "Peça X", unit: "un" });
  const y = await inventory.createItem(inventoryActor, { sku: "Y-0001", name: "Peça Y", unit: "un" });
  const z = await inventory.createItem(inventoryActor, { sku: "Z-0001", name: "Peça Z", unit: "un" });
  await inventory.createMovement(inventoryActor, { item_id: x.id, type: "entrada", quantidade: 5, unit_cost: 1 });
  await inventory.createMovement(inventoryActor, { item_id: y.id, type: "entrada", quantidade: 10, unit_cost: 1 });
  await inventory.createMovement(inventoryActor, { item_id: z.id, type: "entrada", quantidade: 10, unit_cost: 1 });
  await inventoryRepository.createTransfer({
    tenantId,
    itemId: x.id,
    type: "link",
    quantity: 5,
    custody: { custodyType: "professional", custodyOperatorProfileId: profileA.id },
    createdBy: inventoryActor.userId,
  });

  const workOrderRepository = new InMemoryWorkOrderRepository();
  const workOrders = new WorkOrderService(workOrderRepository);
  const createAssignedWorkOrder = async (assigned: AuthenticatedActor) => {
    const created = await workOrderRepository.create({
      tenantId,
      code: `OS-${randomUUID()}`,
      title: "OS custódia",
      priority: "medium",
      createdBy: manager.userId,
      updatedBy: manager.userId,
    });
    await workOrderRepository.assign({
      tenantId,
      workOrderId: created.id,
      operatorId: assigned.userId,
      userId: assigned.userId,
      message: "Atribuição",
      assignedBy: manager.userId,
      event: {
        fromStatus: created.status,
        actorUserId: manager.userId,
        message: "Atribuição",
        metadata: {},
      },
    });
    return created.id;
  };
  const workOrderTecA = await createAssignedWorkOrder(tecA);
  const workOrderNoProfile = await createAssignedWorkOrder(noProfile);
  const run = (who: AuthenticatedActor, workOrderId: string, sku: string, quantity: number) =>
    syncMobileInventoryActions(who, {
      actions: [{
        client_action_id: randomUUID(),
        type: "work_order_material.add",
        local_created_at: "2026-11-12T12:00:00.000Z",
        payload: { work_order_id: workOrderId, sku, quantity },
      }],
    }, {
      inventory,
      workOrders,
      workOrdersModuleEnabled: async () => true,
    });
  const balance = async (
    itemId: string,
    custody: { custodyType: "base" } | { custodyType: "professional"; custodyOperatorProfileId: string },
  ) => (await inventoryRepository.listCustodyBalances(tenantId, custody))
    .find((entry) => entry.item?.id === itemId)?.available ?? 0;
  const materialMovements = async () => (await inventory.listMovements(inventoryActor, { limit: 100, offset: 0 })).items
    .filter((movement) => movement.sourceType === "work_order_material");

  return {
    manager,
    tecA,
    noProfile,
    profileA,
    x,
    y,
    z,
    workOrderTecA,
    workOrderNoProfile,
    createAssignedWorkOrder,
    run,
    balance,
    materialMovements,
  };
}

test("[RC8(1)] técnico baixa da própria custódia profissional", async () => {
  const ctx = await setup();
  const response = await ctx.run(ctx.tecA, ctx.workOrderTecA, ctx.x.sku, 2);
  const [movement] = await ctx.materialMovements();

  assert.equal(response.accepted.length, 1);
  assert.equal(movement?.custodyType, "professional");
  assert.equal(movement?.custodyOperatorProfileId, ctx.profileA.id);
  assert.equal(await ctx.balance(ctx.x.id, {
    custodyType: "professional",
    custodyOperatorProfileId: ctx.profileA.id,
  }), 3);
  assert.equal(await ctx.balance(ctx.x.id, { custodyType: "base" }), 0);
});

test("[RC8(2)] saldo apenas na BASE não cobre baixa da custódia profissional", async () => {
  const ctx = await setup();
  const response = await ctx.run(ctx.tecA, ctx.workOrderTecA, ctx.y.sku, 1);

  assert.equal(response.conflicts[0]?.conflict?.conflict_type, "insufficient_balance");
  assert.equal(await ctx.balance(ctx.y.id, { custodyType: "base" }), 10);
  assert.equal(await ctx.balance(ctx.y.id, {
    custodyType: "professional",
    custodyOperatorProfileId: ctx.profileA.id,
  }), 0);
  assert.equal((await ctx.materialMovements()).length, 0);
});

test("[RC8(4)] técnico de campo sem cadastro é recusado sem baixa", async () => {
  const ctx = await setup();
  const response = await ctx.run(ctx.noProfile, ctx.workOrderNoProfile, ctx.x.sku, 1);

  assert.equal(response.rejected[0]?.error?.reason, "operator_profile_required");
  assert.equal((await ctx.materialMovements()).length, 0);
});

test("[RC8(5)] gerente sem cadastro baixa da BASE", async () => {
  const ctx = await setup();
  const workOrderId = await ctx.createAssignedWorkOrder(ctx.tecA);
  const response = await ctx.run(ctx.manager, workOrderId, ctx.z.sku, 2);
  const [movement] = await ctx.materialMovements();

  assert.equal(response.accepted.length, 1);
  assert.equal(movement?.custodyType, "base");
  assert.equal(await ctx.balance(ctx.z.id, { custodyType: "base" }), 8);
});
