import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

const fixturePath = new URL("./fixtures/aws-cur-sample.csv", import.meta.url);

test("platform admin acessa summary e tenant comum nao acessa custos brutos", async () => {
  await withCloudCostsApi(async ({ baseUrl, seed, service, csv }) => {
    await service.importAwsCurCsv({ csv, sourceType: "mock_fixture" });

    const platform = await requestJson(baseUrl, "/api/v1/platform/cloud-costs/summary", {
      headers: platformHeaders(),
    });
    const tenantUser = await requestJson(baseUrl, "/api/v1/platform/cloud-costs/summary", {
      headers: authHeaders(seed.tenantA, seed.adminA),
    });

    assert.equal(platform.status, 200);
    assert.equal(platform.body.data.totalUnblendedCost, 12.75);
    assert.equal(tenantUser.status, 403);
    assert.equal(tenantUser.body.error.reason, "platform_permission_required");
  });
});

test("platform admin lista imports e line items com filtros", async () => {
  await withCloudCostsApi(async ({ baseUrl, service, csv }) => {
    const imported = await service.importAwsCurCsv({
      csv,
      sourceType: "mock_fixture",
      metadata: {
        accessToken: "secret",
        note: "safe",
      },
    });

    const imports = await requestJson(baseUrl, "/api/v1/platform/cloud-costs/imports", {
      headers: platformHeaders(),
    });
    const lineItems = await requestJson(
      baseUrl,
      "/api/v1/platform/cloud-costs/line-items?serviceCode=AmazonEC2&periodStart=2026-06-01T00:00:00.000Z&periodEnd=2026-06-30T23:59:59.999Z",
      { headers: platformHeaders() },
    );
    const detail = await requestJson(baseUrl, `/api/v1/platform/cloud-costs/imports/${imported.id}`, {
      headers: platformHeaders(),
    });

    assert.equal(imports.status, 200);
    assert.equal(imports.body.data.length, 1);
    assert.equal(imports.body.data[0].metadata.accessToken, "[REDACTED]");
    assert.equal(imports.body.data[0].metadata.note, "safe");
    assert.equal(lineItems.status, 200);
    assert.equal(lineItems.body.data.length, 1);
    assert.equal(lineItems.body.data[0].serviceCode, "AmazonEC2");
    assert.equal(lineItems.body.data[0].unblendedCost, 10.5);
    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.id, imported.id);
  });
});

test("platform admin importa manual CSV por JSON seguro", async () => {
  await withCloudCostsApi(async ({ baseUrl, csv }) => {
    const response = await requestJson(baseUrl, "/api/v1/platform/cloud-costs/imports/manual-csv", {
      method: "POST",
      headers: platformHeaders(),
      body: {
        csv,
        metadata: {
          secret: "must-redact",
        },
      },
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.data.status, "completed");
    assert.equal(response.body.data.rowCount, 2);
    assert.equal(response.body.data.totalUnblendedCost, 12.75);
    assert.equal(response.body.data.metadata.secret, "[REDACTED]");
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly adminA: User;
};

type CloudCostsApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
  readonly service: import("../src/modules/cloud-costs/index.js").CloudCostService;
  readonly csv: string;
};

async function withCloudCostsApi(callback: (context: CloudCostsApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { createMemoryCloudCostService, resetCloudCostRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/cloud-costs/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetCloudCostRuntimeForTests();

  const service = createMemoryCloudCostService();
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);
  const csv = await readFile(fixturePath, "utf8");

  try {
    await callback({
      baseUrl,
      seed,
      service,
      csv,
    });
  } finally {
    await closeServer(server);
    resetCloudCostRuntimeForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({ name: "Tenant Cloud Costs A" });
  const adminA = service.createUser({
    tenantId: tenantA.id,
    name: "Admin A",
    email: "cloud-costs-admin-a@example.com",
    roles: ["tenant_admin"],
  });

  return {
    tenantA,
    adminA,
  };
}

function platformHeaders(): Record<string, string> {
  return {
    "x-user-id": "usr_platform",
    "x-role": "super_admin",
  };
}

function authHeaders(tenant: Tenant, user: User, role = "tenant_admin"): Record<string, string> {
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
    body: options.body ? JSON.stringify(options.body) : undefined,
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
