import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("POST /customers cria cliente e retorna 201 com objeto completo", async () => {
  await withCustomerApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        name: "Cliente Exemplo",
        document: "12345678901",
        phone: "+55 41 99999-9999",
        email: "cliente@example.com",
        address: "Rua Exemplo, 123",
        city: "Curitiba",
        state: "PR",
        zip_code: "80000-000",
        notes: "Cliente preferencial.",
      },
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.data.name, "Cliente Exemplo");
    assert.equal(created.body.data.document, "12345678901");
    assert.equal(created.body.data.phone, "+55 41 99999-9999");
    assert.equal(created.body.data.city, "Curitiba");
    assert.equal(created.body.data.isActive, true);
    assert.equal(created.body.data.tenant_id, undefined);
    assert.equal(created.body.data.tenantId, undefined);
    assert.ok(created.body.data.id);
  });
});

test("GET /customers pagina e filtra por nome via ?search", async () => {
  await withCustomerApi(async ({ baseUrl, seed }) => {
    await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Alpha Transportes" },
    });
    await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Beta Logistica" },
    });

    const paged = await requestJson(baseUrl, "/api/v1/customers?limit=1", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const searched = await requestJson(baseUrl, "/api/v1/customers?search=Alpha", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(paged.status, 200);
    assert.equal(paged.body.items.length, 1);
    assert.equal(paged.body.pagination.total, 2);
    assert.equal(paged.body.pagination.limit, 1);
    assert.equal(searched.body.items.length, 1);
    assert.equal(searched.body.items[0].name, "Alpha Transportes");
  });
});

test("GET /customers/:id retorna o cliente", async () => {
  await withCustomerApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Cliente Detalhe" },
    });
    const detailed = await requestJson(baseUrl, `/api/v1/customers/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(detailed.status, 200);
    assert.equal(detailed.body.data.id, created.body.data.id);
    assert.equal(detailed.body.data.name, "Cliente Detalhe");
  });
});

test("PATCH /customers/:id atualiza campos", async () => {
  await withCustomerApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Cliente Editar", phone: "1140028922" },
    });
    const updated = await requestJson(baseUrl, `/api/v1/customers/${created.body.data.id}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { phone: "+55 11 4004-0001" },
    });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.phone, "+55 11 4004-0001");
    assert.equal(updated.body.data.name, "Cliente Editar");
  });
});

test("PATCH /customers/:id { is_active:false } desativa e o filtro ?is_active=false reflete", async () => {
  await withCustomerApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Cliente Ativo" },
    });
    const deactivated = await requestJson(baseUrl, `/api/v1/customers/${created.body.data.id}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { is_active: false },
    });
    const inactiveList = await requestJson(baseUrl, "/api/v1/customers?is_active=false", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const activeList = await requestJson(baseUrl, "/api/v1/customers?is_active=true", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(deactivated.status, 200);
    assert.equal(deactivated.body.data.isActive, false);
    assert.equal(inactiveList.body.items.length, 1);
    assert.equal(inactiveList.body.items[0].id, created.body.data.id);
    assert.equal(activeList.body.items.length, 0);
  });
});

test("[isolamento] GET /customers/:id de outra organizacao retorna 404", async () => {
  await withCustomerApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Cliente Tenant A" },
    });
    const crossTenant = await requestJson(baseUrl, `/api/v1/customers/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(crossTenant.status, 404);
    assert.equal(crossTenant.body.error.reason, "not_found");
  });
});

test("[isolamento] a lista da organizacao B nunca contem itens da organizacao A", async () => {
  await withCustomerApi(async ({ baseUrl, seed }) => {
    await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Cliente A-1" },
    });
    await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Cliente A-2" },
    });
    await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
      body: { name: "Cliente B-1" },
    });

    const listA = await requestJson(baseUrl, "/api/v1/customers", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const listB = await requestJson(baseUrl, "/api/v1/customers", {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(listA.status, 200);
    assert.equal(listA.body.pagination.total, 2);
    assert.equal(listB.body.pagination.total, 1);
    assert.deepEqual(
      listB.body.items.map((item: { name: string }) => item.name),
      ["Cliente B-1"],
    );
  });
});

test("[isolamento] POST forjando tenant_id no corpo e ignorado; o registro pertence ao tenant do claim", async () => {
  await withCustomerApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        name: "Cliente Forjado",
        tenant_id: seed.tenantB.id,
        tenantId: seed.tenantB.id,
      },
    });
    const fromClaimTenant = await requestJson(baseUrl, `/api/v1/customers/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const fromForgedTenant = await requestJson(baseUrl, `/api/v1/customers/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(created.status, 201);
    assert.equal(fromClaimTenant.status, 200);
    assert.equal(fromForgedTenant.status, 404);
  });
});

test("[isolamento] POST documento duplicado no mesmo tenant retorna 409; mesmo documento em outro tenant retorna 201", async () => {
  await withCustomerApi(async ({ baseUrl, seed }) => {
    const first = await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Cliente Doc A", document: "98765432100" },
    });
    const duplicateSameTenant = await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { name: "Cliente Doc A2", document: "98765432100" },
    });
    const sameDocOtherTenant = await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
      body: { name: "Cliente Doc B", document: "98765432100" },
    });

    assert.equal(first.status, 201);
    assert.equal(duplicateSameTenant.status, 409);
    assert.equal(duplicateSameTenant.body.error.reason, "duplicate_document");
    assert.equal(sameDocOtherTenant.status, 201);
  });
});

test("[isolamento] POST sem permissao de escrita (operator) retorna 403; sem headers retorna 403", async () => {
  await withCustomerApi(async ({ baseUrl, seed }) => {
    const asOperator = await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body: { name: "Cliente Sem Permissao" },
    });
    const unauthenticated = await requestJson(baseUrl, "/api/v1/customers", {
      method: "POST",
      body: { name: "Cliente Anonimo" },
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

type CustomerApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withCustomerApi(callback: (context: CustomerApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetCustomerRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/customers/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetCustomerRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed });
  } finally {
    await closeServer(server);
    resetCustomerRuntimeForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({
    name: "Tenant Customers A",
    modules: ["dashboard", "work_orders"],
  });
  const tenantB = service.createTenant({
    name: "Tenant Customers B",
    modules: ["dashboard", "work_orders"],
  });
  const managerA = service.createUser({
    tenantId: tenantA.id,
    name: "Manager A",
    email: "customers-manager-a@example.com",
    roles: ["manager"],
  });
  const managerB = service.createUser({
    tenantId: tenantB.id,
    name: "Manager B",
    email: "customers-manager-b@example.com",
    roles: ["manager"],
  });
  const operatorA = service.createUser({
    tenantId: tenantA.id,
    name: "Operator A",
    email: "customers-operator-a@example.com",
    roles: ["operator"],
  });
  const viewerA = service.createUser({
    tenantId: tenantA.id,
    name: "Viewer A",
    email: "customers-viewer-a@example.com",
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
