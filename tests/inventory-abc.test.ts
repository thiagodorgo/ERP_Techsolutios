import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { classifyAbc, summarizeAbc } from "../src/modules/inventory/inventory.abc.js";
import {
  computeDailyUsage,
  computeNeedsReorder,
  computeReorderPoint,
  deriveReorder,
} from "../src/modules/inventory/inventory.calculations.js";
import { runReorderPointNotifications } from "../src/modules/inventory/inventory.notifications.js";
import { InMemoryInventoryRepository } from "../src/modules/inventory/inventory.repository.js";
import {
  createMemoryNotificationService,
  getMemoryNotificationRepositoryForTests,
  resetNotificationRuntimeForTests,
} from "../src/modules/notifications/notification.service.js";
import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

// ---------------------------------------------------------------------------
// R7.4 — classifyAbc (pure Pareto classification)
// ---------------------------------------------------------------------------

test("[R7.4] classifyAbc: fronteiras exatas de Pareto (80% → B, 95% → C)", () => {
  // Values 80 / 15 / 5 (total 100): cumulative-before is exactly 0 / 80 / 95.
  const classes = classifyAbc([
    { id: "a", consumptionValue: 80 },
    { id: "b", consumptionValue: 15 },
    { id: "c", consumptionValue: 5 },
  ]);

  assert.equal(classes.get("a"), "A"); // before 0% < 80 → A
  assert.equal(classes.get("b"), "B"); // before EXACTLY 80% → not A, < 95 → B
  assert.equal(classes.get("c"), "C"); // before EXACTLY 95% → not B → C
  assert.deepEqual(summarizeAbc(classes), { A: 1, B: 1, C: 1 });
});

test("[R7.4] classifyAbc: consumo zero → C; total zero → todos C", () => {
  const withZero = classifyAbc([
    { id: "a", consumptionValue: 100 },
    { id: "z", consumptionValue: 0 },
  ]);
  assert.equal(withZero.get("a"), "A");
  assert.equal(withZero.get("z"), "C"); // zero consumption is always class C

  const allZero = classifyAbc([
    { id: "x", consumptionValue: 0 },
    { id: "y", consumptionValue: 0 },
  ]);
  assert.equal(allZero.get("x"), "C");
  assert.equal(allZero.get("y"), "C"); // total 0 → every item C
});

test("[R7.4] classifyAbc: empate é determinístico (ordena por valor, desempata por id)", () => {
  const input = [
    { id: "id-a", consumptionValue: 60 },
    { id: "id-b", consumptionValue: 20 },
    { id: "id-c", consumptionValue: 20 },
  ];
  const forward = classifyAbc(input);
  const reversed = classifyAbc([...input].reverse());

  // Tie between id-b and id-c is broken by id: id-b (before 60% < 80) → A,
  // id-c (before 80%) → B. The result must not depend on input order.
  assert.equal(forward.get("id-a"), "A");
  assert.equal(forward.get("id-b"), "A");
  assert.equal(forward.get("id-c"), "B");
  assert.deepEqual([...reversed.entries()].sort(), [...forward.entries()].sort());
});

// ---------------------------------------------------------------------------
// R7.5 — reorder-point derivation (pure math)
// ---------------------------------------------------------------------------

test("[R7.5] computeDailyUsage / computeReorderPoint / computeNeedsReorder", () => {
  assert.equal(computeDailyUsage(90), 1); // 90 saída na janela / 90 dias
  assert.equal(computeDailyUsage(45, 90), 0.5);
  assert.equal(computeDailyUsage(0), 0);

  assert.equal(computeReorderPoint(1, 10, 5), 15); // 1×10 + 5
  assert.equal(computeReorderPoint(2, 0, 5), 5); // lead 0 → só o estoque de segurança
  assert.equal(computeReorderPoint(1, 10, undefined), 10); // safety default 0
  assert.equal(computeReorderPoint(1, undefined, 5), null); // sem lead time → sem ponto

  assert.equal(computeNeedsReorder(10, 15), true); // saldo ≤ ponto
  assert.equal(computeNeedsReorder(15, 15), true); // igual conta como precisa
  assert.equal(computeNeedsReorder(20, 15), false);
  assert.equal(computeNeedsReorder(0, null), false); // ponto indefinido → nunca dispara
});

test("[R7.5] deriveReorder combina uso, lead time e estoque de segurança", () => {
  assert.deepEqual(
    deriveReorder({ saldo: 10, usageAbs: 90, leadTimeDays: 10, safetyStock: 5 }),
    { reorderPoint: 15, needsReorder: true },
  );
  assert.deepEqual(
    deriveReorder({ saldo: 90, usageAbs: 90, leadTimeDays: 10, safetyStock: 5 }),
    { reorderPoint: 15, needsReorder: false },
  );
  assert.deepEqual(
    deriveReorder({ saldo: 10, usageAbs: 90, leadTimeDays: undefined, safetyStock: 5 }),
    { reorderPoint: null, needsReorder: false },
  );
});

// ---------------------------------------------------------------------------
// R7.5 — reorder-point notification job (idempotent)
// ---------------------------------------------------------------------------

test("[R7.5] runReorderPointNotifications é idempotente: rodar 2× no mesmo dia = 1 aviso", async () => {
  resetNotificationRuntimeForTests();
  const notificationService = createMemoryNotificationService();
  getMemoryNotificationRepositoryForTests();
  const repository = new InMemoryInventoryRepository();
  const tenantId = randomUUID();
  const recipient = randomUUID();

  const item = await repository.createItem({
    tenantId,
    sku: "REORD-1",
    name: "Peça crítica",
    unit: "un",
    minQuantity: 0,
    leadTimeDays: 10,
    safetyStock: 5,
    createdBy: recipient,
    updatedBy: recipient,
  });
  // saldo 10, usage 90 → daily 1 → reorderPoint 15 → 10 ≤ 15 → needsReorder.
  await repository.createMovement({ tenantId, itemId: item.id, type: "entrada", quantidadeSinalizada: 100, unitCost: 1 });
  await repository.createMovement({ tenantId, itemId: item.id, type: "saida", quantidadeSinalizada: -90 });

  const now = new Date("2026-07-09T12:00:00.000Z");
  const context = { tenantId, repository, notificationService, recipientUserIds: [recipient], now };

  const first = await runReorderPointNotifications(context);
  const second = await runReorderPointNotifications(context);

  assert.equal(first.length, 1);
  assert.equal(second.length, 1);
  assert.equal(first[0]?.id, second[0]?.id, "a segunda execução deve retornar o MESMO aviso (dedup por dia)");
  assert.equal(first[0]?.actionUrl, "/purchase-orders"); // sugere reposição, sem automatizar compra
  assert.equal(first[0]?.type, "inventory.reorder_point");

  resetNotificationRuntimeForTests();
});

test("[R7.5] runReorderPointNotifications não avisa item sem lead time (sem ponto de pedido)", async () => {
  resetNotificationRuntimeForTests();
  const notificationService = createMemoryNotificationService();
  const repository = new InMemoryInventoryRepository();
  const tenantId = randomUUID();
  const recipient = randomUUID();

  const item = await repository.createItem({
    tenantId,
    sku: "NOLEAD-1",
    name: "Peça sem lead time",
    unit: "un",
    minQuantity: 0,
    createdBy: recipient,
    updatedBy: recipient,
  });
  await repository.createMovement({ tenantId, itemId: item.id, type: "entrada", quantidadeSinalizada: 1, unitCost: 1 });
  await repository.createMovement({ tenantId, itemId: item.id, type: "saida", quantidadeSinalizada: -1 });

  const created = await runReorderPointNotifications({
    tenantId,
    repository,
    notificationService,
    recipientUserIds: [recipient],
  });

  assert.equal(created.length, 0);
  resetNotificationRuntimeForTests();
});

// ---------------------------------------------------------------------------
// R7.4 — ABC recalc route + R7.5 needs_reorder filter (route-level)
// ---------------------------------------------------------------------------

test("[R7.4] POST /inventory-items/abc-recalculate reclassifica por valor de consumo (Pareto)", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    // Consumption values 800 / 150 / 50 (total 1000) → exact 80% / 15% / 5% cut.
    const itemA = await seedConsumption(baseUrl, seed, "ABC-A", 80);
    const itemB = await seedConsumption(baseUrl, seed, "ABC-B", 15);
    const itemC = await seedConsumption(baseUrl, seed, "ABC-C", 5);

    const recalc = await requestJson(baseUrl, "/api/v1/inventory-items/abc-recalculate", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(recalc.status, 200, JSON.stringify(recalc.body));
    assert.deepEqual(recalc.body.data.counts, { A: 1, B: 1, C: 1 });
    assert.equal(recalc.body.data.total, 3);
    assert.ok(recalc.body.data.recalculatedAt);

    assert.equal((await getItem(baseUrl, seed, itemA)).abcClass, "A");
    assert.equal((await getItem(baseUrl, seed, itemB)).abcClass, "B");
    assert.equal((await getItem(baseUrl, seed, itemC)).abcClass, "C");
  });
});

test("[RBAC] ABC recalc exige inventory_items:update: operator 403; manager/inventory 200", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    const asOperator = await requestJson(baseUrl, "/api/v1/inventory-items/abc-recalculate", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
    });
    const asManager = await requestJson(baseUrl, "/api/v1/inventory-items/abc-recalculate", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const asInventory = await requestJson(baseUrl, "/api/v1/inventory-items/abc-recalculate", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.inventoryA, "inventory"),
    });
    const anon = await requestJson(baseUrl, "/api/v1/inventory-items/abc-recalculate", { method: "POST" });

    assert.equal(asOperator.status, 403, JSON.stringify(asOperator.body)); // sem inventory_items:update
    assert.equal(asManager.status, 200, JSON.stringify(asManager.body));
    assert.equal(asInventory.status, 200, JSON.stringify(asInventory.body));
    assert.equal(anon.status, 403);
  });
});

test("[R7.5] GET /inventory-items?needs_reorder=true retorna só itens no ponto de pedido; DTO expõe reorderPoint", async () => {
  await withInventoryApi(async ({ baseUrl, seed }) => {
    // X: saldo 10, usage 90 → ponto 15 → precisa repor.
    const x = await createItem(baseUrl, seed, { sku: "RE-X", lead_time_days: 10, safety_stock: 5 });
    await createMovement(baseUrl, seed, { item_id: x.id, type: "entrada", quantidade: 100, unit_cost: 1 });
    await createMovement(baseUrl, seed, { item_id: x.id, type: "saida", quantidade: 90 });
    // Y: saldo 90, usage 10 → ponto ~6 → não precisa.
    const y = await createItem(baseUrl, seed, { sku: "RE-Y", lead_time_days: 10, safety_stock: 5 });
    await createMovement(baseUrl, seed, { item_id: y.id, type: "entrada", quantidade: 100, unit_cost: 1 });
    await createMovement(baseUrl, seed, { item_id: y.id, type: "saida", quantidade: 10 });
    // Z: sem lead time → ponto null → nunca precisa.
    const z = await createItem(baseUrl, seed, { sku: "RE-Z" });
    await createMovement(baseUrl, seed, { item_id: z.id, type: "entrada", quantidade: 5, unit_cost: 1 });

    const needs = await requestJson(baseUrl, "/api/v1/inventory-items?needs_reorder=true", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const notNeeds = await requestJson(baseUrl, "/api/v1/inventory-items?needs_reorder=false", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(needs.body.pagination.total, 1, JSON.stringify(needs.body));
    assert.equal(needs.body.items[0].id, x.id);
    assert.equal(needs.body.items[0].reorderPoint, 15);
    assert.equal(needs.body.items[0].needsReorder, true);

    const notNeedsIds = notNeeds.body.items.map((item: { id: string }) => item.id);
    assert.ok(notNeedsIds.includes(y.id));
    assert.ok(notNeedsIds.includes(z.id));
    assert.ok(!notNeedsIds.includes(x.id));
    const zView = notNeeds.body.items.find((item: { id: string }) => item.id === z.id);
    assert.equal(zView.reorderPoint, null); // sem lead time
    assert.equal(zView.needsReorder, false);
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
};

type InventoryApiContext = { readonly baseUrl: string; readonly seed: SeedData };

async function withInventoryApi(callback: (context: InventoryApiContext) => Promise<void>): Promise<void> {
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
  const tenantA = service.createTenant({ name: "Tenant ABC A", modules: ["dashboard", "work_orders"] });
  const tenantB = service.createTenant({ name: "Tenant ABC B", modules: ["dashboard", "work_orders"] });
  const managerA = service.createUser({ tenantId: tenantA.id, name: "Manager A", email: "abc-manager-a@example.com", roles: ["manager"] });
  const managerB = service.createUser({ tenantId: tenantB.id, name: "Manager B", email: "abc-manager-b@example.com", roles: ["manager"] });
  const operatorA = service.createUser({ tenantId: tenantA.id, name: "Operator A", email: "abc-operator-a@example.com", roles: ["operator"] });
  const inventoryA = service.createUser({ tenantId: tenantA.id, name: "Inventory A", email: "abc-inventory-a@example.com", roles: ["inventory"] });

  return { tenantA, tenantB, managerA, managerB, operatorA, inventoryA };
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

/** Creates an item, puts 100 @ cost 10 in, then draws `outflow` out (consumption value = outflow × 10). */
async function seedConsumption(baseUrl: string, seed: SeedData, sku: string, outflow: number): Promise<string> {
  const item = await createItem(baseUrl, seed, { sku });
  await createMovement(baseUrl, seed, { item_id: item.id, type: "entrada", quantidade: 100, unit_cost: 10 });
  await createMovement(baseUrl, seed, { item_id: item.id, type: "saida", quantidade: outflow });

  return item.id;
}

async function getItem(baseUrl: string, seed: SeedData, itemId: string): Promise<{ readonly abcClass: string | null }> {
  const detail = await requestJson(baseUrl, `/api/v1/inventory-items/${itemId}`, {
    headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
  });

  assert.equal(detail.status, 200, JSON.stringify(detail.body));

  return { abcClass: detail.body.data.abcClass as string | null };
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
