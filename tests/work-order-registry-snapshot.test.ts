import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// B1 — OS integrada + snapshot.
// The work order gains 4 optional cadastro references (customer/vehicle/team/
// service catalog). When customer_id is provided on create, the backend derives
// a point-in-time snapshot of the customer's name/document/phone. Old OS (no
// reference) keep working with their stored snapshot.

test("[snapshot] customer_id congela nome/documento/telefone no momento da criacao da OS", async () => {
  await withRegistryApi(async ({ baseUrl, seed }) => {
    const customer = await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: {
        name: "Transportes XYZ",
        document: "12345678901",
        phone: "+55 41 3333-3333",
      },
    });
    const customerId = customer.body.data.id as string;

    const firstOs = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: {
        title: "Guincho para Transportes XYZ",
        customer_id: customerId,
      },
    });
    const firstOsId = firstOs.body.data.id as string;

    // Rename the customer AFTER the first OS is created.
    const renamed = await requestJson(baseUrl, `/api/v1/customers/${customerId}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { name: "XYZ Logistica" },
    });

    // The already-created OS keeps the frozen snapshot.
    const frozen = await requestJson(baseUrl, `/api/v1/work-orders/${firstOsId}`, {
      headers: authHeaders(seed.tenantA, seed.managerA),
    });

    // A new OS for the same customer takes a fresh snapshot.
    const secondOs = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: {
        title: "Segunda OS para o mesmo cliente",
        customer_id: customerId,
      },
    });

    assert.equal(customer.status, 201);
    assert.equal(firstOs.status, 201);
    assert.equal(firstOs.body.data.customerName, "Transportes XYZ");
    assert.equal(firstOs.body.data.customerDocument, "12345678901");
    assert.equal(firstOs.body.data.customerPhone, "+55 41 3333-3333");
    assert.equal(firstOs.body.data.customerId, customerId);

    assert.equal(renamed.status, 200);
    assert.equal(renamed.body.data.name, "XYZ Logistica");

    assert.equal(frozen.status, 200);
    assert.equal(frozen.body.data.customerName, "Transportes XYZ");
    assert.equal(frozen.body.data.customerId, customerId);

    assert.equal(secondOs.status, 201);
    assert.equal(secondOs.body.data.customerName, "XYZ Logistica");
    assert.equal(secondOs.body.data.customerId, customerId);
  });
});

test("[snapshot] sem customer_id o caminho existente e preservado (customerName do cliente, customerId null)", async () => {
  await withRegistryApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: {
        title: "OS avulsa",
        customerName: "Cliente Manual",
        customerDocument: "99988877766",
        customerPhone: "+55 11 90000-0000",
      },
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.data.customerName, "Cliente Manual");
    assert.equal(created.body.data.customerDocument, "99988877766");
    assert.equal(created.body.data.customerPhone, "+55 11 90000-0000");
    assert.equal(created.body.data.customerId, null);
    assert.equal(created.body.data.vehicleId, null);
    assert.equal(created.body.data.teamId, null);
    assert.equal(created.body.data.serviceCatalogId, null);
  });
});

test("[referencia] customer_id inexistente retorna 400 invalid_customer_reference", async () => {
  await withRegistryApi(async ({ baseUrl, seed }) => {
    const missing = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: {
        title: "OS com cliente inexistente",
        customer_id: randomUUID(),
      },
    });

    assert.equal(missing.status, 400);
    assert.equal(missing.body.error.reason, "invalid_customer_reference");
  });
});

test("[isolamento] customer_id de outra organizacao retorna 400 (nao resolve entre tenants)", async () => {
  await withRegistryApi(async ({ baseUrl, seed }) => {
    const customerB = await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      headers: authHeaders(seed.tenantB, seed.managerB),
      body: { name: "Cliente da Organizacao B", document: "11122233344" },
    });

    const crossTenant = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: {
        title: "OS tentando usar cliente de outra org",
        customer_id: customerB.body.data.id,
      },
    });

    assert.equal(customerB.status, 201);
    assert.equal(crossTenant.status, 400);
    assert.equal(crossTenant.body.error.reason, "invalid_customer_reference");
  });
});

test("[referencia] vehicle_id valido e armazenado e ecoado; invalido retorna 400 invalid_vehicle_reference", async () => {
  await withRegistryApi(async ({ baseUrl, seed }) => {
    const vehicle = await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { plate: "ABC1D23", model: "Guincho Pesado" },
    });
    const vehicleId = vehicle.body.data.id as string;

    const withVehicle = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { title: "OS com veiculo", vehicle_id: vehicleId },
    });
    const invalid = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { title: "OS com veiculo invalido", vehicle_id: randomUUID() },
    });

    assert.equal(vehicle.status, 201);
    assert.equal(withVehicle.status, 201);
    assert.equal(withVehicle.body.data.vehicleId, vehicleId);
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.reason, "invalid_vehicle_reference");
  });
});

test("[referencia] team_id valido e armazenado e ecoado; invalido retorna 400 invalid_team_reference", async () => {
  await withRegistryApi(async ({ baseUrl, seed }) => {
    const team = await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { name: "Equipe Guincho Norte" },
    });
    const teamId = team.body.data.id as string;

    const withTeam = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { title: "OS com equipe", team_id: teamId },
    });
    const invalid = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { title: "OS com equipe invalida", team_id: randomUUID() },
    });

    assert.equal(team.status, 201);
    assert.equal(withTeam.status, 201);
    assert.equal(withTeam.body.data.teamId, teamId);
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.reason, "invalid_team_reference");
  });
});

test("[referencia] service_catalog_id valido e armazenado e ecoado; invalido retorna 400 invalid_service_catalog_reference", async () => {
  await withRegistryApi(async ({ baseUrl, seed }) => {
    const service = await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { name: "Remocao de veiculo" },
    });
    const serviceId = service.body.data.id as string;

    const withService = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { title: "OS com servico", service_catalog_id: serviceId },
    });
    const invalid = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { title: "OS com servico invalido", service_catalog_id: randomUUID() },
    });

    assert.equal(service.status, 201);
    assert.equal(withService.status, 201);
    assert.equal(withService.body.data.serviceCatalogId, serviceId);
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.reason, "invalid_service_catalog_reference");
  });
});

test("[regressao] criar OS sem nenhum dos novos campos ainda retorna 201 com ids nulos", async () => {
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

    assert.equal(created.status, 201);
    assert.equal(created.body.data.code, "OS-000001");
    assert.equal(created.body.data.customerName, "Cliente Exemplo");
    assert.equal(created.body.data.priority, "high");
    assert.equal(created.body.data.customerId, null);
    assert.equal(created.body.data.vehicleId, null);
    assert.equal(created.body.data.teamId, null);
    assert.equal(created.body.data.serviceCatalogId, null);
  });
});

test("[integrada] as quatro referencias juntas sao validadas, armazenadas e a snapshot do cliente aplicada", async () => {
  await withRegistryApi(async ({ baseUrl, seed, seedTariff }) => {
    const customer = await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { name: "Cliente Integrado", document: "55544433322", phone: "1140021234" },
    });
    const vehicle = await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { plate: "XYZ9K88", model: "Prancha" },
    });
    const team = await requestJson(baseUrl, "/api/v1/teams", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { name: "Equipe Integrada" },
    });
    const service = await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { name: "Servico Integrado" },
    });
    // Ω3F-3b (#4) — OS com cliente + serviço exige tarifa vigente na tabela do cliente.
    await seedTariff(seed.tenantA.id, service.body.data.id);

    const created = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: {
        title: "OS totalmente integrada",
        customer_id: customer.body.data.id,
        vehicle_id: vehicle.body.data.id,
        team_id: team.body.data.id,
        service_catalog_id: service.body.data.id,
        // Client-sent snapshot must be overridden by the server-derived one.
        customerName: "NAO USAR ESTE NOME",
      },
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.data.customerId, customer.body.data.id);
    assert.equal(created.body.data.vehicleId, vehicle.body.data.id);
    assert.equal(created.body.data.teamId, team.body.data.id);
    assert.equal(created.body.data.serviceCatalogId, service.body.data.id);
    assert.equal(created.body.data.customerName, "Cliente Integrado");
    assert.equal(created.body.data.customerDocument, "55544433322");
    assert.equal(created.body.data.customerPhone, "1140021234");
  });
});

// Ω3F-3b (#4, spec §1.2) — no create, o tipo de serviço precisa ter tarifa vigente na tabela do cliente.
// A guarda só dispara com AMBOS (cliente E serviço) presentes; reusa resolveApplicableTariff (tenant-scoped).

test("[#4] OS com cliente + servico SEM tarifa vigente → 422 tariff_not_found_for_service", async () => {
  await withRegistryApi(async ({ baseUrl, seed }) => {
    const customer = await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { name: "Cliente Sem Tarifa", document: "10000000001", phone: "1130001111" },
    });
    const service = await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { name: "Servico Sem Tarifa" },
    });
    const created = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { title: "OS sem tarifa", customer_id: customer.body.data.id, service_catalog_id: service.body.data.id },
    });
    assert.equal(created.status, 422);
    assert.equal(created.body.error.reason, "tariff_not_found_for_service");
  });
});

test("[#4] OS com cliente + servico COM tarifa publicada → 201", async () => {
  await withRegistryApi(async ({ baseUrl, seed, seedTariff }) => {
    const customer = await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { name: "Cliente Com Tarifa", document: "10000000002", phone: "1130002222" },
    });
    const service = await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { name: "Servico Com Tarifa" },
    });
    await seedTariff(seed.tenantA.id, service.body.data.id);
    const created = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { title: "OS com tarifa", customer_id: customer.body.data.id, service_catalog_id: service.body.data.id },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.serviceCatalogId, service.body.data.id);
  });
});

test("[#4] OS so com servico (sem cliente) NAO exige tarifa → 201 (guarda so dispara com ambos)", async () => {
  await withRegistryApi(async ({ baseUrl, seed }) => {
    const service = await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { name: "Servico Avulso" },
    });
    const created = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { title: "OS so servico", service_catalog_id: service.body.data.id, customerName: "Cliente Manual" },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.serviceCatalogId, service.body.data.id);
    assert.equal(created.body.data.customerId, null);
  });
});

test("[#4/isolamento] tarifa publicada SO em outra org e invisivel → 422 (nunca vaza cross-tenant)", async () => {
  await withRegistryApi(async ({ baseUrl, seed, seedTariff }) => {
    const customer = await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { name: "Cliente Org A", document: "10000000003", phone: "1130003333" },
    });
    const service = await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { name: "Servico Org A" },
    });
    // Tarifa existe, mas SÓ na org B — invisível para a org A (resolver tenant-scoped).
    await seedTariff(seed.tenantB.id, service.body.data.id);
    const created = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { title: "OS cross-tenant tarifa", customer_id: customer.body.data.id, service_catalog_id: service.body.data.id },
    });
    assert.equal(created.status, 422);
    assert.equal(created.body.error.reason, "tariff_not_found_for_service");
  });
});

test("[isolamento/validacao] vehicle_id de outra org retorna 400; customer_id mal formado retorna 400 invalid_uuid", async () => {
  await withRegistryApi(async ({ baseUrl, seed }) => {
    const vehicleB = await requestJson(baseUrl, "/api/v1/vehicles", {
      method: "POST",
      headers: authHeaders(seed.tenantB, seed.managerB),
      body: { plate: "BBB2C33", model: "Veiculo da Org B" },
    });

    const crossTenantVehicle = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { title: "OS com veiculo de outra org", vehicle_id: vehicleB.body.data.id },
    });
    const malformed = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA),
      body: { title: "OS com uuid invalido", customer_id: "nao-e-um-uuid" },
    });

    assert.equal(vehicleB.status, 201);
    assert.equal(crossTenantVehicle.status, 400);
    assert.equal(crossTenantVehicle.body.error.reason, "invalid_vehicle_reference");
    assert.equal(malformed.status, 400);
    assert.equal(malformed.body.error.reason, "invalid_uuid");
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
  // publicada (tenant-scoped) para o serviço, satisfazendo o invariante do create no cenário integrado.
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
    name: "Tenant Registry A",
    modules: ["dashboard", "work_orders"],
  });
  const tenantB = service.createTenant({
    name: "Tenant Registry B",
    modules: ["dashboard", "work_orders"],
  });
  const managerA = service.createUser({
    tenantId: tenantA.id,
    name: "Manager A",
    email: "registry-manager-a@example.com",
    roles: ["manager"],
  });
  const managerB = service.createUser({
    tenantId: tenantB.id,
    name: "Manager B",
    email: "registry-manager-b@example.com",
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
