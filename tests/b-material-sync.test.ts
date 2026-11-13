import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after, before } from "node:test";

import type { AuthenticatedActor } from "../src/modules/core-saas/types/core-saas.types.js";
import { InMemoryInventoryRepository } from "../src/modules/inventory/inventory.repository.js";
import { InventoryService } from "../src/modules/inventory/inventory.service.js";
import { syncMobileInventoryActions } from "../src/modules/mobile/mobile-inventory-sync.js";
import { InMemoryWorkOrderRepository } from "../src/modules/work-orders/work-order.repository.js";
import { WorkOrderService } from "../src/modules/work-orders/work-order.service.js";
import { abrirArnesDoGate, type ArnesDoGate } from "./helpers/san3-18-gate.js";

let gate: ArnesDoGate;

before(async () => {
  gate = await abrirArnesDoGate();
});

after(async () => {
  await gate.fechar();
});

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

const materialRemoveAction = (
  clientActionId: string,
  sourceClientActionId: string,
  workOrderId: string,
) => ({
  client_action_id: clientActionId,
  type: "work_order_material.remove",
  local_created_at: "2026-11-12T12:00:00.000Z",
  payload: {
    source_client_action_id: sourceClientActionId,
    work_order_id: workOrderId,
    work_order_local_id: "wo-local-1",
    material_local_id: "material-local-1",
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
  const profiles = new Map([
    [tecA.userId, { id: randomUUID(), isActive: true, label: "Técnico A" }],
    [tecB.userId, { id: randomUUID(), isActive: true, label: "Técnico B" }],
    [technician.userId, { id: randomUUID(), isActive: true, label: "Technician" }],
  ]);
  const inventory = new InventoryService(inventoryRepository, {
    resolveActorOperatorProfile: async (candidate) => profiles.get(candidate.userId),
  });
  const item = await inventory.createItem(inventoryActor, { sku: "ELE-0102", name: "Disjuntor", unit: "un" });
  await inventory.createMovement(inventoryActor, {
    item_id: item.id,
    type: "entrada",
    quantidade: 30,
    unit_cost: 10,
  });
  for (const profile of profiles.values()) {
    await inventoryRepository.createTransfer({
      tenantId,
      itemId: item.id,
      type: "link",
      quantity: 5,
      custody: { custodyType: "professional", custodyOperatorProfileId: profile.id },
      createdBy: inventoryActor.userId,
    });
  }

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
  const deps = { inventory, workOrders, workOrdersModuleEnabled: async () => true };
  const run = (who: AuthenticatedActor, actions: readonly Record<string, unknown>[]) =>
    syncMobileInventoryActions(who, { client_batch_id: randomUUID(), actions }, deps);
  const movementCount = async () => (await inventory.listMovements(inventoryActor, { limit: 100, offset: 0 })).items
    .filter((movement) => movement.sourceType === "work_order_material").length;
  const snapshotLedger = async () => {
    const movements = await inventory.listMovements(inventoryActor, { limit: 100, offset: 0 });
    const base = await inventoryRepository.listCustodyBalances(tenantId, { custodyType: "base" });
    const professional = await Promise.all([...profiles.values()].map(async (profile) => ({
      profileId: profile.id,
      balances: (await inventoryRepository.listCustodyBalances(tenantId, {
        custodyType: "professional",
        custodyOperatorProfileId: profile.id,
      })).map((entry) => [entry.item?.id, entry.available]),
    })));
    return {
      movementIds: movements.items.map((movement) => movement.id).sort(),
      base: base.map((entry) => [entry.item?.id, entry.available]),
      professional,
    };
  };
  const assertLedgerUnchanged = async (sourceId: string, before: Awaited<ReturnType<typeof snapshotLedger>>) => {
    assert.deepEqual(await snapshotLedger(), before);
    assert.equal(await inventory.findExitBySource(inventoryActor, "work_order_material", sourceId), undefined);
  };

  return {
    tenantB,
    manager,
    tecA,
    tecB,
    technician,
    inventoryActor,
    auditor,
    inventory,
    workOrders,
    workOrderRepository,
    createAssignedWorkOrder,
    workOrderId,
    run,
    movementCount,
    snapshotLedger,
    assertLedgerUnchanged,
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
  const id = randomUUID();
  const before = await ctx.snapshotLedger();
  const response = await ctx.run(ctx.tecA, [materialAction(id, ctx.workOrderId, { sku: "NAO-EXISTE" })]);
  assert.equal(response.rejected[0]?.error?.reason, "inventory_item_not_found");
  await ctx.assertLedgerUnchanged(id, before);
});

test("[RC2(6)] work_order_id ausente é rejeitado com razão específica", async () => {
  const ctx = await setup();
  const id = randomUUID();
  const before = await ctx.snapshotLedger();
  const response = await ctx.run(ctx.tecA, [materialAction(id, ctx.workOrderId, { work_order_id: undefined })]);
  assert.equal(response.rejected[0]?.error?.reason, "work_order_id_required");
  await ctx.assertLedgerUnchanged(id, before);
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
  const id = randomUUID();
  const before = await ctx.snapshotLedger();
  const response = await ctx.run(ctx.tecB, [materialAction(id, ctx.workOrderId)]);
  assert.equal(response.rejected[0]?.error?.reason, "not_assigned_to_actor");
  await ctx.assertLedgerUnchanged(id, before);
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
  const id = randomUUID();
  const before = await ctx.snapshotLedger();
  const response = await ctx.run(ctx.tecA, [materialAction(id, ctx.workOrderId)]);
  assert.equal(response.conflicts[0]?.conflict?.conflict_type, "assignment_changed_pending_review");
  assert.equal(response.conflicts[0]?.conflict?.next_action, "await_supervisor_review");
  await ctx.assertLedgerUnchanged(id, before);
});

test("[RC2(12)] gestor tenant-wide aplica material na mesma OS", async () => {
  const ctx = await setup();
  const response = await ctx.run(ctx.manager, [materialAction(randomUUID(), ctx.workOrderId)]);
  assert.equal(response.accepted.length, 1);
});

test("[RC2(13)] autor remove material e estorna a baixa por origem", async () => {
  const ctx = await setup();
  const sourceId = randomUUID();
  const add = await ctx.run(ctx.tecA, [materialAction(sourceId, ctx.workOrderId)]);
  const beforeRemove = await ctx.snapshotLedger();
  const response = await ctx.run(ctx.tecA, [materialRemoveAction(randomUUID(), sourceId, ctx.workOrderId)]);
  const afterRemove = await ctx.snapshotLedger();

  assert.equal(add.accepted.length, 1);
  assert.equal(response.accepted.length, 1);
  assert.ok(response.accepted[0]?.result_ref);
  assert.equal(await ctx.inventory.findExitBySource(ctx.inventoryActor, "work_order_material", sourceId), undefined);
  assert.equal(afterRemove.movementIds.length, beforeRemove.movementIds.length + 1);
  assert.ok(afterRemove.movementIds.includes(response.accepted[0]?.result_ref ?? ""));
});

test("[RC2(14)] segundo remove da mesma origem é already_applied", async () => {
  const ctx = await setup();
  const sourceId = randomUUID();
  await ctx.run(ctx.tecA, [materialAction(sourceId, ctx.workOrderId)]);
  await ctx.run(ctx.tecA, [materialRemoveAction(randomUUID(), sourceId, ctx.workOrderId)]);
  const beforeReplay = await ctx.snapshotLedger();
  const replay = await ctx.run(ctx.tecA, [materialRemoveAction(randomUUID(), sourceId, ctx.workOrderId)]);

  assert.equal(replay.already_applied.length, 1);
  assert.deepEqual(await ctx.snapshotLedger(), beforeReplay);
});

test("[RC2(15)] remove falha no escopo da OS da baixa antes de conferir posse", async () => {
  const ctx = await setup();
  const sourceId = randomUUID();
  await ctx.run(ctx.tecA, [materialAction(sourceId, ctx.workOrderId)]);
  const workOrderTecB = await ctx.createAssignedWorkOrder(ctx.tecB);
  const before = await ctx.snapshotLedger();
  const activeBefore = await ctx.inventory.findExitBySource(ctx.inventoryActor, "work_order_material", sourceId);

  const response = await ctx.run(ctx.tecB, [materialRemoveAction(randomUUID(), sourceId, workOrderTecB)]);

  assert.equal(response.rejected[0]?.error?.reason, "not_assigned_to_actor");
  assert.deepEqual(await ctx.snapshotLedger(), before);
  assert.deepEqual(
    await ctx.inventory.findExitBySource(ctx.inventoryActor, "work_order_material", sourceId),
    activeBefore,
  );
});

test("[RC2(15b)] ator com escopo não estorna baixa criada por outro usuário", async () => {
  const ctx = await setup();
  const sourceId = randomUUID();
  await ctx.run(ctx.tecA, [materialAction(sourceId, ctx.workOrderId)]);
  const before = await ctx.snapshotLedger();
  const activeBefore = await ctx.inventory.findExitBySource(ctx.inventoryActor, "work_order_material", sourceId);

  const response = await ctx.run(ctx.manager, [materialRemoveAction(randomUUID(), sourceId, ctx.workOrderId)]);

  assert.equal(response.conflicts[0]?.conflict?.conflict_type, "action_owned_by_other_actor");
  assert.deepEqual(await ctx.snapshotLedger(), before);
  assert.deepEqual(
    await ctx.inventory.findExitBySource(ctx.inventoryActor, "work_order_material", sourceId),
    activeBefore,
  );
});

test("[RC2(18)] remove recusa work_order_id diferente da OS da baixa", async () => {
  const ctx = await setup();
  const sourceId = randomUUID();
  await ctx.run(ctx.tecA, [materialAction(sourceId, ctx.workOrderId)]);
  const otherWorkOrder = await ctx.createAssignedWorkOrder(ctx.tecA);
  const before = await ctx.snapshotLedger();

  const response = await ctx.run(ctx.tecA, [materialRemoveAction(randomUUID(), sourceId, otherWorkOrder)]);

  assert.equal(response.rejected[0]?.error?.reason, "work_order_mismatch");
  assert.deepEqual(await ctx.snapshotLedger(), before);
  assert.ok(await ctx.inventory.findExitBySource(ctx.inventoryActor, "work_order_material", sourceId));
});

test("[RC2(16)] papel technician atribuído aplica material", async () => {
  const ctx = await setup();
  const workOrderId = await ctx.createAssignedWorkOrder(ctx.technician);
  const response = await ctx.run(ctx.technician, [materialAction(randomUUID(), workOrderId)]);
  assert.equal(response.accepted.length, 1);
});

test("[RC2(17t-a)] técnico: OS de outro tenant não baixa e a mesma origem segue utilizável", async () => {
  const ctx = await setup();
  const actorB = actor(ctx.tenantB, "field_technician", ["work_orders:update"]);
  const workOrderB = await ctx.createAssignedWorkOrder(actorB, ctx.tenantB);
  const id = randomUUID();
  const before = await ctx.snapshotLedger();
  const response = await ctx.run(ctx.tecA, [materialAction(id, workOrderB)]);
  assert.equal(response.rejected[0]?.error?.reason, "not_found");
  await ctx.assertLedgerUnchanged(id, before);

  const legitimate = await ctx.run(ctx.tecA, [materialAction(id, ctx.workOrderId)]);
  assert.equal(legitimate.accepted.length, 1);
});

test("[RC2(17t-b)] gestor: OS de outro tenant não toca a BASE nem o razão", async () => {
  const ctx = await setup();
  const actorB = actor(ctx.tenantB, "field_technician", ["work_orders:update"]);
  const workOrderB = await ctx.createAssignedWorkOrder(actorB, ctx.tenantB);
  const id = randomUUID();
  const before = await ctx.snapshotLedger();
  const response = await ctx.run(ctx.manager, [materialAction(id, workOrderB)]);
  assert.equal(response.rejected[0]?.error?.reason, "not_found");
  await ctx.assertLedgerUnchanged(id, before);
});

async function jwtActor(modules: readonly string[], roles: readonly string[]) {
  const org = gate.criarOrganizacao(modules);
  const user = gate.criarUsuario(org.id, roles);
  const token = await gate.token({ tenantId: org.id, userId: user.id, email: user.email, roles });
  return { org, user, token };
}

const invalidButWellFormedMaterial = () => ({
  client_action_id: randomUUID(),
  type: "work_order_material.add",
  local_created_at: "2026-11-12T12:00:00.000Z",
  payload: { work_order_id: randomUUID(), sku: "ELE-0102", quantity: 1 },
});

test("[RC2(19)] JWT sem inventory é recusado pelo gate do lote", async () => {
  const tech = await jwtActor(["work_orders"], ["field_technician"]);
  const response = await gate.chamar("POST", "/api/v1/mobile/sync/inventory-actions", {
    token: tech.token,
    body: { actions: [invalidButWellFormedMaterial()] },
  });

  assert.equal(response.status, 403);
  assert.equal(response.reason, "module_not_enabled");
});

test("[RC2(20)] com inventory e sem work_orders só material é recusado por módulo", async () => {
  const tech = await jwtActor(["inventory"], ["field_technician"]);
  const material = await gate.chamar("POST", "/api/v1/mobile/sync/inventory-actions", {
    token: tech.token,
    body: { actions: [invalidButWellFormedMaterial()] },
  });
  assert.equal(material.status, 200, JSON.stringify(material.body));
  assert.equal(material.body.data.rejected[0]?.error?.reason, "module_not_enabled");

  const inventory = await jwtActor(["inventory"], ["inventory"]);
  const consume = await gate.chamar("POST", "/api/v1/mobile/sync/inventory-actions", {
    token: inventory.token,
    body: {
      actions: [{
        client_action_id: randomUUID(),
        type: "inventory.consume",
        local_created_at: "2026-11-12T12:00:00.000Z",
        payload: { item_id: "inv-item-tow-cable", quantity: 1 },
      }],
    },
  });
  assert.equal(consume.status, 200, JSON.stringify(consume.body));
  assert.equal(consume.body.data.accepted.length, 1);
});

test("[RC2(20-r)] sem work_orders o remove não estorna a baixa ativa", async () => {
  const ctx = await setup();
  const sourceId = randomUUID();
  await ctx.run(ctx.tecA, [materialAction(sourceId, ctx.workOrderId)]);
  const before = await ctx.snapshotLedger();
  const activeBefore = await ctx.inventory.findExitBySource(ctx.inventoryActor, "work_order_material", sourceId);

  const response = await syncMobileInventoryActions(ctx.tecA, {
    actions: [materialRemoveAction(randomUUID(), sourceId, ctx.workOrderId)],
  }, {
    inventory: ctx.inventory,
    workOrders: ctx.workOrders,
    workOrdersModuleEnabled: async () => false,
  });

  assert.equal(response.rejected[0]?.error?.reason, "module_not_enabled");
  assert.deepEqual(await ctx.snapshotLedger(), before);
  assert.deepEqual(
    await ctx.inventory.findExitBySource(ctx.inventoryActor, "work_order_material", sourceId),
    activeBefore,
  );
});

test("[RC2(21)] bootstrap exige inventory e permissão de sync", async () => {
  const withoutInventory = await jwtActor(["work_orders"], ["field_technician"]);
  const disabled = await gate.chamar("GET", "/api/v1/mobile/bootstrap", { token: withoutInventory.token });
  assert.equal(disabled.status, 200, JSON.stringify(disabled.body));
  assert.equal(disabled.body.data.feature_flags.inventory_sync.enabled, false);

  const withInventory = await jwtActor(["inventory", "work_orders"], ["field_technician"]);
  const enabled = await gate.chamar("GET", "/api/v1/mobile/bootstrap", { token: withInventory.token });
  assert.equal(enabled.status, 200, JSON.stringify(enabled.body));
  assert.equal(enabled.body.data.feature_flags.inventory_sync.enabled, true);
});
