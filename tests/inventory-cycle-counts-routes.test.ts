import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("[R7.6] fluxo completo: abre (snapshot do saldo) → conta → fecha (gera ajuste, saldo reflete, concluida)", async () => {
  await withCycleCountApi(async ({ baseUrl, seed }) => {
    const itemA = await createItem(baseUrl, seed, { sku: "CC-A" });
    const itemB = await createItem(baseUrl, seed, { sku: "CC-B" });
    await createMovement(baseUrl, seed, { item_id: itemA.id, type: "entrada", quantidade: 10, unit_cost: 1 });
    await createMovement(baseUrl, seed, { item_id: itemB.id, type: "entrada", quantidade: 5, unit_cost: 1 });

    // Abre a sessão (inventory conta) — snapshot dos saldos atuais.
    const opened = await requestJson(baseUrl, "/api/v1/cycle-counts", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.inventoryA, "inventory"),
      body: {},
    });
    assert.equal(opened.status, 201, JSON.stringify(opened.body));
    assert.equal(opened.body.data.status, "aberta");
    assert.equal(opened.body.data.tenantId, undefined);
    assert.equal(opened.body.data.entries.length, 2);
    const sessionId = opened.body.data.id as string;
    const entryA = findEntry(opened.body.data.entries, itemA.id);
    const entryB = findEntry(opened.body.data.entries, itemB.id);
    assert.equal(entryA.systemQuantity, 10);
    assert.equal(entryB.systemQuantity, 5);
    assert.equal(entryA.countedQuantity, null);

    // Conta: A diverge (8 vs 10 → variância −2); B bate (5 vs 5).
    const countA = await patchEntry(baseUrl, seed, sessionId, entryA.id, { counted_quantity: 8 });
    const countB = await patchEntry(baseUrl, seed, sessionId, entryB.id, { counted_quantity: 5 });
    assert.equal(countA.status, 200, JSON.stringify(countA.body));
    assert.equal(countA.body.data.countedQuantity, 8);
    assert.equal(countB.status, 200);

    // Fecha: gera ajuste real via fluxo F7a para a divergência.
    const closed = await requestJson(baseUrl, `/api/v1/cycle-counts/${sessionId}/close`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.inventoryA, "inventory"),
    });
    assert.equal(closed.status, 200, JSON.stringify(closed.body));
    assert.equal(closed.body.data.status, "concluida");
    assert.equal(closed.body.data.totalVarianceValue, -2); // −2 × avgCost 1
    const closedEntryA = findEntry(closed.body.data.entries, itemA.id);
    const closedEntryB = findEntry(closed.body.data.entries, itemB.id);
    assert.equal(closedEntryA.variance, -2);
    assert.ok(closedEntryA.adjustmentMovementId, "entrada divergente deve linkar o ajuste");
    assert.equal(closedEntryB.variance, null); // sem divergência → sem ajuste
    assert.equal(closedEntryB.adjustmentMovementId, null);

    // Saldo do A reflete o ajuste; B intocado.
    assert.equal(await saldoOf(baseUrl, seed, itemA.id), 8);
    assert.equal(await saldoOf(baseUrl, seed, itemB.id), 5);

    // O ajuste é um StockMovement real, ligado à sessão, com reason da contagem.
    const movements = await requestJson(baseUrl, `/api/v1/stock-movements?item_id=${itemA.id}&type=ajuste`, {
      headers: authHeaders(seed.tenantA, seed.inventoryA, "inventory"),
    });
    assert.equal(movements.body.pagination.total, 1, JSON.stringify(movements.body));
    const adjustment = movements.body.items[0];
    assert.equal(adjustment.quantidadeSinalizada, -2);
    assert.equal(adjustment.cycleCountId, sessionId);
    assert.equal(adjustment.reason, `contagem cíclica ${sessionId}`);
    assert.equal(adjustment.id, closedEntryA.adjustmentMovementId);

    // Filtro por sessão (mecanismo do guard de idempotência do close — P-021):
    // a sessão gera EXATAMENTE 1 ajuste (o item que bateu não gera), sem duplicata.
    const bySession = await requestJson(baseUrl, `/api/v1/stock-movements?cycle_count_id=${sessionId}`, {
      headers: authHeaders(seed.tenantA, seed.inventoryA, "inventory"),
    });
    assert.equal(bySession.body.pagination.total, 1, JSON.stringify(bySession.body));
    assert.equal(bySession.body.items[0].id, closedEntryA.adjustmentMovementId);
  });
});

test("[R7.6] fechar duas vezes → 422 (sessão concluida é terminal)", async () => {
  await withCycleCountApi(async ({ baseUrl, seed }) => {
    await createItem(baseUrl, seed, { sku: "CC-CLOSE" });
    const sessionId = await openSession(baseUrl, seed);

    const first = await requestJson(baseUrl, `/api/v1/cycle-counts/${sessionId}/close`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.inventoryA, "inventory"),
    });
    const second = await requestJson(baseUrl, `/api/v1/cycle-counts/${sessionId}/close`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.inventoryA, "inventory"),
    });

    assert.equal(first.status, 200, JSON.stringify(first.body));
    assert.equal(second.status, 422, JSON.stringify(second.body));
    assert.equal(second.body.error.reason, "invalid_status_transition");
  });
});

test("[R7.6] cancelar sessão → cancelada; contar/fechar depois → 422", async () => {
  await withCycleCountApi(async ({ baseUrl, seed }) => {
    const item = await createItem(baseUrl, seed, { sku: "CC-CANCEL" });
    await createMovement(baseUrl, seed, { item_id: item.id, type: "entrada", quantidade: 3, unit_cost: 1 });
    const opened = await openSessionFull(baseUrl, seed);
    const entry = findEntry(opened.entries, item.id);

    const cancelled = await requestJson(baseUrl, `/api/v1/cycle-counts/${opened.id}/cancel`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.inventoryA, "inventory"),
    });
    assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
    assert.equal(cancelled.body.data.status, "cancelada");

    const countAfter = await patchEntry(baseUrl, seed, opened.id, entry.id, { counted_quantity: 2 });
    const closeAfter = await requestJson(baseUrl, `/api/v1/cycle-counts/${opened.id}/close`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.inventoryA, "inventory"),
    });
    assert.equal(countAfter.status, 422, JSON.stringify(countAfter.body));
    assert.equal(closeAfter.status, 422);
  });
});

test("[R7.6] abre por classe ABC: só itens da classe entram no snapshot", async () => {
  await withCycleCountApi(async ({ baseUrl, seed }) => {
    // Dois itens com consumo distinto → recalcula ABC → A e B.
    const big = await createItem(baseUrl, seed, { sku: "CLS-BIG" });
    await createMovement(baseUrl, seed, { item_id: big.id, type: "entrada", quantidade: 100, unit_cost: 10 });
    await createMovement(baseUrl, seed, { item_id: big.id, type: "saida", quantidade: 90 });
    const small = await createItem(baseUrl, seed, { sku: "CLS-SMALL" });
    await createMovement(baseUrl, seed, { item_id: small.id, type: "entrada", quantidade: 100, unit_cost: 10 });
    await createMovement(baseUrl, seed, { item_id: small.id, type: "saida", quantidade: 5 });

    await requestJson(baseUrl, "/api/v1/inventory-items/abc-recalculate", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    const opened = await requestJson(baseUrl, "/api/v1/cycle-counts", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.inventoryA, "inventory"),
      body: { abc_class: "A" },
    });
    assert.equal(opened.status, 201, JSON.stringify(opened.body));
    assert.equal(opened.body.data.abcClass, "A");
    assert.equal(opened.body.data.entries.length, 1, JSON.stringify(opened.body.data.entries));
    assert.equal(opened.body.data.entries[0].itemId, big.id);
  });
});

test("[isolamento] sessão/entrada cross-tenant → 404; tenant_id forjado ignorado; lista não vaza", async () => {
  await withCycleCountApi(async ({ baseUrl, seed }) => {
    await createItem(baseUrl, seed, { sku: "ISO-A" });
    const openedA = await openSessionFull(baseUrl, seed);

    // B não enxerga a sessão de A.
    const crossGet = await requestJson(baseUrl, `/api/v1/cycle-counts/${openedA.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });
    const crossEntry = await requestJson(baseUrl, `/api/v1/cycle-counts/${openedA.id}/entries/${openedA.entries[0].id}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
      body: { counted_quantity: 1 },
    });
    const crossClose = await requestJson(baseUrl, `/api/v1/cycle-counts/${openedA.id}/close`, {
      method: "POST",
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });

    assert.equal(crossGet.status, 404);
    assert.equal(crossEntry.status, 404, JSON.stringify(crossEntry.body));
    assert.equal(crossClose.status, 404);

    // tenant_id forjado no body é ignorado — a sessão fica no tenant do claim (A).
    const forged = await requestJson(baseUrl, "/api/v1/cycle-counts", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.inventoryA, "inventory"),
      body: { tenant_id: seed.tenantB.id, tenantId: seed.tenantB.id },
    });
    assert.equal(forged.status, 201);
    const forgedFromB = await requestJson(baseUrl, `/api/v1/cycle-counts/${forged.body.data.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });
    assert.equal(forgedFromB.status, 404);

    const listB = await requestJson(baseUrl, "/api/v1/cycle-counts", {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });
    assert.equal(listB.body.pagination.total, 0);
  });
});

test("[RBAC] criar contagem: operator/inventory/manager 201; finance/auditor/viewer 403; leitura finance/auditor 200; anon 403", async () => {
  await withCycleCountApi(async ({ baseUrl, seed }) => {
    for (const [user, role] of [
      [seed.operatorA, "operator"],
      [seed.inventoryA, "inventory"],
      [seed.managerA, "manager"],
    ] as const) {
      const created = await requestJson(baseUrl, "/api/v1/cycle-counts", {
        method: "POST",
        headers: authHeaders(seed.tenantA, user, role),
        body: {},
      });
      assert.equal(created.status, 201, `${role} create should be 201: ${JSON.stringify(created.body)}`);
    }

    for (const [user, role] of [
      [seed.financeA, "finance"],
      [seed.auditorA, "auditor"],
      [seed.viewerA, "viewer"],
    ] as const) {
      const denied = await requestJson(baseUrl, "/api/v1/cycle-counts", {
        method: "POST",
        headers: authHeaders(seed.tenantA, user, role),
        body: {},
      });
      assert.equal(denied.status, 403, `${role} create should be 403: ${JSON.stringify(denied.body)}`);
    }

    const anon = await requestJson(baseUrl, "/api/v1/cycle-counts", { method: "POST", body: {} });
    assert.equal(anon.status, 403);

    // finance/auditor leem (read-only).
    for (const [user, role] of [
      [seed.financeA, "finance"],
      [seed.auditorA, "auditor"],
    ] as const) {
      const read = await requestJson(baseUrl, "/api/v1/cycle-counts", {
        headers: authHeaders(seed.tenantA, user, role),
      });
      assert.equal(read.status, 200, `${role} read should be 200`);
    }
  });
});

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: User;
  readonly managerB: User;
  readonly operatorA: User;
  readonly inventoryA: User;
  readonly financeA: User;
  readonly auditorA: User;
  readonly viewerA: User;
};

type CycleCountApiContext = { readonly baseUrl: string; readonly seed: SeedData };

async function withCycleCountApi(callback: (context: CycleCountApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetInventoryRuntimeForTests },
    { resetCycleCountRuntimeForTests },
    { resetVehicleRuntimeForTests },
    { resetWorkOrderRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/inventory/inventory.service.js"),
    import("../src/modules/inventory/cycle-count.service.js"),
    import("../src/modules/vehicles/index.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetInventoryRuntimeForTests();
  resetCycleCountRuntimeForTests();
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
    resetCycleCountRuntimeForTests();
    resetVehicleRuntimeForTests();
    resetWorkOrderRuntimeForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({ name: "Tenant Contagem A", modules: ["dashboard", "work_orders"] });
  const tenantB = service.createTenant({ name: "Tenant Contagem B", modules: ["dashboard", "work_orders"] });
  const managerA = service.createUser({ tenantId: tenantA.id, name: "Manager A", email: "cc-manager-a@example.com", roles: ["manager"] });
  const managerB = service.createUser({ tenantId: tenantB.id, name: "Manager B", email: "cc-manager-b@example.com", roles: ["manager"] });
  const operatorA = service.createUser({ tenantId: tenantA.id, name: "Operator A", email: "cc-operator-a@example.com", roles: ["operator"] });
  const inventoryA = service.createUser({ tenantId: tenantA.id, name: "Inventory A", email: "cc-inventory-a@example.com", roles: ["inventory"] });
  const financeA = service.createUser({ tenantId: tenantA.id, name: "Finance A", email: "cc-finance-a@example.com", roles: ["finance"] });
  const auditorA = service.createUser({ tenantId: tenantA.id, name: "Auditor A", email: "cc-auditor-a@example.com", roles: ["auditor"] });
  const viewerA = service.createUser({ tenantId: tenantA.id, name: "Viewer A", email: "cc-viewer-a@example.com", roles: ["viewer"] });

  return { tenantA, tenantB, managerA, managerB, operatorA, inventoryA, financeA, auditorA, viewerA };
}

async function createItem(baseUrl: string, seed: SeedData, body: Record<string, unknown>): Promise<{ readonly id: string }> {
  const created = await requestJson(baseUrl, "/api/v1/inventory-items", {
    method: "POST",
    headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    body: { sku: "SKU-DEFAULT", name: "Item de estoque", unit: "un", ...body },
  });

  assert.equal(created.status, 201, `item creation failed: ${JSON.stringify(created.body)}`);

  return { id: created.body.data.id as string };
}

async function createMovement(baseUrl: string, seed: SeedData, body: Record<string, unknown>): Promise<void> {
  const created = await requestJson(baseUrl, "/api/v1/stock-movements", {
    method: "POST",
    headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    body,
  });

  assert.equal(created.status, 201, `movement creation failed: ${JSON.stringify(created.body)}`);
}

async function openSessionFull(
  baseUrl: string,
  seed: SeedData,
): Promise<{ readonly id: string; readonly entries: readonly { readonly id: string; readonly itemId: string }[] }> {
  const opened = await requestJson(baseUrl, "/api/v1/cycle-counts", {
    method: "POST",
    headers: authHeaders(seed.tenantA, seed.inventoryA, "inventory"),
    body: {},
  });

  assert.equal(opened.status, 201, `open session failed: ${JSON.stringify(opened.body)}`);

  return { id: opened.body.data.id as string, entries: opened.body.data.entries };
}

async function openSession(baseUrl: string, seed: SeedData): Promise<string> {
  return (await openSessionFull(baseUrl, seed)).id;
}

async function patchEntry(baseUrl: string, seed: SeedData, sessionId: string, entryId: string, body: Record<string, unknown>) {
  return requestJson(baseUrl, `/api/v1/cycle-counts/${sessionId}/entries/${entryId}`, {
    method: "PATCH",
    headers: authHeaders(seed.tenantA, seed.inventoryA, "inventory"),
    body,
  });
}

async function saldoOf(baseUrl: string, seed: SeedData, itemId: string): Promise<number> {
  const detail = await requestJson(baseUrl, `/api/v1/inventory-items/${itemId}`, {
    headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
  });

  assert.equal(detail.status, 200, JSON.stringify(detail.body));

  return detail.body.data.saldo as number;
}

function findEntry(
  entries: readonly { readonly id: string; readonly itemId: string; readonly systemQuantity: number; readonly countedQuantity: number | null; readonly variance: number | null; readonly adjustmentMovementId: string | null }[],
  itemId: string,
) {
  const entry = entries.find((candidate) => candidate.itemId === itemId);
  assert.ok(entry, `entry for item ${itemId} not found`);

  return entry;
}

function authHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
  return { "x-tenant-id": tenant.id, "x-user-id": user.id, "x-role": role };
}

async function requestJson(
  baseUrl: string,
  routePath: string,
  options: { readonly method?: string; readonly headers?: Record<string, string>; readonly body?: unknown } = {},
) {
  const response = await fetch(`${baseUrl}${routePath}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();

  return { status: response.status, body: text ? JSON.parse(text) : null };
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
