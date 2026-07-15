import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("POST /service-quotes congela o preço da Tarifa publicada e retorna 201 (DTO completo)", async () => {
  await withQuoteApi(async ({ baseUrl, seed, seedTariff }) => {
    const serviceCatalogId = randomUUID();
    await seedTariff(seed.tenantA.id, { serviceCatalogId, unitPrice: 175.5 });
    const created = await requestJson(baseUrl, "/api/v1/service-quotes", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { service_catalog_id: serviceCatalogId, quantity: 2 },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.frozenUnitPrice, 175.5);
    assert.equal(created.body.data.frozenTotal, 351);
    assert.equal(created.body.data.frozenCurrency, "BRL");
    assert.equal(created.body.data.priceSource, "tariff");
    assert.equal(created.body.data.status, "draft");
    assert.equal(created.body.data.tenantId, undefined);
    assert.ok(created.body.data.id);
  });
});

test("GET /service-quotes lista com DTO completo (moeda + links) e pagina", async () => {
  await withQuoteApi(async ({ baseUrl, seed, seedTariff }) => {
    const serviceCatalogId = randomUUID();
    await seedTariff(seed.tenantA.id, { serviceCatalogId, unitPrice: 10 });
    await requestJson(baseUrl, "/api/v1/service-quotes", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { service_catalog_id: serviceCatalogId },
    });
    const list = await requestJson(baseUrl, "/api/v1/service-quotes", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(list.status, 200);
    assert.equal(list.body.items.length, 1);
    assert.equal(list.body.items[0].frozenCurrency, "BRL");
    assert.equal(list.body.items[0].priceSource, "tariff");
    assert.equal(list.body.pagination.total, 1);
  });
});

test("POST source=manual congela unit_price informado (201)", async () => {
  await withQuoteApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/service-quotes", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 88, quantity: 3 },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.frozenUnitPrice, 88);
    assert.equal(created.body.data.frozenTotal, 264);
    assert.equal(created.body.data.sourceTariffId, null);
  });
});

test("POST sem tarifa aplicável (source=tariff) → 422 tariff_not_found_for_service", async () => {
  await withQuoteApi(async ({ baseUrl, seed }) => {
    const res = await requestJson(baseUrl, "/api/v1/service-quotes", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { service_catalog_id: randomUUID() },
    });
    assert.equal(res.status, 422);
    assert.equal(res.body.error.reason, "tariff_not_found_for_service");
  });
});

test("POST quantity=0 → 400 invalid_quantity", async () => {
  await withQuoteApi(async ({ baseUrl, seed }) => {
    const res = await requestJson(baseUrl, "/api/v1/service-quotes", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10, quantity: 0 },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.reason, "invalid_quantity");
  });
});

test("POST duplicado (mesma work_order + service ativo) → 409; void libera re-orçar", async () => {
  await withQuoteApi(async ({ baseUrl, seed, seedTariff }) => {
    const serviceCatalogId = randomUUID();
    const workOrderId = randomUUID();
    await seedTariff(seed.tenantA.id, { serviceCatalogId, unitPrice: 10 });
    const first = await requestJson(baseUrl, "/api/v1/service-quotes", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { work_order_id: workOrderId, service_catalog_id: serviceCatalogId },
    });
    const dup = await requestJson(baseUrl, "/api/v1/service-quotes", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { work_order_id: workOrderId, service_catalog_id: serviceCatalogId },
    });
    assert.equal(first.status, 201);
    assert.equal(dup.status, 409);
    assert.equal(dup.body.error.reason, "duplicate_quote_for_service");

    await requestJson(baseUrl, `/api/v1/service-quotes/${first.body.data.id}/status`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { status: "void" },
    });
    const reQuote = await requestJson(baseUrl, "/api/v1/service-quotes", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { work_order_id: workOrderId, service_catalog_id: serviceCatalogId },
    });
    assert.equal(reQuote.status, 201);
  });
});

test("PATCH /:id/status draft→approved; depois PATCH quantidade → 422 quote_not_editable", async () => {
  await withQuoteApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/service-quotes", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10 },
    });
    const approved = await requestJson(baseUrl, `/api/v1/service-quotes/${created.body.data.id}/status`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { status: "approved" },
    });
    const edit = await requestJson(baseUrl, `/api/v1/service-quotes/${created.body.data.id}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { quantity: 5 },
    });
    assert.equal(approved.status, 200);
    assert.equal(approved.body.data.status, "approved");
    assert.equal(edit.status, 422);
    assert.equal(edit.body.error.reason, "quote_not_editable");
  });
});

test("PATCH /:id/status transição inválida (approved→draft) → 422 invalid_status_transition", async () => {
  await withQuoteApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/service-quotes", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10 },
    });
    await requestJson(baseUrl, `/api/v1/service-quotes/${created.body.data.id}/status`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { status: "approved" },
    });
    const invalid = await requestJson(baseUrl, `/api/v1/service-quotes/${created.body.data.id}/status`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { status: "draft" },
    });
    assert.equal(invalid.status, 422);
    assert.equal(invalid.body.error.reason, "invalid_status_transition");
  });
});

test("[isolamento] GET /service-quotes/:id de outra organização → 404", async () => {
  await withQuoteApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/service-quotes", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10 },
    });
    const cross = await requestJson(baseUrl, `/api/v1/service-quotes/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });
    assert.equal(cross.status, 404);
    assert.equal(cross.body.error.reason, "not_found");
  });
});

test("[isolamento] a lista da organização B nunca contém itens da A", async () => {
  await withQuoteApi(async ({ baseUrl, seed }) => {
    await requestJson(baseUrl, "/api/v1/service-quotes", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10 },
    });
    const listB = await requestJson(baseUrl, "/api/v1/service-quotes", {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });
    assert.equal(listB.status, 200);
    assert.equal(listB.body.pagination.total, 0);
  });
});

test("[RBAC] POST sem service_quotes:create (viewer) → 403; sem headers → 403", async () => {
  await withQuoteApi(async ({ baseUrl, seed }) => {
    const asViewer = await requestJson(baseUrl, "/api/v1/service-quotes", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.viewerA, "viewer"),
      body: { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10 },
    });
    const anon = await requestJson(baseUrl, "/api/v1/service-quotes", {
      method: "POST",
      body: { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10 },
    });
    assert.equal(asViewer.status, 403);
    assert.equal(anon.status, 403);
  });
});

test("[RBAC] viewer LÊ a lista (service_quotes:read) → 200", async () => {
  await withQuoteApi(async ({ baseUrl, seed }) => {
    const read = await requestJson(baseUrl, "/api/v1/service-quotes", {
      headers: authHeaders(seed.tenantA, seed.viewerA, "viewer"),
    });
    assert.equal(read.status, 200);
  });
});

test("[RBAC] operator CRIA orçamento (service_quotes:create) → 201", async () => {
  await withQuoteApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/service-quotes", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body: { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 20 },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.frozenUnitPrice, 20);
  });
});

test("[isolamento] POST forjando tenant_id no corpo é ignorado; registro pertence ao claim", async () => {
  await withQuoteApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/service-quotes", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10, tenant_id: seed.tenantB.id, tenantId: seed.tenantB.id },
    });
    const fromForged = await requestJson(baseUrl, `/api/v1/service-quotes/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });
    assert.equal(created.status, 201);
    assert.equal(fromForged.status, 404);
  });
});

// ---------- Ω3F-4b: approve → cria OS + share ----------

test("POST /:id/approve (manager) cria OS: 200 com workOrderId+createdWorkOrderId e status approved; replay → 409", async () => {
  await withQuoteApi(async ({ baseUrl, seed, seedServiceCatalog }) => {
    const serviceCatalogId = await seedServiceCatalog(seed.tenantA.id);
    const created = await requestJson(baseUrl, "/api/v1/service-quotes", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { service_catalog_id: serviceCatalogId, price_source: "manual", unit_price: 120 },
    });
    assert.equal(created.status, 201);

    const approved = await requestJson(baseUrl, `/api/v1/service-quotes/${created.body.data.id}/approve`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { activation_mode: "aplicativo" },
    });
    assert.equal(approved.status, 200);
    assert.equal(approved.body.data.status, "approved");
    assert.ok(approved.body.data.workOrderId);
    assert.equal(approved.body.data.createdWorkOrderId, approved.body.data.workOrderId);

    const replay = await requestJson(baseUrl, `/api/v1/service-quotes/${created.body.data.id}/approve`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {},
    });
    assert.equal(replay.status, 409);
    assert.equal(replay.body.error.reason, "quote_already_approved");
  });
});

test("[RBAC] POST /:id/approve sem service_quotes:approve (viewer) → 403; sem headers → 403", async () => {
  await withQuoteApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/service-quotes", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10 },
    });
    const asViewer = await requestJson(baseUrl, `/api/v1/service-quotes/${created.body.data.id}/approve`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.viewerA, "viewer"),
      body: {},
    });
    const anon = await requestJson(baseUrl, `/api/v1/service-quotes/${created.body.data.id}/approve`, {
      method: "POST",
      body: {},
    });
    assert.equal(asViewer.status, 403);
    assert.equal(anon.status, 403);
  });
});

test("POST /:id/share (manager) devolve shareToken+sharePath; token NÃO aparece no GET /:id", async () => {
  await withQuoteApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/service-quotes", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10 },
    });
    const shared = await requestJson(baseUrl, `/api/v1/service-quotes/${created.body.data.id}/share`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {},
    });
    assert.equal(shared.status, 200);
    assert.ok(shared.body.data.shareToken);
    assert.equal(shared.body.data.sharePath, `/orcamentos/compartilhado/${shared.body.data.shareToken}`);

    // 2ª chamada reusa o mesmo token (idempotente).
    const again = await requestJson(baseUrl, `/api/v1/service-quotes/${created.body.data.id}/share`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {},
    });
    assert.equal(again.body.data.shareToken, shared.body.data.shareToken);

    // §2.8 — o token nunca vaza no DTO normal.
    const got = await requestJson(baseUrl, `/api/v1/service-quotes/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(got.body.data.shareToken, undefined);
    assert.equal(JSON.stringify(got.body).includes(shared.body.data.shareToken), false);
  });
});

test("[RBAC] POST /:id/share sem service_quotes:update (viewer) → 403", async () => {
  await withQuoteApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/service-quotes", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 10 },
    });
    const asViewer = await requestJson(baseUrl, `/api/v1/service-quotes/${created.body.data.id}/share`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.viewerA, "viewer"),
      body: {},
    });
    assert.equal(asViewer.status, 403);
  });
});

// ---------- harness ----------

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: User;
  readonly managerB: User;
  readonly operatorA: User;
  readonly viewerA: User;
};

type SeedTariffFn = (
  tenantId: string,
  opts: { readonly serviceCatalogId: string; readonly customerId?: string; readonly unitPrice: number; readonly currency?: string },
) => Promise<void>;

type SeedServiceCatalogFn = (tenantId: string) => Promise<string>;

type QuoteApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
  readonly seedTariff: SeedTariffFn;
  readonly seedServiceCatalog: SeedServiceCatalogFn;
};

async function withQuoteApi(callback: (context: QuoteApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetServiceQuoteRuntimeForTests },
    { getMemoryTariffRepositoryForTests, resetTariffRuntimeForTests },
    { getMemoryPriceTableRepositoryForTests, resetPriceTableRuntimeForTests },
    { createMemoryServiceCatalogService, resetServiceCatalogRuntimeForTests },
    { resetWorkOrderRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/service-quotes/index.js"),
    import("../src/modules/tariffs/tariff.service.js"),
    import("../src/modules/price-tables/price-table.service.js"),
    import("../src/modules/service-catalog/index.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetPriceTableRuntimeForTests();
  resetTariffRuntimeForTests();
  resetServiceQuoteRuntimeForTests();
  resetServiceCatalogRuntimeForTests();
  resetWorkOrderRuntimeForTests();

  const seedServiceCatalog: SeedServiceCatalogFn = async (tenantId) => {
    const catalogActor = { tenantId, userId: randomUUID(), roles: ["manager"], permissions: [] } as never;
    const created = await createMemoryServiceCatalogService().create(catalogActor, { name: `Serviço ${randomUUID()}` });
    return created.id;
  };

  const seedTariff: SeedTariffFn = async (tenantId, opts) => {
    const table = await getMemoryPriceTableRepositoryForTests().create({
      tenantId,
      name: `Tabela ${randomUUID()}`,
      currency: opts.currency ?? "BRL",
      version: 1,
      status: "published",
    });
    await getMemoryTariffRepositoryForTests().create({
      tenantId,
      priceTableId: table.id,
      serviceCatalogId: opts.serviceCatalogId,
      customerId: opts.customerId,
      unitPrice: opts.unitPrice,
      currency: opts.currency ?? "BRL",
      origin: "seed",
      status: "active",
    });
  };

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed, seedTariff, seedServiceCatalog });
  } finally {
    await closeServer(server);
    resetPriceTableRuntimeForTests();
    resetTariffRuntimeForTests();
    resetServiceQuoteRuntimeForTests();
    resetServiceCatalogRuntimeForTests();
    resetWorkOrderRuntimeForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({ name: "Tenant Quotes A", modules: ["dashboard", "work_orders"] });
  const tenantB = service.createTenant({ name: "Tenant Quotes B", modules: ["dashboard", "work_orders"] });
  const managerA = service.createUser({ tenantId: tenantA.id, name: "Manager A", email: "quotes-manager-a@example.com", roles: ["manager"] });
  const managerB = service.createUser({ tenantId: tenantB.id, name: "Manager B", email: "quotes-manager-b@example.com", roles: ["manager"] });
  const operatorA = service.createUser({ tenantId: tenantA.id, name: "Operator A", email: "quotes-operator-a@example.com", roles: ["operator"] });
  const viewerA = service.createUser({ tenantId: tenantA.id, name: "Viewer A", email: "quotes-viewer-a@example.com", roles: ["viewer"] });
  return { tenantA, tenantB, managerA, managerB, operatorA, viewerA };
}

function authHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
  return { "x-tenant-id": tenant.id, "x-user-id": user.id, "x-role": role };
}

async function requestJson(
  baseUrl: string,
  path: string,
  options: { readonly method?: string; readonly headers?: Record<string, string>; readonly body?: unknown } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");
  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
