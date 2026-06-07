import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { CoreSaasRegistry } from "../src/modules/core-saas/services/core-saas.service.js";
import { MemoryCoreSaasAdapter } from "../src/modules/core-saas/services/memory-core-saas.adapter.js";
import { InMemoryCoreSaasStore } from "../src/modules/core-saas/store/core-saas.store.js";

test("platform routes require platform scope", async () => {
  await withPlatformApi(async (baseUrl) => {
    const missingActor = await requestJson(baseUrl, "/api/v1/platform/tenants");
    assert.equal(missingActor.status, 403);
    assert.equal(missingActor.body.error.reason, "platform_actor_required");

    const tenantActor = await requestJson(baseUrl, "/api/v1/platform/tenants", {
      headers: {
        "x-tenant-id": "ten_demo",
        "x-user-id": "usr_demo",
        "x-role": "manager",
      },
    });
    assert.equal(tenantActor.status, 403);
    assert.equal(tenantActor.body.error.reason, "platform_permission_required");

    const platformActor = await requestJson(baseUrl, "/api/v1/platform/tenants", {
      headers: {
        "x-user-id": "usr_platform",
        "x-role": "super_admin",
      },
    });
    assert.equal(platformActor.status, 200);
    assert.equal(Array.isArray(platformActor.body.data), true);
  });
});

test("invalid bearer token rejects platform route before legacy fallback", async () => {
  await withPlatformApi(async (baseUrl) => {
    const response = await requestJson(baseUrl, "/api/v1/platform/tenants", {
      headers: {
        authorization: "Bearer invalid.token.value",
        "x-user-id": "usr_platform",
        "x-role": "super_admin",
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

test("platform legacy headers are disabled in production", async () => {
  await withPlatformApi(async (baseUrl) => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const response = await requestJson(baseUrl, "/api/v1/platform/tenants", {
        headers: {
          "x-user-id": "usr_platform",
          "x-role": "super_admin",
        },
      });

      assert.equal(response.status, 403);
      assert.equal(response.body.error.reason, "platform_legacy_headers_disabled");
    } finally {
      restoreOptionalEnv("NODE_ENV", previousNodeEnv);
    }
  });
});

async function withPlatformApi(callback: (baseUrl: string) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";

  const { createApp } = await import("../src/app.js");
  const service = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const app = createApp(new MemoryCoreSaasAdapter(service));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback(baseUrl);
  } finally {
    await closeServer(server);
  }
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

function restoreOptionalEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
