import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import express from "express";

import { attachAuthenticatedActor } from "../src/modules/auth/middleware/authenticated-actor.middleware.js";
import { signAccessToken } from "../src/modules/auth/services/jwt.service.js";
import {
  createPersistentRbacContextMiddleware,
  type PersistentAuthorizationResolver,
} from "../src/modules/core-saas/middleware/persistent-rbac-context.middleware.js";
import { tenantContextMiddleware } from "../src/modules/core-saas/middleware/tenant-context.middleware.js";
import { createNavigationRouter } from "../src/modules/navigation/navigation.routes.js";

test("super_admin JWT recebe menu platform sem consultar RBAC tenant-scoped", async () => {
  let resolverCalls = 0;
  const resolveAuthorization: PersistentAuthorizationResolver = async () => {
    resolverCalls += 1;
    throw new Error("platform pseudo-tenant must not reach persistent tenant RBAC");
  };

  await withNavigationApi(resolveAuthorization, async (baseUrl) => {
    const response = await requestMenu(baseUrl, "platform", "super_admin", "platform");

    assert.equal(response.status, 200);
    assert.equal(response.body.metadata.scope, "platform");
    assert.equal(response.body.data.some((item: { id: string }) => item.id === "platform.tenants"), true);
    assert.equal(resolverCalls, 0);

    const tenantScope = await requestMenu(baseUrl, "platform", "super_admin", "tenant");
    assert.deepEqual(tenantScope.body.data, []);

    const unscoped = await requestMenu(baseUrl, "platform", "super_admin");
    assert.equal(unscoped.body.data.some((item: { id: string }) => item.id === "platform.tenants"), true);
    assert.equal(unscoped.body.data.every((item: { group: string }) => item.group === "platform"), true);
  });

  await withDefaultPersistentRbacApi(resolveAuthorization, async (baseUrl) => {
    const response = await requestContext(baseUrl, "platform", "super_admin");

    assert.equal(response.status, 500);
    assert.equal(response.body.error.code, "AUTHORIZATION_CONTEXT_ERROR");
    assert.equal(resolverCalls, 1);
  });
});

test("operator e viewer JWT recebem menu platform vazio", async () => {
  let resolverCalls = 0;
  const resolveAuthorization: PersistentAuthorizationResolver = async () => {
    resolverCalls += 1;
    throw new Error("platform pseudo-tenant must not reach persistent tenant RBAC");
  };

  await withNavigationApi(resolveAuthorization, async (baseUrl) => {
    for (const role of ["operator", "viewer"]) {
      const response = await requestMenu(baseUrl, "platform", role, "platform");

      assert.equal(response.status, 200);
      assert.deepEqual(response.body.data, []);

      const tenantScope = await requestMenu(baseUrl, "platform", role, "tenant");
      assert.deepEqual(tenantScope.body.data, []);

      const unscoped = await requestMenu(baseUrl, "platform", role);
      assert.deepEqual(unscoped.body.data, []);

      const invalidScope = await requestMenu(baseUrl, "platform", role, "invalid");
      assert.deepEqual(invalidScope.body.data, []);
    }

    assert.equal(resolverCalls, 0);
  });
});

test("JWT de tenant real usa RBAC persistente no menu tenant", async () => {
  const tenantId = "11111111-1111-4111-8111-111111111111";
  const resolverInputs: Array<{ tenantId: string; userId: string }> = [];
  const resolveAuthorization: PersistentAuthorizationResolver = async (input) => {
    resolverInputs.push(input);
    return {
      roles: ["viewer"],
      permissions: ["dashboard:read"],
      source: "persistent_rbac",
    };
  };

  await withNavigationApi(resolveAuthorization, async (baseUrl) => {
    const response = await requestMenu(baseUrl, tenantId, "tenant_admin", "tenant");

    assert.equal(response.status, 200);
    assert.equal(response.body.data.some((item: { id: string }) => item.id === "tenant.dashboard"), true);
    assert.equal(response.body.data.some((item: { id: string }) => item.id === "tenant.checklists"), false);
    assert.equal(response.body.data.some((item: { group: string }) => item.group === "platform"), false);
    assert.deepEqual(resolverInputs, [{ tenantId, userId: `usr-${tenantId}` }]);
  });

  await withNavigationApi(async () => {
    throw new Error("persistent authorization unavailable");
  }, async (baseUrl) => {
    const response = await requestMenu(baseUrl, tenantId, "tenant_admin", "tenant");

    assert.equal(response.status, 500);
    assert.equal(response.body.error.code, "AUTHORIZATION_CONTEXT_ERROR");
  });
});

async function withNavigationApi(
  resolveAuthorization: PersistentAuthorizationResolver,
  callback: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = express();
  app.use(
    "/api/v1/navigation",
    attachAuthenticatedActor(),
    createNavigationRouter(undefined, { resolveAuthorization }),
  );
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback(baseUrl);
  } finally {
    await closeServer(server);
  }
}

async function withDefaultPersistentRbacApi(
  resolveAuthorization: PersistentAuthorizationResolver,
  callback: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = express();
  app.use(
    attachAuthenticatedActor(),
    tenantContextMiddleware,
    createPersistentRbacContextMiddleware({ resolveAuthorization }),
  );
  app.get("/context", (request, response) => {
    response.status(200).json({ data: request.tenantContext });
  });
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback(baseUrl);
  } finally {
    await closeServer(server);
  }
}

async function requestMenu(
  baseUrl: string,
  tenantId: string,
  role: string,
  scope?: string,
) {
  const token = await signActorToken(tenantId, role);
  const query = scope ? `?scope=${scope}` : "";
  const response = await fetch(`${baseUrl}/api/v1/navigation/menu${query}`, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

async function requestContext(
  baseUrl: string,
  tenantId: string,
  role: string,
) {
  const token = await signActorToken(tenantId, role);
  const response = await fetch(`${baseUrl}/context`, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

function signActorToken(tenantId: string, role: string) {
  return signAccessToken({
    user_id: `usr-${tenantId}`,
    tenant_id: tenantId,
    email: `${role}@example.com`,
    roles: [role],
  });
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
