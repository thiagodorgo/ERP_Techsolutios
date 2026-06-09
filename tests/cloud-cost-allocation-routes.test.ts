import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";
import type { CloudCostLineItem } from "../src/modules/cloud-costs/index.js";
import type { CloudUsageDailyAggregate } from "../src/modules/cloud-usage/index.js";

const periodStart = new Date("2026-06-01T00:00:00.000Z");
const periodEnd = new Date("2026-06-30T23:59:59.999Z");

test("Platform Admin cria run, lista runs, consulta allocations e summary", async () => {
  await withAllocationApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/platform/cloud-cost-allocations/runs", {
      method: "POST",
      headers: platformHeaders(),
      body: {
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        strategy: "direct_tag_then_usage_weighted_v1",
      },
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.data.status, "completed");
    assert.equal(created.body.data.totalImportedCost, 15);
    assert.equal(created.body.data.totalAllocatedCost, 15);
    assert.equal(created.body.data.totalUnallocatedCost, 0);

    const runs = await requestJson(
      baseUrl,
      "/api/v1/platform/cloud-cost-allocations/runs?periodStart=2026-06-01&periodEnd=2026-06-30",
      { headers: platformHeaders() },
    );
    const allocations = await requestJson(
      baseUrl,
      `/api/v1/platform/cloud-cost-allocations/runs/${created.body.data.id}/tenant-allocations`,
      { headers: platformHeaders() },
    );
    const summary = await requestJson(baseUrl, "/api/v1/platform/cloud-cost-allocations/summary", {
      headers: platformHeaders(),
    });

    assert.equal(runs.status, 200);
    assert.equal(runs.body.data.length, 1);
    assert.equal(allocations.status, 200);
    assert.equal(allocations.body.data.some((item: { tenantId: string }) => item.tenantId === seed.tenantA.id), true);
    assert.equal(summary.status, 200);
    assert.equal(summary.body.data.totalImportedCost, 15);
    assert.equal(summary.body.data.totalAllocatedCost, 15);
    assert.equal(summary.body.data.totalUnallocatedCost, 0);
    assert.equal(summary.body.data.tenants.length, 2);
  });
});

test("usuario tenant comum nao acessa endpoints platform de allocation", async () => {
  await withAllocationApi(async ({ baseUrl, seed }) => {
    const response = await requestJson(baseUrl, "/api/v1/platform/cloud-cost-allocations/summary", {
      headers: authHeaders(seed.tenantA, seed.adminA),
    });

    assert.equal(response.status, 403);
    assert.equal(response.body.error.reason, "platform_permission_required");
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly adminA: User;
};

type AllocationApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withAllocationApi(callback: (context: AllocationApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    {
      getMemoryCloudCostAllocationRepositoryForTests,
      resetCloudCostAllocationRuntimeForTests,
    },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/cloud-cost-allocation/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetCloudCostAllocationRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const repository = getMemoryCloudCostAllocationRepositoryForTests();
  repository.seed({
    tenants: [
      { id: seed.tenantA.id, name: seed.tenantA.name, slug: seed.tenantA.slug },
      { id: seed.tenantB.id, name: seed.tenantB.name, slug: seed.tenantB.slug },
    ],
    costLineItems: [
      costLine("cost-direct", { tenantTag: seed.tenantA.id, serviceCode: "AmazonEC2", unblendedCost: 5 }),
      costLine("cost-s3", { serviceCode: "AmazonS3", usageType: "TimedStorage-ByteHrs", unblendedCost: 10 }),
    ],
    usageAggregates: [
      usage(seed.tenantA.id, "storage_gb_month", 1),
      usage(seed.tenantB.id, "storage_gb_month", 1),
    ],
  });

  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed });
  } finally {
    await closeServer(server);
    resetCloudCostAllocationRuntimeForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({ name: "Tenant Allocation A" });
  const tenantB = service.createTenant({ name: "Tenant Allocation B" });
  const adminA = service.createUser({
    tenantId: tenantA.id,
    name: "Admin A",
    email: "cloud-allocation-admin-a@example.com",
    roles: ["tenant_admin"],
  });

  return { tenantA, tenantB, adminA };
}

function platformHeaders(): Record<string, string> {
  return {
    "x-user-id": "usr_platform",
    "x-role": "super_admin",
  };
}

function authHeaders(tenant: Tenant, user: User): Record<string, string> {
  return {
    "x-tenant-id": tenant.id,
    "x-user-id": user.id,
    "x-role": "tenant_admin",
  };
}

function costLine(id: string, override: Partial<CloudCostLineItem>): CloudCostLineItem {
  return {
    id,
    importId: "import-1",
    provider: "aws",
    billingPeriodStart: periodStart,
    billingPeriodEnd: periodEnd,
    serviceCode: "AmazonEC2",
    usageType: "BoxUsage",
    unblendedCost: 1,
    currency: "USD",
    rawLineHash: id,
    metadata: {},
    createdAt: periodStart,
    ...override,
  };
}

function usage(
  tenantId: string,
  metricKey: CloudUsageDailyAggregate["metricKey"],
  quantity: number,
): CloudUsageDailyAggregate {
  return {
    id: `${tenantId}-${metricKey}`,
    tenantId,
    date: "2026-06-15",
    metricKey,
    quantity,
    unit: "count",
    sourceType: "test",
    metadata: {},
    createdAt: periodStart,
    updatedAt: periodStart,
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
      if (error) reject(error);
      else resolve();
    });
  });
}
