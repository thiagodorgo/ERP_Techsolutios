import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("field location routes record mobile points and expose tenant-scoped latest/history", async () => {
  await withFieldLocationApi(async ({ baseUrl, seed }) => {
    const recorded = await requestJson(baseUrl, "/api/v1/mobile/field-locations", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body: {
        latitude: -23.55052,
        longitude: -46.633308,
        accuracyMeters: 8.5,
        headingDegrees: 120,
        speedMetersPerSecond: 4.2,
        batteryLevel: 76,
        recordedAt: "2026-06-09T12:00:00.000Z",
        metadata: {
          deviceId: "field-device-1",
          accessToken: "must-not-leak",
        },
      },
    });
    const latest = await requestJson(baseUrl, "/api/v1/field-locations/latest", {
      headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
    });
    const history = await requestJson(
      baseUrl,
      `/api/v1/field-locations/history?operatorUserId=${seed.operatorA.id}`,
      {
        headers: authHeaders(seed.tenantA, seed.managerA, "manager"),
      },
    );
    const crossTenantLatest = await requestJson(baseUrl, "/api/v1/field-locations/latest", {
      headers: authHeaders(seed.tenantB, seed.managerB, "manager"),
    });
    const historyWithoutPermission = await requestJson(
      baseUrl,
      `/api/v1/field-locations/history?operatorUserId=${seed.operatorA.id}`,
      {
        headers: authHeaders(seed.tenantA, seed.viewerA, "viewer"),
      },
    );

    assert.equal(recorded.status, 201);
    assert.equal(recorded.body.data.operatorUserId, seed.operatorA.id);
    assert.equal(recorded.body.data.latitude, -23.55052);
    assert.equal(recorded.body.data.metadata, undefined);
    assert.equal(latest.status, 200);
    assert.equal(latest.body.data.length, 1);
    assert.equal(latest.body.data[0].id, recorded.body.data.id);
    assert.equal(history.status, 200);
    assert.equal(history.body.data.length, 1);
    assert.equal(history.body.data[0].id, recorded.body.data.id);
    assert.equal(crossTenantLatest.status, 200);
    assert.deepEqual(crossTenantLatest.body.data, []);
    assert.equal(historyWithoutPermission.status, 403);
    assert.equal(historyWithoutPermission.body.error.reason, "permission_required");
  });
});

test("field location mobile route validates coordinates and battery level", async () => {
  await withFieldLocationApi(async ({ baseUrl, seed }) => {
    const invalidLatitude = await requestJson(baseUrl, "/api/v1/mobile/field-locations", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body: {
        latitude: -100,
        longitude: -46.633308,
      },
    });
    const invalidBattery = await requestJson(baseUrl, "/api/v1/mobile/field-locations", {
      method: "POST",
      headers: authHeaders(seed.tenantA, seed.operatorA, "operator"),
      body: {
        latitude: -23.55052,
        longitude: -46.633308,
        batteryLevel: 101,
      },
    });

    assert.equal(invalidLatitude.status, 400);
    assert.equal(invalidLatitude.body.error.reason, "invalid_coordinate");
    assert.equal(invalidBattery.status, 400);
    assert.equal(invalidBattery.body.error.reason, "invalid_battery");
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly operatorA: User;
  readonly managerA: User;
  readonly managerB: User;
  readonly viewerA: User;
};

type FieldLocationApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withFieldLocationApi(callback: (context: FieldLocationApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetFieldLocationRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/field-location/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetFieldLocationRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({
      baseUrl,
      seed,
    });
  } finally {
    await closeServer(server);
    resetFieldLocationRuntimeForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({
    name: "Tenant Field Location A",
  });
  const tenantB = service.createTenant({
    name: "Tenant Field Location B",
  });
  const operatorA = service.createUser({
    tenantId: tenantA.id,
    name: "Operator A",
    email: "field-location-operator-a@example.com",
    roles: ["operator"],
  });
  const managerA = service.createUser({
    tenantId: tenantA.id,
    name: "Manager A",
    email: "field-location-manager-a@example.com",
    roles: ["manager"],
  });
  const managerB = service.createUser({
    tenantId: tenantB.id,
    name: "Manager B",
    email: "field-location-manager-b@example.com",
    roles: ["manager"],
  });
  const viewerA = service.createUser({
    tenantId: tenantA.id,
    name: "Viewer A",
    email: "field-location-viewer-a@example.com",
    roles: ["viewer"],
  });

  return {
    tenantA,
    tenantB,
    operatorA,
    managerA,
    managerB,
    viewerA,
  };
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
