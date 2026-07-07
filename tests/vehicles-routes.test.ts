import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("POST /vehicles cria viatura e retorna 201 com objeto completo", async () => {
  await withVehicleApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        plate: "ABC1D23",
        model: "Mercedes Atego 1719",
        type: "guincho",
        year: 2020,
        status: "available",
        notes: "Viatura da matriz.",
      },
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.data.plate, "ABC1D23");
    assert.equal(created.body.data.model, "Mercedes Atego 1719");
    assert.equal(created.body.data.type, "guincho");
    assert.equal(created.body.data.year, 2020);
    assert.equal(created.body.data.status, "available");
    assert.equal(created.body.data.isActive, true);
    assert.equal(created.body.data.tenant_id, undefined);
    assert.equal(created.body.data.tenantId, undefined);
    assert.ok(created.body.data.id);
  });
});

test("POST /vehicles sem status usa 'active' por padrao", async () => {
  await withVehicleApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { plate: "XYZ9K88", model: "Iveco Daily" },
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.data.status, "active");
    assert.equal(created.body.data.type, null);
    assert.equal(created.body.data.year, null);
  });
});

test("GET /vehicles pagina e filtra por modelo via ?search", async () => {
  await withVehicleApi(async ({ baseUrl, seed }) => {
    await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { plate: "AAA1A11", model: "Volkswagen Constellation" },
    });
    await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { plate: "BBB2B22", model: "Ford Cargo" },
    });

    const paged = await requestJson(baseUrl, "/api/v1/vehicles?limit=1", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const searched = await requestJson(baseUrl, "/api/v1/vehicles?search=Constellation", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(paged.status, 200);
    assert.equal(paged.body.items.length, 1);
    assert.equal(paged.body.pagination.total, 2);
    assert.equal(paged.body.pagination.limit, 1);
    assert.equal(searched.body.items.length, 1);
    assert.equal(searched.body.items[0].model, "Volkswagen Constellation");
  });
});

test("GET /vehicles/:id retorna a viatura", async () => {
  await withVehicleApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { plate: "DET4L99", model: "Scania P310" },
    });
    const detailed = await requestJson(baseUrl, `/api/v1/vehicles/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(detailed.status, 200);
    assert.equal(detailed.body.data.id, created.body.data.id);
    assert.equal(detailed.body.data.model, "Scania P310");
  });
});

test("PATCH /vehicles/:id atualiza campos", async () => {
  await withVehicleApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { plate: "EDT1T22", model: "Volvo VM 270", status: "available" },
    });
    const updated = await requestJson(baseUrl, `/api/v1/vehicles/${created.body.data.id}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { status: "maintenance", year: 2019 },
    });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.status, "maintenance");
    assert.equal(updated.body.data.year, 2019);
    assert.equal(updated.body.data.model, "Volvo VM 270");
  });
});

test("PATCH /vehicles/:id { is_active:false } desativa e o filtro ?is_active=false reflete", async () => {
  await withVehicleApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { plate: "ATV1V01", model: "Viatura Ativa" },
    });
    const deactivated = await requestJson(baseUrl, `/api/v1/vehicles/${created.body.data.id}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { is_active: false },
    });
    const inactiveList = await requestJson(baseUrl, "/api/v1/vehicles?is_active=false", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const activeList = await requestJson(baseUrl, "/api/v1/vehicles?is_active=true", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(deactivated.status, 200);
    assert.equal(deactivated.body.data.isActive, false);
    assert.equal(inactiveList.body.items.length, 1);
    assert.equal(inactiveList.body.items[0].id, created.body.data.id);
    assert.equal(activeList.body.items.length, 0);
  });
});

test("[isolamento] GET /vehicles/:id de outra organizacao retorna 404", async () => {
  await withVehicleApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { plate: "TNA1A00", model: "Viatura Tenant A" },
    });
    const crossTenant = await requestJson(baseUrl, `/api/v1/vehicles/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(crossTenant.status, 404);
    assert.equal(crossTenant.body.error.reason, "not_found");
  });
});

test("[isolamento] a lista da organizacao B nunca contem itens da organizacao A", async () => {
  await withVehicleApi(async ({ baseUrl, seed }) => {
    await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { plate: "AAA1A01", model: "Viatura A-1" },
    });
    await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { plate: "AAA2A02", model: "Viatura A-2" },
    });
    await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
      body: { plate: "BBB1B01", model: "Viatura B-1" },
    });

    const listA = await requestJson(baseUrl, "/api/v1/vehicles", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const listB = await requestJson(baseUrl, "/api/v1/vehicles", {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(listA.status, 200);
    assert.equal(listA.body.pagination.total, 2);
    assert.equal(listB.body.pagination.total, 1);
    assert.deepEqual(
      listB.body.items.map((item: { model: string }) => item.model),
      ["Viatura B-1"],
    );
  });
});

test("[isolamento] POST forjando tenant_id no corpo e ignorado; o registro pertence ao tenant do claim", async () => {
  await withVehicleApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        plate: "FRJ1D00",
        model: "Viatura Forjada",
        tenant_id: seed.tenantB.id,
        tenantId: seed.tenantB.id,
      },
    });
    const fromClaimTenant = await requestJson(baseUrl, `/api/v1/vehicles/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const fromForgedTenant = await requestJson(baseUrl, `/api/v1/vehicles/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(created.status, 201);
    assert.equal(fromClaimTenant.status, 200);
    assert.equal(fromForgedTenant.status, 404);
  });
});

test("[isolamento] POST placa duplicada no mesmo tenant retorna 409; mesma placa em outro tenant retorna 201", async () => {
  await withVehicleApi(async ({ baseUrl, seed }) => {
    const first = await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { plate: "DUP1L00", model: "Viatura Placa A" },
    });
    const duplicateSameTenant = await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { plate: "DUP1L00", model: "Viatura Placa A2" },
    });
    const samePlateOtherTenant = await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
      body: { plate: "DUP1L00", model: "Viatura Placa B" },
    });

    assert.equal(first.status, 201);
    assert.equal(duplicateSameTenant.status, 409);
    assert.equal(duplicateSameTenant.body.error.reason, "duplicate_plate");
    assert.equal(samePlateOtherTenant.status, 201);
  });
});

test("[isolamento] POST sem permissao de escrita (operator) retorna 403; sem headers retorna 403", async () => {
  await withVehicleApi(async ({ baseUrl, seed }) => {
    const asOperator = await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body: { plate: "NPR1M00", model: "Viatura Sem Permissao" },
    });
    const unauthenticated = await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      body: { plate: "ANO1N00", model: "Viatura Anonima" },
    });

    assert.equal(asOperator.status, 403);
    assert.equal(unauthenticated.status, 403);
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: User;
  readonly managerB: User;
  readonly operatorA: User;
  readonly viewerA: User;
};

type VehicleApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withVehicleApi(callback: (context: VehicleApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetVehicleRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/vehicles/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetVehicleRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed });
  } finally {
    await closeServer(server);
    resetVehicleRuntimeForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({
    name: "Tenant Vehicles A",
    modules: ["dashboard", "work_orders"],
  });
  const tenantB = service.createTenant({
    name: "Tenant Vehicles B",
    modules: ["dashboard", "work_orders"],
  });
  const managerA = service.createUser({
    tenantId: tenantA.id,
    name: "Manager A",
    email: "vehicles-manager-a@example.com",
    roles: ["manager"],
  });
  const managerB = service.createUser({
    tenantId: tenantB.id,
    name: "Manager B",
    email: "vehicles-manager-b@example.com",
    roles: ["manager"],
  });
  const operatorA = service.createUser({
    tenantId: tenantA.id,
    name: "Operator A",
    email: "vehicles-operator-a@example.com",
    roles: ["operator"],
  });
  const viewerA = service.createUser({
    tenantId: tenantA.id,
    name: "Viewer A",
    email: "vehicles-viewer-a@example.com",
    roles: ["viewer"],
  });

  return { tenantA, tenantB, managerA, managerB, operatorA, viewerA };
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
