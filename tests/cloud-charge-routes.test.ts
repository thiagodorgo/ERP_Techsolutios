import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type {
  CloudCostAllocationRun,
  TenantCloudCostAllocation,
} from "../src/modules/cloud-cost-allocation/index.js";
import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

const periodStart = new Date("2026-06-01T00:00:00.000Z");
const periodEnd = new Date("2026-06-30T23:59:59.999Z");

test("Platform Admin cria regra, calculation run, tenant charges e summary", async () => {
  await withChargeApi(async ({ baseUrl, seed, allocationRun }) => {
    const rule = await requestJson(baseUrl, "/api/v1/platform/cloud-charge-rules", {
      method: "POST",
      headers: platformHeaders(),
      body: {
        planCode: "default",
        name: "Default cloud markup",
        description: "Default 60 percent markup",
        isActive: true,
        priority: 100,
        effectiveFrom: "2026-06-01",
        currency: "BRL",
        markupType: "percentage",
        markupValue: 60,
        minimumMonthlyCharge: 10,
        includedCloudCost: 0,
        roundingMode: "nearest_cent",
        metadata: {
          authorization: "Bearer secret-token",
          publicNote: "route-test",
        },
      },
    });
    assert.equal(rule.status, 201);
    assert.equal(rule.body.data.metadata.authorization, "[REDACTED]");
    assert.equal(rule.body.data.metadata.publicNote, "route-test");

    const rules = await requestJson(baseUrl, "/api/v1/platform/cloud-charge-rules?isActive=true", {
      headers: platformHeaders(),
    });
    assert.equal(rules.status, 200);
    assert.equal(rules.body.data.length, 1);

    const created = await requestJson(baseUrl, "/api/v1/platform/cloud-charges/calculation-runs", {
      method: "POST",
      headers: platformHeaders(),
      body: {
        periodStart: "2026-06-01",
        periodEnd: "2026-06-30",
        sourceAllocationRunId: allocationRun.id,
        strategy: "markup_rules_v1",
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.status, "completed");
    assert.equal(created.body.data.totalAllocatedCost, 100);
    assert.equal(created.body.data.totalChargeAmount, 160);
    assert.equal(created.body.data.totalMarginAmount, 60);

    const runs = await requestJson(
      baseUrl,
      "/api/v1/platform/cloud-charges/calculation-runs?periodStart=2026-06-01&periodEnd=2026-06-30",
      { headers: platformHeaders() },
    );
    const charges = await requestJson(
      baseUrl,
      `/api/v1/platform/cloud-charges/calculation-runs/${created.body.data.id}/tenant-charges`,
      { headers: platformHeaders() },
    );
    const summary = await requestJson(baseUrl, "/api/v1/platform/cloud-charges/summary", {
      headers: platformHeaders(),
    });

    assert.equal(runs.status, 200);
    assert.equal(runs.body.data.length, 1);
    assert.equal(charges.status, 200);
    assert.equal(charges.body.data.some((item: { tenantId: string }) => item.tenantId === seed.tenantA.id), true);
    assert.equal(summary.status, 200);
    assert.equal(summary.body.data.totalAllocatedCost, 100);
    assert.equal(summary.body.data.totalChargeAmount, 160);
    assert.equal(summary.body.data.totalMarginAmount, 60);
    assert.equal(summary.body.data.tenants.length, 2);
  });
});

test("usuario tenant comum nao acessa endpoints platform de charges", async () => {
  await withChargeApi(async ({ baseUrl, seed }) => {
    const response = await requestJson(baseUrl, "/api/v1/platform/cloud-charges/summary", {
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

type ChargeApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
  readonly allocationRun: CloudCostAllocationRun;
};

async function withChargeApi(callback: (context: ChargeApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    {
      getMemoryCloudChargeRepositoryForTests,
      resetCloudChargeRuntimeForTests,
    },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/cloud-charges/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetCloudChargeRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const allocationRun = sourceAllocationRun();
  const repository = getMemoryCloudChargeRepositoryForTests();
  repository.seed({
    tenants: [
      { id: seed.tenantA.id, name: seed.tenantA.name, slug: seed.tenantA.slug },
      { id: seed.tenantB.id, name: seed.tenantB.name, slug: seed.tenantB.slug },
    ],
    allocationRuns: [allocationRun],
    allocations: [
      allocation(allocationRun.id, seed.tenantA.id, 40),
      allocation(allocationRun.id, seed.tenantB.id, 60),
    ],
  });

  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed, allocationRun });
  } finally {
    await closeServer(server);
    resetCloudChargeRuntimeForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({ name: "Tenant Charge A" });
  const tenantB = service.createTenant({ name: "Tenant Charge B" });
  const adminA = service.createUser({
    tenantId: tenantA.id,
    name: "Admin A",
    email: "cloud-charge-admin-a@example.com",
    roles: ["tenant_admin"],
  });

  return { tenantA, tenantB, adminA };
}

function sourceAllocationRun(): CloudCostAllocationRun {
  return {
    id: "allocation-run-route",
    provider: "aws",
    status: "completed",
    periodStart,
    periodEnd,
    strategy: "direct_tag_then_usage_weighted_v1",
    totalImportedCost: 100,
    totalAllocatedCost: 100,
    totalUnallocatedCost: 0,
    currency: "USD",
    metadata: {},
    createdAt: periodStart,
    updatedAt: periodStart,
  };
}

function allocation(allocationRunId: string, tenantId: string, allocatedCost: number): TenantCloudCostAllocation {
  return {
    id: `${tenantId}-${allocatedCost}`,
    allocationRunId,
    tenantId,
    provider: "aws",
    periodStart,
    periodEnd,
    serviceCode: "AmazonS3",
    usageType: "TimedStorage-ByteHrs",
    costCategory: "storage",
    allocationMethod: "storage_usage_weight",
    allocationBasisMetricKey: "storage_gb_month",
    allocationBasisQuantity: 1,
    allocationRatio: allocatedCost / 100,
    allocatedCost,
    currency: "USD",
    sourceCostLineItemIds: [],
    metadata: {},
    createdAt: periodStart,
    updatedAt: periodStart,
  };
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
