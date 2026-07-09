import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Role } from "../src/modules/core-saas/permissions/catalog.js";
import type { NotificationRecipientCandidate } from "../src/modules/notifications/notification.types.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const addDays = (base: Date, days: number): Date => new Date(base.getTime() + days * MS_PER_DAY);

// ---------------------------------------------------------------------------
// F10 — POST /api/v1/notifications/fleet-alerts/run wires the four idempotent
// domain producers (maintenance due / fine due / insurance renewal / reorder
// point) so notifications actually appear for the tenant's management users.
// ---------------------------------------------------------------------------

test("[F10] fleet-alerts run creates notifications for management recipients and they appear in GET /notifications", async () => {
  await withFleetAlertsApi(async (ctx) => {
    const now = new Date();
    const tenantA = randomUUID();
    const managerA = randomUUID();
    const adminA = randomUUID();
    const operatorA = randomUUID();
    const inactiveMgrA = randomUUID();

    await seedAllDomains(ctx, tenantA, now);
    ctx.notificationRepo.setRecipientCandidatesForTests(tenantA, [
      candidate(managerA, ["manager"]),
      candidate(adminA, ["tenant_admin"]),
      candidate(operatorA, ["operator"]),
      candidate(inactiveMgrA, ["manager"], "inactive"),
    ]);

    const run = await requestJson(ctx.baseUrl, "/api/v1/notifications/fleet-alerts/run", {
      method: "POST",
      headers: authHeaders(tenantA, managerA, "manager"),
    });

    assert.equal(run.status, 200);
    // 2 management recipients: maintenance 1×2, fines 1×2, insurance 1×3 windows×2, reorder 1×2.
    assert.deepEqual(
      { maintenance: run.body.data.maintenance, fines: run.body.data.fines, insurance: run.body.data.insurance, reorder: run.body.data.reorder },
      { maintenance: 2, fines: 2, insurance: 6, reorder: 2 },
    );
    assert.equal(typeof run.body.data.ranAt, "string");

    const managerInbox = await requestJson(ctx.baseUrl, "/api/v1/notifications", {
      headers: authHeaders(tenantA, managerA, "manager"),
    });
    assert.equal(managerInbox.status, 200);
    assert.equal(managerInbox.body.data.length, 6);
    const types = new Set(managerInbox.body.data.map((n: { type: string }) => n.type));
    assert.ok(types.has("maintenance.due"));
    assert.ok(types.has("fine.due"));
    assert.ok(types.has("insurance.renewal"));
    assert.ok(types.has("inventory.reorder_point"));

    const adminInbox = await requestJson(ctx.baseUrl, "/api/v1/notifications", {
      headers: authHeaders(tenantA, adminA, "tenant_admin"),
    });
    assert.equal(adminInbox.body.data.length, 6);

    // Non-management candidate never receives fleet alerts.
    const operatorInbox = await requestJson(ctx.baseUrl, "/api/v1/notifications", {
      headers: authHeaders(tenantA, operatorA, "operator"),
    });
    assert.equal(operatorInbox.body.data.length, 0);
  });
});

test("[F10] running the endpoint twice in the same window is idempotent (same totals, no duplicates)", async () => {
  await withFleetAlertsApi(async (ctx) => {
    const now = new Date();
    const tenantA = randomUUID();
    const managerA = randomUUID();
    const adminA = randomUUID();

    await seedAllDomains(ctx, tenantA, now);
    ctx.notificationRepo.setRecipientCandidatesForTests(tenantA, [
      candidate(managerA, ["manager"]),
      candidate(adminA, ["tenant_admin"]),
    ]);

    const first = await requestJson(ctx.baseUrl, "/api/v1/notifications/fleet-alerts/run", {
      method: "POST",
      headers: authHeaders(tenantA, managerA, "manager"),
    });
    const second = await requestJson(ctx.baseUrl, "/api/v1/notifications/fleet-alerts/run", {
      method: "POST",
      headers: authHeaders(tenantA, managerA, "manager"),
    });

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.deepEqual(summaryOf(first.body.data), summaryOf(second.body.data));

    const afterFirst = 6;
    const managerInbox = await requestJson(ctx.baseUrl, "/api/v1/notifications", {
      headers: authHeaders(tenantA, managerA, "manager"),
    });
    // Still exactly 6 — the second run produced no duplicates.
    assert.equal(managerInbox.body.data.length, afterFirst);
    const adminInbox = await requestJson(ctx.baseUrl, "/api/v1/notifications", {
      headers: authHeaders(tenantA, adminA, "tenant_admin"),
    });
    assert.equal(adminInbox.body.data.length, afterFirst);
  });
});

test("[F10] RBAC: a user without the notifications management permission gets 403", async () => {
  await withFleetAlertsApi(async (ctx) => {
    const now = new Date();
    const tenantA = randomUUID();
    const managerA = randomUUID();

    await seedAllDomains(ctx, tenantA, now);
    ctx.notificationRepo.setRecipientCandidatesForTests(tenantA, [candidate(managerA, ["manager"])]);

    // viewer holds notifications:read but NOT notifications:update.
    const viewerDenied = await requestJson(ctx.baseUrl, "/api/v1/notifications/fleet-alerts/run", {
      method: "POST",
      headers: authHeaders(tenantA, randomUUID(), "viewer"),
    });
    // Manager role but permissions forged down to a set lacking the gate permission.
    const forgedDenied = await requestJson(ctx.baseUrl, "/api/v1/notifications/fleet-alerts/run", {
      method: "POST",
      headers: authHeaders(tenantA, randomUUID(), "manager", ["notifications:read"]),
    });

    assert.equal(viewerDenied.status, 403);
    assert.equal(viewerDenied.body.error.reason, "permission_required");
    assert.equal(forgedDenied.status, 403);
    assert.equal(forgedDenied.body.error.reason, "permission_required");
  });
});

test("[F10] RBAC: manager and tenant_admin can run fleet alerts (200)", async () => {
  await withFleetAlertsApi(async (ctx) => {
    const now = new Date();
    const tenantA = randomUUID();
    const managerA = randomUUID();

    await seedAllDomains(ctx, tenantA, now);
    ctx.notificationRepo.setRecipientCandidatesForTests(tenantA, [candidate(managerA, ["manager"])]);

    const asManager = await requestJson(ctx.baseUrl, "/api/v1/notifications/fleet-alerts/run", {
      method: "POST",
      headers: authHeaders(tenantA, randomUUID(), "manager"),
    });
    const asAdmin = await requestJson(ctx.baseUrl, "/api/v1/notifications/fleet-alerts/run", {
      method: "POST",
      headers: authHeaders(tenantA, randomUUID(), "tenant_admin"),
    });

    assert.equal(asManager.status, 200);
    assert.equal(asAdmin.status, 200);
  });
});

test("[F10] tenant isolation: a tenant A run never touches tenant B; a forged body tenantId is ignored", async () => {
  await withFleetAlertsApi(async (ctx) => {
    const now = new Date();
    const tenantA = randomUUID();
    const tenantB = randomUUID();
    const managerA = randomUUID();
    const managerB = randomUUID();

    await seedAllDomains(ctx, tenantA, now);
    await seedAllDomains(ctx, tenantB, now);
    ctx.notificationRepo.setRecipientCandidatesForTests(tenantA, [candidate(managerA, ["manager"])]);
    ctx.notificationRepo.setRecipientCandidatesForTests(tenantB, [candidate(managerB, ["manager"])]);

    // Claim tenant A, but the body tries to forge tenant B — it must be ignored.
    const run = await requestJson(ctx.baseUrl, "/api/v1/notifications/fleet-alerts/run", {
      method: "POST",
      headers: authHeaders(tenantA, managerA, "manager"),
      body: { tenantId: tenantB },
    });

    assert.equal(run.status, 200);
    // 1 recipient in tenant A → maintenance 1, fines 1, insurance 3, reorder 1.
    assert.deepEqual(summaryOf(run.body.data), { maintenance: 1, fines: 1, insurance: 3, reorder: 1 });

    const inboxA = await requestJson(ctx.baseUrl, "/api/v1/notifications", {
      headers: authHeaders(tenantA, managerA, "manager"),
    });
    const inboxB = await requestJson(ctx.baseUrl, "/api/v1/notifications", {
      headers: authHeaders(tenantB, managerB, "manager"),
    });

    assert.equal(inboxA.body.data.length, 6);
    // Tenant B untouched: neither the run nor the forged body reached it.
    assert.equal(inboxB.body.data.length, 0);
  });
});

test("[F10] tenant isolation: a tenant B run only creates notifications for tenant B", async () => {
  await withFleetAlertsApi(async (ctx) => {
    const now = new Date();
    const tenantA = randomUUID();
    const tenantB = randomUUID();
    const managerA = randomUUID();
    const managerB = randomUUID();

    await seedAllDomains(ctx, tenantA, now);
    await seedAllDomains(ctx, tenantB, now);
    ctx.notificationRepo.setRecipientCandidatesForTests(tenantA, [candidate(managerA, ["manager"])]);
    ctx.notificationRepo.setRecipientCandidatesForTests(tenantB, [candidate(managerB, ["manager"])]);

    const run = await requestJson(ctx.baseUrl, "/api/v1/notifications/fleet-alerts/run", {
      method: "POST",
      headers: authHeaders(tenantB, managerB, "manager"),
    });
    assert.equal(run.status, 200);

    const inboxB = await requestJson(ctx.baseUrl, "/api/v1/notifications", {
      headers: authHeaders(tenantB, managerB, "manager"),
    });
    const inboxA = await requestJson(ctx.baseUrl, "/api/v1/notifications", {
      headers: authHeaders(tenantA, managerA, "manager"),
    });

    assert.equal(inboxB.body.data.length, 6);
    assert.equal(inboxA.body.data.length, 0);
  });
});

test("[F10] recipients are only active management-role users", async () => {
  await withFleetAlertsApi(async (ctx) => {
    const now = new Date();
    const tenantA = randomUUID();
    const managerA = randomUUID();
    const adminA = randomUUID();
    const operatorA = randomUUID();
    const technicianA = randomUUID();
    const inactiveMgrA = randomUUID();

    await seedAllDomains(ctx, tenantA, now);
    ctx.notificationRepo.setRecipientCandidatesForTests(tenantA, [
      candidate(managerA, ["manager"]),
      candidate(adminA, ["tenant_admin"]),
      candidate(operatorA, ["operator"]),
      candidate(technicianA, ["technician"]),
      candidate(inactiveMgrA, ["manager"], "inactive"),
    ]);

    const run = await requestJson(ctx.baseUrl, "/api/v1/notifications/fleet-alerts/run", {
      method: "POST",
      headers: authHeaders(tenantA, adminA, "tenant_admin"),
    });
    // Exactly the 2 active management recipients → insurance 3 windows × 2 = 6.
    assert.equal(run.body.data.insurance, 6);

    for (const [userId, role] of [
      [managerA, "manager"],
      [adminA, "tenant_admin"],
    ] as const) {
      const inbox = await requestJson(ctx.baseUrl, "/api/v1/notifications", { headers: authHeaders(tenantA, userId, role) });
      assert.equal(inbox.body.data.length, 6, `${role} should receive fleet alerts`);
    }

    for (const [userId, role] of [
      [operatorA, "operator"],
      [technicianA, "technician"],
      [inactiveMgrA, "manager"],
    ] as const) {
      const inbox = await requestJson(ctx.baseUrl, "/api/v1/notifications", { headers: authHeaders(tenantA, userId, role) });
      assert.equal(inbox.body.data.length, 0, `${role} (${userId}) must NOT receive fleet alerts`);
    }
  });
});

test("[F10] no eligible recipients → all buckets zero and no notifications created", async () => {
  await withFleetAlertsApi(async (ctx) => {
    const now = new Date();
    const tenantA = randomUUID();
    const managerA = randomUUID();

    await seedAllDomains(ctx, tenantA, now);
    // Only a non-management candidate exists.
    ctx.notificationRepo.setRecipientCandidatesForTests(tenantA, [candidate(randomUUID(), ["operator"])]);

    const run = await requestJson(ctx.baseUrl, "/api/v1/notifications/fleet-alerts/run", {
      method: "POST",
      headers: authHeaders(tenantA, managerA, "manager"),
    });

    assert.equal(run.status, 200);
    assert.deepEqual(summaryOf(run.body.data), { maintenance: 0, fines: 0, insurance: 0, reorder: 0 });

    const inbox = await requestJson(ctx.baseUrl, "/api/v1/notifications", {
      headers: authHeaders(tenantA, managerA, "manager"),
    });
    assert.equal(inbox.body.data.length, 0);
  });
});

test("[F10] runFleetAlerts is idempotent with an injected now (2× = same counts, no duplicates)", async () => {
  await withFleetAlertsApi(async (ctx) => {
    const now = new Date("2026-07-09T12:00:00.000Z");
    const tenantA = randomUUID();
    const r1 = randomUUID();
    const r2 = randomUUID();

    await seedAllDomains(ctx, tenantA, now);

    const context = { tenantId: tenantA, recipientUserIds: [r1, r2], now };
    const first = await ctx.runFleetAlerts(context);
    const second = await ctx.runFleetAlerts(context);

    assert.deepEqual(first, { maintenance: 2, fines: 2, insurance: 6, reorder: 2 });
    assert.deepEqual(second, first);

    const storedR1 = await ctx.notificationRepo.listByRecipient({ tenantId: tenantA, recipientUserId: r1, filters: {} });
    assert.equal(storedR1.length, 6, "no duplicates after two runs in the same window");
  });
});

test("[F10] selectFleetAlertRecipientIds keeps active management users, dedups and preserves order", async () => {
  const { selectFleetAlertRecipientIds } = await import("../src/modules/notifications/fleet-alerts.runner.js");

  const ids = selectFleetAlertRecipientIds([
    candidate("m", ["manager"]),
    candidate("a", ["tenant_admin"]),
    candidate("s", ["super_admin"]),
    candidate("op", ["operator"]),
    candidate("v", ["viewer"]),
    candidate("inact", ["manager"], "inactive"),
    candidate("m", ["manager"]),
  ]);

  assert.deepEqual(ids, ["m", "a", "s"]);
});

// ---------------------------------------------------------------------------
// Harness + seeding helpers
// ---------------------------------------------------------------------------

type MemoryRepos = {
  readonly notificationRepo: {
    setRecipientCandidatesForTests(tenantId: string, candidates: readonly NotificationRecipientCandidate[]): void;
    listByRecipient(input: { tenantId: string; recipientUserId: string; filters?: Record<string, unknown> }): Promise<readonly unknown[]>;
  };
  readonly maintenanceRepo: { create(input: Record<string, unknown>): Promise<unknown> };
  readonly fineRepo: { create(input: Record<string, unknown>): Promise<unknown> };
  readonly insuranceRepo: { create(input: Record<string, unknown>): Promise<unknown> };
  readonly inventoryRepo: {
    createItem(input: Record<string, unknown>): Promise<{ id: string }>;
    createMovement(input: Record<string, unknown>): Promise<unknown>;
  };
};

type FleetAlertsApiContext = MemoryRepos & {
  readonly baseUrl: string;
  readonly runFleetAlerts: (context: { tenantId: string; recipientUserIds: readonly string[]; now?: Date }) => Promise<{
    maintenance: number;
    fines: number;
    insurance: number;
    reorder: number;
  }>;
};

async function withFleetAlertsApi(callback: (context: FleetAlertsApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    notifications,
    fleetRunner,
    maintenance,
    fines,
    insurance,
    inventory,
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/notifications/notification.service.js"),
    import("../src/modules/notifications/fleet-alerts.runner.js"),
    import("../src/modules/maintenance-orders/maintenance-order.service.js"),
    import("../src/modules/fines/fine.service.js"),
    import("../src/modules/insurance-policies/insurance-policy.service.js"),
    import("../src/modules/inventory/inventory.service.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  notifications.resetNotificationRuntimeForTests();
  maintenance.resetMaintenanceOrderRuntimeForTests();
  fines.resetFineRuntimeForTests();
  insurance.resetInsurancePolicyRuntimeForTests();
  inventory.resetInventoryRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({
      baseUrl,
      runFleetAlerts: fleetRunner.runFleetAlerts,
      notificationRepo: notifications.getMemoryNotificationRepositoryForTests() as unknown as MemoryRepos["notificationRepo"],
      maintenanceRepo: maintenance.getMemoryMaintenanceOrderRepositoryForTests() as unknown as MemoryRepos["maintenanceRepo"],
      fineRepo: fines.getMemoryFineRepositoryForTests() as unknown as MemoryRepos["fineRepo"],
      insuranceRepo: insurance.getMemoryInsurancePolicyRepositoryForTests() as unknown as MemoryRepos["insuranceRepo"],
      inventoryRepo: inventory.getMemoryInventoryRepositoryForTests() as unknown as MemoryRepos["inventoryRepo"],
    });
  } finally {
    await closeServer(server);
    notifications.resetNotificationRuntimeForTests();
    maintenance.resetMaintenanceOrderRuntimeForTests();
    fines.resetFineRuntimeForTests();
    insurance.resetInsurancePolicyRuntimeForTests();
    inventory.resetInventoryRuntimeForTests();
  }
}

async function seedAllDomains(ctx: MemoryRepos, tenantId: string, now: Date): Promise<void> {
  const user = randomUUID();

  // Preventive maintenance scheduled within the 7-day window.
  await ctx.maintenanceRepo.create({
    tenantId,
    vehicleId: randomUUID(),
    type: "preventiva",
    status: "agendada",
    scheduledFor: addDays(now, 3),
    description: "Preventiva próxima.",
    createdBy: user,
    updatedBy: user,
  });

  // Non-final fine due within the 7-day window.
  await ctx.fineRepo.create({
    tenantId,
    vehicleId: randomUUID(),
    numeroAuto: `DUE-${randomUUID().slice(0, 8)}`,
    dataInfracao: addDays(now, -30),
    orgao: "DETRAN",
    valor: 100,
    pontos: 0,
    prazoPagamento: addDays(now, 3),
    status: "recebida",
    createdBy: user,
    updatedBy: user,
  });

  // Vigente policy 5 days from expiry → crosses the 30/15/7 windows.
  await ctx.insuranceRepo.create({
    tenantId,
    vehicleId: randomUUID(),
    seguradora: "Porto",
    numeroApolice: `REN-${randomUUID().slice(0, 8)}`,
    vigenciaInicio: addDays(now, -300),
    vigenciaFim: addDays(now, 5),
    valor: 1000,
    status: "vigente",
    createdBy: user,
    updatedBy: user,
  });

  // Item at/below its derived reorder point (saldo 10 ≤ ponto 15).
  const item = await ctx.inventoryRepo.createItem({
    tenantId,
    sku: `REORD-${randomUUID().slice(0, 8)}`,
    name: "Peça crítica",
    unit: "un",
    minQuantity: 0,
    leadTimeDays: 10,
    safetyStock: 5,
    createdBy: user,
    updatedBy: user,
  });
  await ctx.inventoryRepo.createMovement({ tenantId, itemId: item.id, type: "entrada", quantidadeSinalizada: 100, unitCost: 1 });
  await ctx.inventoryRepo.createMovement({ tenantId, itemId: item.id, type: "saida", quantidadeSinalizada: -90 });
}

function summaryOf(data: { maintenance: number; fines: number; insurance: number; reorder: number }) {
  return { maintenance: data.maintenance, fines: data.fines, insurance: data.insurance, reorder: data.reorder };
}

function candidate(userId: string, roles: readonly Role[], status = "active"): NotificationRecipientCandidate {
  return { userId, status, roles, permissions: [] };
}

function authHeaders(
  tenantId: string,
  userId: string,
  role: string,
  permissions?: readonly string[],
): Record<string, string> {
  return {
    "x-tenant-id": tenantId,
    "x-user-id": userId,
    "x-role": role,
    ...(permissions ? { "x-permissions": permissions.join(",") } : {}),
  };
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
