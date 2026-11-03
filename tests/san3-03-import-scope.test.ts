import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { CloudCostImport, CloudCostLineItem } from "../src/modules/cloud-costs/index.js";
import {
  CloudCostAllocationService,
  InMemoryCloudCostAllocationRepository,
} from "../src/modules/cloud-cost-allocation/index.js";

const periodStart = new Date("2028-03-01T00:00:00.000Z");
const periodEnd = new Date("2028-03-31T23:59:59.999Z");
const olderImportId = "10000000-0000-4000-8000-000000000001";
const newerImportId = "10000000-0000-4000-8000-000000000002";

test("T26-1 · sem importId usa somente o import completed mais recente", async () => {
  const repository = new InMemoryCloudCostAllocationRepository();
  seed(repository, {
    tenants: [{ id: "tenant-a", name: "Tenant A", slug: "tenant-a" }],
    imports: [
      costImport(olderImportId, "completed", "2028-03-10T00:00:00.000Z"),
      costImport(newerImportId, "completed", "2028-03-20T00:00:00.000Z"),
    ],
    costLineItems: [
      costLine("line-old", olderImportId, 5),
      costLine("line-new", newerImportId, 7),
    ],
  });
  const service = new CloudCostAllocationService(repository);

  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });
  const allocations = await service.listTenantAllocations(run.id);

  assert.equal(run.totalImportedCost, 7);
  assert.equal(run.metadata.importId, newerImportId);
  assert.equal(run.metadata.importResolution, "latest_completed");
  assert.deepEqual(allocations.flatMap((allocation) => allocation.sourceCostLineItemIds), ["line-new"]);
});

test("T26-2 · importId explícito usa o import completed solicitado", async () => {
  const { service } = createService();

  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd, importId: olderImportId });

  assert.equal(run.totalImportedCost, 5);
  assert.equal(run.metadata.importId, olderImportId);
  assert.equal(run.metadata.importResolution, "explicit");
});

test("T26-3 · import explícito processing ou failed é recusado com 422", async () => {
  for (const status of ["processing", "failed"] as const) {
    const repository = new InMemoryCloudCostAllocationRepository();
    seed(repository, {
      tenants: [{ id: "tenant-a", name: "Tenant A", slug: "tenant-a" }],
      imports: [costImport(olderImportId, status, "2028-03-10T00:00:00.000Z")],
      costLineItems: [costLine("line-old", olderImportId, 5)],
    });
    const service = new CloudCostAllocationService(repository);

    await assert.rejects(
      service.allocateCostsForPeriod({ periodStart, periodEnd, importId: olderImportId }),
      (error: unknown) =>
        error instanceof Error &&
        "statusCode" in error &&
        error.statusCode === 422 &&
        "reason" in error &&
        error.reason === "import_not_completed",
    );
  }
});

test("T26-4 · sem import elegível conclui run vazia de forma declarada", async () => {
  const repository = new InMemoryCloudCostAllocationRepository();
  repository.seed({ tenants: [{ id: "tenant-a", name: "Tenant A", slug: "tenant-a" }] });
  const service = new CloudCostAllocationService(repository);

  const run = await service.allocateCostsForPeriod({ periodStart, periodEnd });

  assert.equal(run.status, "completed");
  assert.equal(run.totalImportedCost, 0);
  assert.equal(run.metadata.importId, null);
  assert.equal(run.metadata.importResolution, "none");
});

test("T26-5 · reexecução conserva o import fixado mesmo após chegar import novo", async () => {
  const { repository, service } = createService();
  const run = await service.createAllocationRun({ periodStart, periodEnd });
  const newestImportId = "10000000-0000-4000-8000-000000000003";
  seed(repository, {
    tenants: [{ id: "tenant-a", name: "Tenant A", slug: "tenant-a" }],
    imports: [
      costImport(olderImportId, "completed", "2028-03-10T00:00:00.000Z"),
      costImport(newerImportId, "completed", "2028-03-20T00:00:00.000Z"),
      costImport(newestImportId, "completed", "2028-03-25T00:00:00.000Z"),
    ],
    costLineItems: [
      costLine("line-old", olderImportId, 5),
      costLine("line-new", newerImportId, 7),
      costLine("line-newest", newestImportId, 11),
    ],
  });

  const first = await service.executeAllocationRun(run.id);
  const second = await service.executeAllocationRun(run.id);

  assert.equal(first.metadata.importId, newerImportId);
  assert.equal(first.totalImportedCost, 7);
  assert.equal(second.metadata.importId, newerImportId);
  assert.equal(second.totalImportedCost, 7);
});

test("T26-6 · metadata do cliente não substitui importId nem resolução da run", async () => {
  const { service } = createService();

  const run = await service.allocateCostsForPeriod({
    periodStart,
    periodEnd,
    metadata: { importId: olderImportId, importResolution: "explicit", note: "kept" },
  });

  assert.equal(run.metadata.importId, newerImportId);
  assert.equal(run.metadata.importResolution, "latest_completed");
  assert.equal(run.metadata.note, "kept");
});

test("T26-7 · rota recusa importId malformado e aceita UUID válido", async () => {
  await withAllocationApi(async ({ baseUrl }) => {
    const invalid = await requestJson(baseUrl, {
      periodStart: "2028-03-01",
      periodEnd: "2028-03-31",
      importId: "not-a-uuid",
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.reason, "invalid_uuid");

    const valid = await requestJson(baseUrl, {
      periodStart: "2028-03-01",
      periodEnd: "2028-03-31",
      importId: olderImportId,
    });
    assert.equal(valid.status, 201);
    assert.equal(valid.body.data.metadata.importId, olderImportId);
  });
});

function createService(): {
  repository: InMemoryCloudCostAllocationRepository;
  service: CloudCostAllocationService;
} {
  const repository = new InMemoryCloudCostAllocationRepository();
  seed(repository, {
    tenants: [{ id: "tenant-a", name: "Tenant A", slug: "tenant-a" }],
    imports: [
      costImport(olderImportId, "completed", "2028-03-10T00:00:00.000Z"),
      costImport(newerImportId, "completed", "2028-03-20T00:00:00.000Z"),
    ],
    costLineItems: [
      costLine("line-old", olderImportId, 5),
      costLine("line-new", newerImportId, 7),
    ],
  });
  return { repository, service: new CloudCostAllocationService(repository) };
}

function seed(
  repository: InMemoryCloudCostAllocationRepository,
  input: {
    readonly imports: readonly CloudCostImport[];
    readonly costLineItems: readonly CloudCostLineItem[];
    readonly tenants: readonly { id: string; name: string; slug: string }[];
  },
): void {
  repository.seed(input);
}

function costImport(id: string, status: CloudCostImport["status"], importedAt: string): CloudCostImport {
  const timestamp = new Date(importedAt);
  return {
    id,
    provider: "aws",
    sourceType: "manual_csv",
    status,
    periodStart,
    periodEnd,
    importedAt: timestamp,
    rowCount: 1,
    totalUnblendedCost: 1,
    currency: "USD",
    metadata: {},
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function costLine(id: string, importId: string, unblendedCost: number): CloudCostLineItem {
  return {
    id,
    importId,
    provider: "aws",
    billingPeriodStart: periodStart,
    billingPeriodEnd: periodEnd,
    serviceCode: "AmazonEC2",
    usageType: "BoxUsage",
    tenantTag: "tenant-a",
    unblendedCost,
    currency: "USD",
    rawLineHash: id,
    metadata: {},
    createdAt: periodStart,
  };
}

async function withAllocationApi(callback: (context: { readonly baseUrl: string }) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { getMemoryCloudCostAllocationRepositoryForTests, resetCloudCostAllocationRuntimeForTests },
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
  const tenant = core.createTenant({ name: "SAN3 Import Scope" });
  const admin = core.createUser({
    tenantId: tenant.id,
    name: "SAN3 Admin",
    email: "san3-import-admin@example.com",
    roles: ["tenant_admin"],
  });
  getMemoryCloudCostAllocationRepositoryForTests().seed({
    tenants: [{ id: tenant.id, name: tenant.name, slug: tenant.slug }],
    imports: [costImport(olderImportId, "completed", "2028-03-10T00:00:00.000Z")],
    costLineItems: [costLine("line-route", olderImportId, 5)],
  });

  const server = createApp(new MemoryCoreSaasAdapter(core)).listen(0);
  const baseUrl = await getBaseUrl(server);
  try {
    await callback({ baseUrl });
  } finally {
    await closeServer(server);
    resetCloudCostAllocationRuntimeForTests();
  }

  void admin;
}

async function requestJson(baseUrl: string, body: Record<string, unknown>) {
  const response = await fetch(`${baseUrl}/api/v1/platform/cloud-cost-allocations/runs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-user-id": "usr_platform",
      "x-role": "super_admin",
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");
  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
