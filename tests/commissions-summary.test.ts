import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { InMemoryCommissionRepository } from "../src/modules/commissions/commission.repository.js";
import type { Tenant } from "../src/modules/core-saas/types/core-saas.types.js";

// F8 / R8.1 + R8.2 — extrato agregado (visão tenant) e extrato do próprio ator (read_own).

test("summary groups commission calculations by payee and sums amount", async () => {
  await withSummaryApi(async ({ baseUrl, ids, repo }) => {
    seed(repo, ids.tenantA.id, ids.operatorA, 100.25, "2026-06-05T10:00:00.000Z");
    seed(repo, ids.tenantA.id, ids.operatorA, 50.75, "2026-06-10T10:00:00.000Z");
    seed(repo, ids.tenantA.id, ids.payee2A, 200.5, "2026-06-12T10:00:00.000Z");

    const response = await fetch(`${baseUrl}/api/v1/commissions/statements/summary`, {
      headers: authHeaders(ids.tenantA.id, randomUUID(), "tenant_admin"),
    });
    const body = await readJson(response);

    assert.equal(response.status, 200);
    const items = summaryItems(body);
    assert.equal(items.length, 2);
    const operatorRow = items.find((item) => item.payeeId === ids.operatorA);
    const payee2Row = items.find((item) => item.payeeId === ids.payee2A);
    assert.equal(operatorRow?.total, 151);
    assert.equal(operatorRow?.count, 2);
    assert.equal(payee2Row?.total, 200.5);
    assert.equal(payee2Row?.count, 1);
    assert.equal(dataOf(body).total, 351.5);
  });
});

test("summary date range includes boundaries and excludes outside window", async () => {
  await withSummaryApi(async ({ baseUrl, ids, repo }) => {
    seed(repo, ids.tenantA.id, ids.operatorA, 100, "2026-05-31T23:59:59.000Z"); // before
    seed(repo, ids.tenantA.id, ids.operatorA, 200, "2026-06-01T00:00:00.000Z"); // == from
    seed(repo, ids.tenantA.id, ids.operatorA, 300, "2026-06-30T23:59:59.000Z"); // == to
    seed(repo, ids.tenantA.id, ids.operatorA, 400, "2026-07-01T00:00:00.000Z"); // after

    const response = await fetch(
      `${baseUrl}/api/v1/commissions/statements/summary?from=2026-06-01T00:00:00.000Z&to=2026-06-30T23:59:59.000Z`,
      { headers: authHeaders(ids.tenantA.id, randomUUID(), "tenant_admin") },
    );
    const body = await readJson(response);

    assert.equal(response.status, 200);
    const items = summaryItems(body);
    assert.equal(items.length, 1);
    assert.equal(items[0]?.total, 500);
    assert.equal(items[0]?.count, 2);
    assert.equal(dataOf(body).total, 500);
  });
});

test("my-summary fixes payeeId to the actor and ignores a forged payee_id", async () => {
  await withSummaryApi(async ({ baseUrl, ids, repo }) => {
    seed(repo, ids.tenantA.id, ids.operatorA, 120, "2026-06-05T10:00:00.000Z");
    seed(repo, ids.tenantA.id, ids.operatorA, 30, "2026-06-06T10:00:00.000Z");
    seed(repo, ids.tenantA.id, ids.payee2A, 999, "2026-06-07T10:00:00.000Z");

    const response = await fetch(
      `${baseUrl}/api/v1/commissions/statements/my-summary?payee_id=${ids.payee2A}`,
      { headers: authHeaders(ids.tenantA.id, ids.operatorA, "operator") },
    );
    const body = await readJson(response);

    assert.equal(response.status, 200);
    const items = summaryItems(body);
    assert.equal(items.length, 1);
    assert.equal(items[0]?.payeeId, ids.operatorA);
    assert.equal(items[0]?.total, 150);
    assert.equal(items[0]?.count, 2);
    assert.ok(!items.some((item) => item.payeeId === ids.payee2A));
    assert.equal(dataOf(body).total, 150);
  });
});

test("operator cannot read the all-payees summary (lacks commissions:read)", async () => {
  await withSummaryApi(async ({ baseUrl, ids }) => {
    const response = await fetch(`${baseUrl}/api/v1/commissions/statements/summary`, {
      headers: authHeaders(ids.tenantA.id, ids.operatorA, "operator"),
    });

    assert.equal(response.status, 403);
    assert.match(await response.text(), /commissions:read|permission_required/);
  });
});

test("finance cannot read my-summary (lacks commissions:read_own)", async () => {
  await withSummaryApi(async ({ baseUrl, ids }) => {
    const response = await fetch(`${baseUrl}/api/v1/commissions/statements/my-summary`, {
      headers: authHeaders(ids.tenantA.id, randomUUID(), "finance"),
    });

    assert.equal(response.status, 403);
    assert.match(await response.text(), /commissions:read_own|permission_required/);
  });
});

test("finance reads the all-payees summary", async () => {
  await withSummaryApi(async ({ baseUrl, ids, repo }) => {
    seed(repo, ids.tenantA.id, ids.operatorA, 10, "2026-06-05T10:00:00.000Z");
    seed(repo, ids.tenantA.id, ids.payee2A, 20, "2026-06-06T10:00:00.000Z");

    const response = await fetch(`${baseUrl}/api/v1/commissions/statements/summary`, {
      headers: authHeaders(ids.tenantA.id, randomUUID(), "finance"),
    });
    const body = await readJson(response);

    assert.equal(response.status, 200);
    assert.equal(summaryItems(body).length, 2);
    assert.equal(dataOf(body).total, 30);
  });
});

test("auditor reads the all-payees summary", async () => {
  await withSummaryApi(async ({ baseUrl, ids, repo }) => {
    seed(repo, ids.tenantA.id, ids.operatorA, 42, "2026-06-05T10:00:00.000Z");

    const response = await fetch(`${baseUrl}/api/v1/commissions/statements/summary`, {
      headers: authHeaders(ids.tenantA.id, randomUUID(), "auditor"),
    });
    const body = await readJson(response);

    assert.equal(response.status, 200);
    const items = summaryItems(body);
    assert.equal(items.length, 1);
    assert.equal(items[0]?.total, 42);
  });
});

test("viewer and anonymous are denied on summary and my-summary", async () => {
  await withSummaryApi(async ({ baseUrl, ids }) => {
    const viewerSummary = await fetch(`${baseUrl}/api/v1/commissions/statements/summary`, {
      headers: authHeaders(ids.tenantA.id, randomUUID(), "viewer"),
    });
    const viewerMine = await fetch(`${baseUrl}/api/v1/commissions/statements/my-summary`, {
      headers: authHeaders(ids.tenantA.id, randomUUID(), "viewer"),
    });
    const anonymous = await fetch(`${baseUrl}/api/v1/commissions/statements/summary`);

    assert.equal(viewerSummary.status, 403);
    assert.equal(viewerMine.status, 403);
    assert.equal(anonymous.status, 403);
  });
});

test("summary is isolated per tenant and never leaks another tenant's payees", async () => {
  await withSummaryApi(async ({ baseUrl, ids, repo }) => {
    seed(repo, ids.tenantA.id, ids.operatorA, 111, "2026-06-05T10:00:00.000Z");
    seed(repo, ids.tenantB.id, ids.operatorB, 222, "2026-06-05T10:00:00.000Z");

    const tenantA = await fetch(`${baseUrl}/api/v1/commissions/statements/summary`, {
      headers: authHeaders(ids.tenantA.id, randomUUID(), "tenant_admin"),
    });
    const tenantABody = await readJson(tenantA);
    const tenantB = await fetch(`${baseUrl}/api/v1/commissions/statements/summary`, {
      headers: authHeaders(ids.tenantB.id, randomUUID(), "tenant_admin"),
    });
    const tenantBBody = await readJson(tenantB);

    assert.equal(tenantA.status, 200);
    assert.equal(summaryItems(tenantABody).length, 1);
    assert.equal(summaryItems(tenantABody)[0]?.payeeId, ids.operatorA);
    assert.ok(!summaryItems(tenantABody).some((item) => item.payeeId === ids.operatorB));
    assert.equal(dataOf(tenantABody).total, 111);

    assert.equal(tenantB.status, 200);
    assert.equal(summaryItems(tenantBBody)[0]?.payeeId, ids.operatorB);
    assert.equal(dataOf(tenantBBody).total, 222);
  });
});

test("my-summary only ever sees the caller's own tenant window (no cross-tenant leak)", async () => {
  await withSummaryApi(async ({ baseUrl, ids, repo }) => {
    // A calculation for operatorB lives in tenant B; querying with tenant A's claim must never surface it.
    seed(repo, ids.tenantB.id, ids.operatorB, 500, "2026-06-05T10:00:00.000Z");

    const response = await fetch(`${baseUrl}/api/v1/commissions/statements/my-summary`, {
      headers: authHeaders(ids.tenantA.id, ids.operatorB, "operator"),
    });
    const body = await readJson(response);

    assert.equal(response.status, 200);
    assert.equal(summaryItems(body).length, 0);
    assert.equal(dataOf(body).total, 0);
  });
});

test("calculations drill-down filters a payee's window and exposes the basis reference", async () => {
  await withSummaryApi(async ({ baseUrl, ids, repo }) => {
    seed(repo, ids.tenantA.id, ids.operatorA, 10, "2026-06-05T10:00:00.000Z");
    seed(repo, ids.tenantA.id, ids.operatorA, 20, "2026-06-20T10:00:00.000Z");
    seed(repo, ids.tenantA.id, ids.operatorA, 30, "2026-07-05T10:00:00.000Z"); // outside window
    seed(repo, ids.tenantA.id, ids.payee2A, 99, "2026-06-10T10:00:00.000Z"); // other payee

    const response = await fetch(
      `${baseUrl}/api/v1/commissions/calculations?payee_id=${ids.operatorA}` +
        `&from=2026-06-01T00:00:00.000Z&to=2026-06-30T23:59:59.000Z`,
      { headers: authHeaders(ids.tenantA.id, randomUUID(), "tenant_admin") },
    );
    const body = await readJson(response);

    assert.equal(response.status, 200);
    const items = (body.items ?? []) as Array<Record<string, unknown>>;
    assert.equal(body.pagination?.total, 2);
    assert.equal(items.length, 2);
    assert.ok(items.every((item) => item.payeeId === ids.operatorA));
    assert.ok(items.every((item) => typeof item.basisEventId === "string"));
    const amounts = items.map((item) => item.amount).sort();
    assert.deepEqual(amounts, [10, 20]);
  });
});

test("calculations drill-down exposes sourceType/sourceId from the linked basis event", async () => {
  await withSummaryApi(async ({ baseUrl, ids, repo }) => {
    const sourceId = randomUUID();
    const created = await fetch(`${baseUrl}/api/v1/commissions/basis-events`, {
      method: "POST",
      headers: { ...authHeaders(ids.tenantA.id, randomUUID(), "tenant_admin"), "content-type": "application/json" },
      body: JSON.stringify({
        sourceType: "work_order",
        sourceId,
        sourceEventName: "work_order.completed",
        idempotencyKey: `drill-${sourceId}`,
        occurredAt: "2026-06-10T10:00:00.000Z",
      }),
    });
    const createdBody = await readJson(created);
    assert.equal(created.status, 201);
    const basisEventId = createdBody.data?.id as string;

    // Link a calculation to that real basis event, inside the window, for operatorA.
    repo.seedCalculationForTests({
      tenantId: ids.tenantA.id,
      payeeId: ids.operatorA,
      amount: 75,
      basisEventId,
      createdAt: new Date("2026-06-11T10:00:00.000Z"),
    });

    const response = await fetch(
      `${baseUrl}/api/v1/commissions/calculations?payee_id=${ids.operatorA}` +
        `&from=2026-06-01T00:00:00.000Z&to=2026-06-30T23:59:59.000Z`,
      { headers: authHeaders(ids.tenantA.id, randomUUID(), "tenant_admin") },
    );
    const body = await readJson(response);

    assert.equal(response.status, 200);
    const items = (body.items ?? []) as Array<Record<string, unknown>>;
    assert.equal(items.length, 1);
    assert.equal(items[0]?.basisEventId, basisEventId);
    assert.equal(items[0]?.sourceType, "work_order");
    assert.equal(items[0]?.sourceId, sourceId);
  });
});

test("operator reads only their own enriched calculations via /calculations/mine", async () => {
  await withSummaryApi(async ({ baseUrl, ids, repo }) => {
    const sourceId = randomUUID();
    const created = await fetch(`${baseUrl}/api/v1/commissions/basis-events`, {
      method: "POST",
      headers: { ...authHeaders(ids.tenantA.id, randomUUID(), "tenant_admin"), "content-type": "application/json" },
      body: JSON.stringify({
        sourceType: "work_order",
        sourceId,
        sourceEventName: "work_order.completed",
        idempotencyKey: `mine-${sourceId}`,
        occurredAt: "2026-06-10T10:00:00.000Z",
      }),
    });
    const basisEventId = (await readJson(created)).data?.id as string;

    // One calc linked to a real basis event for the operator; one for another payee.
    repo.seedCalculationForTests({
      tenantId: ids.tenantA.id,
      payeeId: ids.operatorA,
      amount: 40,
      basisEventId,
      createdAt: new Date("2026-06-11T10:00:00.000Z"),
    });
    seed(repo, ids.tenantA.id, ids.payee2A, 999, "2026-06-12T10:00:00.000Z");

    // Forged payee_id on /mine must be ignored: payeeId is fixed to the actor server-side.
    const response = await fetch(
      `${baseUrl}/api/v1/commissions/calculations/mine?payee_id=${ids.payee2A}` +
        `&from=2026-06-01T00:00:00.000Z&to=2026-06-30T23:59:59.000Z`,
      { headers: authHeaders(ids.tenantA.id, ids.operatorA, "operator") },
    );
    const body = await readJson(response);

    assert.equal(response.status, 200);
    const items = (body.items ?? []) as Array<Record<string, unknown>>;
    assert.equal(items.length, 1);
    assert.equal(items[0]?.payeeId, ids.operatorA);
    assert.equal(items[0]?.sourceType, "work_order");
    assert.equal(items[0]?.sourceId, sourceId);
    assert.ok(!items.some((item) => item.payeeId === ids.payee2A));
  });
});

test("operator remains denied on the all-payees /calculations route", async () => {
  await withSummaryApi(async ({ baseUrl, ids }) => {
    const response = await fetch(`${baseUrl}/api/v1/commissions/calculations`, {
      headers: authHeaders(ids.tenantA.id, ids.operatorA, "operator"),
    });

    assert.equal(response.status, 403);
    assert.match(await response.text(), /commissions:read|permission_required/);
  });
});

test("any read_own holder (e.g. tenant_admin) gets only their own row via /calculations/mine", async () => {
  await withSummaryApi(async ({ baseUrl, ids, repo }) => {
    const adminUser = randomUUID();
    seed(repo, ids.tenantA.id, adminUser, 55, "2026-06-05T10:00:00.000Z");
    seed(repo, ids.tenantA.id, ids.operatorA, 12, "2026-06-05T10:00:00.000Z");

    const response = await fetch(`${baseUrl}/api/v1/commissions/calculations/mine`, {
      headers: authHeaders(ids.tenantA.id, adminUser, "tenant_admin"),
    });
    const body = await readJson(response);

    assert.equal(response.status, 200);
    const items = (body.items ?? []) as Array<Record<string, unknown>>;
    assert.equal(items.length, 1);
    assert.equal(items[0]?.payeeId, adminUser);
    assert.ok(!items.some((item) => item.payeeId === ids.operatorA));
  });
});

test("/calculations/mine is isolated per tenant and never leaks another tenant's calcs", async () => {
  await withSummaryApi(async ({ baseUrl, ids, repo }) => {
    seed(repo, ids.tenantB.id, ids.operatorB, 500, "2026-06-05T10:00:00.000Z");

    const response = await fetch(`${baseUrl}/api/v1/commissions/calculations/mine`, {
      headers: authHeaders(ids.tenantA.id, ids.operatorB, "operator"),
    });
    const body = await readJson(response);

    assert.equal(response.status, 200);
    assert.equal(((body.items ?? []) as unknown[]).length, 0);
    assert.equal(body.pagination?.total, 0);
  });
});

test("summary rejects an inverted date range with 400", async () => {
  await withSummaryApi(async ({ baseUrl, ids }) => {
    const response = await fetch(
      `${baseUrl}/api/v1/commissions/statements/summary?from=2026-06-30T00:00:00.000Z&to=2026-06-01T00:00:00.000Z`,
      { headers: authHeaders(ids.tenantA.id, randomUUID(), "tenant_admin") },
    );

    assert.equal(response.status, 400);
    assert.match(await response.text(), /invalid_date_range|from must be/);
  });
});

type SummaryIds = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly operatorA: string;
  readonly payee2A: string;
  readonly operatorB: string;
};

type SummaryApiContext = {
  readonly baseUrl: string;
  readonly ids: SummaryIds;
  readonly repo: InMemoryCommissionRepository;
};

type SummaryItem = { readonly payeeId: string; readonly total: number; readonly count: number };

async function withSummaryApi(callback: (context: SummaryApiContext) => Promise<void>): Promise<void> {
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
    { resetCommissionRuntimeForTests, getMemoryCommissionRepositoryForTests },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
    import("../src/modules/commissions/index.js"),
  ]);

  resetCommissionRuntimeForTests();
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "Comissoes Sumario A", modules: ["dashboard", "commissions"] });
  const tenantB = core.createTenant({ name: "Comissoes Sumario B", modules: ["dashboard", "commissions"] });
  const ids: SummaryIds = {
    tenantA,
    tenantB,
    operatorA: randomUUID(),
    payee2A: randomUUID(),
    operatorB: randomUUID(),
  };
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const repo = getMemoryCommissionRepositoryForTests();
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, ids, repo });
  } finally {
    resetCommissionRuntimeForTests();
    await closeServer(server);
  }
}

function seed(
  repo: InMemoryCommissionRepository,
  tenantId: string,
  payeeId: string,
  amount: number,
  createdAt: string,
): void {
  repo.seedCalculationForTests({ tenantId, payeeId, amount, createdAt: new Date(createdAt) });
}

function authHeaders(tenantId: string, userId: string, role: string): Record<string, string> {
  return {
    "x-tenant-id": tenantId,
    "x-user-id": userId,
    "x-role": role,
  };
}

async function readJson(response: Response): Promise<{
  readonly data?: Record<string, unknown>;
  readonly items?: unknown[];
  readonly pagination?: Record<string, unknown>;
}> {
  return (await response.json()) as {
    readonly data?: Record<string, unknown>;
    readonly items?: unknown[];
    readonly pagination?: Record<string, unknown>;
  };
}

function dataOf(body: { readonly data?: Record<string, unknown> }): Record<string, unknown> {
  return body.data ?? {};
}

function summaryItems(body: { readonly data?: Record<string, unknown> }): SummaryItem[] {
  return (dataOf(body).items as SummaryItem[] | undefined) ?? [];
}

async function getBaseUrl(server: Server): Promise<string> {
  const address = await new Promise<AddressInfo>((resolve) => {
    server.once("listening", () => resolve(server.address() as AddressInfo));
  });

  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
