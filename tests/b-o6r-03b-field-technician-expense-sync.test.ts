import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

const envelopes = JSON.parse(
  readFileSync(new URL("../mobile/flutter_app/test/core/sync/bo6r03b_expense_error_envelopes.json", import.meta.url), "utf8"),
) as Record<string, { status: number; body: { error: { code: string; reason?: string; message: string } } }>;

test("RB1 · Técnico de Campo sincroniza despesa", async () => {
  await withExpenseApi(async ({ baseUrl, tenant, fieldTechnician }) => {
    const action = {
      clientActionId: "bo6r03b-rb1-create",
      type: "expense_report.create",
      payload: {
        local_id: "rdv-local-rb1",
        periodStart: "2026-11-01",
        periodEnd: "2026-11-09",
        origin: "mobile",
        advanceAmount: 0,
      },
    };

    const allowed = await postSync(baseUrl, tenant, fieldTechnician, "field_technician", action);
    const allowedBody = await json(allowed);
    assert.equal(allowed.status, 200);
    assert.equal(allowedBody.data?.results?.[0]?.status, "processed");

  });
});

test("RB1 · auditor continua bloqueado no sync de despesa", async () => {
  await withExpenseApi(async ({ baseUrl, tenant, auditor }) => {
    const denied = await postSync(baseUrl, tenant, auditor, "auditor", {
      clientActionId: "bo6r03b-rb1-auditor",
      type: "expense_report.create",
      payload: { periodStart: "2026-11-01", periodEnd: "2026-11-09", origin: "mobile" },
    });
    assert.deepEqual(
      { status: denied.status, body: await denied.json() },
      envelopes["403_permission_required"],
    );
  });
});

test("RB1 · Técnico de Campo lista somente os próprios relatórios", async () => {
  await withExpenseApi(async ({ baseUrl, tenant, fieldTechnician, otherFieldTechnician }) => {
    await createReport(baseUrl, tenant, fieldTechnician, "field_technician", "2026-11-01");
    await createReport(baseUrl, tenant, otherFieldTechnician, "field_technician", "2026-10-01");

    const response = await fetch(`${baseUrl}/api/v1/expense-reports`, {
      headers: authHeaders(tenant, fieldTechnician, "field_technician"),
    });
    const body = await json(response);

    assert.equal(response.status, 200);
    assert.equal(body.pagination?.total, 1);
    assert.equal(body.items?.[0]?.employeeUserId, fieldTechnician.id);
  });
});

type Context = {
  baseUrl: string;
  tenant: Tenant;
  fieldTechnician: User;
  otherFieldTechnician: User;
  auditor: User;
};

async function withExpenseApi(callback: (context: Context) => Promise<void>): Promise<void> {
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [appModule, coreModule, adapterModule, storeModule, expenseModule] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
    import("../src/modules/expense-management/index.js"),
  ]);

  expenseModule.resetExpenseManagementRuntimeForTests();
  const core = new coreModule.CoreSaasRegistry(new storeModule.InMemoryCoreSaasStore());
  const tenant = core.createTenant({ name: "Organização RB1", modules: ["expense_management"] });
  const makeUser = (name: string, role: string) =>
    core.createUser({
      tenantId: tenant.id,
      name,
      email: `${role}-${name.replaceAll(" ", "-").toLowerCase()}@example.invalid`,
      roles: [role],
    });
  const fieldTechnician = makeUser("Campo Um", "field_technician");
  const otherFieldTechnician = makeUser("Campo Dois", "field_technician");
  const auditor = makeUser("Auditoria", "auditor");
  const app = appModule.createApp(new adapterModule.MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, tenant, fieldTechnician, otherFieldTechnician, auditor });
  } finally {
    expenseModule.resetExpenseManagementRuntimeForTests();
    await closeServer(server);
  }
}

function authHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
  return { "x-tenant-id": tenant.id, "x-user-id": user.id, "x-role": role };
}

function jsonHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
  return { ...authHeaders(tenant, user, role), "content-type": "application/json" };
}

async function postSync(baseUrl: string, tenant: Tenant, user: User, role: string, action: object) {
  return fetch(`${baseUrl}/api/v1/mobile/sync/expense-actions`, {
    method: "POST",
    headers: jsonHeaders(tenant, user, role),
    body: JSON.stringify({ actions: [action] }),
  });
}

async function createReport(
  baseUrl: string,
  tenant: Tenant,
  user: User,
  role: string,
  periodStart: string,
): Promise<void> {
  const response = await fetch(`${baseUrl}/api/v1/expense-reports`, {
    method: "POST",
    headers: jsonHeaders(tenant, user, role),
    body: JSON.stringify({ periodStart, periodEnd: periodStart, origin: "mobile", advanceAmount: 0 }),
  });
  assert.equal(response.status, 201);
}

type Body = {
  data?: { results?: Array<{ status?: string }> };
  items?: Array<{ employeeUserId?: string }>;
  pagination?: { total?: number };
};

async function json(response: Response): Promise<Body> {
  return (await response.json()) as Body;
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
