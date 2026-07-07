import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("POST /service-catalog cria servico e retorna 201 com objeto completo", async () => {
  await withServiceCatalogApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        name: "Guincho de Veiculo Leve",
        description: "Remocao de veiculos ate 3.5t.",
        category: "guincho",
        estimated_duration_minutes: 90,
        base_price: 350.5,
        status: "available",
      },
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.data.name, "Guincho de Veiculo Leve");
    assert.equal(created.body.data.category, "guincho");
    assert.equal(created.body.data.estimatedDurationMinutes, 90);
    assert.equal(created.body.data.basePrice, 350.5);
    assert.equal(created.body.data.status, "available");
    assert.equal(created.body.data.isActive, true);
    assert.equal(created.body.data.tenant_id, undefined);
    assert.equal(created.body.data.tenantId, undefined);
    assert.ok(created.body.data.id);
  });
});

test("POST /service-catalog base_price trafega como number no JSON (nao string/objeto)", async () => {
  await withServiceCatalogApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Servico Precificado", base_price: 1250.75 },
    });
    const detailed = await requestJson(baseUrl, `/api/v1/service-catalog/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(created.status, 201);
    assert.equal(typeof created.body.data.basePrice, "number");
    assert.equal(created.body.data.basePrice, 1250.75);
    assert.equal(typeof detailed.body.data.basePrice, "number");
    assert.equal(detailed.body.data.basePrice, 1250.75);
  });
});

test("POST /service-catalog sem status usa 'active' por padrao e campos opcionais nulos", async () => {
  await withServiceCatalogApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Chaveiro Automotivo" },
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.data.status, "active");
    assert.equal(created.body.data.category, null);
    assert.equal(created.body.data.estimatedDurationMinutes, null);
    assert.equal(created.body.data.basePrice, null);
  });
});

test("GET /service-catalog pagina e filtra por nome/categoria via ?search", async () => {
  await withServiceCatalogApi(async ({ baseUrl, seed }) => {
    await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Guincho Pesado", category: "reboque" },
    });
    await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Troca de Pneu", category: "mecanica" },
    });

    const paged = await requestJson(baseUrl, "/api/v1/service-catalog?limit=1", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const searched = await requestJson(baseUrl, "/api/v1/service-catalog?search=reboque", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(paged.status, 200);
    assert.equal(paged.body.items.length, 1);
    assert.equal(paged.body.pagination.total, 2);
    assert.equal(paged.body.pagination.limit, 1);
    assert.equal(searched.body.items.length, 1);
    assert.equal(searched.body.items[0].name, "Guincho Pesado");
  });
});

test("GET /service-catalog/:id retorna o servico", async () => {
  await withServiceCatalogApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Bateria - Auxilio de Partida" },
    });
    const detailed = await requestJson(baseUrl, `/api/v1/service-catalog/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(detailed.status, 200);
    assert.equal(detailed.body.data.id, created.body.data.id);
    assert.equal(detailed.body.data.name, "Bateria - Auxilio de Partida");
  });
});

test("PATCH /service-catalog/:id atualiza campos", async () => {
  await withServiceCatalogApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Transporte de Container", status: "available", base_price: 100 },
    });
    const updated = await requestJson(baseUrl, `/api/v1/service-catalog/${created.body.data.id}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { status: "suspended", base_price: 275.9, estimated_duration_minutes: 120 },
    });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.status, "suspended");
    assert.equal(updated.body.data.basePrice, 275.9);
    assert.equal(typeof updated.body.data.basePrice, "number");
    assert.equal(updated.body.data.estimatedDurationMinutes, 120);
    assert.equal(updated.body.data.name, "Transporte de Container");
  });
});

test("PATCH /service-catalog/:id { is_active:false } desativa e o filtro ?is_active=false reflete", async () => {
  await withServiceCatalogApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Servico Ativo" },
    });
    const deactivated = await requestJson(baseUrl, `/api/v1/service-catalog/${created.body.data.id}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { is_active: false },
    });
    const inactiveList = await requestJson(baseUrl, "/api/v1/service-catalog?is_active=false", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const activeList = await requestJson(baseUrl, "/api/v1/service-catalog?is_active=true", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(deactivated.status, 200);
    assert.equal(deactivated.body.data.isActive, false);
    assert.equal(inactiveList.body.items.length, 1);
    assert.equal(inactiveList.body.items[0].id, created.body.data.id);
    assert.equal(activeList.body.items.length, 0);
  });
});

test("[isolamento] GET /service-catalog/:id de outra organizacao retorna 404", async () => {
  await withServiceCatalogApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Servico Tenant A" },
    });
    const crossTenant = await requestJson(baseUrl, `/api/v1/service-catalog/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(crossTenant.status, 404);
    assert.equal(crossTenant.body.error.reason, "not_found");
  });
});

test("[isolamento] a lista da organizacao B nunca contem itens da organizacao A", async () => {
  await withServiceCatalogApi(async ({ baseUrl, seed }) => {
    await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Servico A-1" },
    });
    await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Servico A-2" },
    });
    await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
      body: { name: "Servico B-1" },
    });

    const listA = await requestJson(baseUrl, "/api/v1/service-catalog", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const listB = await requestJson(baseUrl, "/api/v1/service-catalog", {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(listA.status, 200);
    assert.equal(listA.body.pagination.total, 2);
    assert.equal(listB.body.pagination.total, 1);
    assert.deepEqual(
      listB.body.items.map((item: { name: string }) => item.name),
      ["Servico B-1"],
    );
  });
});

test("[isolamento] POST forjando tenant_id no corpo e ignorado; o registro pertence ao tenant do claim", async () => {
  await withServiceCatalogApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        name: "Servico Forjado",
        tenant_id: seed.tenantB.id,
        tenantId: seed.tenantB.id,
      },
    });
    const fromClaimTenant = await requestJson(baseUrl, `/api/v1/service-catalog/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const fromForgedTenant = await requestJson(baseUrl, `/api/v1/service-catalog/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(created.status, 201);
    assert.equal(fromClaimTenant.status, 200);
    assert.equal(fromForgedTenant.status, 404);
  });
});

test("[isolamento] POST nome duplicado no mesmo tenant retorna 409; mesmo nome em outro tenant retorna 201", async () => {
  await withServiceCatalogApi(async ({ baseUrl, seed }) => {
    const first = await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Servico Exclusivo" },
    });
    const duplicateSameTenant = await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Servico Exclusivo" },
    });
    const sameNameOtherTenant = await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
      body: { name: "Servico Exclusivo" },
    });

    assert.equal(first.status, 201);
    assert.equal(duplicateSameTenant.status, 409);
    assert.equal(duplicateSameTenant.body.error.reason, "duplicate_name");
    assert.equal(sameNameOtherTenant.status, 201);
  });
});

test("[isolamento] POST sem permissao de escrita (operator) retorna 403; sem headers retorna 403", async () => {
  await withServiceCatalogApi(async ({ baseUrl, seed }) => {
    const asOperator = await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body: { name: "Servico Sem Permissao" },
    });
    const unauthenticated = await requestJson(baseUrl, "/api/v1/service-catalog", {
      method: "POST",
      body: { name: "Servico Anonimo" },
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

type ServiceCatalogApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withServiceCatalogApi(callback: (context: ServiceCatalogApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetServiceCatalogRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/service-catalog/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetServiceCatalogRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed });
  } finally {
    await closeServer(server);
    resetServiceCatalogRuntimeForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({
    name: "Tenant Service Catalog A",
    modules: ["dashboard", "work_orders"],
  });
  const tenantB = service.createTenant({
    name: "Tenant Service Catalog B",
    modules: ["dashboard", "work_orders"],
  });
  const managerA = service.createUser({
    tenantId: tenantA.id,
    name: "Manager A",
    email: "service-catalog-manager-a@example.com",
    roles: ["manager"],
  });
  const managerB = service.createUser({
    tenantId: tenantB.id,
    name: "Manager B",
    email: "service-catalog-manager-b@example.com",
    roles: ["manager"],
  });
  const operatorA = service.createUser({
    tenantId: tenantA.id,
    name: "Operator A",
    email: "service-catalog-operator-a@example.com",
    roles: ["operator"],
  });
  const viewerA = service.createUser({
    tenantId: tenantA.id,
    name: "Viewer A",
    email: "service-catalog-viewer-a@example.com",
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
