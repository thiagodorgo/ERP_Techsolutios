import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("field dispatch routes enforce RBAC and expose create/list/detail/status/reassign", async () => {
  await withFieldDispatchApi(async ({ baseUrl, seed }) => {
    const unauthenticated = await requestJson(baseUrl, "/api/v1/operations/dispatches");
    const forbiddenCreate = await requestJson(baseUrl, "/api/v1/operations/dispatches", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.viewerA, "viewer"),
      body: {
        workOrderId: seed.workOrderId,
        operatorUserId: seed.operatorA.id,
      },
    });
    const created = await requestJson(baseUrl, "/api/v1/operations/dispatches", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        workOrderId: seed.workOrderId,
        operatorUserId: seed.operatorA.id,
        observation: "Despachar operador disponivel.",
      },
    });
    const dispatchId = created.body.data.id;
    const listed = await requestJson(baseUrl, "/api/v1/operations/dispatches?status=assigned", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const detailed = await requestJson(baseUrl, `/api/v1/operations/dispatches/${dispatchId}`, {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const accepted = await requestJson(baseUrl, `/api/v1/operations/dispatches/${dispatchId}/status`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body: {
        status: "accepted",
      },
    });
    const reassigned = await requestJson(baseUrl, `/api/v1/operations/dispatches/${dispatchId}/reassign`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        operatorUserId: seed.operatorA.id,
        reason: "Confirmacao de operador.",
      },
    });

    assert.equal(unauthenticated.status, 403);
    assert.equal(forbiddenCreate.status, 403);
    assert.equal(created.status, 201);
    assert.equal(created.body.data.workOrderId, seed.workOrderId);
    assert.equal(listed.status, 200);
    assert.equal(listed.body.items.length, 1);
    assert.equal(listed.body.pagination.total, 1);
    assert.equal(detailed.body.data.id, dispatchId);
    assert.deepEqual(
      detailed.body.data.timeline.map((event: { eventType: string }) => event.eventType),
      ["field_dispatch_created"],
    );
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.data.status, "accepted");
    assert.equal(reassigned.status, 200);
    assert.equal(reassigned.body.data.status, "reassigned");
  });
});

test("field dispatch routes block cross-tenant data and require cancel permission/reason", async () => {
  await withFieldDispatchApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/operations/dispatches", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        workOrderId: seed.workOrderId,
        operatorUserId: seed.operatorA.id,
      },
    });
    const dispatchId = created.body.data.id;
    const crossTenantDetail = await requestJson(baseUrl, `/api/v1/operations/dispatches/${dispatchId}`, {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });
    const crossTenantOperator = await requestJson(baseUrl, "/api/v1/operations/dispatches", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        workOrderId: seed.workOrderId,
        operatorUserId: seed.operatorB.id,
      },
    });
    const cancelWithoutPermission = await requestJson(baseUrl, `/api/v1/operations/dispatches/${dispatchId}/status`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body: {
        status: "cancelled",
        reason: "Tentativa sem permissao.",
      },
    });
    const cancelWithoutReason = await requestJson(baseUrl, `/api/v1/operations/dispatches/${dispatchId}/status`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        status: "cancelled",
      },
    });
    const cancelled = await requestJson(baseUrl, `/api/v1/operations/dispatches/${dispatchId}/status`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      body: {
        status: "cancelled",
        reason: "Cliente cancelou.",
      },
    });

    assert.equal(crossTenantDetail.status, 404);
    assert.equal(crossTenantOperator.status, 404);
    assert.equal(crossTenantOperator.body.error.code, "FIELD_OPERATOR_NOT_FOUND");
    assert.equal(cancelWithoutPermission.status, 403);
    assert.equal(cancelWithoutReason.status, 400);
    assert.equal(cancelWithoutReason.body.error.reason, "cancel_reason_required");
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.data.status, "cancelled");
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly managerA: User;
  readonly managerB: User;
  readonly operatorA: User;
  readonly operatorB: User;
  readonly viewerA: User;
  readonly workOrderId: string;
};

type FieldDispatchApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withFieldDispatchApi(callback: (context: FieldDispatchApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetFieldDispatchRuntimeForTests },
    { resetWorkOrderRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/field-dispatch/index.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetFieldDispatchRuntimeForTests();
  resetWorkOrderRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seedWithoutWorkOrder = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    const createdWorkOrder = await requestJson(baseUrl, "/api/v1/work-orders", {
      method: "POST",
      headers: authHeaders(seedWithoutWorkOrder.tenantA, seedWithoutWorkOrder.managerA, "manager"),
      body: {
        title: "OS para despacho",
      },
    });
    assert.equal(createdWorkOrder.status, 201);
    await callback({
      baseUrl,
      seed: {
        ...seedWithoutWorkOrder,
        workOrderId: createdWorkOrder.body.data.id,
      },
    });
  } finally {
    await closeServer(server);
    resetFieldDispatchRuntimeForTests();
    resetWorkOrderRuntimeForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): Omit<SeedData, "workOrderId"> {
  const tenantA = service.createTenant({
    name: "Tenant Dispatch A",
    modules: ["dashboard", "work_orders", "field_operations"],
  });
  const tenantB = service.createTenant({
    name: "Tenant Dispatch B",
    modules: ["dashboard", "work_orders", "field_operations"],
  });
  const managerA = service.createUser({
    tenantId: tenantA.id,
    name: "Manager A",
    email: "field-dispatch-manager-a@example.com",
    roles: ["manager"],
  });
  const managerB = service.createUser({
    tenantId: tenantB.id,
    name: "Manager B",
    email: "field-dispatch-manager-b@example.com",
    roles: ["manager"],
  });
  const operatorA = service.createUser({
    tenantId: tenantA.id,
    name: "Operator A",
    email: "field-dispatch-operator-a@example.com",
    roles: ["operator"],
  });
  const operatorB = service.createUser({
    tenantId: tenantB.id,
    name: "Operator B",
    email: "field-dispatch-operator-b@example.com",
    roles: ["operator"],
  });
  const viewerA = service.createUser({
    tenantId: tenantA.id,
    name: "Viewer A",
    email: "field-dispatch-viewer-a@example.com",
    roles: ["viewer"],
  });

  return { tenantA, tenantB, managerA, managerB, operatorA, operatorB, viewerA };
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
