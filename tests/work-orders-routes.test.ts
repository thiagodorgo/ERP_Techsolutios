import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("work order routes enforce RBAC and expose CRUD/status/assign/timeline", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed }) => {
    const operatorId = randomUUID();
    const operatorUserId = randomUUID();
    const unauthenticated = await requestJson(baseUrl, "/api/v1/work-orders");
    const forbiddenCreate = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.viewerA, "viewer"),
      body: {
        title: "OS viewer",
      },
    });
    const created = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        title: "Atendimento de guincho",
        customerName: "Cliente Exemplo",
        serviceAddress: "Rua Exemplo, 123",
        priority: "high",
      },
    });
    const workOrderId = created.body.data.id;
    const listed = await requestJson(baseUrl, "/api/v1/work-orders?status=open", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const detailed = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const updated = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        title: "Atendimento atualizado",
        priority: "urgent",
      },
    });
    const assigned = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/assign`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        operatorId,
        userId: operatorUserId,
        message: "Atribuido ao operador disponivel.",
      },
    });
    const accepted = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/status`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        status: "accepted",
        message: "Operador aceitou a OS.",
      },
    });
    const timeline = await requestJson(baseUrl, `/api/v1/work-orders/${workOrderId}/timeline`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(unauthenticated.status, 403);
    assert.equal(forbiddenCreate.status, 403);
    assert.equal(created.status, 201);
    assert.equal(created.body.data.code, "OS-000001");
    assert.equal(listed.status, 200);
    assert.equal(listed.body.items.length, 1);
    assert.equal(listed.body.pagination.total, 1);
    assert.equal(detailed.body.data.id, workOrderId);
    assert.equal(updated.body.data.title, "Atendimento atualizado");
    assert.equal(updated.body.data.priority, "urgent");
    assert.equal(assigned.body.data.status, "assigned");
    assert.equal(assigned.body.data.assignedUserId, operatorUserId);
    assert.equal(accepted.body.data.status, "accepted");
    assert.deepEqual(
      timeline.body.data.map((event: { eventType: string }) => event.eventType),
      ["work_order_created", "work_order_updated", "work_order_assigned", "work_order_status_changed"],
    );
  });
});

test("work order routes validate payloads and block cross-tenant access", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed }) => {
    const invalidPayload = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        title: "OS invalida",
        serviceLatitude: 91,
      },
    });
    const createdTenantA = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        title: "OS tenant A",
      },
    });
    const crossTenantDetail = await requestJson(baseUrl, `/api/v1/work-orders/${createdTenantA.body.data.id}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });
    const invalidTransition = await requestJson(baseUrl, `/api/v1/work-orders/${createdTenantA.body.data.id}/status`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        status: "completed",
      },
    });
    const assignWithoutPermission = await requestJson(baseUrl, `/api/v1/work-orders/${createdTenantA.body.data.id}/assign`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body: {
        operatorId: seed.operatorA.id,
        userId: seed.operatorA.id,
      },
    });

    assert.equal(invalidPayload.status, 400);
    assert.equal(invalidPayload.body.error.reason, "invalid_coordinate");
    assert.equal(crossTenantDetail.status, 404);
    assert.equal(invalidTransition.status, 409);
    assert.equal(invalidTransition.body.error.reason, "invalid_status_transition");
    assert.equal(assignWithoutPermission.status, 403);
  });
});

test("Ω1b-2: geocode route enforces RBAC, honest disabled reason, 404/422/409 and force parsing", async () => {
  await withWorkOrderApi(async ({ baseUrl, seed }) => {
    const withAddress = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { title: "OS com endereço", serviceAddress: "Av. Paulista, 1578", priority: "high" },
    });
    const id = withAddress.body.data.id;

    // 403 — sem work_orders:update (viewer é read-only).
    const forbidden = await requestJson(baseUrl, `/api/v1/work-orders/${id}/geocode`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.viewerA, "viewer"),
    });
    // 200 {geocoded:false} — em memória o geocoder é Noop (desabilitado): razão HONESTA, não "não localizado".
    const disabled = await requestJson(baseUrl, `/api/v1/work-orders/${id}/geocode`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    // 404 — OS inexistente.
    const notFound = await requestJson(baseUrl, `/api/v1/work-orders/${randomUUID()}/geocode`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    // 422 — OS sem endereço.
    const noAddress = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { title: "OS sem endereço", priority: "low" },
    });
    const unprocessable = await requestJson(baseUrl, `/api/v1/work-orders/${noAddress.body.data.id}/geocode`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    // 409 — OS já com coordenada, sem force; ?force=true passa a barreira (parsing do force no controller).
    const withCoords = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: { title: "OS geocodificada", serviceAddress: "Rua X", serviceLatitude: -23.5, serviceLongitude: -46.6 },
    });
    const conflict = await requestJson(baseUrl, `/api/v1/work-orders/${withCoords.body.data.id}/geocode`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const forced = await requestJson(baseUrl, `/api/v1/work-orders/${withCoords.body.data.id}/geocode?force=true`, {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });

    assert.equal(forbidden.status, 403);
    assert.equal(disabled.status, 200);
    assert.equal(disabled.body.data.geocoded, false);
    assert.match(disabled.body.data.reason, /desabilitada/i);
    assert.equal(notFound.status, 404);
    assert.equal(unprocessable.status, 422);
    assert.equal(conflict.status, 409);
    // Com force, passa da barreira de 409 e cai no geocoder desabilitado → 200 {geocoded:false}.
    assert.equal(forced.status, 200);
    assert.equal(forced.body.data.geocoded, false);
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

type WorkOrderApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withWorkOrderApi(callback: (context: WorkOrderApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetWorkOrderRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

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
    resetWorkOrderRuntimeForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({
    name: "Tenant Work Orders A",
    modules: ["dashboard", "work_orders"],
  });
  const tenantB = service.createTenant({
    name: "Tenant Work Orders B",
    modules: ["dashboard", "work_orders"],
  });
  const managerA = service.createUser({
    tenantId: tenantA.id,
    name: "Manager A",
    email: "work-orders-manager-a@example.com",
    roles: ["manager"],
  });
  const managerB = service.createUser({
    tenantId: tenantB.id,
    name: "Manager B",
    email: "work-orders-manager-b@example.com",
    roles: ["manager"],
  });
  const operatorA = service.createUser({
    tenantId: tenantA.id,
    name: "Operator A",
    email: "work-orders-operator-a@example.com",
    roles: ["operator"],
  });
  const viewerA = service.createUser({
    tenantId: tenantA.id,
    name: "Viewer A",
    email: "work-orders-viewer-a@example.com",
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
