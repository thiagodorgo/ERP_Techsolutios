import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

const IN_7_DAYS = "2026-07-14T10:00:00.000Z";

test("POST /maintenance-orders cria manutencao e retorna 201 com objeto completo", async () => {
  await withMaintenanceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "ABC1D23");

    const created = await requestJson(baseUrl, "/api/v1/maintenance-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        vehicle_id: vehicleId,
        type: "preventiva",
        scheduled_for: IN_7_DAYS,
        supplier: "Oficina Central",
        odometer: 1000,
        description: "Troca de óleo e filtros.",
      },
    });

    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.data.vehicleId, vehicleId);
    assert.equal(created.body.data.type, "preventiva");
    assert.equal(created.body.data.status, "agendada");
    assert.equal(created.body.data.supplier, "Oficina Central");
    assert.equal(created.body.data.odometer, 1000);
    assert.equal(created.body.data.description, "Troca de óleo e filtros.");
    assert.equal(created.body.data.cost, null);
    assert.equal(created.body.data.completedAt, null);
    assert.equal(created.body.data.isActive, true);
    assert.equal(created.body.data.tenant_id, undefined);
    assert.equal(created.body.data.tenantId, undefined);
    assert.ok(created.body.data.id);
  });
});

test("GET /maintenance-orders filtra por viatura, tipo e status", async () => {
  await withMaintenanceApi(async ({ baseUrl, seed }) => {
    const vehicleV = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "AAA1A11");
    const vehicleW = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "BBB2B22");

    await createMaintenance(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleV, type: "preventiva", description: "Preventiva V" });
    await createMaintenance(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleV, type: "corretiva", description: "Corretiva V" });
    await createMaintenance(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleW, type: "preventiva", description: "Preventiva W" });

    const byVehicle = await requestJson(baseUrl, `/api/v1/maintenance-orders?vehicle_id=${vehicleV}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const byType = await requestJson(baseUrl, "/api/v1/maintenance-orders?type=preventiva", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const byStatus = await requestJson(baseUrl, "/api/v1/maintenance-orders?status=agendada", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(byVehicle.body.pagination.total, 2);
    assert.ok(byVehicle.body.items.every((item: { vehicleId: string }) => item.vehicleId === vehicleV));
    assert.equal(byType.body.pagination.total, 2);
    assert.ok(byType.body.items.every((item: { type: string }) => item.type === "preventiva"));
    assert.equal(byStatus.body.pagination.total, 3);
  });
});

test("GET /maintenance-orders/:id retorna a manutencao", async () => {
  await withMaintenanceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "CCC3C33");
    const created = await createMaintenance(baseUrl, seed.tenantA, seed.managerA, {
      vehicle_id: vehicleId,
      description: "Revisão de freios.",
    });

    const detailed = await requestJson(baseUrl, `/api/v1/maintenance-orders/${created.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(detailed.status, 200);
    assert.equal(detailed.body.data.id, created.id);
    assert.equal(detailed.body.data.description, "Revisão de freios.");
  });
});

test("PATCH /maintenance-orders/:id atualiza campos", async () => {
  await withMaintenanceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "DDD4D44");
    const created = await createMaintenance(baseUrl, seed.tenantA, seed.managerA, {
      vehicle_id: vehicleId,
      supplier: "Oficina A",
      description: "Manutenção inicial.",
    });

    const updated = await requestJson(baseUrl, `/api/v1/maintenance-orders/${created.id}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { supplier: "Oficina B", description: "Manutenção revisada." },
    });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.supplier, "Oficina B");
    assert.equal(updated.body.data.description, "Manutenção revisada.");
  });
});

test("PATCH /maintenance-orders/:id { is_active:false } desativa e o filtro reflete", async () => {
  await withMaintenanceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "EEE5E55");
    const created = await createMaintenance(baseUrl, seed.tenantA, seed.managerA, {
      vehicle_id: vehicleId,
      description: "Manutenção a desativar.",
    });

    const deactivated = await requestJson(baseUrl, `/api/v1/maintenance-orders/${created.id}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { is_active: false },
    });
    const inactiveList = await requestJson(baseUrl, "/api/v1/maintenance-orders?is_active=false", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const activeList = await requestJson(baseUrl, "/api/v1/maintenance-orders?is_active=true", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(deactivated.status, 200);
    assert.equal(deactivated.body.data.isActive, false);
    assert.equal(inactiveList.body.items.length, 1);
    assert.equal(inactiveList.body.items[0].id, created.id);
    assert.equal(activeList.body.items.length, 0);
  });
});

test("[R2.1] fluxo valido agendada -> em_execucao -> concluida (com custo e data)", async () => {
  await withMaintenanceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "FFF6F66");
    const created = await createMaintenance(baseUrl, seed.tenantA, seed.managerA, {
      vehicle_id: vehicleId,
      type: "corretiva",
      description: "Reparo de motor.",
    });

    const started = await patchStatus(baseUrl, seed.tenantA, seed.managerA, created.id, { status: "em_execucao" });
    const completed = await patchStatus(baseUrl, seed.tenantA, seed.managerA, created.id, {
      status: "concluida",
      cost: 1250.5,
      completed_at: "2026-07-10T12:00:00.000Z",
    });

    assert.equal(started.status, 200);
    assert.equal(started.body.data.status, "em_execucao");
    assert.equal(completed.status, 200);
    assert.equal(completed.body.data.status, "concluida");
    assert.equal(completed.body.data.cost, 1250.5);
    assert.equal(completed.body.data.completedAt, "2026-07-10T12:00:00.000Z");
  });
});

test("[R2.1] cada transicao invalida retorna 422 invalid_status_transition", async () => {
  await withMaintenanceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "GGG7G77");

    // agendada -> concluida (pula em_execucao) é inválido.
    const o1 = await createMaintenance(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId, description: "O1" });
    const skip = await patchStatus(baseUrl, seed.tenantA, seed.managerA, o1.id, { status: "concluida", cost: 10, completed_at: "2026-07-10T00:00:00.000Z" });

    // em_execucao -> agendada (regressão) é inválido.
    const o2 = await createMaintenance(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId, description: "O2" });
    await patchStatus(baseUrl, seed.tenantA, seed.managerA, o2.id, { status: "em_execucao" });
    const back = await patchStatus(baseUrl, seed.tenantA, seed.managerA, o2.id, { status: "agendada" });

    // cancelada é terminal.
    const o3 = await createMaintenance(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId, description: "O3" });
    await patchStatus(baseUrl, seed.tenantA, seed.managerA, o3.id, { status: "cancelada" });
    const fromCancelled = await patchStatus(baseUrl, seed.tenantA, seed.managerA, o3.id, { status: "em_execucao" });

    // concluida é terminal.
    const o4 = await createMaintenance(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId, description: "O4" });
    await patchStatus(baseUrl, seed.tenantA, seed.managerA, o4.id, { status: "em_execucao" });
    await patchStatus(baseUrl, seed.tenantA, seed.managerA, o4.id, { status: "concluida", cost: 10, completed_at: "2026-07-10T00:00:00.000Z" });
    const fromCompleted = await patchStatus(baseUrl, seed.tenantA, seed.managerA, o4.id, { status: "cancelada" });

    for (const response of [skip, back, fromCancelled, fromCompleted]) {
      assert.equal(response.status, 422, JSON.stringify(response.body));
      assert.equal(response.body.error.reason, "invalid_status_transition");
      assert.equal(response.body.error.code, "MAINTENANCE_INVALID");
    }
  });
});

test("[conclusao] concluir sem custo/data retorna 422 completion_requires_cost_and_date", async () => {
  await withMaintenanceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "HHH8H88");
    const created = await createMaintenance(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId, description: "Sem custo." });
    await patchStatus(baseUrl, seed.tenantA, seed.managerA, created.id, { status: "em_execucao" });

    const noCost = await patchStatus(baseUrl, seed.tenantA, seed.managerA, created.id, { status: "concluida" });
    const onlyCost = await patchStatus(baseUrl, seed.tenantA, seed.managerA, created.id, { status: "concluida", cost: 100 });

    assert.equal(noCost.status, 422);
    assert.equal(noCost.body.error.reason, "completion_requires_cost_and_date");
    assert.equal(onlyCost.status, 422);
    assert.equal(onlyCost.body.error.reason, "completion_requires_cost_and_date");
  });
});

test("[R1.2] odometro regressivo cruzado com fuel_log retorna 422 odometer_regressive", async () => {
  await withMaintenanceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "III9I99");

    // Um abastecimento (F1) registra odômetro 5000 para a viatura.
    const fuel = await requestJson(baseUrl, "/api/v1/fuel-logs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { vehicle_id: vehicleId, liters: 40, total_value: 300, odometer: 5000 },
    });
    assert.equal(fuel.status, 201, JSON.stringify(fuel.body));

    // Manutenção com odômetro 4000 é regressiva em relação ao fuel_log.
    const regressive = await requestJson(baseUrl, "/api/v1/maintenance-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { vehicle_id: vehicleId, type: "corretiva", odometer: 4000, description: "Regressiva." },
    });

    assert.equal(regressive.status, 422);
    assert.equal(regressive.body.error.reason, "odometer_regressive");
  });
});

test("[R2.3] criar OS com viatura em manutencao em_execucao retorna 409 vehicle_in_maintenance", async () => {
  await withMaintenanceApi(async ({ baseUrl, seed }) => {
    const vehicleBusy = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "JJJ1J11");
    const vehicleFree = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "KKK1K11");

    const maintenance = await createMaintenance(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleBusy, description: "Em execução." });
    await patchStatus(baseUrl, seed.tenantA, seed.managerA, maintenance.id, { status: "em_execucao" });

    const blocked = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { title: "OS bloqueada", vehicle_id: vehicleBusy },
    });
    const allowed = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { title: "OS liberada", vehicle_id: vehicleFree },
    });

    assert.equal(blocked.status, 409, JSON.stringify(blocked.body));
    assert.equal(blocked.body.error.reason, "vehicle_in_maintenance");
    assert.equal(allowed.status, 201, JSON.stringify(allowed.body));
  });
});

test("[isolamento] GET /maintenance-orders/:id de outra organizacao retorna 404", async () => {
  await withMaintenanceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "LLL1L11");
    const created = await createMaintenance(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId, description: "Privada A." });

    const crossTenant = await requestJson(baseUrl, `/api/v1/maintenance-orders/${created.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(crossTenant.status, 404);
    assert.equal(crossTenant.body.error.reason, "not_found");
  });
});

test("[isolamento] lista da organizacao B nunca contem itens da organizacao A", async () => {
  await withMaintenanceApi(async ({ baseUrl, seed }) => {
    const vehicleA = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "AAA1B11");
    const vehicleB = await createVehicle(baseUrl, seed.tenantB, seed.managerB, "BBB1C22");
    await createMaintenance(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleA, description: "A1" });
    await createMaintenance(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleA, description: "A2" });
    await createMaintenance(baseUrl, seed.tenantB, seed.managerB, { vehicle_id: vehicleB, description: "B1" });

    const listA = await requestJson(baseUrl, "/api/v1/maintenance-orders", { headers: authHeaders(seed.tenantA, seed.managerA, "manager") });
    const listB = await requestJson(baseUrl, "/api/v1/maintenance-orders", { headers: authHeaders(seed.tenantB, seed.managerB, "manager") });

    assert.equal(listA.body.pagination.total, 2);
    assert.equal(listB.body.pagination.total, 1);
    assert.ok(listB.body.items.every((item: { vehicleId: string }) => item.vehicleId === vehicleB));
  });
});

test("[isolamento] POST forjando tenant_id no corpo e ignorado; registro pertence ao claim", async () => {
  await withMaintenanceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "MMM1M11");
    const created = await requestJson(baseUrl, "/api/v1/maintenance-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        vehicle_id: vehicleId,
        type: "preventiva",
        description: "Forjada.",
        tenant_id: seed.tenantB.id,
        tenantId: seed.tenantB.id,
      },
    });

    const fromClaim = await requestJson(baseUrl, `/api/v1/maintenance-orders/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const fromForged = await requestJson(baseUrl, `/api/v1/maintenance-orders/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(created.status, 201);
    assert.equal(fromClaim.status, 200);
    assert.equal(fromForged.status, 404);
  });
});

test("[isolamento] vehicle_id de outra organizacao retorna 400 invalid_vehicle_reference", async () => {
  await withMaintenanceApi(async ({ baseUrl, seed }) => {
    const vehicleB = await createVehicle(baseUrl, seed.tenantB, seed.managerB, "NNN1N11");

    const crossVehicle = await requestJson(baseUrl, "/api/v1/maintenance-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { vehicle_id: vehicleB, type: "corretiva", description: "Cross." },
    });

    assert.equal(crossVehicle.status, 400);
    assert.equal(crossVehicle.body.error.reason, "invalid_vehicle_reference");
  });
});

test("[rbac] operador cria (201); finance e auditor sem create retornam 403; viewer/anonimo 403", async () => {
  await withMaintenanceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "OOO1O11");
    const body = { vehicle_id: vehicleId, type: "preventiva", description: "RBAC." };

    const asOperator = await requestJson(baseUrl, "/api/v1/maintenance-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body,
    });
    const asFinance = await requestJson(baseUrl, "/api/v1/maintenance-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.financeA, "finance"),
      body,
    });
    const asAuditor = await requestJson(baseUrl, "/api/v1/maintenance-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.auditorA, "auditor"),
      body,
    });
    const asViewer = await requestJson(baseUrl, "/api/v1/maintenance-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.viewerA, "viewer"),
      body,
    });
    const anonymous = await requestJson(baseUrl, "/api/v1/maintenance-orders", { method: "POST", body });

    // finance and auditor CAN read (RBAC read set).
    const financeRead = await requestJson(baseUrl, "/api/v1/maintenance-orders", {
      headers: authHeaders(seed.tenantA, seed.financeA, "finance"),
    });

    assert.equal(asOperator.status, 201, JSON.stringify(asOperator.body));
    assert.equal(asFinance.status, 403);
    assert.equal(asAuditor.status, 403);
    assert.equal(asViewer.status, 403);
    assert.equal(anonymous.status, 403);
    assert.equal(financeRead.status, 200);
  });
});

test("[validacao] tipo invalido e descricao ausente retornam 400", async () => {
  await withMaintenanceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "PPP1P11");

    const badType = await requestJson(baseUrl, "/api/v1/maintenance-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { vehicle_id: vehicleId, type: "turbo", description: "X" },
    });
    const missingDescription = await requestJson(baseUrl, "/api/v1/maintenance-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { vehicle_id: vehicleId, type: "preventiva" },
    });

    assert.equal(badType.status, 400);
    assert.equal(badType.body.error.reason, "invalid_type");
    assert.equal(missingDescription.status, 400);
    assert.equal(missingDescription.body.error.reason, "required_field");
  });
});

test("[MANUT-06] POST /maintenance-orders com next_due_at persiste a próxima; reusa maintenance_orders:*", async () => {
  await withMaintenanceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "NDU1E11");
    const created = await requestJson(baseUrl, "/api/v1/maintenance-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        vehicle_id: vehicleId,
        type: "preventiva",
        description: "Com próxima manutenção.",
        next_due_at: "2027-01-10T12:00:00.000Z",
      },
    });

    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.data.nextDueAt, "2027-01-10T12:00:00.000Z");
    // Efeito de domínio: sem exigir notifications:create do usuário (manager não tem essa permissão).
  });
});

test("[MANUT-01/02/03] itens: POST/GET/DELETE + totais DERIVADOS no GET do cabeçalho", async () => {
  await withMaintenanceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "ITM1E11");
    const order = await createMaintenance(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId, description: "Com itens." });

    const svc = await addItem(baseUrl, seed.tenantA, seed.managerA, order.id, { item_type: "service", description: "Mão de obra", unit_value: 150, quantity: 2 });
    await addItem(baseUrl, seed.tenantA, seed.managerA, order.id, { item_type: "product", description: "Peça", unit_value: 50, quantity: 3 });
    await addItem(baseUrl, seed.tenantA, seed.managerA, order.id, { item_type: "stock", description: "Óleo", unit_value: 20, quantity: 1 });

    assert.equal(svc.status, 201, JSON.stringify(svc.body));
    assert.equal(svc.body.data.lineTotal, 300);
    assert.equal(svc.body.data.tenant_id, undefined);
    assert.equal(svc.body.data.maintenanceOrderId, undefined);

    const detail = await requestJson(baseUrl, `/api/v1/maintenance-orders/${order.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(detail.body.data.totals.totalServices, 300);
    assert.equal(detail.body.data.totals.totalProducts, 170); // 150 + 20
    assert.equal(detail.body.data.totals.total, 470);
    assert.equal(detail.body.data.totals.itemCount, 3);
    assert.equal(detail.body.data.items.length, 3);

    // Lista de cabeçalhos expõe itemCount + itemsTotal derivados.
    const list = await requestJson(baseUrl, `/api/v1/maintenance-orders?vehicle_id=${vehicleId}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(list.body.items[0].itemCount, 3);
    assert.equal(list.body.items[0].itemsTotal, 470);

    // DELETE (soft) remove da soma.
    const deleted = await requestJson(baseUrl, `/api/v1/maintenance-orders/${order.id}/items/${svc.body.data.id}`, {
      method: "DELETE",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(deleted.status, 200);
    const after = await requestJson(baseUrl, `/api/v1/maintenance-orders/${order.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(after.body.data.totals.itemCount, 2);
    assert.equal(after.body.data.totals.total, 170);
  });
});

test("[MANUT-02] item com unit_value/quantity <= 0 retorna 422", async () => {
  await withMaintenanceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "ITM2E22");
    const order = await createMaintenance(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId, description: "Itens 422." });

    const badValue = await addItem(baseUrl, seed.tenantA, seed.managerA, order.id, { item_type: "service", description: "X", unit_value: 0, quantity: 1 });
    const badQty = await addItem(baseUrl, seed.tenantA, seed.managerA, order.id, { item_type: "service", description: "X", unit_value: 10, quantity: 0 });

    assert.equal(badValue.status, 422);
    assert.equal(badValue.body.error.reason, "invalid_unit_value");
    assert.equal(badQty.status, 422);
    assert.equal(badQty.body.error.reason, "invalid_quantity");
  });
});

test("[MANUT-09] item de manutenção de outra organização retorna 404", async () => {
  await withMaintenanceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "ITM3E33");
    const order = await createMaintenance(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleId, description: "Privada A." });

    const cross = await addItem(baseUrl, seed.tenantB, seed.managerB, order.id, { item_type: "service", description: "X", unit_value: 10, quantity: 1 });
    assert.equal(cross.status, 404);
    assert.equal(cross.body.error.reason, "not_found");
  });
});

test("[MANUT-04] GET /maintenance-orders/odometer-suggestion = max(fuel, maintenance); null sem histórico", async () => {
  await withMaintenanceApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "ODO1E11");

    const empty = await requestJson(baseUrl, `/api/v1/maintenance-orders/odometer-suggestion?vehicleId=${vehicleId}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(empty.status, 200);
    assert.equal(empty.body.data, null);

    const fuel = await requestJson(baseUrl, "/api/v1/fuel-logs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { vehicle_id: vehicleId, liters: 40, total_value: 300, odometer: 15500 },
    });
    assert.equal(fuel.status, 201, JSON.stringify(fuel.body));

    const suggested = await requestJson(baseUrl, `/api/v1/maintenance-orders/odometer-suggestion?vehicleId=${vehicleId}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(suggested.status, 200);
    assert.equal(suggested.body.data.suggestedOdometer, 15500);
    assert.equal(suggested.body.data.source, "fuel_log");
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
};

type MaintenanceApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withMaintenanceApi(callback: (context: MaintenanceApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetMaintenanceOrderRuntimeForTests },
    { resetFuelLogRuntimeForTests },
    { resetVehicleRuntimeForTests },
    { resetWorkOrderRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/maintenance-orders/index.js"),
    import("../src/modules/fuel-logs/index.js"),
    import("../src/modules/vehicles/index.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetMaintenanceOrderRuntimeForTests();
  resetFuelLogRuntimeForTests();
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
    resetMaintenanceOrderRuntimeForTests();
    resetFuelLogRuntimeForTests();
    resetVehicleRuntimeForTests();
    resetWorkOrderRuntimeForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({ name: "Tenant Maint A", modules: ["dashboard", "work_orders"] });
  const tenantB = service.createTenant({ name: "Tenant Maint B", modules: ["dashboard", "work_orders"] });
  const managerA = service.createUser({ tenantId: tenantA.id, name: "Manager A", email: "maint-manager-a@example.com", roles: ["manager"] });
  const managerB = service.createUser({ tenantId: tenantB.id, name: "Manager B", email: "maint-manager-b@example.com", roles: ["manager"] });
  const operatorA = service.createUser({ tenantId: tenantA.id, name: "Operator A", email: "maint-operator-a@example.com", roles: ["operator"] });
  const financeA = service.createUser({ tenantId: tenantA.id, name: "Finance A", email: "maint-finance-a@example.com", roles: ["finance"] });
  const auditorA = service.createUser({ tenantId: tenantA.id, name: "Auditor A", email: "maint-auditor-a@example.com", roles: ["auditor"] });
  const viewerA = service.createUser({ tenantId: tenantA.id, name: "Viewer A", email: "maint-viewer-a@example.com", roles: ["viewer"] });

  return { tenantA, tenantB, managerA, managerB, operatorA, financeA, auditorA, viewerA };
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

async function createMaintenance(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  body: Record<string, unknown>,
): Promise<{ readonly id: string }> {
  const created = await requestJson(baseUrl, "/api/v1/maintenance-orders", {
    method: "POST",
    headers: authHeaders(tenant, user, "manager"),
    body: { type: "preventiva", ...body },
  });

  assert.equal(created.status, 201, `maintenance creation failed: ${JSON.stringify(created.body)}`);

  return { id: created.body.data.id as string };
}

async function patchStatus(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  id: string,
  body: Record<string, unknown>,
) {
  return requestJson(baseUrl, `/api/v1/maintenance-orders/${id}`, {
    method: "PATCH",
    headers: authHeaders(tenant, user, "manager"),
    body,
  });
}

async function addItem(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  orderId: string,
  body: Record<string, unknown>,
) {
  return requestJson(baseUrl, `/api/v1/maintenance-orders/${orderId}/items`, {
    method: "POST",
    headers: authHeaders(tenant, user, "manager"),
    body,
  });
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
  path: string,
  options: {
    readonly method?: string;
    readonly headers?: Record<string, string>;
    readonly body?: unknown;
  } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
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
