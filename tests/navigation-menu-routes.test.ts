import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { signAccessToken } from "../src/modules/auth/index.js";
import { CoreSaasRegistry } from "../src/modules/core-saas/services/core-saas.service.js";
import { MemoryCoreSaasAdapter } from "../src/modules/core-saas/services/memory-core-saas.adapter.js";
import { InMemoryCoreSaasStore } from "../src/modules/core-saas/store/core-saas.store.js";
import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("GET /api/v1/navigation/menu exige autenticacao", async () => {
  await withNavigationApi(async ({ baseUrl }) => {
    const response = await requestJson(baseUrl, "/api/v1/navigation/menu");

    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, "AUTHENTICATION_REQUIRED");
  });
});

test("Platform Admin acessa menu Platform", async () => {
  await withNavigationApi(async ({ baseUrl }) => {
    const token = await signAccessToken({
      user_id: "usr-platform",
      tenant_id: "platform",
      email: "platform@example.com",
      roles: ["platform_admin"],
    });
    const response = await requestJson(baseUrl, "/api/v1/navigation/menu?scope=platform", {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.metadata.scope, "platform");
    assert.equal(response.body.data.some((item: { id: string }) => item.id === "platform.tenants"), true);
    assert.equal(response.body.data.some((item: { id: string }) => item.id === "platform.cloudBilling"), true);
  });
});

test("Tenant Admin acessa menu tenant", async () => {
  await withNavigationApi(async ({ baseUrl, seed }) => {
    const response = await requestJson(baseUrl, "/api/v1/navigation/menu?scope=tenant", {
      headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.some((item: { id: string }) => item.id === "tenant.checklists"), true);
    assert.equal(response.body.data.some((item: { id: string }) => item.id === "tenant.notifications"), true);
    assert.equal(response.body.data.some((item: { group: string }) => item.group === "platform"), false);
  });
});

test("Operador recebe menu operacional filtrado", async () => {
  await withNavigationApi(async ({ baseUrl, seed }) => {
    const response = await requestJson(baseUrl, "/api/v1/navigation/menu?scope=operations", {
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.some((item: { id: string }) => item.id === "operations.checklists"), true);
    assert.equal(response.body.data.some((item: { id: string }) => item.id === "operations.workOrders"), false);
  });
});

test("Usuario comum nao recebe Billing Cloud Platform", async () => {
  await withNavigationApi(async ({ baseUrl, seed }) => {
    const response = await requestJson(baseUrl, "/api/v1/navigation/menu", {
      headers: authHeaders(seed.tenantA, seed.viewerA, "viewer"),
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.some((item: { id: string }) => item.id === "platform.cloudBilling"), false);
  });
});

test("Query scope=platform nao retorna dados para tenant comum", async () => {
  await withNavigationApi(async ({ baseUrl, seed }) => {
    const response = await requestJson(baseUrl, "/api/v1/navigation/menu?scope=platform", {
      headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data, []);
  });
});

test("Resposta possui formato esperado", async () => {
  await withNavigationApi(async ({ baseUrl }) => {
    const token = await signAccessToken({
      user_id: "usr-platform-jwt",
      tenant_id: "platform",
      email: "platform@example.com",
      roles: ["platform_admin"],
    });
    const response = await requestJson(baseUrl, "/api/v1/navigation/menu?scope=platform", {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    const first = response.body.data[0];

    assert.equal(response.status, 200);
    assert.equal(typeof response.body.metadata.generatedAt, "string");
    assert.equal(Array.isArray(response.body.metadata.groups), true);
    assert.equal(typeof first.id, "string");
    assert.equal(typeof first.label, "string");
    assert.equal(typeof first.path, "string");
    assert.equal(typeof first.icon, "string");
    assert.equal(Array.isArray(first.requiredPermissions), true);
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly adminA: User;
  readonly operatorA: User;
  readonly viewerA: User;
};

type NavigationApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withNavigationApi(callback: (context: NavigationApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";

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
    name: "Tenant A",
    modules: ["dashboard", "tenant_checklist", "tenant-admin", "users", "audit", "notifications", "finance"],
  });
  const adminA = service.createUser({
    tenantId: tenantA.id,
    name: "Admin A",
    email: "admin-a@example.com",
    roles: ["tenant_admin"],
  });
  const operatorA = service.createUser({
    tenantId: tenantA.id,
    name: "Operator A",
    email: "operator-a@example.com",
    roles: ["operator"],
  });
  const viewerA = service.createUser({
    tenantId: tenantA.id,
    name: "Viewer A",
    email: "viewer-a@example.com",
    roles: ["viewer"],
  });

  return { tenantA, adminA, operatorA, viewerA };
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
    readonly headers?: Record<string, string>;
  } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
  });

  return {
    status: response.status,
    body: await response.json(),
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
