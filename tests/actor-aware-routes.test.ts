import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { signAccessToken } from "../src/modules/auth/index.js";
import { CoreSaasRegistry } from "../src/modules/core-saas/services/core-saas.service.js";
import { MemoryCoreSaasAdapter } from "../src/modules/core-saas/services/memory-core-saas.adapter.js";
import { InMemoryCoreSaasStore } from "../src/modules/core-saas/store/core-saas.store.js";
import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly adminA: User;
  readonly adminB: User;
};

type ApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

test("protected routes keep accepting legacy headers", async () => {
  await withActorAwareApi(async ({ baseUrl, seed }) => {
    const response = await requestJson(baseUrl, "/api/v1/users", {
      headers: legacyHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.data.map((user: User) => user.email),
      ["actor-admin-a@example.com"],
    );
  });
});

test("protected routes accept a valid Bearer token without legacy headers", async () => {
  await withActorAwareApi(async ({ baseUrl, seed }) => {
    const token = await signAccessToken({
      user_id: seed.adminA.id,
      tenant_id: seed.tenantA.id,
      email: seed.adminA.email,
      roles: ["tenant_admin"],
    });
    const response = await requestJson(baseUrl, "/api/v1/users", {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.data.map((user: User) => user.email),
      ["actor-admin-a@example.com"],
    );
  });
});

test("protected routes reject an invalid Bearer token", async () => {
  await withActorAwareApi(async ({ baseUrl, seed }) => {
    const response = await requestJson(baseUrl, "/api/v1/users", {
      headers: {
        authorization: "Bearer invalid.token.value",
        ...legacyHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
      },
    });

    assert.equal(response.status, 401);
    assert.deepEqual(response.body, {
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired access token.",
      },
    });
  });
});

test("JWT actor has priority over conflicting legacy headers", async () => {
  await withActorAwareApi(async ({ baseUrl, seed }) => {
    const token = await signAccessToken({
      user_id: seed.adminA.id,
      tenant_id: seed.tenantA.id,
      email: seed.adminA.email,
      roles: ["tenant_admin"],
    });
    const response = await requestJson(baseUrl, "/api/v1/users", {
      headers: {
        authorization: `Bearer ${token}`,
        ...legacyHeaders(seed.tenantB, seed.adminB, "tenant_admin"),
      },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.data.map((user: User) => user.email),
      ["actor-admin-a@example.com"],
    );
    assert.equal(
      response.body.data.some((user: User) => user.email === "actor-admin-b@example.com"),
      false,
    );
  });
});

test("missing JWT and missing legacy headers keep the existing forbidden envelope", async () => {
  await withActorAwareApi(async ({ baseUrl }) => {
    const response = await requestJson(baseUrl, "/api/v1/users");

    assert.equal(response.status, 403);
    assert.deepEqual(response.body.error, {
      code: "FORBIDDEN",
      reason: "tenant_required",
      message: "Tenant context is required.",
    });
  });
});

test("success response shape is preserved between legacy headers and JWT", async () => {
  await withActorAwareApi(async ({ baseUrl, seed }) => {
    const legacyResponse = await requestJson(baseUrl, "/api/v1/users", {
      headers: legacyHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
    });
    const token = await signAccessToken({
      user_id: seed.adminA.id,
      tenant_id: seed.tenantA.id,
      email: seed.adminA.email,
      roles: ["tenant_admin"],
    });
    const jwtResponse = await requestJson(baseUrl, "/api/v1/users", {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    assert.equal(legacyResponse.status, 200);
    assert.equal(jwtResponse.status, 200);
    assert.deepEqual(Object.keys(jwtResponse.body).sort(), ["data"]);
    assert.deepEqual(Object.keys(jwtResponse.body.data[0]).sort(), Object.keys(legacyResponse.body.data[0]).sort());
  });
});

async function withActorAwareApi(
  callback: (context: ApiContext) => Promise<void>,
): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";

  const { createApp } = await import("../src/app.js");
  const service = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(service);
  const app = createApp(new MemoryCoreSaasAdapter(service));
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
    name: "Actor Tenant A",
  });
  const tenantB = service.createTenant({
    name: "Actor Tenant B",
  });
  const adminA = service.createUser({
    tenantId: tenantA.id,
    name: "Actor Admin A",
    email: "actor-admin-a@example.com",
    roles: ["tenant_admin"],
  });
  const adminB = service.createUser({
    tenantId: tenantB.id,
    name: "Actor Admin B",
    email: "actor-admin-b@example.com",
    roles: ["tenant_admin"],
  });

  return {
    tenantA,
    tenantB,
    adminA,
    adminB,
  };
}

function legacyHeaders(
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
