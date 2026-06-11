import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("expense routes list policies and categories with RBAC", async () => {
  await withExpenseApi(async ({ baseUrl, seed }) => {
    const policyResponse = await fetch(`${baseUrl}/api/v1/expense-policies`, {
      headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
    });
    const policyBody = await readJson(policyResponse);

    assert.equal(policyResponse.status, 200);
    assert.equal(policyBody.pagination?.total, 1);
    assert.equal((policyBody.items as Array<Record<string, unknown>>)[0]?.status, "active");

    const categoryResponse = await fetch(`${baseUrl}/api/v1/expense-categories`, {
      headers: authHeaders(seed.tenantA, seed.technicianA, "technician"),
    });
    const categoryBody = await readJson(categoryResponse);

    assert.equal(categoryResponse.status, 200);
    assert.ok((categoryBody.items as unknown[]).length > 0);
  });
});

test("expense routes deny missing permission", async () => {
  await withExpenseApi(async ({ baseUrl, seed }) => {
    const response = await fetch(`${baseUrl}/api/v1/expense-policies`, {
      headers: authHeaders(seed.tenantA, seed.viewerA, "viewer"),
    });

    assert.equal(response.status, 403);
    assert.match(await response.text(), /expense_policy:read|permission_required/);
  });
});

test("expense reports create draft, list by tenant, add item and submit", async () => {
  await withExpenseApi(async ({ baseUrl, seed }) => {
    const created = await createReport(baseUrl, seed.tenantA, seed.technicianA, "technician");

    assert.equal(created.status, "draft");
    assert.equal(created.totalAmount, 0);

    const itemResponse = await fetch(`${baseUrl}/api/v1/expense-reports/${created.id}/items`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.technicianA, "technician"),
      body: JSON.stringify({
        categoryKey: "fuel",
        spentAt: "2026-06-11T10:00:00.000Z",
        amount: 120,
        currency: "BRL",
      }),
    });
    const itemBody = await readJson(itemResponse);

    assert.equal(itemResponse.status, 201);
    assert.equal(itemBody.data?.amount, 120);

    const detailResponse = await fetch(`${baseUrl}/api/v1/expense-reports/${created.id}`, {
      headers: authHeaders(seed.tenantA, seed.technicianA, "technician"),
    });
    const detailBody = await readJson(detailResponse);

    assert.equal(detailResponse.status, 200);
    assert.equal(detailBody.data?.totalAmount, 120);
    assert.equal(detailBody.data?.reimbursementAmount, 70);

    const submitResponse = await fetch(`${baseUrl}/api/v1/expense-reports/${created.id}/submit`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.technicianA, "technician"),
    });
    const submitBody = await readJson(submitResponse);

    assert.equal(submitResponse.status, 200);
    assert.equal(submitBody.data?.status, "submitted");

    const tenantBList = await fetch(`${baseUrl}/api/v1/expense-reports`, {
      headers: authHeaders(seed.tenantB, seed.adminB, "tenant_admin"),
    });
    const tenantBBody = await readJson(tenantBList);

    assert.equal(tenantBList.status, 200);
    assert.equal(tenantBBody.pagination?.total, 0);
  });
});

test("expense read_own does not see another user report", async () => {
  await withExpenseApi(async ({ baseUrl, seed }) => {
    await createReport(baseUrl, seed.tenantA, seed.technicianA, "technician");

    const listResponse = await fetch(`${baseUrl}/api/v1/expense-reports`, {
      headers: authHeaders(seed.tenantA, seed.otherTechnicianA, "technician"),
    });
    const listBody = await readJson(listResponse);

    assert.equal(listResponse.status, 200);
    assert.equal(listBody.pagination?.total, 0);
  });
});

test("expense mobile sync is idempotent and ignores cross-scope tenant payload", async () => {
  await withExpenseApi(async ({ baseUrl, seed }) => {
    const body = {
      actions: [
        {
          clientActionId: "sync-create-rdv-1",
          type: "expense_report.create",
          payload: {
            tenantId: seed.tenantB.id,
            employeeUserId: seed.adminB.id,
            periodStart: "2026-06-01",
            periodEnd: "2026-06-30",
            origin: "field",
            advanceAmount: 10,
          },
        },
      ],
    };

    const firstResponse = await fetch(`${baseUrl}/api/v1/mobile/sync/expense-actions`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.technicianA, "technician"),
      body: JSON.stringify(body),
    });
    const firstBody = await readJson(firstResponse);
    const secondResponse = await fetch(`${baseUrl}/api/v1/mobile/sync/expense-actions`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.technicianA, "technician"),
      body: JSON.stringify(body),
    });
    const secondBody = await readJson(secondResponse);

    assert.equal(firstResponse.status, 200);
    assert.equal(secondResponse.status, 200);
    assert.equal(firstBody.data?.results?.[0]?.resultRef, secondBody.data?.results?.[0]?.resultRef);
    assert.equal(secondBody.data?.results?.[0]?.replayed, true);

    const tenantAList = await fetch(`${baseUrl}/api/v1/expense-reports`, {
      headers: authHeaders(seed.tenantA, seed.technicianA, "technician"),
    });
    const tenantAListBody = await readJson(tenantAList);
    const tenantBList = await fetch(`${baseUrl}/api/v1/expense-reports`, {
      headers: authHeaders(seed.tenantB, seed.adminB, "tenant_admin"),
    });
    const tenantBListBody = await readJson(tenantBList);

    assert.equal(tenantAListBody.pagination?.total, 1);
    assert.equal(tenantBListBody.pagination?.total, 0);
  });
});

test("expense mobile sync without permission is blocked", async () => {
  await withExpenseApi(async ({ baseUrl, seed }) => {
    const response = await fetch(`${baseUrl}/api/v1/mobile/sync/expense-actions`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.viewerA, "viewer"),
      body: JSON.stringify({ actions: [] }),
    });

    assert.equal(response.status, 403);
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly adminA: User;
  readonly adminB: User;
  readonly technicianA: User;
  readonly otherTechnicianA: User;
  readonly viewerA: User;
};

type ExpenseApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withExpenseApi(callback: (context: ExpenseApiContext) => Promise<void>): Promise<void> {
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
    { resetExpenseManagementRuntimeForTests },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
    import("../src/modules/expense-management/index.js"),
  ]);

  resetExpenseManagementRuntimeForTests();
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed });
  } finally {
    resetExpenseManagementRuntimeForTests();
    await closeServer(server);
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({ name: "Tenant Despesas A", modules: ["dashboard", "expense_management"] });
  const tenantB = service.createTenant({ name: "Tenant Despesas B", modules: ["dashboard", "expense_management"] });
  const adminA = service.createUser({
    tenantId: tenantA.id,
    name: "Admin Despesas A",
    email: "expense-admin-a@example.com",
    roles: ["tenant_admin"],
  });
  const adminB = service.createUser({
    tenantId: tenantB.id,
    name: "Admin Despesas B",
    email: "expense-admin-b@example.com",
    roles: ["tenant_admin"],
  });
  const technicianA = service.createUser({
    tenantId: tenantA.id,
    name: "Tecnico Despesas A",
    email: "expense-tech-a@example.com",
    roles: ["technician"],
  });
  const otherTechnicianA = service.createUser({
    tenantId: tenantA.id,
    name: "Tecnico Despesas A2",
    email: "expense-tech-a2@example.com",
    roles: ["technician"],
  });
  const viewerA = service.createUser({
    tenantId: tenantA.id,
    name: "Viewer Despesas A",
    email: "expense-viewer-a@example.com",
    roles: ["viewer"],
  });

  return { tenantA, tenantB, adminA, adminB, technicianA, otherTechnicianA, viewerA };
}

async function createReport(baseUrl: string, tenant: Tenant, user: User, role: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${baseUrl}/api/v1/expense-reports`, {
    method: "POST",
    headers: jsonHeaders(tenant, user, role),
    body: JSON.stringify({
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      origin: "field",
      city: "Sao Paulo",
      advanceAmount: 50,
      policyVersion: "default",
    }),
  });
  const body = await readJson(response);

  assert.equal(response.status, 201);
  return body.data ?? {};
}

function authHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
  return {
    "x-tenant-id": tenant.id,
    "x-user-id": user.id,
    "x-role": role,
  };
}

function jsonHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
  return {
    ...authHeaders(tenant, user, role),
    "content-type": "application/json",
  };
}

async function readJson(response: Response): Promise<{
  readonly data?: Record<string, unknown> & { readonly results?: Array<Record<string, unknown>> };
  readonly items?: unknown[];
  readonly pagination?: Record<string, unknown>;
}> {
  return (await response.json()) as {
    readonly data?: Record<string, unknown> & { readonly results?: Array<Record<string, unknown>> };
    readonly items?: unknown[];
    readonly pagination?: Record<string, unknown>;
  };
}

async function getBaseUrl(server: Server): Promise<string> {
  const address = await new Promise<AddressInfo>((resolve) => {
    server.on("listening", () => resolve(server.address() as AddressInfo));
  });

  return `http://127.0.0.1:${address.port}`;
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
