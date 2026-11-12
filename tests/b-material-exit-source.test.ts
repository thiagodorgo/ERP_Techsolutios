import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { InMemoryInventoryRepository } from "../src/modules/inventory/inventory.repository.js";
import { InventoryService } from "../src/modules/inventory/inventory.service.js";
import type { InventoryActorContext } from "../src/modules/inventory/inventory.types.js";

const actor = (tenantId = randomUUID()): InventoryActorContext => ({
  tenantId,
  userId: randomUUID(),
  roles: ["inventory"],
  permissions: ["inventory.read", "inventory.manage", "inventory.consume"],
});

async function seeded() {
  const repository = new InMemoryInventoryRepository();
  const service = new InventoryService(repository);
  const inventoryActor = actor();
  const item = await service.createItem(inventoryActor, {
    sku: "ELE-0102",
    name: "Disjuntor",
    unit: "un",
  });
  await service.createMovement(inventoryActor, {
    item_id: item.id,
    type: "entrada",
    quantidade: 5,
    unit_cost: 10,
  });
  return { repository, service, inventoryActor, item };
}

test("[RC1(1)] work_order_material grava saída, origem, OS, motivo e custódia base", async () => {
  const { service, inventoryActor, item } = await seeded();
  const sourceId = randomUUID();
  const workOrderId = randomUUID();

  const movement = await service.createExitForSource(inventoryActor, {
    sourceType: "work_order_material",
    sourceId,
    itemId: item.id,
    quantity: 2,
    workOrderId,
  });

  assert.equal(movement.type, "saida");
  assert.equal(movement.quantidadeSinalizada, -2);
  assert.equal(movement.sourceType, "work_order_material");
  assert.equal(movement.sourceId, sourceId);
  assert.equal(movement.workOrderId, workOrderId);
  assert.equal(movement.reason, "baixa_material_os");
  assert.equal(movement.custodyType, "base");
});

test("[RC1(2)] a mesma origem devolve o mesmo movimento e mantém uma única saída", async () => {
  const { service, inventoryActor, item } = await seeded();
  const sourceId = randomUUID();
  const workOrderId = randomUUID();
  const input = { sourceType: "work_order_material" as const, sourceId, itemId: item.id, quantity: 2, workOrderId };

  const first = await service.createExitForSource(inventoryActor, input);
  const second = await service.createExitForSource(inventoryActor, input);
  const movements = await service.listMovements(inventoryActor, { limit: 100, offset: 0 });

  assert.equal(second.id, first.id);
  assert.equal(movements.items.filter((movement) => movement.sourceId === sourceId).length, 1);
});

test("[RC1(3)] saldo insuficiente não grava saída da origem", async () => {
  const { service, inventoryActor, item } = await seeded();
  const sourceId = randomUUID();

  await assert.rejects(
    service.createExitForSource(inventoryActor, {
      sourceType: "work_order_material",
      sourceId,
      itemId: item.id,
      quantity: 6,
      workOrderId: randomUUID(),
    }),
    (error: unknown) => error instanceof Error && "reason" in error && error.reason === "insufficient_balance",
  );
  assert.equal(await service.findExitBySource(inventoryActor, "work_order_material", sourceId), undefined);
});

test("[RC1(4)] findItemBySku é exato e isolado por organização", async () => {
  const { service, inventoryActor, item } = await seeded();
  const otherTenantActor = actor();

  assert.equal((await service.findItemBySku(inventoryActor, "ELE-0102"))?.id, item.id);
  assert.equal(await service.findItemBySku(inventoryActor, "ELE-010"), undefined);
  assert.equal(await service.findItemBySku(otherTenantActor, "ELE-0102"), undefined);
});

test("[RC1(5)] remover estorna uma vez e a origem deixa de estar ativa", async () => {
  const { service, inventoryActor, item } = await seeded();
  const sourceId = randomUUID();
  const exit = await service.createExitForSource(inventoryActor, {
    sourceType: "work_order_material",
    sourceId,
    itemId: item.id,
    quantity: 2,
    workOrderId: randomUUID(),
  });

  const reversal = await service.removeExitForSource(inventoryActor, "work_order_material", sourceId);
  assert.equal(reversal?.reversesMovementId, exit.id);
  assert.equal(reversal?.quantidadeSinalizada, 2);
  assert.equal(await service.removeExitForSource(inventoryActor, "work_order_material", sourceId), undefined);
  assert.equal(await service.findExitBySource(inventoryActor, "work_order_material", sourceId), undefined);
});

test("[RC1(6)] origens anteriores preservam os motivos existentes", async () => {
  const { service, inventoryActor, item } = await seeded();
  const fuel = await service.createItem(inventoryActor, {
    sku: "COM-0001",
    name: "Combustível",
    unit: "l",
    is_fuel: true,
  });
  await service.createMovement(inventoryActor, { item_id: fuel.id, type: "entrada", quantidade: 5, unit_cost: 1 });

  const fuelExit = await service.createExitForSource(inventoryActor, {
    sourceType: "fuel_log",
    sourceId: randomUUID(),
    itemId: fuel.id,
    quantity: 1,
  });
  const maintenanceExit = await service.createExitForSource(inventoryActor, {
    sourceType: "maintenance_item",
    sourceId: randomUUID(),
    itemId: item.id,
    quantity: 1,
  });

  assert.equal(fuelExit.reason, "baixa_abastecimento_interno");
  assert.equal(maintenanceExit.reason, "baixa_manutencao");
});
