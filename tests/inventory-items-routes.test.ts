import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("POST /inventory-items cria item (201) sem vazar tenant; saldo derivado começa em 0", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/inventory-items", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        sku: "FLT-001",
        name: "Filtro de óleo",
        unit: "un",
        min_quantity: 5,
        max_quantity: 50,
        lead_time_days: 7,
        safety_stock: 2,
      },
    });

    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.data.sku, "FLT-001");
    assert.equal(created.body.data.name, "Filtro de óleo");
    assert.equal(created.body.data.unit, "un");
    assert.equal(created.body.data.minQuantity, 5);
    assert.equal(created.body.data.maxQuantity, 50);
    assert.equal(created.body.data.leadTimeDays, 7);
    assert.equal(created.body.data.safetyStock, 2);
    assert.equal(created.body.data.avgCost, 0);
    assert.equal(created.body.data.saldo, 0);
    assert.equal(created.body.data.belowMin, true); // saldo 0 < min 5 (derivado)
    assert.equal(created.body.data.abcClass, null);
    assert.equal(created.body.data.isActive, true);
    assert.equal(created.body.data.tenantId, undefined);
    assert.equal(created.body.data.tenant_id, undefined);

    const detail = await requestJson(baseUrl, `/api/v1/inventory-items/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.saldo, 0);
    assert.equal(detail.body.data.belowMin, true);
  });
});

test("[P6] sku duplicado no MESMO tenant → 409 duplicate_sku; mesmo sku em OUTRO tenant → 201", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const first = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "SKU-P6" });
    const duplicated = await requestJson(baseUrl, "/api/v1/inventory-items", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: itemBody({ sku: "SKU-P6" }),
    });
    const otherTenant = await requestJson(baseUrl, "/api/v1/inventory-items", {
      method: "POST",
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
      body: itemBody({ sku: "SKU-P6" }),
    });

    assert.ok(first.id);
    assert.equal(duplicated.status, 409, JSON.stringify(duplicated.body));
    assert.equal(duplicated.body.error.code, "INVENTORY_ITEM_CONFLICT");
    assert.equal(duplicated.body.error.reason, "duplicate_sku");
    assert.equal(otherTenant.status, 201, JSON.stringify(otherTenant.body));
  });
});

test("PATCH atualiza campos, troca sku com unique check (409 quando colide) e desativa logicamente", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "SKU-A" });
    const target = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "SKU-B" });

    const updated = await patchItem(baseUrl, seed.tenantA, seed.managerA, "manager", target.id, {
      name: "Correia dentada",
      unit: "cx",
      min_quantity: 3,
      safety_stock: 1,
    });
    const skuCollision = await patchItem(baseUrl, seed.tenantA, seed.managerA, "manager", target.id, { sku: "SKU-A" });
    const skuChanged = await patchItem(baseUrl, seed.tenantA, seed.managerA, "manager", target.id, { sku: "SKU-C" });
    const deactivated = await patchItem(baseUrl, seed.tenantA, seed.managerA, "manager", target.id, { is_active: false });
    const inactiveList = await requestJson(baseUrl, "/api/v1/inventory-items?is_active=false", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(updated.status, 200, JSON.stringify(updated.body));
    assert.equal(updated.body.data.name, "Correia dentada");
    assert.equal(updated.body.data.unit, "cx");
    assert.equal(updated.body.data.minQuantity, 3);
    assert.equal(updated.body.data.safetyStock, 1);
    assert.equal(skuCollision.status, 409, JSON.stringify(skuCollision.body));
    assert.equal(skuCollision.body.error.reason, "duplicate_sku");
    assert.equal(skuChanged.status, 200, JSON.stringify(skuChanged.body));
    assert.equal(skuChanged.body.data.sku, "SKU-C");
    assert.equal(deactivated.body.data.isActive, false);
    assert.equal(inactiveList.body.items.length, 1);
    assert.equal(inactiveList.body.items[0].id, target.id);
  });
});

test("GET /inventory-items busca por sku E por nome; filtro is_active; DELETE não existe (404)", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const filtro = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "FLT-010", name: "Filtro de ar" });
    await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "COR-020", name: "Correia Poly-V" });

    const bySku = await requestJson(baseUrl, "/api/v1/inventory-items?search=flt-01", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const byName = await requestJson(baseUrl, "/api/v1/inventory-items?search=poly", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const activeList = await requestJson(baseUrl, "/api/v1/inventory-items?is_active=true", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const deleteAttempt = await requestJson(baseUrl, `/api/v1/inventory-items/${filtro.id}`, {
      method: "DELETE",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(bySku.body.pagination.total, 1);
    assert.equal(bySku.body.items[0].sku, "FLT-010");
    assert.equal(byName.body.pagination.total, 1);
    assert.equal(byName.body.items[0].sku, "COR-020");
    assert.equal(activeList.body.pagination.total, 2);
    assert.equal(deleteAttempt.status, 404); // desativação é lógica, via PATCH is_active=false
  });
});

test("[R7.1] below_min é filtro DERIVADO real: saldo (Σ movimentos) comparado a min_quantity", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const low = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "LOW-1", min_quantity: 10 });
    const ok = await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "OK-1", min_quantity: 1 });
    await createMovement(baseUrl, seed.tenantA, seed.managerA, { item_id: low.id, type: "entrada", quantidade: 5, unit_cost: 2 });
    await createMovement(baseUrl, seed.tenantA, seed.managerA, { item_id: ok.id, type: "entrada", quantidade: 5, unit_cost: 2 });

    const below = await requestJson(baseUrl, "/api/v1/inventory-items?below_min=true", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const notBelow = await requestJson(baseUrl, "/api/v1/inventory-items?below_min=false", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(below.body.pagination.total, 1, JSON.stringify(below.body));
    assert.equal(below.body.items[0].id, low.id);
    assert.equal(below.body.items[0].saldo, 5);
    assert.equal(below.body.items[0].belowMin, true);
    assert.equal(notBelow.body.pagination.total, 1);
    assert.equal(notBelow.body.items[0].id, ok.id);

    // Reabastecer o item baixo remove-o do filtro derivado.
    await createMovement(baseUrl, seed.tenantA, seed.managerA, { item_id: low.id, type: "entrada", quantidade: 10, unit_cost: 2 });
    const afterRestock = await requestJson(baseUrl, "/api/v1/inventory-items?below_min=true", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    assert.equal(afterRestock.body.pagination.total, 0, JSON.stringify(afterRestock.body));
  });
});

test("[isolamento] cross-tenant GET 404; lista de B não contém itens de A; tenant_id forjado é ignorado", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    await createItem(baseUrl, seed.tenantA, seed.managerA, { sku: "ISO-1" });
    const itemB = await createItem(baseUrl, seed.tenantB, seed.managerB, { sku: "ISO-B" });

    const forged = await requestJson(baseUrl, "/api/v1/inventory-items", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: itemBody({ sku: "ISO-FORGED", tenant_id: seed.tenantB.id, tenantId: seed.tenantB.id }),
    });
    const forgedFromB = await requestJson(baseUrl, `/api/v1/inventory-items/${forged.body.data.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });
    const crossTenantGet = await requestJson(baseUrl, `/api/v1/inventory-items/${itemB.id}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const crossTenantPatch = await patchItem(baseUrl, seed.tenantA, seed.managerA, "manager", itemB.id, { name: "hack" });
    const listA = await requestJson(baseUrl, "/api/v1/inventory-items", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const listB = await requestJson(baseUrl, "/api/v1/inventory-items", {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(forged.status, 201);
    assert.equal(forgedFromB.status, 404); // o item forjado ficou no tenant A
    assert.equal(crossTenantGet.status, 404);
    assert.equal(crossTenantPatch.status, 404);
    assert.equal(listA.body.pagination.total, 2); // ISO-1 + forjado
    assert.equal(listB.body.pagination.total, 1);
    assert.ok(listB.body.items.every((item: { sku: string }) => item.sku === "ISO-B"));
  });
});

test("[rbac] inventory gerencia (201/200); operator/finance/auditor/viewer criam 403; anon 403; field_technician sem leitura", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const asInventory = await requestJson(baseUrl, "/api/v1/inventory-items", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.inventoryA, "inventory"),
      body: itemBody({ sku: "INV-1" }),
    });
    assert.equal(asInventory.status, 201, JSON.stringify(asInventory.body));

    const inventoryPatch = await patchItem(
      baseUrl,
      seed.tenantA,
      seed.inventoryA,
      "inventory",
      asInventory.body.data.id,
      { min_quantity: 9 },
    );
    assert.equal(inventoryPatch.status, 200, JSON.stringify(inventoryPatch.body));

    for (const [user, role] of [
      [seed.operatorA, "operator"],
      [seed.financeA, "finance"],
      [seed.auditorA, "auditor"],
      [seed.viewerA, "viewer"],
    ] as const) {
      const denied = await requestJson(baseUrl, "/api/v1/inventory-items", {
        method: "POST",
        headers: authHeaders(seed.tenantA, user, role),
        body: itemBody({ sku: `DENY-${role}` }),
      });
      assert.equal(denied.status, 403, `${role} create should be 403: ${JSON.stringify(denied.body)}`);
    }

    const operatorPatch = await patchItem(
      baseUrl,
      seed.tenantA,
      seed.operatorA,
      "operator",
      asInventory.body.data.id,
      { min_quantity: 1 },
    );
    const anonCreate = await requestJson(baseUrl, "/api/v1/inventory-items", {
      method: "POST",
      body: itemBody({ sku: "ANON-1" }),
    });
    assert.equal(operatorPatch.status, 403);
    assert.equal(anonCreate.status, 403);

    for (const [user, role] of [
      [seed.operatorA, "operator"],
      [seed.financeA, "finance"],
      [seed.auditorA, "auditor"],
      [seed.viewerA, "viewer"],
      [seed.inventoryA, "inventory"],
    ] as const) {
      const read = await requestJson(baseUrl, "/api/v1/inventory-items", {
        headers: authHeaders(seed.tenantA, user, role),
      });
      assert.equal(read.status, 200, `${role} read should be 200`);
    }

    const techRead = await requestJson(baseUrl, "/api/v1/inventory-items", {
      headers: authHeaders(seed.tenantA, seed.techA, "field_technician"),
    });
    assert.equal(techRead.status, 403); // matrix F7: field_technician sem acesso
  });
});

test("[validação] sku/name/unit ausentes → 400; min negativa → 400; abc_class/avg_cost NÃO são graváveis via API", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.managerA, "manager");

    const missingSku = await requestJson(baseUrl, "/api/v1/inventory-items", {
      method: "POST",
      headers,
      body: { name: "Sem sku", unit: "un" },
    });
    const missingName = await requestJson(baseUrl, "/api/v1/inventory-items", {
      method: "POST",
      headers,
      body: { sku: "VAL-1", unit: "un" },
    });
    const missingUnit = await requestJson(baseUrl, "/api/v1/inventory-items", {
      method: "POST",
      headers,
      body: { sku: "VAL-2", name: "Sem unidade" },
    });
    const negativeMin = await requestJson(baseUrl, "/api/v1/inventory-items", {
      method: "POST",
      headers,
      body: itemBody({ sku: "VAL-3", min_quantity: -1 }),
    });

    assert.equal(missingSku.status, 400);
    assert.equal(missingSku.body.error.reason, "required_field");
    assert.equal(missingName.status, 400);
    assert.equal(missingUnit.status, 400);
    assert.equal(negativeMin.status, 400);
    assert.equal(negativeMin.body.error.reason, "invalid_minQuantity");

    // F7b é dona de abc_class; avg_cost pertence ao fluxo de entrada (R7.3).
    const smuggled = await requestJson(baseUrl, "/api/v1/inventory-items", {
      method: "POST",
      headers,
      body: itemBody({ sku: "VAL-4", abc_class: "A", abcClass: "A", avg_cost: 99, avgCost: 99 }),
    });
    assert.equal(smuggled.status, 201);
    assert.equal(smuggled.body.data.abcClass, null);
    assert.equal(smuggled.body.data.avgCost, 0);
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
  const tenantA = service.createTenant({ name: "Tenant Estoque A", modules: ["dashboard", "work_orders"] });
  const tenantB = service.createTenant({ name: "Tenant Estoque B", modules: ["dashboard", "work_orders"] });
  const managerA = service.createUser({ tenantId: tenantA.id, name: "Manager A", email: "inv-manager-a@example.com", roles: ["manager"] });
  const managerB = service.createUser({ tenantId: tenantB.id, name: "Manager B", email: "inv-manager-b@example.com", roles: ["manager"] });
  const operatorA = service.createUser({ tenantId: tenantA.id, name: "Operator A", email: "inv-operator-a@example.com", roles: ["operator"] });
  const financeA = service.createUser({ tenantId: tenantA.id, name: "Finance A", email: "inv-finance-a@example.com", roles: ["finance"] });
  const auditorA = service.createUser({ tenantId: tenantA.id, name: "Auditor A", email: "inv-auditor-a@example.com", roles: ["auditor"] });
  const viewerA = service.createUser({ tenantId: tenantA.id, name: "Viewer A", email: "inv-viewer-a@example.com", roles: ["viewer"] });
  const inventoryA = service.createUser({ tenantId: tenantA.id, name: "Inventory A", email: "inv-inventory-a@example.com", roles: ["inventory"] });
  const techA = service.createUser({ tenantId: tenantA.id, name: "Tech A", email: "inv-tech-a@example.com", roles: ["field_technician"] });

  return { tenantA, tenantB, managerA, managerB, operatorA, financeA, auditorA, viewerA, inventoryA, techA };
}

function itemBody(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    sku: "SKU-DEFAULT",
    name: "Item de estoque",
    unit: "un",
    ...overrides,
  };
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
    body: itemBody(body),
  });

  assert.equal(created.status, 201, `item creation failed: ${JSON.stringify(created.body)}`);

  return { id: created.body.data.id as string };
}

async function createMovement(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  body: Record<string, unknown>,
): Promise<{ readonly id: string }> {
  const created = await requestJson(baseUrl, "/api/v1/stock-movements", {
    method: "POST",
    headers: authHeaders(tenant, user, "manager"),
    body,
  });

  assert.equal(created.status, 201, `movement creation failed: ${JSON.stringify(created.body)}`);

  return { id: created.body.data.id as string };
}

async function patchItem(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  role: string,
  id: string,
  body: Record<string, unknown>,
) {
  return requestJson(baseUrl, `/api/v1/inventory-items/${id}`, {
    method: "PATCH",
    headers: authHeaders(tenant, user, role),
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
