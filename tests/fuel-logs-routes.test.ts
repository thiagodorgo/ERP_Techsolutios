import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("POST /fuel-logs cria abastecimento e retorna 201 com objeto completo", async () => {
  await withFuelLogApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "ABC1D23");

    const created = await requestJson(baseUrl, "/api/v1/fuel-logs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        vehicle_id: vehicleId,
        fueled_at: "2026-07-01T10:00:00.000Z",
        fuel_type: "diesel_s10",
        liters: 40,
        total_value: 320.5,
        odometer: 1000,
        station: "Posto Central",
        notes: "Tanque cheio.",
      },
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.data.vehicleId, vehicleId);
    assert.equal(created.body.data.fuelType, "diesel_s10");
    assert.equal(created.body.data.liters, 40);
    assert.equal(created.body.data.totalValue, 320.5);
    assert.equal(created.body.data.odometer, 1000);
    assert.equal(created.body.data.station, "Posto Central");
    assert.equal(created.body.data.isActive, true);
    // First log of the vehicle → baseline, no efficiency.
    assert.equal(created.body.data.kmPerLiter, null);
    assert.equal(created.body.data.distanceKm, null);
    assert.equal(created.body.data.tenant_id, undefined);
    assert.equal(created.body.data.tenantId, undefined);
    assert.ok(created.body.data.id);
  });
});

test("GET /fuel-logs filtra por viatura e por periodo (fueled_at)", async () => {
  await withFuelLogApi(async ({ baseUrl, seed }) => {
    const vehicleV = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "AAA1A11");
    const vehicleW = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "BBB2B22");

    await createFuelLog(baseUrl, seed.tenantA, seed.managerA, {
      vehicle_id: vehicleV,
      fueled_at: "2026-06-01T10:00:00.000Z",
      liters: 30,
      total_value: 200,
      odometer: 500,
    });
    await createFuelLog(baseUrl, seed.tenantA, seed.managerA, {
      vehicle_id: vehicleV,
      fueled_at: "2026-07-01T10:00:00.000Z",
      liters: 30,
      total_value: 200,
      odometer: 800,
    });
    await createFuelLog(baseUrl, seed.tenantA, seed.managerA, {
      vehicle_id: vehicleW,
      fueled_at: "2026-07-01T10:00:00.000Z",
      liters: 30,
      total_value: 200,
      odometer: 100,
    });

    const byVehicle = await requestJson(baseUrl, `/api/v1/fuel-logs?vehicle_id=${vehicleV}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const byPeriod = await requestJson(
      baseUrl,
      `/api/v1/fuel-logs?vehicle_id=${vehicleV}&from=2026-06-15T00:00:00.000Z&to=2026-07-15T00:00:00.000Z`,
      { headers: authHeaders(seed.tenantA, seed.managerA, "manager") },
    );

    assert.equal(byVehicle.status, 200);
    assert.equal(byVehicle.body.pagination.total, 2);
    assert.ok(byVehicle.body.items.every((item: { vehicleId: string }) => item.vehicleId === vehicleV));
    assert.equal(byPeriod.body.pagination.total, 1);
    assert.equal(byPeriod.body.items[0].odometer, 800);
  });
});

test("GET /fuel-logs/:id retorna o abastecimento", async () => {
  await withFuelLogApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "CCC3C33");
    const created = await createFuelLog(baseUrl, seed.tenantA, seed.managerA, {
      vehicle_id: vehicleId,
      liters: 25,
      total_value: 150,
      odometer: 300,
    });

    const detailed = await requestJson(baseUrl, `/api/v1/fuel-logs/${created.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(detailed.status, 200);
    assert.equal(detailed.body.data.id, created.id);
    assert.equal(detailed.body.data.odometer, 300);
  });
});

test("PATCH /fuel-logs/:id atualiza campos", async () => {
  await withFuelLogApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "DDD4D44");
    const created = await createFuelLog(baseUrl, seed.tenantA, seed.managerA, {
      vehicle_id: vehicleId,
      liters: 20,
      total_value: 120,
      odometer: 200,
      station: "Posto A",
    });

    const updated = await requestJson(baseUrl, `/api/v1/fuel-logs/${created.id}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { station: "Posto B", notes: "Reabastecido" },
    });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.station, "Posto B");
    assert.equal(updated.body.data.notes, "Reabastecido");
    assert.equal(updated.body.data.odometer, 200);
  });
});

test("PATCH /fuel-logs/:id { is_active:false } desativa e o filtro ?is_active=false reflete", async () => {
  await withFuelLogApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "EEE5E55");
    const created = await createFuelLog(baseUrl, seed.tenantA, seed.managerA, {
      vehicle_id: vehicleId,
      liters: 20,
      total_value: 120,
      odometer: 200,
    });

    const deactivated = await requestJson(baseUrl, `/api/v1/fuel-logs/${created.id}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { is_active: false },
    });
    const inactiveList = await requestJson(baseUrl, "/api/v1/fuel-logs?is_active=false", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const activeList = await requestJson(baseUrl, "/api/v1/fuel-logs?is_active=true", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(deactivated.status, 200);
    assert.equal(deactivated.body.data.isActive, false);
    assert.equal(inactiveList.body.items.length, 1);
    assert.equal(inactiveList.body.items[0].id, created.id);
    assert.equal(activeList.body.items.length, 0);
  });
});

test("[R1.1] km/L e distancia sao derivados entre abastecimentos consecutivos (null no primeiro)", async () => {
  await withFuelLogApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "FFF6F66");

    const first = await requestJson(baseUrl, "/api/v1/fuel-logs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { vehicle_id: vehicleId, fueled_at: "2026-07-01T08:00:00.000Z", liters: 40, total_value: 200, odometer: 1000 },
    });
    const second = await requestJson(baseUrl, "/api/v1/fuel-logs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { vehicle_id: vehicleId, fueled_at: "2026-07-05T08:00:00.000Z", liters: 40, total_value: 200, odometer: 1400 },
    });

    // Baseline log carries no efficiency.
    assert.equal(first.body.data.kmPerLiter, null);
    assert.equal(first.body.data.distanceKm, null);
    // distance = 1400 - 1000 = 400; km/L = 400 / 40 = 10.
    assert.equal(second.body.data.distanceKm, 400);
    assert.equal(second.body.data.kmPerLiter, 10);

    const firstDetail = await requestJson(baseUrl, `/api/v1/fuel-logs/${first.body.data.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const secondDetail = await requestJson(baseUrl, `/api/v1/fuel-logs/${second.body.data.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(firstDetail.body.data.kmPerLiter, null);
    assert.equal(secondDetail.body.data.kmPerLiter, 10);
    assert.equal(secondDetail.body.data.distanceKm, 400);
  });
});

test("[R1.2] odometro regressivo retorna 422 odometer_regressive", async () => {
  await withFuelLogApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "GGG7G77");
    await createFuelLog(baseUrl, seed.tenantA, seed.managerA, {
      vehicle_id: vehicleId,
      liters: 40,
      total_value: 200,
      odometer: 1400,
    });

    const regressive = await requestJson(baseUrl, "/api/v1/fuel-logs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { vehicle_id: vehicleId, liters: 40, total_value: 200, odometer: 1200 },
    });

    assert.equal(regressive.status, 422);
    assert.equal(regressive.body.error.reason, "odometer_regressive");
  });
});

test("[isolamento] GET /fuel-logs/:id de outra organizacao retorna 404", async () => {
  await withFuelLogApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "HHH8H88");
    const created = await createFuelLog(baseUrl, seed.tenantA, seed.managerA, {
      vehicle_id: vehicleId,
      liters: 40,
      total_value: 200,
      odometer: 100,
    });

    const crossTenant = await requestJson(baseUrl, `/api/v1/fuel-logs/${created.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(crossTenant.status, 404);
    assert.equal(crossTenant.body.error.reason, "not_found");
  });
});

test("[isolamento] a lista da organizacao B nunca contem itens da organizacao A", async () => {
  await withFuelLogApi(async ({ baseUrl, seed }) => {
    const vehicleA = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "AAA1B11");
    const vehicleB = await createVehicle(baseUrl, seed.tenantB, seed.managerB, "BBB1C22");
    await createFuelLog(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleA, liters: 10, total_value: 50, odometer: 10 });
    await createFuelLog(baseUrl, seed.tenantA, seed.managerA, { vehicle_id: vehicleA, liters: 10, total_value: 50, odometer: 20 });
    await createFuelLog(baseUrl, seed.tenantB, seed.managerB, { vehicle_id: vehicleB, liters: 10, total_value: 50, odometer: 30 });

    const listA = await requestJson(baseUrl, "/api/v1/fuel-logs", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const listB = await requestJson(baseUrl, "/api/v1/fuel-logs", {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(listA.body.pagination.total, 2);
    assert.equal(listB.body.pagination.total, 1);
    assert.ok(listB.body.items.every((item: { vehicleId: string }) => item.vehicleId === vehicleB));
  });
});

test("[isolamento] POST forjando tenant_id no corpo e ignorado; o registro pertence ao tenant do claim", async () => {
  await withFuelLogApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "III9I99");
    const created = await requestJson(baseUrl, "/api/v1/fuel-logs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        vehicle_id: vehicleId,
        liters: 10,
        total_value: 50,
        odometer: 100,
        tenant_id: seed.tenantB.id,
        tenantId: seed.tenantB.id,
      },
    });

    const fromClaimTenant = await requestJson(baseUrl, `/api/v1/fuel-logs/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const fromForgedTenant = await requestJson(baseUrl, `/api/v1/fuel-logs/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(created.status, 201);
    assert.equal(fromClaimTenant.status, 200);
    assert.equal(fromForgedTenant.status, 404);
  });
});

test("[isolamento] vehicle_id de outra organizacao retorna 400 invalid_vehicle_reference", async () => {
  await withFuelLogApi(async ({ baseUrl, seed }) => {
    const vehicleB = await createVehicle(baseUrl, seed.tenantB, seed.managerB, "JJJ1J11");

    const crossVehicle = await requestJson(baseUrl, "/api/v1/fuel-logs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { vehicle_id: vehicleB, liters: 10, total_value: 50, odometer: 100 },
    });

    assert.equal(crossVehicle.status, 400);
    assert.equal(crossVehicle.body.error.reason, "invalid_vehicle_reference");
  });
});

test("[rbac] operador lanca (fuel_logs:create); papel sem create e anonimo retornam 403", async () => {
  await withFuelLogApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "KKK1K11");

    // operator HAS fuel_logs:create per RBAC (they log fuel).
    const asOperator = await requestJson(baseUrl, "/api/v1/fuel-logs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body: { vehicle_id: vehicleId, liters: 10, total_value: 50, odometer: 100 },
    });
    // viewer only reads (no fuel_logs:create).
    const asViewer = await requestJson(baseUrl, "/api/v1/fuel-logs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.viewerA, "viewer"),
      body: { vehicle_id: vehicleId, liters: 10, total_value: 50, odometer: 110 },
    });
    const unauthenticated = await requestJson(baseUrl, "/api/v1/fuel-logs", {
      method: "POST",
      body: { vehicle_id: vehicleId, liters: 10, total_value: 50, odometer: 120 },
    });

    assert.equal(asOperator.status, 201);
    assert.equal(asViewer.status, 403);
    assert.equal(unauthenticated.status, 403);
  });
});

test("[validacao] fuel_type invalido e litros negativos retornam 400", async () => {
  await withFuelLogApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "LLL1L11");

    const badFuelType = await requestJson(baseUrl, "/api/v1/fuel-logs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { vehicle_id: vehicleId, fuel_type: "querosene", liters: 10, total_value: 50, odometer: 100 },
    });
    const negativeLiters = await requestJson(baseUrl, "/api/v1/fuel-logs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { vehicle_id: vehicleId, liters: -5, total_value: 50, odometer: 100 },
    });

    assert.equal(badFuelType.status, 400);
    assert.equal(badFuelType.body.error.reason, "invalid_fuel_type");
    assert.equal(negativeLiters.status, 400);
    assert.equal(negativeLiters.body.error.reason, "invalid_liters");
  });
});

test("[validacao] vehicle_id inexistente retorna 400 invalid_vehicle_reference", async () => {
  await withFuelLogApi(async ({ baseUrl, seed }) => {
    const missing = await requestJson(baseUrl, "/api/v1/fuel-logs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { vehicle_id: randomUUID(), liters: 10, total_value: 50, odometer: 100 },
    });

    assert.equal(missing.status, 400);
    assert.equal(missing.body.error.reason, "invalid_vehicle_reference");
  });
});

test("[RN-ABA-01] EXTERNO com fornecedor do MESMO tenant retorna 201 com supplierId + supplierName, sem tenant_id", async () => {
  await withFuelLogApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "SUP1A11");
    const supplierId = await createSupplier(baseUrl, seed.tenantA, seed.managerA, "Rede Posto Alpha");

    const created = await requestJson(baseUrl, "/api/v1/fuel-logs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        vehicle_id: vehicleId,
        station_type: "external",
        supplier_id: supplierId,
        liters: 40,
        total_value: 320,
        odometer: 1000,
      },
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.data.stationType, "external");
    assert.equal(created.body.data.supplierId, supplierId);
    // supplierName é label derivado do módulo suppliers do tenant (§2.8) — nunca dado sensível.
    assert.equal(created.body.data.supplierName, "Rede Posto Alpha");
    // §2.8 — nunca vaza tenant_id (nem em camel/snake).
    assert.equal(created.body.data.tenant_id, undefined);
    assert.equal(created.body.data.tenantId, undefined);
  });
});

test("[RN-ABA-01] EXTERNO explicito sem fornecedor retorna 422 supplier_required_for_external", async () => {
  await withFuelLogApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "SUP2A22");

    const missingSupplier = await requestJson(baseUrl, "/api/v1/fuel-logs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { vehicle_id: vehicleId, station_type: "external", liters: 40, total_value: 200, odometer: 100 },
    });

    assert.equal(missingSupplier.status, 422);
    assert.equal(missingSupplier.body.error.reason, "supplier_required_for_external");
  });
});

test("[RN-ABA-01] INTERNO com fornecedor retorna 422 supplier_not_allowed_for_internal (so marca o log)", async () => {
  await withFuelLogApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "SUP3A33");
    const supplierId = await createSupplier(baseUrl, seed.tenantA, seed.managerA, "Rede Posto Beta");

    const internalWithSupplier = await requestJson(baseUrl, "/api/v1/fuel-logs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        vehicle_id: vehicleId,
        station_type: "internal",
        supplier_id: supplierId,
        liters: 40,
        total_value: 200,
        odometer: 100,
      },
    });
    // INTERNO válido (sem fornecedor) só MARCA o log — sem movimento de estoque (baixa deferida a PR-10/11).
    const internalOk = await requestJson(baseUrl, "/api/v1/fuel-logs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { vehicle_id: vehicleId, station_type: "internal", liters: 40, total_value: 200, odometer: 200 },
    });

    assert.equal(internalWithSupplier.status, 422);
    assert.equal(internalWithSupplier.body.error.reason, "supplier_not_allowed_for_internal");
    assert.equal(internalOk.status, 201);
    assert.equal(internalOk.body.data.stationType, "internal");
    assert.equal(internalOk.body.data.supplierId, null);
    assert.equal(internalOk.body.data.supplierName, null);
  });
});

test("[RN-ABA-08] fornecedor de OUTRA organizacao retorna 400 invalid_supplier_reference (SupplierService.get real, 3 tenants)", async () => {
  await withFuelLogApi(async ({ baseUrl, seed }) => {
    // Fornecedores em A e C; ator do tenant B tenta referenciá-los no seu próprio POST.
    const supplierA = await createSupplier(baseUrl, seed.tenantA, seed.managerA, "Posto do Tenant A");
    const supplierC = await createSupplier(baseUrl, seed.tenantC, seed.managerC, "Posto do Tenant C");
    const vehicleB = await createVehicle(baseUrl, seed.tenantB, seed.managerB, "SUP4B44");

    const crossFromA = await requestJson(baseUrl, "/api/v1/fuel-logs", {
      method: "POST",
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
      body: { vehicle_id: vehicleB, station_type: "external", supplier_id: supplierA, liters: 10, total_value: 50, odometer: 100 },
    });
    const crossFromC = await requestJson(baseUrl, "/api/v1/fuel-logs", {
      method: "POST",
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
      body: { vehicle_id: vehicleB, station_type: "external", supplier_id: supplierC, liters: 10, total_value: 50, odometer: 110 },
    });

    assert.equal(crossFromA.status, 400);
    assert.equal(crossFromA.body.error.reason, "invalid_supplier_reference");
    assert.equal(crossFromC.status, 400);
    assert.equal(crossFromC.body.error.reason, "invalid_supplier_reference");
  });
});

test("[RN-ABA-05] ignore_previous_odometer bypassa 422 na stack HTTP; KM/L fica honesto null se Delta<=0", async () => {
  await withFuelLogApi(async ({ baseUrl, seed }) => {
    const vehicleId = await createVehicle(baseUrl, seed.tenantA, seed.managerA, "SUP5A55");
    await createFuelLog(baseUrl, seed.tenantA, seed.managerA, {
      vehicle_id: vehicleId,
      fueled_at: "2026-07-01T00:00:00.000Z",
      liters: 40,
      total_value: 200,
      odometer: 1400,
    });

    const regressiveBlocked = await requestJson(baseUrl, "/api/v1/fuel-logs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { vehicle_id: vehicleId, liters: 40, total_value: 200, odometer: 1000 },
    });
    const bypassed = await requestJson(baseUrl, "/api/v1/fuel-logs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        vehicle_id: vehicleId,
        fueled_at: "2026-07-05T00:00:00.000Z",
        ignore_previous_odometer: true,
        liters: 40,
        total_value: 200,
        odometer: 1000,
      },
    });

    assert.equal(regressiveBlocked.status, 422);
    assert.equal(regressiveBlocked.body.error.reason, "odometer_regressive");
    assert.equal(bypassed.status, 201);
    assert.equal(bypassed.body.data.odometer, 1000);
    // Delta = 1000 - 1400 <= 0 → KM/L honesto "—"/null (nunca negativo/fabricado).
    assert.equal(bypassed.body.data.kmPerLiter, null);
    assert.equal(bypassed.body.data.distanceKm, null);
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly tenantC: Tenant;
  readonly managerA: User;
  readonly managerB: User;
  readonly managerC: User;
  readonly operatorA: User;
  readonly viewerA: User;
};

type FuelLogApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withFuelLogApi(callback: (context: FuelLogApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetFuelLogRuntimeForTests },
    { resetVehicleRuntimeForTests },
    { resetSupplierRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/fuel-logs/index.js"),
    import("../src/modules/vehicles/index.js"),
    import("../src/modules/suppliers/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetFuelLogRuntimeForTests();
  resetVehicleRuntimeForTests();
  resetSupplierRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed });
  } finally {
    await closeServer(server);
    resetFuelLogRuntimeForTests();
    resetVehicleRuntimeForTests();
    resetSupplierRuntimeForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({ name: "Tenant FuelLogs A", modules: ["dashboard", "work_orders"] });
  const tenantB = service.createTenant({ name: "Tenant FuelLogs B", modules: ["dashboard", "work_orders"] });
  // 3º tenant EFÊMERO (nunca seed) — prova o isolamento multi-tenant do fornecedor com 3 organizações.
  const tenantC = service.createTenant({ name: "Tenant FuelLogs C", modules: ["dashboard", "work_orders"] });
  const managerA = service.createUser({
    tenantId: tenantA.id,
    name: "Manager A",
    email: "fuel-manager-a@example.com",
    roles: ["manager"],
  });
  const managerB = service.createUser({
    tenantId: tenantB.id,
    name: "Manager B",
    email: "fuel-manager-b@example.com",
    roles: ["manager"],
  });
  const managerC = service.createUser({
    tenantId: tenantC.id,
    name: "Manager C",
    email: "fuel-manager-c@example.com",
    roles: ["manager"],
  });
  const operatorA = service.createUser({
    tenantId: tenantA.id,
    name: "Operator A",
    email: "fuel-operator-a@example.com",
    roles: ["operator"],
  });
  const viewerA = service.createUser({
    tenantId: tenantA.id,
    name: "Viewer A",
    email: "fuel-viewer-a@example.com",
    roles: ["viewer"],
  });

  return { tenantA, tenantB, tenantC, managerA, managerB, managerC, operatorA, viewerA };
}

async function createSupplier(baseUrl: string, tenant: Tenant, user: User, name: string): Promise<string> {
  const created = await requestJson(baseUrl, "/api/v1/suppliers", {
    method: "POST",
    headers: authHeaders(tenant, user, "manager"),
    body: { name },
  });

  assert.equal(created.status, 201, `supplier creation failed: ${JSON.stringify(created.body)}`);

  return created.body.data.id as string;
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

async function createFuelLog(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  body: Record<string, unknown>,
): Promise<{ readonly id: string }> {
  const created = await requestJson(baseUrl, "/api/v1/fuel-logs", {
    method: "POST",
    headers: authHeaders(tenant, user, "manager"),
    body,
  });

  assert.equal(created.status, 201, `fuel-log creation failed: ${JSON.stringify(created.body)}`);

  return { id: created.body.data.id as string };
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
