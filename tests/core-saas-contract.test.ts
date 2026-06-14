import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { CoreSaasRegistry } from "../src/modules/core-saas/services/core-saas.service.js";
import { MemoryCoreSaasAdapter } from "../src/modules/core-saas/services/memory-core-saas.adapter.js";
import { InMemoryCoreSaasStore } from "../src/modules/core-saas/store/core-saas.store.js";
import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

type SeedData = {
  readonly tenant: Tenant;
  readonly admin: User;
};

type ApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

test("Core SaaS HTTP contract keeps success envelopes stable in memory runtime", async () => {
  await withContractApi(async ({ baseUrl, seed }) => {
    const headers = authHeaders(seed.tenant, seed.admin, "tenant_admin");
    const health = await requestJson(baseUrl, "/api/v1/health");
    const users = await requestJson(baseUrl, "/api/v1/users", { headers });
    const roles = await requestJson(baseUrl, "/api/v1/roles", { headers });
    const auditEvents = await requestJson(baseUrl, "/api/v1/audit-events", { headers });

    assert.equal(health.status, 200);
    assert.equal(health.body.status, "ok");
    assert.equal(health.body.service, "erp-techsolutions-api");
    assert.equal(typeof health.body.timestamp, "string");

    assert.equal(users.status, 200);
    assert.ok(Array.isArray(users.body.data));
    assert.equal(users.body.data[0].id, seed.admin.id);
    assert.equal(users.body.data[0].tenantId, seed.tenant.id);
    assert.equal(users.body.data[0].email, "contract-admin@example.com");
    assert.deepEqual(users.body.data[0].roles, ["tenant_admin"]);
    assert.ok(Array.isArray(users.body.data[0].branchIds));
    assert.equal(users.body.data[0].status, "active");
    assert.equal(typeof users.body.data[0].createdAt, "string");

    assert.equal(roles.status, 200);
    assert.ok(Array.isArray(roles.body.data));
    assert.equal(typeof roles.body.data[0].role, "string");
    assert.ok(Array.isArray(roles.body.data[0].permissions));

    assert.equal(auditEvents.status, 200);
    assert.ok(Array.isArray(auditEvents.body.data));
    assert.equal(typeof auditEvents.body.data[0].id, "string");
    assert.equal(typeof auditEvents.body.data[0].action, "string");
    assert.equal(typeof auditEvents.body.data[0].actor_user_id, "string");
    assert.equal(auditEvents.body.data[0].tenant_id, seed.tenant.id);
    assert.equal(typeof auditEvents.body.data[0].timestamp, "string");
  });
});

test("Core SaaS HTTP contract keeps missing tenant error envelope stable", async () => {
  await withContractApi(async ({ baseUrl, seed }) => {
    const response = await requestJson(baseUrl, "/api/v1/users", {
      headers: {
        "x-user-id": seed.admin.id,
        "x-role": "tenant_admin",
      },
    });

    assert.equal(response.status, 403);
    assert.deepEqual(response.body.error, {
      code: "FORBIDDEN",
      reason: "tenant_required",
      message: "Tenant context is required.",
    });
  });
});

test("Core SaaS HTTP contract keeps permission error envelope stable", async () => {
  await withContractApi(async ({ baseUrl, seed }) => {
    const response = await requestJson(baseUrl, "/api/v1/roles", {
      headers: authHeaders(seed.tenant, seed.admin, "viewer"),
    });

    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, "FORBIDDEN");
    assert.equal(response.body.error.reason, "permission_required");
    assert.equal(response.body.error.message, "One of these permissions is required: roles.manage.");
  });
});

async function withContractApi(
  callback: (context: ApiContext) => Promise<void>,
): Promise<void> {
  process.env.LOG_LEVEL = "silent";

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
  const tenant = service.createTenant({
    name: "Contract Tenant",
  });
  const admin = service.createUser({
    tenantId: tenant.id,
    name: "Contract Admin",
    email: "contract-admin@example.com",
    roles: ["tenant_admin"],
  });

  return { tenant, admin };
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
