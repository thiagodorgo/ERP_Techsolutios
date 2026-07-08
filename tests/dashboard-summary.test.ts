import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("GET /dashboard/summary reflete total e byStatus da organizacao A (nao da B)", async () => {
  await withDashboardApi(async ({ baseUrl, seed }) => {
    const headersA = authHeaders(seed.tenantA, seed.managerA);

    await createWorkOrder(baseUrl, headersA, { title: "OS aberta" });
    const assignedOs = await createWorkOrder(baseUrl, headersA, { title: "OS para atribuir" });
    const cancelledOs = await createWorkOrder(baseUrl, headersA, { title: "OS para cancelar" });
    await changeStatus(baseUrl, headersA, assignedOs.id, { status: "assigned" });
    await changeStatus(baseUrl, headersA, cancelledOs.id, {
      status: "cancelled",
      cancellationReason: "Cliente desistiu.",
    });

    // Ruido da organizacao B — nunca deve entrar na contagem de A.
    await createWorkOrder(baseUrl, authHeaders(seed.tenantB, seed.managerB), { title: "OS B-1" });
    await createWorkOrder(baseUrl, authHeaders(seed.tenantB, seed.managerB), { title: "OS B-2" });

    const summary = await getSummary(baseUrl, headersA);

    assert.equal(summary.status, 200);
    assert.equal(summary.body.data.workOrders.total, 3);
    assert.equal(Object.keys(summary.body.data.workOrders.byStatus).length, 10);
    assert.equal(summary.body.data.workOrders.byStatus.open, 1);
    assert.equal(summary.body.data.workOrders.byStatus.assigned, 1);
    assert.equal(summary.body.data.workOrders.byStatus.cancelled, 1);
    assert.equal(summary.body.data.workOrders.byStatus.completed, 0);
    assert.equal(summary.body.data.workOrders.byStatus.in_progress, 0);
  });
});

test("GET /dashboard/summary conta apenas cadastros ativos da organizacao A", async () => {
  await withDashboardApi(async ({ baseUrl, seed }) => {
    const headersA = authHeaders(seed.tenantA, seed.managerA);

    const keptCustomer = await createCustomer(baseUrl, headersA, "Cliente Ativo");
    const droppedCustomer = await createCustomer(baseUrl, headersA, "Cliente Inativo");
    await deactivateCustomer(baseUrl, headersA, droppedCustomer.id);
    void keptCustomer;
    await createVehicle(baseUrl, headersA, "ABC1D23");
    await createTeam(baseUrl, headersA, "Equipe Alfa");
    await createService(baseUrl, headersA, "Reboque");
    await createService(baseUrl, headersA, "Chaveiro");
    await createService(baseUrl, headersA, "Bateria");

    // Cadastros da organizacao B — nao devem contar para A.
    await createCustomer(baseUrl, authHeaders(seed.tenantB, seed.managerB), "Cliente B-1");
    await createVehicle(baseUrl, authHeaders(seed.tenantB, seed.managerB), "ZZZ9Z99");

    const summary = await getSummary(baseUrl, headersA);

    assert.deepEqual(summary.body.data.registry, {
      customers: 1,
      vehicles: 1,
      teams: 1,
      services: 3,
    });
  });
});

test("GET /dashboard/summary conta em overdue apenas OS vencidas e nao terminais", async () => {
  await withDashboardApi(async ({ baseUrl, seed }) => {
    const headersA = authHeaders(seed.tenantA, seed.managerA);

    await createWorkOrder(baseUrl, headersA, { title: "Vencida aberta", scheduledFor: daysAgo(2) });
    await createWorkOrder(baseUrl, headersA, { title: "Futura", scheduledFor: daysAhead(2) });
    await createWorkOrder(baseUrl, headersA, { title: "Sem agenda" });
    const cancelledOverdue = await createWorkOrder(baseUrl, headersA, {
      title: "Vencida cancelada",
      scheduledFor: daysAgo(3),
    });
    await changeStatus(baseUrl, headersA, cancelledOverdue.id, {
      status: "cancelled",
      cancellationReason: "Encerrada.",
    });

    const summary = await getSummary(baseUrl, headersA);

    assert.equal(summary.body.data.workOrders.total, 4);
    assert.equal(summary.body.data.workOrders.overdue, 1);
  });
});

test("GET /dashboard/summary lista criticas da organizacao A, mais urgentes primeiro e sem tenant_id", async () => {
  await withDashboardApi(async ({ baseUrl, seed }) => {
    const headersA = authHeaders(seed.tenantA, seed.managerA);

    const overdue = await createWorkOrder(baseUrl, headersA, {
      title: "Vencida",
      priority: "medium",
      scheduledFor: daysAgo(2),
    });
    const urgentFuture = await createWorkOrder(baseUrl, headersA, {
      title: "Urgente futura",
      priority: "urgent",
      scheduledFor: daysAhead(5),
    });
    await createWorkOrder(baseUrl, headersA, { title: "Comum", priority: "low" });

    // Critica da organizacao B — nao pode vazar para A.
    await createWorkOrder(baseUrl, authHeaders(seed.tenantB, seed.managerB), {
      title: "Urgente B",
      priority: "urgent",
      scheduledFor: daysAgo(1),
    });

    const summary = await getSummary(baseUrl, headersA);
    const critical = summary.body.data.criticalWorkOrders;

    assert.equal(critical.length, 2);
    assert.equal(critical[0].id, overdue.id);
    assert.equal(critical[1].id, urgentFuture.id);
    assert.deepEqual(
      critical.map((item: { code: string }) => item.code).sort(),
      [overdue.code, urgentFuture.code].sort(),
    );
    for (const item of critical) {
      assert.equal(item.tenantId, undefined);
      assert.equal("tenant_id" in item, false);
    }
  });
});

test("GET /dashboard/summary retorna eventos recentes da organizacao A, mais novos primeiro", async () => {
  await withDashboardApi(async ({ baseUrl, seed }) => {
    const headersA = authHeaders(seed.tenantA, seed.managerA);

    const first = await createWorkOrder(baseUrl, headersA, { title: "OS 1" });
    const second = await createWorkOrder(baseUrl, headersA, { title: "OS 2" });
    await changeStatus(baseUrl, headersA, second.id, { status: "assigned" });

    // Evento da organizacao B — nao pode aparecer para A.
    await createWorkOrder(baseUrl, authHeaders(seed.tenantB, seed.managerB), { title: "OS B" });

    const summary = await getSummary(baseUrl, headersA);
    const events = summary.body.data.recentEvents;

    assert.equal(events.length, 3);
    assert.equal(events[0].eventType, "work_order_status_changed");
    assert.equal(events[0].workOrderId, second.id);
    const workOrderIds = new Set(events.map((event: { workOrderId: string }) => event.workOrderId));
    assert.ok(workOrderIds.has(first.id));
    assert.ok(workOrderIds.has(second.id));
    for (const event of events) {
      assert.equal(event.tenantId, undefined);
      assert.equal("tenant_id" in event, false);
    }
  });
});

test("[isolamento] o resumo da organizacao B reflete somente dados da organizacao B", async () => {
  await withDashboardApi(async ({ baseUrl, seed }) => {
    const headersA = authHeaders(seed.tenantA, seed.managerA);
    const headersB = authHeaders(seed.tenantB, seed.managerB);

    const osA1 = await createWorkOrder(baseUrl, headersA, { title: "OS A-1", scheduledFor: daysAgo(1) });
    await createWorkOrder(baseUrl, headersA, { title: "OS A-2" });
    await createCustomer(baseUrl, headersA, "Cliente A");
    await createVehicle(baseUrl, headersA, "AAA1A11");

    const osB1 = await createWorkOrder(baseUrl, headersB, { title: "OS B-1", priority: "urgent", scheduledFor: daysAgo(2) });
    await createCustomer(baseUrl, headersB, "Cliente B");

    const summaryB = await getSummary(baseUrl, headersB);

    assert.equal(summaryB.body.data.workOrders.total, 1);
    assert.equal(summaryB.body.data.workOrders.overdue, 1);
    assert.equal(summaryB.body.data.registry.customers, 1);
    assert.equal(summaryB.body.data.registry.vehicles, 0);
    assert.equal(summaryB.body.data.criticalWorkOrders.length, 1);
    assert.equal(summaryB.body.data.criticalWorkOrders[0].id, osB1.id);
    const bIds = summaryB.body.data.criticalWorkOrders.map((item: { id: string }) => item.id);
    assert.equal(bIds.includes(osA1.id), false);
    for (const event of summaryB.body.data.recentEvents) {
      assert.equal(event.workOrderId, osB1.id);
    }
  });
});

test("[permissao] sem autenticacao e sem dashboard:read retornam 403", async () => {
  await withDashboardApi(async ({ baseUrl, seed }) => {
    const unauthenticated = await getSummary(baseUrl, {});
    const withoutPermission = await getSummary(baseUrl, authHeaders(seed.tenantA, seed.financeA));

    assert.equal(unauthenticated.status, 403);
    assert.equal(withoutPermission.status, 403);
    assert.equal(withoutPermission.body.error.reason, "permission_required");
  });
});

test("GET /dashboard/summary de organizacao vazia retorna zeros e listas vazias", async () => {
  await withDashboardApi(async ({ baseUrl, seed }) => {
    const summary = await getSummary(baseUrl, authHeaders(seed.tenantA, seed.managerA));

    assert.equal(summary.status, 200);
    assert.equal(summary.body.data.workOrders.total, 0);
    assert.equal(summary.body.data.workOrders.createdToday, 0);
    assert.equal(summary.body.data.workOrders.createdThisWeek, 0);
    assert.equal(summary.body.data.workOrders.overdue, 0);
    assert.equal(Object.keys(summary.body.data.workOrders.byStatus).length, 10);
    assert.ok(
      Object.values(summary.body.data.workOrders.byStatus).every((count) => count === 0),
    );
    assert.deepEqual(summary.body.data.registry, {
      customers: 0,
      vehicles: 0,
      teams: 0,
      services: 0,
    });
    assert.deepEqual(summary.body.data.criticalWorkOrders, []);
    assert.deepEqual(summary.body.data.recentEvents, []);
  });
});

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function daysAhead(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString();
}

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: User;
  readonly managerB: User;
  readonly financeA: User;
};

type DashboardApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withDashboardApi(callback: (context: DashboardApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetDashboardRuntimeForTests },
    { resetWorkOrderRuntimeForTests },
    { resetCustomerRuntimeForTests },
    { resetVehicleRuntimeForTests },
    { resetTeamRuntimeForTests },
    { resetServiceCatalogRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/dashboard/dashboard.service.js"),
    import("../src/modules/work-orders/work-order.service.js"),
    import("../src/modules/customers/customer.service.js"),
    import("../src/modules/vehicles/vehicle.service.js"),
    import("../src/modules/teams/team.service.js"),
    import("../src/modules/service-catalog/service-catalog.service.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  const resetRuntimes = (): void => {
    resetDashboardRuntimeForTests();
    resetWorkOrderRuntimeForTests();
    resetCustomerRuntimeForTests();
    resetVehicleRuntimeForTests();
    resetTeamRuntimeForTests();
    resetServiceCatalogRuntimeForTests();
  };

  resetRuntimes();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed });
  } finally {
    await closeServer(server);
    resetRuntimes();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: {
    readonly tenantId: string;
    readonly name: string;
    readonly email: string;
    readonly roles: readonly string[];
  }): User;
}): SeedData {
  const tenantA = service.createTenant({ name: "Dashboard A", modules: ["dashboard", "work_orders"] });
  const tenantB = service.createTenant({ name: "Dashboard B", modules: ["dashboard", "work_orders"] });
  const managerA = service.createUser({
    tenantId: tenantA.id,
    name: "Manager A",
    email: "dashboard-manager-a@example.com",
    roles: ["manager"],
  });
  const managerB = service.createUser({
    tenantId: tenantB.id,
    name: "Manager B",
    email: "dashboard-manager-b@example.com",
    roles: ["manager"],
  });
  const financeA = service.createUser({
    tenantId: tenantA.id,
    name: "Finance A",
    email: "dashboard-finance-a@example.com",
    roles: ["finance"],
  });

  return { tenantA, tenantB, managerA, managerB, financeA };
}

function authHeaders(tenant: Tenant, user: User): Record<string, string> {
  return {
    "x-tenant-id": tenant.id,
    "x-user-id": user.id,
    "x-role": user.roles[0] ?? "manager",
  };
}

async function createWorkOrder(
  baseUrl: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<{ readonly id: string; readonly code: string }> {
  const response = await requestJson(baseUrl, "/api/v1/work-orders", { method: "POST", headers, body });
  assert.equal(response.status, 201, `createWorkOrder failed: ${JSON.stringify(response.body)}`);

  return { id: response.body.data.id, code: response.body.data.code };
}

async function changeStatus(
  baseUrl: string,
  headers: Record<string, string>,
  workOrderId: string,
  body: Record<string, unknown>,
): Promise<void> {
  const response = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/status`, {
    method: "PATCH",
    headers,
    body,
  });
  assert.equal(response.status, 200, `changeStatus failed: ${JSON.stringify(response.body)}`);
}

async function createCustomer(
  baseUrl: string,
  headers: Record<string, string>,
  name: string,
): Promise<{ readonly id: string }> {
  const response = await requestJson(baseUrl, "/api/v1/customers", { method: "POST", headers, body: { name } });
  assert.equal(response.status, 201, `createCustomer failed: ${JSON.stringify(response.body)}`);

  return { id: response.body.data.id };
}

async function deactivateCustomer(baseUrl: string, headers: Record<string, string>, customerId: string): Promise<void> {
  const response = await requestJson(baseUrl, `/api/v1/customers/${customerId}`, {
    method: "PATCH",
    headers,
    body: { is_active: false },
  });
  assert.equal(response.status, 200, `deactivateCustomer failed: ${JSON.stringify(response.body)}`);
}

async function createVehicle(baseUrl: string, headers: Record<string, string>, plate: string): Promise<void> {
  const response = await requestJson(baseUrl, "/api/v1/vehicles", {
    method: "POST",
    headers,
    body: { plate, model: "Modelo Teste" },
  });
  assert.equal(response.status, 201, `createVehicle failed: ${JSON.stringify(response.body)}`);
}

async function createTeam(baseUrl: string, headers: Record<string, string>, name: string): Promise<void> {
  const response = await requestJson(baseUrl, "/api/v1/teams", { method: "POST", headers, body: { name } });
  assert.equal(response.status, 201, `createTeam failed: ${JSON.stringify(response.body)}`);
}

async function createService(baseUrl: string, headers: Record<string, string>, name: string): Promise<void> {
  const response = await requestJson(baseUrl, "/api/v1/service-catalog", { method: "POST", headers, body: { name } });
  assert.equal(response.status, 201, `createService failed: ${JSON.stringify(response.body)}`);
}

async function getSummary(baseUrl: string, headers: Record<string, string>) {
  return requestJson(baseUrl, "/api/v1/dashboard/summary", { headers });
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
