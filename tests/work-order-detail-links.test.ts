import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// C2 — Detalhe de OS enriquecido.
// The single-detail response (GET /api/v1/work-orders/:id) gains a `links` object
// with resolved, tenant-scoped summaries of the cadastros linked in B1 (customer/
// vehicle/team/service catalog). Each summary is a small projection or null. The
// list endpoint stays ids-only and the frozen snapshot fields are untouched.

test("[links] detalhe da OS resolve resumo dos quatro cadastros vinculados", async () => {
  await withRegistryApi(async ({ baseUrl, seed, seedTariff }) => {
    const customer = await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { name: "Cliente Vinculado", document: "12345678901", phone: "+55 41 3333-3333" },
    });
    const vehicle = await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { plate: "ABC1D23", model: "Guincho Pesado" },
    });
    const team = await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { name: "Equipe Guincho Norte" },
    });
    const service = await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { name: "Remocao de veiculo", base_price: 250.5 },
    });
    // Ω3F-3b (#4) — OS com cliente + serviço exige tarifa vigente na tabela do cliente.
    await seedTariff(seed.tenantA.id, service.body.data.id);

    const created = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: {
        title: "OS totalmente vinculada",
        customer_id: customer.body.data.id,
        vehicle_id: vehicle.body.data.id,
        team_id: team.body.data.id,
        service_catalog_id: service.body.data.id,
      },
    });
    const detail = await requestJson(baseUrl, `/api/v1/work-orders/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA),
    });

    assert.equal(detail.status, 200);
    // customer summary
    assert.equal(detail.body.data.links.customer.id, customer.body.data.id);
    assert.equal(detail.body.data.links.customer.name, "Cliente Vinculado");
    assert.equal(detail.body.data.links.customer.isActive, true);
    // vehicle summary
    assert.equal(detail.body.data.links.vehicle.id, vehicle.body.data.id);
    assert.equal(detail.body.data.links.vehicle.plate, "ABC1D23");
    assert.equal(detail.body.data.links.vehicle.model, "Guincho Pesado");
    // team summary
    assert.equal(detail.body.data.links.team.id, team.body.data.id);
    assert.equal(detail.body.data.links.team.name, "Equipe Guincho Norte");
    // service catalog summary
    assert.equal(detail.body.data.links.serviceCatalog.id, service.body.data.id);
    assert.equal(detail.body.data.links.serviceCatalog.name, "Remocao de veiculo");
    assert.equal(detail.body.data.links.serviceCatalog.basePrice, 250.5);
  });
});

test("[links] resumos nao expoem tenant_id nem outros campos internos", async () => {
  await withRegistryApi(async ({ baseUrl, seed }) => {
    const customer = await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { name: "Cliente Seguro", document: "99988877766", phone: "+55 11 90000-0000" },
    });
    const created = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { title: "OS com cliente", customer_id: customer.body.data.id },
    });
    const detail = await requestJson(baseUrl, `/api/v1/work-orders/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA),
    });

    assert.equal(detail.status, 200);
    assert.deepEqual(Object.keys(detail.body.data.links.customer).sort(), ["id", "isActive", "name"]);
    assert.equal(detail.body.data.links.customer.tenantId, undefined);
    // No leak of snapshot-only PII (document/phone) into the summary either.
    assert.equal(detail.body.data.links.customer.document, undefined);
    assert.equal(detail.body.data.links.customer.phone, undefined);
    // The frozen snapshot fields remain on the DTO, unchanged by C2.
    assert.equal(detail.body.data.customerDocument, "99988877766");
    assert.equal(detail.body.data.customerPhone, "+55 11 90000-0000");
  });
});

test("[links] OS sem vinculos retorna objeto links com todos os campos nulos", async () => {
  await withRegistryApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { title: "OS avulsa", customerName: "Cliente Manual" },
    });
    const detail = await requestJson(baseUrl, `/api/v1/work-orders/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA),
    });

    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.links.customer, null);
    assert.equal(detail.body.data.links.vehicle, null);
    assert.equal(detail.body.data.links.team, null);
    assert.equal(detail.body.data.links.serviceCatalog, null);
  });
});

test("[isolamento] detalhe de OS de outra organizacao retorna 404 e nao vaza dados", async () => {
  await withRegistryApi(async ({ baseUrl, seed }) => {
    const customerA = await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { name: "Cliente da Org A" },
    });
    const osA = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { title: "OS da Org A", customer_id: customerA.body.data.id },
    });

    // Same tenant sees the resolved link.
    const ownDetail = await requestJson(baseUrl, `/api/v1/work-orders/${osA.body.data.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA),
    });
    // Another tenant cannot even read the OS, so no summary can leak.
    const crossDetail = await requestJson(baseUrl, `/api/v1/work-orders/${osA.body.data.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB),
    });

    assert.equal(ownDetail.status, 200);
    assert.equal(ownDetail.body.data.links.customer.name, "Cliente da Org A");
    assert.equal(crossDetail.status, 404);
    assert.equal(crossDetail.body.data, undefined);
  });
});

test("[regressao] detalhe de OS sem cadastros mantem 200 e os campos pre-existentes", async () => {
  await withRegistryApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: {
        title: "Atendimento de guincho",
        customerName: "Cliente Exemplo",
        serviceAddress: "Rua Exemplo, 123",
        priority: "high",
      },
    });
    const detail = await requestJson(baseUrl, `/api/v1/work-orders/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA),
    });

    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.code, "OS-000001");
    assert.equal(detail.body.data.title, "Atendimento de guincho");
    assert.equal(detail.body.data.customerName, "Cliente Exemplo");
    assert.equal(detail.body.data.serviceAddress, "Rua Exemplo, 123");
    assert.equal(detail.body.data.priority, "high");
    assert.equal(detail.body.data.status, "open");
    assert.equal(detail.body.data.customerId, null);
    assert.equal(detail.body.data.vehicleId, null);
    assert.equal(detail.body.data.teamId, null);
    assert.equal(detail.body.data.serviceCatalogId, null);
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: User;
  readonly managerB: User;
};

type RegistryApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
  readonly seedTariff: (tenantId: string, serviceCatalogId: string, unitPrice?: number) => Promise<void>;
};

async function withRegistryApi(callback: (context: RegistryApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetWorkOrderRuntimeForTests },
    { resetCustomerRuntimeForTests },
    { resetVehicleRuntimeForTests },
    { resetTeamRuntimeForTests },
    { resetServiceCatalogRuntimeForTests },
    { getMemoryTariffRepositoryForTests, resetTariffRuntimeForTests },
    { getMemoryPriceTableRepositoryForTests, resetPriceTableRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/customers/index.js"),
    import("../src/modules/vehicles/index.js"),
    import("../src/modules/teams/index.js"),
    import("../src/modules/service-catalog/index.js"),
    import("../src/modules/tariffs/tariff.service.js"),
    import("../src/modules/price-tables/price-table.service.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  const resetAll = () => {
    resetPriceTableRuntimeForTests();
    resetTariffRuntimeForTests();
    resetWorkOrderRuntimeForTests();
    resetCustomerRuntimeForTests();
    resetVehicleRuntimeForTests();
    resetTeamRuntimeForTests();
    resetServiceCatalogRuntimeForTests();
  };

  resetAll();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  // Ω3F-3b (#4) — OS com cliente E serviço exige tarifa vigente na tabela do cliente. Semeia uma tarifa
  // publicada para o serviço (tenant-scoped) para os cenários "OS totalmente vinculada" satisfazerem o
  // invariante do create (fora isso, o create → 422 tariff_not_found_for_service).
  const seedTariff = async (tenantId: string, serviceCatalogId: string, unitPrice = 250.5): Promise<void> => {
    const table = await getMemoryPriceTableRepositoryForTests().create({
      tenantId,
      name: `Tabela ${serviceCatalogId}`,
      currency: "BRL",
      version: 1,
      status: "published",
    });
    await getMemoryTariffRepositoryForTests().create({
      tenantId,
      priceTableId: table.id,
      serviceCatalogId,
      unitPrice,
      currency: "BRL",
      origin: "seed",
      status: "active",
    });
  };

  try {
    await callback({ baseUrl, seed, seedTariff });
  } finally {
    await closeServer(server);
    resetAll();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({
    name: "Tenant Links A",
    modules: ["dashboard", "work_orders"],
  });
  const tenantB = service.createTenant({
    name: "Tenant Links B",
    modules: ["dashboard", "work_orders"],
  });
  const managerA = service.createUser({
    tenantId: tenantA.id,
    name: "Manager A",
    email: "links-manager-a@example.com",
    roles: ["manager"],
  });
  const managerB = service.createUser({
    tenantId: tenantB.id,
    name: "Manager B",
    email: "links-manager-b@example.com",
    roles: ["manager"],
  });

  return { tenantA, tenantB, managerA, managerB };
}

function authHeaders(tenant: Tenant, user: User): Record<string, string> {
  return {
    "x-tenant-id": tenant.id,
    "x-user-id": user.id,
    "x-role": "manager",
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
