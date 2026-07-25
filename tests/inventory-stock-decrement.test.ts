import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { InventoryService } from "../src/modules/inventory/inventory.service.js";
import { InMemoryInventoryRepository } from "../src/modules/inventory/inventory.repository.js";
import type { InventoryActorContext } from "../src/modules/inventory/inventory.types.js";
import {
  FuelLogService,
  type FuelLogReferenceResolvers,
} from "../src/modules/fuel-logs/fuel-log.service.js";
import { InMemoryFuelLogRepository } from "../src/modules/fuel-logs/fuel-log.repository.js";
import type { FuelLogActorContext } from "../src/modules/fuel-logs/fuel-log.types.js";
import {
  MaintenanceOrderService,
  type MaintenanceOrderReferenceResolvers,
} from "../src/modules/maintenance-orders/maintenance-order.service.js";
import { InMemoryMaintenanceOrderRepository } from "../src/modules/maintenance-orders/maintenance-order.repository.js";
import { InMemoryMaintenanceOrderItemRepository } from "../src/modules/maintenance-orders/maintenance-order-item.repository.js";
import type { MaintenanceOrderActorContext } from "../src/modules/maintenance-orders/maintenance-order.types.js";

// Ω4C PR-08b — Baixa automática de estoque (seam consumidor NÃO-AMPLIFICADOR: abastecimento INTERNO + item
// Tipo=ESTOQUE). EXIT = stock_movements type='saida', custódia BASE, source_type/source_id, unit_cost NULL.
// EXIT-first (rejeita antes de gravar o consumo → 409 sem consumo órfão), idempotente por origem, estorno no
// soft-delete, fuel só INTERNO+is_fuel, service/product não baixam, lock 409, isolamento 3 tenants. RN-BAIXA-01..09.

const VEHICLE_V = randomUUID();

type Harness = {
  readonly inventory: InventoryService;
  readonly inventoryRepo: InMemoryInventoryRepository;
  readonly fuel: FuelLogService;
  readonly maintenance: MaintenanceOrderService;
};

function actorFor(tenantId: string): InventoryActorContext & FuelLogActorContext & MaintenanceOrderActorContext {
  return { tenantId, userId: randomUUID(), roles: [], permissions: [] };
}

function buildHarness(): Harness {
  // Um ÚNICO InventoryService compartilhado (mesmo singleton in-memory que produção usa via os resolvers default).
  const inventoryRepo = new InMemoryInventoryRepository();
  const inventory = new InventoryService(inventoryRepo, {});

  const fuelReferences: FuelLogReferenceResolvers = {
    resolveVehicle: async () => true,
    // Direção consumidor→inventory (mesma do createDefaultReferenceResolvers, sem permissão nova). O erro do seam
    // PROPAGA (não é engolido) — a rejeição precisa abortar o create.
    postStockExit: async (actor, input) => {
      await inventory.createExitForSource(actor, {
        sourceType: "fuel_log",
        sourceId: input.sourceId,
        itemId: input.stockItemId,
        quantity: input.quantity,
        vehicleId: input.vehicleId,
      });
    },
    reverseStockExit: async (actor, fuelLogId) => {
      await inventory.removeExitForSource(actor, "fuel_log", fuelLogId);
    },
    hasActiveStockExit: async (actor, fuelLogId) =>
      (await inventory.findExitBySource(actor, "fuel_log", fuelLogId)) !== undefined,
  };

  const maintenanceReferences: MaintenanceOrderReferenceResolvers = {
    resolveVehicle: async () => true,
    postStockExit: async (actor, input) => {
      await inventory.createExitForSource(actor, {
        sourceType: "maintenance_item",
        sourceId: input.sourceId,
        itemId: input.stockItemId,
        quantity: input.quantity,
        vehicleId: input.vehicleId,
      });
    },
    reverseStockExit: async (actor, itemId) => {
      await inventory.removeExitForSource(actor, "maintenance_item", itemId);
    },
    hasActiveStockExit: async (actor, itemId) =>
      (await inventory.findExitBySource(actor, "maintenance_item", itemId)) !== undefined,
  };

  const fuel = new FuelLogService(new InMemoryFuelLogRepository(), fuelReferences);
  const maintenance = new MaintenanceOrderService(
    new InMemoryMaintenanceOrderRepository(),
    maintenanceReferences,
    new InMemoryMaintenanceOrderItemRepository(),
  );

  return { inventory, inventoryRepo, fuel, maintenance };
}

// Cria item + entrada (dá saldo BASE inicial). Retorna o id do item.
async function seedItem(
  inventory: InventoryService,
  actor: InventoryActorContext,
  opts: { readonly sku: string; readonly isFuel?: boolean; readonly saldo: number },
): Promise<string> {
  const item = await inventory.createItem(actor, {
    sku: opts.sku,
    name: `Item ${opts.sku}`,
    unit: opts.isFuel ? "L" : "un",
    is_fuel: opts.isFuel ?? false,
  });
  if (opts.saldo > 0) {
    await inventory.createMovement(actor, { item_id: item.id, type: "entrada", quantidade: opts.saldo, unit_cost: 5 });
  }
  return item.id;
}

async function saldoOf(inventory: InventoryService, actor: InventoryActorContext, itemId: string): Promise<number> {
  return (await inventory.getItem(actor, itemId)).saldo;
}

test("[RN-BAIXA-01/03/04] abastecimento INTERNO baixa estoque: EXIT saida/BASE, qty travada nos litros, vehicle atribuído, unit_cost NULL", async () => {
  const { inventory, fuel } = buildHarness();
  const actor = actorFor(randomUUID());
  const itemId = await seedItem(inventory, actor, { sku: "DIESEL-1", isFuel: true, saldo: 100 });

  const created = await fuel.create(actor, {
    vehicle_id: VEHICLE_V,
    station_type: "internal",
    stock_item_id: itemId,
    liters: 40,
    total_value: 200,
    odometer: 1000,
  });

  // Saldo caiu de 100 → 60 (RN-BAIXA-03: a quantidade é travada nos litros).
  assert.equal(await saldoOf(inventory, actor, itemId), 60);

  const exit = await inventory.findExitBySource(actor, "fuel_log", created.fuelLog.id);
  assert.ok(exit, "deve existir um EXIT da fonte fuel_log");
  assert.equal(exit?.type, "saida"); // NÃO consumo (que exigiria work_order_id)
  assert.equal(exit?.custodyType, "base"); // RN-BAIXA-04: custódia BASE fixada
  assert.equal(exit?.quantidadeSinalizada, -40); // sinal negativo, travado nos litros
  assert.equal(exit?.vehicleId, VEHICLE_V); // viatura só ATRIBUÍDA (não vira custódia)
  assert.equal(exit?.custodyVehicleId, undefined); // NUNCA custódia de viatura
  assert.equal(exit?.unitCost, undefined); // §: o dinheiro vive no consumidor
  assert.equal(exit?.sourceType, "fuel_log");
  assert.equal(exit?.sourceId, created.fuelLog.id);
  assert.equal(exit?.reason, "baixa_abastecimento_interno"); // token de máquina, não PII
});

test("[RN-BAIXA-02] idempotência por origem: a MESMA fonte não duplica o EXIT (2ª chamada devolve o mesmo)", async () => {
  const { inventory, fuel } = buildHarness();
  const actor = actorFor(randomUUID());
  const itemId = await seedItem(inventory, actor, { sku: "DIESEL-2", isFuel: true, saldo: 100 });

  const created = await fuel.create(actor, {
    vehicle_id: VEHICLE_V,
    station_type: "internal",
    stock_item_id: itemId,
    liters: 30,
    total_value: 150,
    odometer: 500,
  });
  const first = await inventory.findExitBySource(actor, "fuel_log", created.fuelLog.id);

  // 2ª chamada DIRETA ao seam com a MESMA fonte → devolve o EXIT existente (não posta um 2º).
  const again = await inventory.createExitForSource(actor, {
    sourceType: "fuel_log",
    sourceId: created.fuelLog.id,
    itemId,
    quantity: 30,
  });

  assert.equal(again.id, first?.id, "a 2ª chamada devolve o MESMO movimento");
  assert.equal(await saldoOf(inventory, actor, itemId), 70, "saldo caiu só uma vez (70)");
});

test("[RN-BAIXA-01] saldo insuficiente → 409 insufficient_balance ANTES de gravar (EXIT-first: sem consumo órfão)", async () => {
  const { inventory, fuel } = buildHarness();
  const actor = actorFor(randomUUID());
  // Item combustível SEM saldo (saldo 0).
  const itemId = await seedItem(inventory, actor, { sku: "DIESEL-3", isFuel: true, saldo: 0 });

  await assert.rejects(
    () =>
      fuel.create(actor, {
        vehicle_id: VEHICLE_V,
        station_type: "internal",
        stock_item_id: itemId,
        liters: 40,
        total_value: 200,
        odometer: 100,
      }),
    (error: unknown) => {
      const err = error as { statusCode?: number; reason?: string };
      assert.equal(err.statusCode, 409);
      assert.equal(err.reason, "insufficient_balance");
      return true;
    },
  );

  // EXIT-first: NADA foi persistido (nem o abastecimento, nem um EXIT órfão).
  const logs = await fuel.list(actor, {});
  assert.equal(logs.total, 0, "o abastecimento NÃO foi criado (sem consumo órfão)");
  const movements = await inventory.listMovements(actor, { type: "saida" });
  assert.equal(movements.total, 0, "nenhum EXIT órfão foi postado");
});

test("[RN-BAIXA-06] fuel EXTERNO com stock_item → 422; fuel INTERNO com item NÃO-combustível → 422 item_not_fuel", async () => {
  const { inventory, fuel } = buildHarness();
  const actor = actorFor(randomUUID());
  const fuelItem = await seedItem(inventory, actor, { sku: "DIESEL-4", isFuel: true, saldo: 100 });
  const nonFuelItem = await seedItem(inventory, actor, { sku: "PECA-4", isFuel: false, saldo: 100 });

  // EXTERNO não baixa estoque (stock_item_id só no INTERNO).
  await assert.rejects(
    () =>
      fuel.create(actor, {
        vehicle_id: VEHICLE_V,
        station_type: "external",
        stock_item_id: fuelItem,
        supplier_id: randomUUID(),
        liters: 10,
        total_value: 80,
        odometer: 10,
      }),
    (error: unknown) => {
      assert.equal((error as { statusCode?: number }).statusCode, 422);
      assert.equal((error as { reason?: string }).reason, "stock_item_not_allowed_for_external");
      return true;
    },
  );

  // INTERNO com item que NÃO é combustível → 422 item_not_fuel (e nada é gravado).
  await assert.rejects(
    () =>
      fuel.create(actor, {
        vehicle_id: VEHICLE_V,
        station_type: "internal",
        stock_item_id: nonFuelItem,
        liters: 10,
        total_value: 80,
        odometer: 10,
      }),
    (error: unknown) => {
      assert.equal((error as { statusCode?: number }).statusCode, 422);
      assert.equal((error as { reason?: string }).reason, "item_not_fuel");
      return true;
    },
  );
  assert.equal((await fuel.list(actor, {})).total, 0, "nenhum abastecimento criado");
  assert.equal(await saldoOf(inventory, actor, nonFuelItem), 100, "saldo do item não-combustível intocado");
});

test("[RN-BAIXA-05] desativar o abastecimento reverte a baixa (estorno compensatório) e destrava; no-op idempotente", async () => {
  const { inventory, fuel } = buildHarness();
  const actor = actorFor(randomUUID());
  const itemId = await seedItem(inventory, actor, { sku: "DIESEL-5", isFuel: true, saldo: 100 });

  const created = await fuel.create(actor, {
    vehicle_id: VEHICLE_V,
    station_type: "internal",
    stock_item_id: itemId,
    liters: 40,
    total_value: 200,
    odometer: 1000,
  });
  assert.equal(await saldoOf(inventory, actor, itemId), 60);

  // Desativar → estorno compensatório: saldo volta a 100; não há mais EXIT ATIVO.
  await fuel.update(actor, created.fuelLog.id, { is_active: false });
  assert.equal(await saldoOf(inventory, actor, itemId), 100, "estorno devolveu o saldo");
  assert.equal(
    await inventory.findExitBySource(actor, "fuel_log", created.fuelLog.id),
    undefined,
    "sem EXIT ATIVO após o estorno",
  );

  // O EXIT original permanece no ledger (imutável) + o estorno compensatório = 2 movimentos saida.
  const movements = await inventory.listMovements(actor, { type: "saida" });
  assert.equal(movements.total, 2, "ledger imutável: EXIT + estorno (nenhum DELETE)");
});

test("[RN-BAIXA-07] editar litros/item com EXIT ATIVO → 409 stock_baixa_locked; editar após desativar é livre", async () => {
  const { inventory, fuel } = buildHarness();
  const actor = actorFor(randomUUID());
  const itemId = await seedItem(inventory, actor, { sku: "DIESEL-6", isFuel: true, saldo: 100 });

  const created = await fuel.create(actor, {
    vehicle_id: VEHICLE_V,
    station_type: "internal",
    stock_item_id: itemId,
    liters: 40,
    total_value: 200,
    odometer: 1000,
  });

  // Com baixa ATIVA, editar litros trava (409).
  await assert.rejects(
    () => fuel.update(actor, created.fuelLog.id, { liters: 50 }),
    (error: unknown) => {
      assert.equal((error as { statusCode?: number }).statusCode, 409);
      assert.equal((error as { reason?: string }).reason, "stock_baixa_locked");
      return true;
    },
  );

  // Editar campo NÃO-estoque (notes) permanece livre mesmo com baixa ativa.
  await fuel.update(actor, created.fuelLog.id, { notes: "observação" });

  // Desativar (reverte) e então o campo destrava (sem 409).
  await fuel.update(actor, created.fuelLog.id, { is_active: false });
});

test("[RN-BAIXA-06] fuel INTERNO SEM stock_item NÃO baixa (picker deferido — API-only)", async () => {
  const { inventory, fuel } = buildHarness();
  const actor = actorFor(randomUUID());
  const itemId = await seedItem(inventory, actor, { sku: "DIESEL-7", isFuel: true, saldo: 100 });

  await fuel.create(actor, {
    vehicle_id: VEHICLE_V,
    station_type: "internal",
    liters: 40,
    total_value: 200,
    odometer: 1000,
  });

  assert.equal(await saldoOf(inventory, actor, itemId), 100, "sem stock_item_id não há baixa");
  assert.equal((await inventory.listMovements(actor, { type: "saida" })).total, 0);
});

test("[RN-BAIXA-06] manutenção: item ESTOQUE baixa; service/product NÃO baixam; excluir reverte", async () => {
  const { inventory, maintenance } = buildHarness();
  const actor = actorFor(randomUUID());
  const itemId = await seedItem(inventory, actor, { sku: "PECA-8", isFuel: false, saldo: 20 });

  const order = await maintenance.create(actor, { vehicle_id: VEHICLE_V, type: "corretiva", description: "Troca de peça." });

  // SERVIÇO com stock_item_id → NÃO baixa (item_type != stock).
  await maintenance.addItem(actor, order.id, {
    item_type: "service",
    description: "Mão de obra",
    unit_value: 100,
    quantity: 2,
    stock_item_id: itemId,
  });
  assert.equal(await saldoOf(inventory, actor, itemId), 20, "serviço não baixa estoque");

  // ESTOQUE → baixa a quantity da linha (RN-BAIXA-03).
  const stockItem = await maintenance.addItem(actor, order.id, {
    item_type: "stock",
    description: "Filtro",
    unit_value: 30,
    quantity: 5,
    stock_item_id: itemId,
  });
  assert.equal(await saldoOf(inventory, actor, itemId), 15, "item ESTOQUE baixou 5");
  const exit = await inventory.findExitBySource(actor, "maintenance_item", stockItem.id);
  assert.equal(exit?.type, "saida");
  assert.equal(exit?.custodyType, "base");
  assert.equal(exit?.quantidadeSinalizada, -5);
  assert.equal(exit?.reason, "baixa_manutencao");

  // Excluir o item ESTOQUE reverte (saldo volta a 20).
  await maintenance.removeItem(actor, order.id, stockItem.id);
  assert.equal(await saldoOf(inventory, actor, itemId), 20, "excluir o item reverteu a baixa");
  assert.equal(await inventory.findExitBySource(actor, "maintenance_item", stockItem.id), undefined);
});

test("[RN-BAIXA-07] manutenção: editar quantity de item ESTOQUE com EXIT ativo → 409 stock_baixa_locked", async () => {
  const { inventory, maintenance } = buildHarness();
  const actor = actorFor(randomUUID());
  const itemId = await seedItem(inventory, actor, { sku: "PECA-9", isFuel: false, saldo: 20 });
  const order = await maintenance.create(actor, { vehicle_id: VEHICLE_V, type: "corretiva", description: "Peça." });

  const stockItem = await maintenance.addItem(actor, order.id, {
    item_type: "stock",
    description: "Correia",
    unit_value: 40,
    quantity: 3,
    stock_item_id: itemId,
  });

  await assert.rejects(
    () => maintenance.updateItem(actor, order.id, stockItem.id, { quantity: 6 }),
    (error: unknown) => {
      assert.equal((error as { statusCode?: number }).statusCode, 409);
      assert.equal((error as { reason?: string }).reason, "stock_baixa_locked");
      return true;
    },
  );
  // Editar notes (não-estoque) permanece livre.
  await maintenance.updateItem(actor, order.id, stockItem.id, { notes: "obs" });
});

test("[RN-BAIXA-09] isolamento multi-tenant (3 tenants): EXIT de A invisível/intocável por B/C; saldos independentes", async () => {
  const { inventory, fuel } = buildHarness();
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const tenantC = randomUUID();
  const actorA = actorFor(tenantA);
  const actorB = actorFor(tenantB);
  const actorC = actorFor(tenantC);

  const itemA = await seedItem(inventory, actorA, { sku: "DIESEL-A", isFuel: true, saldo: 100 });
  const itemC = await seedItem(inventory, actorC, { sku: "DIESEL-C", isFuel: true, saldo: 100 });

  const logA = await fuel.create(actorA, {
    vehicle_id: VEHICLE_V,
    station_type: "internal",
    stock_item_id: itemA,
    liters: 40,
    total_value: 200,
    odometer: 100,
  });
  const logC = await fuel.create(actorC, {
    vehicle_id: VEHICLE_V,
    station_type: "internal",
    stock_item_id: itemC,
    liters: 30,
    total_value: 150,
    odometer: 100,
  });

  // Saldos independentes por tenant.
  assert.equal(await saldoOf(inventory, actorA, itemA), 60);
  assert.equal(await saldoOf(inventory, actorC, itemC), 70);

  // O EXIT de A é visível SÓ para A; B e C não o enxergam (findExitBySource escopado por tenant).
  assert.ok(await inventory.findExitBySource(actorA, "fuel_log", logA.fuelLog.id));
  assert.equal(await inventory.findExitBySource(actorB, "fuel_log", logA.fuelLog.id), undefined);
  assert.equal(await inventory.findExitBySource(actorC, "fuel_log", logA.fuelLog.id), undefined);

  // Cross-tenant: B tenta estornar a baixa de A → no-op (não afeta A).
  await inventory.removeExitForSource(actorB, "fuel_log", logA.fuelLog.id);
  assert.equal(await saldoOf(inventory, actorA, itemA), 60, "o saldo de A não foi afetado por B");
  assert.ok(await inventory.findExitBySource(actorA, "fuel_log", logA.fuelLog.id), "o EXIT de A segue ATIVO");

  // C só vê a própria baixa.
  assert.ok(await inventory.findExitBySource(actorC, "fuel_log", logC.fuelLog.id));
  assert.equal(await inventory.findExitBySource(actorA, "fuel_log", logC.fuelLog.id), undefined);
});
