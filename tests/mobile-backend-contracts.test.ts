import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { CoreSaasRegistry } from "../src/modules/core-saas/services/core-saas.service.js";
import { MemoryCoreSaasAdapter } from "../src/modules/core-saas/services/memory-core-saas.adapter.js";
import { InMemoryCoreSaasStore } from "../src/modules/core-saas/store/core-saas.store.js";
import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly adminA: User;
};

type ApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

test("mobile bootstrap returns tenant-scoped contract and ignores requested tenant override", async () => {
  await withMobileContractApi(async ({ baseUrl, seed }) => {
    const response = await requestJson(baseUrl, `/api/v1/mobile/bootstrap?tenantId=${seed.tenantB.id}`, {
      headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.tenant.id, seed.tenantA.id);
    assert.equal(response.body.data.tenant.name, "Mobile Tenant A");
    assert.equal(response.body.data.user.id, seed.adminA.id);
    assert.equal(response.body.data.user.email, seed.adminA.email);
    assert.deepEqual(response.body.data.roles, ["tenant_admin"]);
    assert.equal(response.body.data.permissions.includes("work_orders:read"), true);
    assert.equal(response.body.data.modules.some((item: { key: string; enabled: boolean }) => item.key === "mobile" && item.enabled), true);
    assert.equal(response.body.data.modules.some((item: { key: string }) => item.key === "expense_management"), true);
    assert.equal(response.body.data.expenseCategories.length > 0, true);
    assert.equal(response.body.data.sync.workOrdersCursor, null);
    assert.equal(response.body.data.sync.checklistsCursor, null);
    assert.equal(response.body.data.sync.expensesCursor, null);
    assert.equal(response.body.data.sync.inventoryCursor, null);
    assert.equal(Number.isNaN(Date.parse(response.body.data.serverTime)), false);
    assert.equal(JSON.stringify(response.body).includes(seed.tenantB.id), false);
    assertNoStackTrace(response.body);
  });
});

test("mobile bootstrap requires tenant, user and role context", async () => {
  await withMobileContractApi(async ({ baseUrl, seed }) => {
    const missingTenant = await requestJson(baseUrl, "/api/v1/mobile/bootstrap", {
      headers: {
        "x-user-id": seed.adminA.id,
        "x-role": "tenant_admin",
      },
    });
    const missingUser = await requestJson(baseUrl, "/api/v1/mobile/bootstrap", {
      headers: {
        "x-tenant-id": seed.tenantA.id,
        "x-role": "tenant_admin",
      },
    });
    const missingRole = await requestJson(baseUrl, "/api/v1/mobile/bootstrap", {
      headers: {
        "x-tenant-id": seed.tenantA.id,
        "x-user-id": seed.adminA.id,
      },
    });

    assert.equal(missingTenant.status, 403);
    assert.equal(missingTenant.body.error.reason, "tenant_required");
    assert.equal(missingUser.status, 403);
    assert.equal(missingUser.body.error.reason, "user_required");
    assert.equal(missingRole.status, 403);
    assert.equal(missingRole.body.error.reason, "role_required");
    assertNoStackTrace(missingTenant.body);
    assertNoStackTrace(missingUser.body);
    assertNoStackTrace(missingRole.body);
  });
});

test("mobile backend exposes ready checklist, expense, work order and notification contracts", async () => {
  await withMobileContractApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.adminA, "tenant_admin");
    const checklists = await requestJson(baseUrl, "/api/v1/mobile/checklists/available", { headers });
    const expenseSync = await requestJson(baseUrl, "/api/v1/mobile/sync/expense-actions", {
      method: "POST",
      headers,
      body: { actions: [] },
    });
    const workOrders = await requestJson(baseUrl, "/api/v1/work-orders", { headers });
    const notifications = await requestJson(baseUrl, "/api/v1/notifications", { headers });

    assert.equal(checklists.status, 200);
    assert.ok(Array.isArray(checklists.body.data));
    assert.equal(expenseSync.status, 200);
    assert.ok(Array.isArray(expenseSync.body.data.results));
    assert.equal(expenseSync.body.data.results.length, 0);
    assert.equal(workOrders.status, 200);
    assert.ok(Array.isArray(workOrders.body.items));
    assert.equal(notifications.status, 200);
    assert.ok(Array.isArray(notifications.body.data));
    assertNoStackTrace(checklists.body);
    assertNoStackTrace(expenseSync.body);
    assertNoStackTrace(workOrders.body);
    assertNoStackTrace(notifications.body);
  });
});

test("planned mobile sync and inventory endpoints return stable JSON 404", async () => {
  await withMobileContractApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenantA, seed.adminA, "tenant_admin");
    const workOrderSync = await requestJson(baseUrl, "/api/v1/mobile/sync/work-order-actions", {
      method: "POST",
      headers,
      body: { actions: [] },
    });
    const checklistSync = await requestJson(baseUrl, "/api/v1/mobile/sync/checklist-actions", {
      method: "POST",
      headers,
      body: { actions: [] },
    });
    const inventory = await requestJson(baseUrl, "/api/v1/mobile/inventory/items", { headers });

    for (const response of [workOrderSync, checklistSync, inventory]) {
      assert.equal(response.status, 404);
      assert.deepEqual(response.body.error, {
        code: "NOT_FOUND",
        reason: "route_not_found",
        message: "Route not found.",
      });
      assertNoStackTrace(response.body);
    }
  });
});

test("permission error contract uses stable message for one or many required permissions", async () => {
  await withMobileContractApi(async ({ baseUrl, seed }) => {
    const roles = await requestJson(baseUrl, "/api/v1/roles", {
      headers: authHeaders(seed.tenantA, seed.adminA, "viewer"),
    });
    const checklistRun = await requestJson(baseUrl, "/api/v1/mobile/checklist-runs", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.adminA, "viewer"),
      body: {},
    });

    assert.equal(roles.status, 403);
    assert.equal(roles.body.error.reason, "permission_required");
    assert.equal(roles.body.error.message, "One of these permissions is required: roles.manage.");
    assert.equal(checklistRun.status, 403);
    assert.equal(checklistRun.body.error.reason, "permission_required");
    assert.equal(checklistRun.body.error.message, "One of these permissions is required: checklist_runs:create.");
    assertNoStackTrace(roles.body);
    assertNoStackTrace(checklistRun.body);
  });
});

async function withMobileContractApi(
  callback: (context: ApiContext) => Promise<void>,
): Promise<void> {
  process.env.LOG_LEVEL = "silent";

  const { createApp } = await import("../src/app.js");
  const registry = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(registry);
  const app = createApp(new MemoryCoreSaasAdapter(registry));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed });
  } finally {
    await closeServer(server);
  }
}

function seedCoreSaas(service: CoreSaasRegistry): SeedData {
  const tenantA = service.createTenant({
    name: "Mobile Tenant A",
    modules: [
      "dashboard",
      "mobile",
      "work_orders",
      "tenant_checklist",
      "expense_management",
      "notifications",
      "field_operations",
    ],
  });
  const tenantB = service.createTenant({
    name: "Mobile Tenant B",
    modules: ["dashboard", "mobile"],
  });
  const adminA = service.createUser({
    tenantId: tenantA.id,
    name: "Mobile Admin",
    email: "mobile-admin@example.com",
    roles: ["tenant_admin"],
  });

  return { tenantA, tenantB, adminA };
}

function authHeaders(
  tenant: Tenant,
  user: User,
  role: string,
): Record<string, string> {
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
    readonly body?: Record<string, unknown>;
  } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

function assertNoStackTrace(body: unknown): void {
  const serialized = JSON.stringify(body);

  assert.equal(serialized.includes("stack"), false);
  assert.equal(serialized.includes("node_modules"), false);
  assert.equal(serialized.includes("at "), false);
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
