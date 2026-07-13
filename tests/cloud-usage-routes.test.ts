import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("platform admin acessa cloud usage summary e usuario comum nao acessa", async () => {
  await withCloudUsageApi(async ({ baseUrl, seed, service }) => {
    await service.recordUsageEvent({
      tenantId: seed.tenantA.id,
      sourceType: "checklist_run",
      sourceId: "run-a",
      metricKey: "checklist_run.completed",
      quantity: 1,
      unit: "count",
      occurredAt: new Date("2026-06-08T10:00:00.000Z"),
    });

    // Período explícito cobrindo o evento (2026-06-08). Sem período, o summary usa a janela
    // padrão de 30 dias relativa a "agora" — o que fazia este teste apodrecer com o relógio.
    const platform = await requestJson(
      baseUrl,
      "/api/v1/platform/cloud-usage/summary?periodStart=2026-06-01T00:00:00.000Z&periodEnd=2026-06-30T23:59:59.999Z",
      { headers: platformHeaders() },
    );
    const tenantUser = await requestJson(baseUrl, "/api/v1/platform/cloud-usage/summary", {
      headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
    });

    assert.equal(platform.status, 200);
    assert.equal(platform.body.data.metrics.length, 1);
    assert.equal(tenantUser.status, 403);
    assert.equal(tenantUser.body.error.reason, "platform_permission_required");
  });
});

test("cloud usage platform API filtra por tenant e data sem vazar outro tenant", async () => {
  await withCloudUsageApi(async ({ baseUrl, seed, service }) => {
    await service.recordManyUsageEvents([
      {
        tenantId: seed.tenantA.id,
        sourceType: "notification",
        sourceId: "notif-old",
        metricKey: "notification.created",
        quantity: 2,
        unit: "count",
        occurredAt: new Date("2026-06-01T10:00:00.000Z"),
      },
      {
        tenantId: seed.tenantA.id,
        sourceType: "notification",
        sourceId: "notif-new",
        metricKey: "notification.created",
        quantity: 3,
        unit: "count",
        occurredAt: new Date("2026-06-08T10:00:00.000Z"),
      },
      {
        tenantId: seed.tenantB.id,
        sourceType: "notification",
        sourceId: "notif-b",
        metricKey: "notification.created",
        quantity: 99,
        unit: "count",
        occurredAt: new Date("2026-06-08T10:00:00.000Z"),
      },
      {
        tenantId: seed.tenantA.id,
        sourceType: "checklist_run",
        sourceId: "run-a",
        metricKey: "checklist_run.completed",
        quantity: 1,
        unit: "count",
        occurredAt: new Date("2026-06-08T10:00:00.000Z"),
      },
    ]);
    await service.aggregateDailyUsage(new Date("2026-06-08T12:00:00.000Z"));

    const summary = await requestJson(
      baseUrl,
      `/api/v1/platform/cloud-usage/tenants/${seed.tenantA.id}/summary?periodStart=2026-06-08T00:00:00.000Z&periodEnd=2026-06-08T23:59:59.999Z`,
      { headers: platformHeaders() },
    );
    const daily = await requestJson(
      baseUrl,
      `/api/v1/platform/cloud-usage/tenants/${seed.tenantA.id}/daily?periodStart=2026-06-08&periodEnd=2026-06-08`,
      { headers: platformHeaders() },
    );

    assert.equal(summary.status, 200);
    assert.equal(summary.body.data.tenantId, seed.tenantA.id);
    assert.equal(
      summary.body.data.metrics.find((metric: { metricKey: string }) => metric.metricKey === "notification.created").quantity,
      3,
    );
    assert.equal(
      summary.body.data.metrics.some((metric: { quantity: number }) => metric.quantity === 99),
      false,
    );
    assert.equal(daily.status, 200);
    assert.equal(daily.body.data.tenantId, seed.tenantA.id);
    assert.equal(daily.body.data.daily.some((item: { metricKey: string }) => item.metricKey === "notification.created"), true);
  });
});

test("cloud usage routes suportam eventos de checklist e notifications sem quebrar isolamento", async () => {
  await withCloudUsageApi(async ({ baseUrl, seed, service }) => {
    await service.recordManyUsageEvents([
      {
        tenantId: seed.tenantA.id,
        sourceType: "checklist_run",
        sourceId: "run-a",
        metricKey: "checklist_run.divergence_reported",
        quantity: 1,
        unit: "count",
      },
      {
        tenantId: seed.tenantA.id,
        sourceType: "notification",
        sourceId: "notif-a",
        metricKey: "notification.created",
        quantity: 1,
        unit: "count",
      },
      {
        tenantId: seed.tenantB.id,
        sourceType: "notification",
        sourceId: "notif-b",
        metricKey: "notification.created",
        quantity: 7,
        unit: "count",
      },
    ]);

    const response = await requestJson(baseUrl, `/api/v1/platform/cloud-usage/tenants/${seed.tenantA.id}/summary`, {
      headers: platformHeaders(),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.data.metrics.map((metric: { metricKey: string }) => metric.metricKey).sort(),
      ["checklist_run.divergence_reported", "notification.created"],
    );
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly adminA: User;
};

type CloudUsageApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
  readonly service: import("../src/modules/cloud-usage/index.js").CloudUsageService;
};

async function withCloudUsageApi(callback: (context: CloudUsageApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { createMemoryCloudUsageService, resetCloudUsageRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/cloud-usage/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetCloudUsageRuntimeForTests();

  const service = createMemoryCloudUsageService();
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({
      baseUrl,
      seed,
      service,
    });
  } finally {
    await closeServer(server);
    resetCloudUsageRuntimeForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({ name: "Tenant Cloud Usage A" });
  const tenantB = service.createTenant({ name: "Tenant Cloud Usage B" });
  const adminA = service.createUser({
    tenantId: tenantA.id,
    name: "Admin A",
    email: "cloud-usage-admin-a@example.com",
    roles: ["tenant_admin"],
  });

  return {
    tenantA,
    tenantB,
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
