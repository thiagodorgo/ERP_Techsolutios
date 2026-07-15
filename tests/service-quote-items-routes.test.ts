import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// Ω3F-4a — rotas /api/v1/service-quotes/:serviceQuoteId/items: RBAC (service_quotes:*),
// congelamento via API, total agregado no DTO, idempotência 409, delete lógico 204 e isolamento.

test("POST items congela o preço da Tarifa publicada e retorna 201 (DTO sem tenant_id)", async () => {
  await withQuoteItemApi(async ({ baseUrl, seed, seedTariff, createQuote }) => {
    const quoteId = await createQuote(seed.tenantA, seed.managerA);
    const serviceCatalogId = randomUUID();
    await seedTariff(seed.tenantA.id, { serviceCatalogId, unitPrice: 175.5 });
    const created = await requestJson(baseUrl, `/api/v1/service-quotes/${quoteId}/items`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { service_catalog_id: serviceCatalogId, description: "Guincho leve", quantity: 2 },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.unitAmount, 175.5);
    assert.equal(created.body.data.totalAmount, 351);
    assert.equal(created.body.data.currency, "BRL");
    assert.equal(created.body.data.source, "tariff");
    assert.equal(created.body.data.serviceQuoteId, quoteId);
    assert.equal(created.body.data.tenantId, undefined);
    assert.equal(created.body.data.tenant_id, undefined);
    assert.ok(created.body.data.tariffId);
    assert.ok(created.body.data.id);
  });
});

test("GET items lista com totalAmount AGREGADO no DTO (o front nunca soma)", async () => {
  await withQuoteItemApi(async ({ baseUrl, seed, createQuote }) => {
    const quoteId = await createQuote(seed.tenantA, seed.managerA);
    for (const [description, unitAmount] of [["Guincho", 150.5], ["Pedágio", 12.25]] as const) {
      const res = await requestJson(baseUrl, `/api/v1/service-quotes/${quoteId}/items`, {
        method: "POST",
        headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
        body: { source: "manual", description, unit_amount: unitAmount },
      });
      assert.equal(res.status, 201);
    }
    const list = await requestJson(baseUrl, `/api/v1/service-quotes/${quoteId}/items`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(list.status, 200);
    assert.equal(list.body.items.length, 2);
    assert.equal(list.body.totalAmount, 162.75);
    assert.equal(list.body.currency, "BRL");
  });
});

test("PATCH quantity recomputa o total do preço JÁ congelado (200)", async () => {
  await withQuoteItemApi(async ({ baseUrl, seed, createQuote }) => {
    const quoteId = await createQuote(seed.tenantA, seed.managerA);
    const created = await requestJson(baseUrl, `/api/v1/service-quotes/${quoteId}/items`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { source: "manual", description: "Pedágio", unit_amount: 12.5 },
    });
    const patched = await requestJson(baseUrl, `/api/v1/service-quotes/${quoteId}/items/${created.body.data.id}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { quantity: 4 },
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.data.unitAmount, 12.5);
    assert.equal(patched.body.data.totalAmount, 50);
  });
});

test("DELETE lógico → 204; item some da lista e do total agregado", async () => {
  await withQuoteItemApi(async ({ baseUrl, seed, createQuote }) => {
    const quoteId = await createQuote(seed.tenantA, seed.managerA);
    const created = await requestJson(baseUrl, `/api/v1/service-quotes/${quoteId}/items`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { source: "manual", description: "Pedágio", unit_amount: 10 },
    });
    const removed = await requestJson(baseUrl, `/api/v1/service-quotes/${quoteId}/items/${created.body.data.id}`, {
      method: "DELETE",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(removed.status, 204);
    const list = await requestJson(baseUrl, `/api/v1/service-quotes/${quoteId}/items`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(list.body.items.length, 0);
    assert.equal(list.body.totalAmount, 0);
  });
});

test("409 idempotência: replay do mesmo client_action_id via rota → duplicate_quote_item", async () => {
  await withQuoteItemApi(async ({ baseUrl, seed, createQuote }) => {
    const quoteId = await createQuote(seed.tenantA, seed.managerA);
    const body = { source: "manual", description: "Pedágio", unit_amount: 10, client_action_id: "act-rota-1" };
    const first = await requestJson(baseUrl, `/api/v1/service-quotes/${quoteId}/items`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body,
    });
    const replay = await requestJson(baseUrl, `/api/v1/service-quotes/${quoteId}/items`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body,
    });
    assert.equal(first.status, 201);
    assert.equal(replay.status, 409);
    assert.equal(replay.body.error.reason, "duplicate_quote_item");
  });
});

test("[isolamento] orçamento de outra organização → 404 (POST e GET); nada vaza", async () => {
  await withQuoteItemApi(async ({ baseUrl, seed, createQuote }) => {
    const quoteId = await createQuote(seed.tenantA, seed.managerA);
    const crossCreate = await requestJson(baseUrl, `/api/v1/service-quotes/${quoteId}/items`, {
      method: "POST",
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
      body: { source: "manual", description: "x", unit_amount: 10 },
    });
    const crossList = await requestJson(baseUrl, `/api/v1/service-quotes/${quoteId}/items`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });
    assert.equal(crossCreate.status, 404);
    assert.equal(crossCreate.body.error.reason, "quote_not_found");
    assert.equal(crossList.status, 404);
  });
});

test("[RBAC] POST sem service_quotes:create (viewer) → 403; sem headers → 403", async () => {
  await withQuoteItemApi(async ({ baseUrl, seed, createQuote }) => {
    const quoteId = await createQuote(seed.tenantA, seed.managerA);
    const asViewer = await requestJson(baseUrl, `/api/v1/service-quotes/${quoteId}/items`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.viewerA, "viewer"),
      body: { source: "manual", description: "x", unit_amount: 10 },
    });
    const anon = await requestJson(baseUrl, `/api/v1/service-quotes/${quoteId}/items`, {
      method: "POST",
      body: { source: "manual", description: "x", unit_amount: 10 },
    });
    assert.equal(asViewer.status, 403);
    assert.equal(anon.status, 403);
  });
});

test("[RBAC] viewer LÊ a lista (service_quotes:read) → 200; operator CRIA → 201", async () => {
  await withQuoteItemApi(async ({ baseUrl, seed, createQuote }) => {
    const quoteId = await createQuote(seed.tenantA, seed.managerA);
    const read = await requestJson(baseUrl, `/api/v1/service-quotes/${quoteId}/items`, {
      headers: authHeaders(seed.tenantA, seed.viewerA, "viewer"),
    });
    assert.equal(read.status, 200);
    const created = await requestJson(baseUrl, `/api/v1/service-quotes/${quoteId}/items`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body: { source: "manual", description: "Pedágio", unit_amount: 20 },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.unitAmount, 20);
  });
});

// ---------- harness (espelho de tests/work-order-financials-routes.test.ts) ----------

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
  opts: { readonly serviceCatalogId: string; readonly unitPrice: number; readonly currency?: string },
) => Promise<void>;

type QuoteItemApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
  readonly seedTariff: SeedTariffFn;
  readonly createQuote: (tenant: Tenant, user: User) => Promise<string>;
};

async function withQuoteItemApi(callback: (context: QuoteItemApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetServiceQuoteItemRuntimeForTests },
    { resetServiceQuoteRuntimeForTests },
    { getMemoryTariffRepositoryForTests, resetTariffRuntimeForTests },
    { getMemoryPriceTableRepositoryForTests, resetPriceTableRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/service-quote-items/index.js"),
    import("../src/modules/service-quotes/index.js"),
    import("../src/modules/tariffs/tariff.service.js"),
    import("../src/modules/price-tables/price-table.service.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  const resetAll = () => {
    resetPriceTableRuntimeForTests();
    resetTariffRuntimeForTests();
    resetServiceQuoteRuntimeForTests();
    resetServiceQuoteItemRuntimeForTests();
  };
  resetAll();

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

  // Cria o orçamento-pai em `draft` via a rota real de service-quotes (preço manual só para
  // materializar o cabeçalho); os itens são exercitados sobre ele.
  const createQuote = async (tenant: Tenant, user: User): Promise<string> => {
    const created = await requestJson(baseUrl, "/api/v1/service-quotes", {
      method: "POST",
      headers: authHeaders(tenant, user, "manager"),
      body: { service_catalog_id: randomUUID(), price_source: "manual", unit_price: 1 },
    });
    assert.equal(created.status, 201);
    return created.body.data.id as string;
  };

  try {
    await callback({ baseUrl, seed, seedTariff, createQuote });
  } finally {
    await closeServer(server);
    resetAll();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({ name: "Tenant Quote Items A", modules: ["dashboard", "work_orders"] });
  const tenantB = service.createTenant({ name: "Tenant Quote Items B", modules: ["dashboard", "work_orders"] });
  const managerA = service.createUser({ tenantId: tenantA.id, name: "Manager A", email: "quote-items-manager-a@example.com", roles: ["manager"] });
  const managerB = service.createUser({ tenantId: tenantB.id, name: "Manager B", email: "quote-items-manager-b@example.com", roles: ["manager"] });
  const operatorA = service.createUser({ tenantId: tenantA.id, name: "Operator A", email: "quote-items-operator-a@example.com", roles: ["operator"] });
  const viewerA = service.createUser({ tenantId: tenantA.id, name: "Viewer A", email: "quote-items-viewer-a@example.com", roles: ["viewer"] });
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
