import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("[R7.3] entrada sobe o saldo e recalcula avg_cost pela média móvel exata (saldo 0 → avg = unit_cost)", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const item = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "AVG-1" });

    const first = await createMovementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "entrada",
      quantidade: 10,
      unit_cost: 10,
    });
    assert.equal(first.status, 201, JSON.stringify(first.body));
    assert.equal(first.body.data.type, "entrada");
    assert.equal(first.body.data.quantidadeSinalizada, 10); // armazenado SINALIZADO (+)
    assert.equal(first.body.data.unitCost, 10);
    assert.equal(first.body.data.tenantId, undefined);
    assert.equal(first.body.data.tenant_id, undefined);

    const afterFirst = await getItem(baseUrl, seed.tenantA, seed.managerA, item.id);
    assert.equal(afterFirst.saldo, 10);
    assert.equal(afterFirst.avgCost, 10); // saldo antes = 0 → avg = unit_cost

    const second = await createMovementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "entrada",
      quantidade: 10,
      unit_cost: 20,
    });
    assert.equal(second.status, 201);

    const afterSecond = await getItem(baseUrl, seed.tenantA, seed.managerA, item.id);
    assert.equal(afterSecond.saldo, 20);
    assert.equal(afterSecond.avgCost, 15); // (10×10 + 10×20) / 20 = 15 — exato
  });
});

test("[R7.1] saida consome até o saldo (sinal −); além do saldo → 409 insufficient_balance; avg intocado na saída", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const item = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "BAL-1" });
    await createMovement(baseUrl, seed.tenantA, seed.managerA, { item_id: item.id, type: "entrada", quantidade: 10, unit_cost: 7.5 });

    const partial = await createMovementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "saida",
      quantidade: 4,
    });
    assert.equal(partial.status, 201, JSON.stringify(partial.body));
    assert.equal(partial.body.data.quantidadeSinalizada, -4);

    const toZero = await createMovementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "saida",
      quantidade: 6,
    });
    assert.equal(toZero.status, 201);

    const overdraw = await createMovementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "saida",
      quantidade: 1,
    });
    assert.equal(overdraw.status, 409, JSON.stringify(overdraw.body));
    assert.equal(overdraw.body.error.code, "STOCK_INVALID");
    assert.equal(overdraw.body.error.reason, "insufficient_balance");
    assert.ok(String(overdraw.body.error.message).includes("saldo atual"), overdraw.body.error.message);
    assert.ok(String(overdraw.body.error.message).includes("0"), overdraw.body.error.message);

    const after = await getItem(baseUrl, seed.tenantA, seed.managerA, item.id);
    assert.equal(after.saldo, 0); // o 409 não gravou nada
    assert.equal(after.avgCost, 7.5); // saída não mexe no custo médio (R7.3 é só entrada)
  });
});

test("[R7.2] consumo exige OS: sem work_order → 400; OS cross-tenant → 400; com OS do tenant → 201 e saldo desce", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const item = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "CON-1" });
    await createMovement(baseUrl, seed.tenantA, seed.managerA, { item_id: item.id, type: "entrada", quantidade: 10, unit_cost: 3 });
    const workOrderA = await createWorkOrder(baseUrl, seed.tenantA, seed.managerA);
    const workOrderB = await createWorkOrder(baseUrl, seed.tenantB, seed.managerB);

    const missingWo = await createMovementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "consumo",
      quantidade: 2,
    });
    const crossTenantWo = await createMovementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "consumo",
      quantidade: 2,
      work_order_id: workOrderB,
    });
    const valid = await createMovementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "consumo",
      quantidade: 2,
      work_order_id: workOrderA,
    });
    const overdraw = await createMovementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "consumo",
      quantidade: 100,
      work_order_id: workOrderA,
    });

    assert.equal(missingWo.status, 400, JSON.stringify(missingWo.body));
    assert.equal(missingWo.body.error.reason, "consumo_requires_work_order");
    assert.equal(crossTenantWo.status, 400, JSON.stringify(crossTenantWo.body));
    assert.equal(crossTenantWo.body.error.reason, "invalid_work_order_reference");
    assert.equal(valid.status, 201, JSON.stringify(valid.body));
    assert.equal(valid.body.data.quantidadeSinalizada, -2);
    assert.equal(valid.body.data.workOrderId, workOrderA);
    assert.equal(overdraw.status, 409);
    assert.equal(overdraw.body.error.reason, "insufficient_balance");

    const after = await getItem(baseUrl, seed.tenantA, seed.managerA, item.id);
    assert.equal(after.saldo, 8);
  });
});

test("[R7.3] entrada sem unit_cost → 400 entrada_requires_unit_cost", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const item = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "ENT-1" });

    const missingCost = await createMovementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "entrada",
      quantidade: 5,
    });

    assert.equal(missingCost.status, 400, JSON.stringify(missingCost.body));
    assert.equal(missingCost.body.error.code, "STOCK_INVALID");
    assert.equal(missingCost.body.error.reason, "entrada_requires_unit_cost");
  });
});

test("ajuste: exige reason (400); aceita sinal positivo/negativo; negativo que estoura o saldo → 409; sequência consistente", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const item = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "AJU-1" });
    await createMovement(baseUrl, seed.tenantA, seed.managerA, { item_id: item.id, type: "entrada", quantidade: 5, unit_cost: 1 });

    const missingReason = await createMovementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "ajuste",
      quantidade: -2,
    });
    assert.equal(missingReason.status, 400, JSON.stringify(missingReason.body));
    assert.equal(missingReason.body.error.reason, "ajuste_requires_reason");

    const negative = await createMovementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "ajuste",
      quantidade: -2,
      reason: "quebra em inventário",
    });
    assert.equal(negative.status, 201, JSON.stringify(negative.body));
    assert.equal(negative.body.data.quantidadeSinalizada, -2);
    assert.equal(negative.body.data.reason, "quebra em inventário");

    const overdraw = await createMovementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "ajuste",
      quantidade: -10,
      reason: "ajuste inválido",
    });
    assert.equal(overdraw.status, 409, JSON.stringify(overdraw.body));
    assert.equal(overdraw.body.error.reason, "insufficient_balance");

    const positive = await createMovementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "ajuste",
      quantidade: 4,
      reason: "sobra em inventário",
    });
    assert.equal(positive.status, 201);
    assert.equal(positive.body.data.quantidadeSinalizada, 4);

    await createMovement(baseUrl, seed.tenantA, seed.managerA, { item_id: item.id, type: "saida", quantidade: 1 });

    // R7.1 — saldo derivado consistente após entrada(+5), ajuste(−2), ajuste(+4), saida(−1) = 6.
    const after = await getItem(baseUrl, seed.tenantA, seed.managerA, item.id);
    assert.equal(after.saldo, 6);
  });
});

test("movimentos são IMUTÁVEIS: PATCH e DELETE não existem (404 route_not_found)", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const item = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "IMM-1" });
    const movement = await createMovement(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "entrada",
      quantidade: 5,
      unit_cost: 2,
    });

    const patchAttempt = await requestJson(baseUrl, `/api/v1/stock-movements/${movement.id}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { quantidade: 999 },
    });
    const deleteAttempt = await requestJson(baseUrl, `/api/v1/stock-movements/${movement.id}`, {
      method: "DELETE",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(patchAttempt.status, 404, JSON.stringify(patchAttempt.body));
    assert.equal(patchAttempt.body.error.reason, "route_not_found");
    assert.equal(deleteAttempt.status, 404);
    assert.equal(deleteAttempt.body.error.reason, "route_not_found");

    // O razão continua intacto.
    const detail = await requestJson(baseUrl, `/api/v1/stock-movements/${movement.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.quantidadeSinalizada, 5);
  });
});

test("GET /stock-movements filtra por item_id, type, work_order_id e from/to; GET /:id retorna o movimento", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const itemA = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "FIL-A" });
    const itemB = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "FIL-B" });
    const workOrder = await createWorkOrder(baseUrl, seed.tenantA, seed.managerA);

    await createMovement(baseUrl, seed.tenantA, seed.managerA, { item_id: itemA.id, type: "entrada", quantidade: 10, unit_cost: 1 });
    await createMovement(baseUrl, seed.tenantA, seed.managerA, { item_id: itemB.id, type: "entrada", quantidade: 10, unit_cost: 1 });
    const consumo = await createMovement(baseUrl, seed.tenantA, seed.managerA, {
      item_id: itemA.id,
      type: "consumo",
      quantidade: 3,
      work_order_id: workOrder,
    });

    const headers = authHeaders(seed.tenantA, seed.managerA, "manager");
    const byItem = await requestJson(baseUrl, `/api/v1/stock-movements?item_id=${itemA.id}`, { headers });
    const byType = await requestJson(baseUrl, "/api/v1/stock-movements?type=entrada", { headers });
    const byWorkOrder = await requestJson(baseUrl, `/api/v1/stock-movements?work_order_id=${workOrder}`, { headers });
    const sinceAlways = await requestJson(baseUrl, "/api/v1/stock-movements?from=2000-01-01T00:00:00.000Z", { headers });
    const beforeAlways = await requestJson(baseUrl, "/api/v1/stock-movements?to=2000-01-01T00:00:00.000Z", { headers });
    const detail = await requestJson(baseUrl, `/api/v1/stock-movements/${consumo.id}`, { headers });

    assert.equal(byItem.body.pagination.total, 2);
    assert.ok(byItem.body.items.every((movement: { itemId: string }) => movement.itemId === itemA.id));
    assert.equal(byType.body.pagination.total, 2);
    assert.ok(byType.body.items.every((movement: { type: string }) => movement.type === "entrada"));
    assert.equal(byWorkOrder.body.pagination.total, 1);
    assert.equal(byWorkOrder.body.items[0].id, consumo.id);
    assert.equal(sinceAlways.body.pagination.total, 3);
    assert.equal(beforeAlways.body.pagination.total, 0);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.id, consumo.id);
    assert.equal(detail.body.data.workOrderId, workOrder);
  });
});

test("[isolamento] item de outro tenant no create → 400; GET cross-tenant 404; lista não vaza; tenant_id forjado ignorado", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const itemA = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "ISO-A" });
    const itemB = await createItem(baseUrl, seed.tenantB, seed.managerB, { sku: "ISO-B" });
    await createMovement(baseUrl, seed.tenantB, seed.managerB, { item_id: itemB.id, type: "entrada", quantidade: 5, unit_cost: 1 });

    const crossTenantItem = await createMovementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: itemB.id,
      type: "entrada",
      quantidade: 5,
      unit_cost: 1,
    });
    assert.equal(crossTenantItem.status, 400, JSON.stringify(crossTenantItem.body));
    assert.equal(crossTenantItem.body.error.reason, "invalid_item_reference");

    const forged = await createMovementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: itemA.id,
      type: "entrada",
      quantidade: 5,
      unit_cost: 1,
      tenant_id: seed.tenantB.id,
      tenantId: seed.tenantB.id,
    });
    assert.equal(forged.status, 201);

    const forgedFromB = await requestJson(baseUrl, `/api/v1/stock-movements/${forged.body.data.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });
    const listA = await requestJson(baseUrl, "/api/v1/stock-movements", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const listB = await requestJson(baseUrl, "/api/v1/stock-movements", {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(forgedFromB.status, 404); // o movimento forjado ficou no tenant A
    assert.equal(listA.body.pagination.total, 1);
    assert.equal(listB.body.pagination.total, 1);
    assert.ok(listB.body.items.every((movement: { itemId: string }) => movement.itemId === itemB.id));
  });
});

test("[rbac] operator e inventory movimentam (201); finance/auditor/viewer criam 403; anon 403; leituras R ok; field_technician 403", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const item = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "RBAC-1" });

    const asOperator = await createMovementRaw(baseUrl, seed.tenantA, seed.operatorA, {
      item_id: item.id,
      type: "entrada",
      quantidade: 5,
      unit_cost: 1,
    }, "operator");
    const asInventory = await createMovementRaw(baseUrl, seed.tenantA, seed.inventoryA, {
      item_id: item.id,
      type: "saida",
      quantidade: 1,
    }, "inventory");

    assert.equal(asOperator.status, 201, JSON.stringify(asOperator.body));
    assert.equal(asInventory.status, 201, JSON.stringify(asInventory.body));

    for (const [user, role] of [
      [seed.financeA, "finance"],
      [seed.auditorA, "auditor"],
      [seed.viewerA, "viewer"],
    ] as const) {
      const denied = await createMovementRaw(baseUrl, seed.tenantA, user, {
        item_id: item.id,
        type: "saida",
        quantidade: 1,
      }, role);
      assert.equal(denied.status, 403, `${role} create movement should be 403: ${JSON.stringify(denied.body)}`);
    }

    const anon = await requestJson(baseUrl, "/api/v1/stock-movements", {
      method: "POST",
      body: { item_id: item.id, type: "saida", quantidade: 1 },
    });
    assert.equal(anon.status, 403);

    for (const [user, role] of [
      [seed.operatorA, "operator"],
      [seed.financeA, "finance"],
      [seed.auditorA, "auditor"],
      [seed.viewerA, "viewer"],
      [seed.inventoryA, "inventory"],
    ] as const) {
      const read = await requestJson(baseUrl, "/api/v1/stock-movements", {
        headers: authHeaders(seed.tenantA, user, role),
      });
      assert.equal(read.status, 200, `${role} read should be 200`);
    }

    const techRead = await requestJson(baseUrl, "/api/v1/stock-movements", {
      headers: authHeaders(seed.tenantA, seed.techA, "field_technician"),
    });
    assert.equal(techRead.status, 403); // matrix F7: field_technician sem acesso
  });
});

test("[validação] quantidade > 0 para entrada/saida/consumo; ajuste ≠ 0; vehicle_id cross-tenant 400; vehicle válido ecoado", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const item = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "VAL-M1" });
    await createMovement(baseUrl, seed.tenantA, seed.managerA, { item_id: item.id, type: "entrada", quantidade: 10, unit_cost: 2 });
    const vehicleA = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "AAA1A11");
    const vehicleB = await createVehicle(baseUrl, seed.tenantB, seed.managerB, "BBB1B11");
    const workOrderA = await createWorkOrder(baseUrl, seed.tenantA, seed.managerA);

    const zeroEntrada = await createMovementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "entrada",
      quantidade: 0,
      unit_cost: 1,
    });
    const negativeSaida = await createMovementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "saida",
      quantidade: -2,
    });
    const zeroAjuste = await createMovementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "ajuste",
      quantidade: 0,
      reason: "nada",
    });
    const crossTenantVehicle = await createMovementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "consumo",
      quantidade: 1,
      work_order_id: workOrderA,
      vehicle_id: vehicleB,
    });
    const withVehicle = await createMovementRaw(baseUrl, seed.tenantA, seed.managerA, {
      item_id: item.id,
      type: "consumo",
      quantidade: 1,
      work_order_id: workOrderA,
      vehicle_id: vehicleA,
    });

    assert.equal(zeroEntrada.status, 400);
    assert.equal(zeroEntrada.body.error.reason, "invalid_quantidade");
    assert.equal(negativeSaida.status, 400);
    assert.equal(negativeSaida.body.error.reason, "invalid_quantidade");
    assert.equal(zeroAjuste.status, 400);
    assert.equal(zeroAjuste.body.error.reason, "invalid_quantidade");
    assert.equal(crossTenantVehicle.status, 400, JSON.stringify(crossTenantVehicle.body));
    assert.equal(crossTenantVehicle.body.error.reason, "invalid_vehicle_reference");
    assert.equal(withVehicle.status, 201, JSON.stringify(withVehicle.body));
    assert.equal(withVehicle.body.data.vehicleId, vehicleA);
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: User;
  readonly managerB: User;
  readonly operatorA: User;
  readonly financeA: User;
  readonly auditorA: User;
  readonly viewerA: User;
  readonly inventoryA: User;
  readonly techA: User;
};

type InventoryApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withInventoryApi(callback: (context: InventoryApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetInventoryRuntimeForTests },
    { resetVehicleRuntimeForTests },
    { resetWorkOrderRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/inventory/index.js"),
    import("../src/modules/vehicles/index.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetInventoryRuntimeForTests();
  resetVehicleRuntimeForTests();
  resetWorkOrderRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed });
  } finally {
    await closeServer(server);
    resetInventoryRuntimeForTests();
    resetVehicleRuntimeForTests();
    resetWorkOrderRuntimeForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({ name: "Tenant Movimentos A", modules: ["dashboard", "work_orders"] });
  const tenantB = service.createTenant({ name: "Tenant Movimentos B", modules: ["dashboard", "work_orders"] });
  const managerA = service.createUser({ tenantId: tenantA.id, name: "Manager A", email: "mov-manager-a@example.com", roles: ["manager"] });
  const managerB = service.createUser({ tenantId: tenantB.id, name: "Manager B", email: "mov-manager-b@example.com", roles: ["manager"] });
  const operatorA = service.createUser({ tenantId: tenantA.id, name: "Operator A", email: "mov-operator-a@example.com", roles: ["operator"] });
  const financeA = service.createUser({ tenantId: tenantA.id, name: "Finance A", email: "mov-finance-a@example.com", roles: ["finance"] });
  const auditorA = service.createUser({ tenantId: tenantA.id, name: "Auditor A", email: "mov-auditor-a@example.com", roles: ["auditor"] });
  const viewerA = service.createUser({ tenantId: tenantA.id, name: "Viewer A", email: "mov-viewer-a@example.com", roles: ["viewer"] });
  const inventoryA = service.createUser({ tenantId: tenantA.id, name: "Inventory A", email: "mov-inventory-a@example.com", roles: ["inventory"] });
  const techA = service.createUser({ tenantId: tenantA.id, name: "Tech A", email: "mov-tech-a@example.com", roles: ["field_technician"] });

  return { tenantA, tenantB, managerA, managerB, operatorA, financeA, auditorA, viewerA, inventoryA, techA };
}

async function createItem(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  body: Record<string, unknown>,
): Promise<{ readonly id: string }> {
  const created = await requestJson(baseUrl, "/api/v1/inventory-items", {
    method: "POST",
    headers: authHeaders(tenant, user, "manager"),
    body: {
      sku: "SKU-DEFAULT",
      name: "Item de estoque",
      unit: "un",
      ...body,
    },
  });

  assert.equal(created.status, 201, `item creation failed: ${JSON.stringify(created.body)}`);

  return { id: created.body.data.id as string };
}

async function getItem(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  itemId: string,
): Promise<{ readonly saldo: number; readonly avgCost: number }> {
  const detail = await requestJson(baseUrl, `/api/v1/inventory-items/${itemId}`, {
    headers: authHeaders(tenant, user, "manager"),
  });

  assert.equal(detail.status, 200, `item detail failed: ${JSON.stringify(detail.body)}`);

  return { saldo: detail.body.data.saldo as number, avgCost: detail.body.data.avgCost as number };
}

async function createMovementRaw(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  body: Record<string, unknown>,
  role = "manager",
) {
  return requestJson(baseUrl, "/api/v1/stock-movements", {
    method: "POST",
    headers: authHeaders(tenant, user, role),
    body,
  });
}

async function createMovement(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  body: Record<string, unknown>,
): Promise<{ readonly id: string }> {
  const created = await createMovementRaw(baseUrl, tenant, user, body);

  assert.equal(created.status, 201, `movement creation failed: ${JSON.stringify(created.body)}`);

  return { id: created.body.data.id as string };
}

async function createVehicle(baseUrl: string, tenant: Tenant, user: User, plate: string): Promise<string> {
  const created = await requestJson(baseUrl, "/api/v1/vehicles", {
    method: "POST",
    headers: authHeaders(tenant, user, "manager"),
    body: { plate, model: "Caminhao Guincho" },
  });

  assert.equal(created.status, 201, `vehicle creation failed: ${JSON.stringify(created.body)}`);

  return created.body.data.id as string;
}

async function createWorkOrder(baseUrl: string, tenant: Tenant, user: User): Promise<string> {
  const created = await requestJson(baseUrl, "/api/v1/work-orders", {
    method: "POST",
    headers: authHeaders(tenant, user, "manager"),
    body: {
      title: "Atendimento de guincho",
      customerName: "Cliente Exemplo",
      serviceAddress: "Rua Exemplo, 123",
    },
  });

  assert.equal(created.status, 201, `work order creation failed: ${JSON.stringify(created.body)}`);

  return created.body.data.id as string;
}

function authHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
  return {
    "x-tenant-id": tenant.id,
    "x-user-id": user.id,
    "x-role": role,
  };
}

async function requestJson(
  baseUrl: string,
  routePath: string,
  options: {
    readonly method?: string;
    readonly headers?: Record<string, string>;
    readonly body?: unknown;
  } = {},
) {
  const response = await fetch(`${baseUrl}${routePath}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();

  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
  };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address();

  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");

  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
