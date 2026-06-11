import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("commission routes create and list policies with RBAC", async () => {
  await withCommissionApi(async ({ baseUrl, seed }) => {
    const createResponse = await fetch(`${baseUrl}/api/v1/commissions/policies`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
      body: JSON.stringify({
        name: "Comissao guincho basica",
        scope: "tenant",
        vertical: "field_services",
        effectiveFrom: "2026-06-01T00:00:00.000Z",
        rules: [
          {
            ruleType: "percentage",
            basisType: "work_order_completed",
            rateType: "percent",
            rateValue: 5,
            conditions: {
              serviceType: "guincho",
            },
          },
        ],
      }),
    });
    const createBody = await readJson(createResponse);

    assert.equal(createResponse.status, 201);
    assert.equal(createBody.data?.name, "Comissao guincho basica");
    assert.equal((createBody.data?.rules as unknown[]).length, 1);

    const listResponse = await fetch(`${baseUrl}/api/v1/commissions/policies?status=draft`, {
      headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
    });
    const listBody = await readJson(listResponse);

    assert.equal(listResponse.status, 200);
    assert.equal(listBody.pagination?.total, 1);
    assert.equal((listBody.items as Array<Record<string, unknown>>)[0]?.id, createBody.data?.id);
  });
});

test("commission basis events are idempotent and sanitize payloads", async () => {
  await withCommissionApi(async ({ baseUrl, seed }) => {
    const payload = {
      amount: 1000,
      token: "must-not-leak",
      latitude: -23.55,
      nested: {
        secret: "must-not-leak",
        longitude: -46.63,
        code: "OS-100",
      },
    };
    const body = {
      sourceType: "work_order",
      sourceId: randomUUID(),
      sourceEventName: "work_order.completed",
      idempotencyKey: "wo-completed-100",
      payload,
      occurredAt: "2026-06-02T10:00:00.000Z",
    };

    const firstResponse = await fetch(`${baseUrl}/api/v1/commissions/basis-events`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.financeA, "finance"),
      body: JSON.stringify(body),
    });
    const firstBody = await readJson(firstResponse);
    const secondResponse = await fetch(`${baseUrl}/api/v1/commissions/basis-events`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.financeA, "finance"),
      body: JSON.stringify(body),
    });
    const secondBody = await readJson(secondResponse);

    assert.equal(firstResponse.status, 201);
    assert.equal(secondResponse.status, 201);
    assert.equal(secondBody.data?.id, firstBody.data?.id);
    assert.ok(!("token" in payloadOf(firstBody)));
    assert.ok(!("latitude" in payloadOf(firstBody)));
    assert.ok(!("secret" in nestedPayloadOf(firstBody)));
    assert.ok(!("longitude" in nestedPayloadOf(firstBody)));
    assert.equal(nestedPayloadOf(firstBody).code, "OS-100");

    const listResponse = await fetch(`${baseUrl}/api/v1/commissions/basis-events`, {
      headers: authHeaders(seed.tenantA, seed.financeA, "finance"),
    });
    const listBody = await readJson(listResponse);

    assert.equal(listResponse.status, 200);
    assert.equal(listBody.pagination?.total, 1);
  });
});

test("commission routes deny missing permission and isolate tenants", async () => {
  await withCommissionApi(async ({ baseUrl, seed }) => {
    const forbidden = await fetch(`${baseUrl}/api/v1/commissions/policies`, {
      headers: authHeaders(seed.tenantA, seed.viewerA, "viewer"),
    });

    assert.equal(forbidden.status, 403);
    assert.match(await forbidden.text(), /commissions:read|permission_required/);

    const createResponse = await fetch(`${baseUrl}/api/v1/commissions/basis-events`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.financeA, "finance"),
      body: JSON.stringify({
        sourceType: "work_order",
        sourceId: randomUUID(),
        sourceEventName: "work_order.completed",
        idempotencyKey: "tenant-a-only",
        payload: {
          amount: 500,
        },
      }),
    });
    assert.equal(createResponse.status, 201);

    const tenantBList = await fetch(`${baseUrl}/api/v1/commissions/basis-events`, {
      headers: authHeaders(seed.tenantB, seed.adminB, "tenant_admin"),
    });
    const tenantBBody = await readJson(tenantBList);

    assert.equal(tenantBList.status, 200);
    assert.equal(tenantBBody.pagination?.total, 0);
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly adminA: User;
  readonly adminB: User;
  readonly financeA: User;
  readonly viewerA: User;
};

type CommissionApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withCommissionApi(callback: (context: CommissionApiContext) => Promise<void>): Promise<void> {
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
    { resetCommissionRuntimeForTests },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
    import("../src/modules/commissions/index.js"),
  ]);

  resetCommissionRuntimeForTests();
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed });
  } finally {
    resetCommissionRuntimeForTests();
    await closeServer(server);
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({
    name: "Tenant Comissoes A",
    modules: ["dashboard", "commissions"],
  });
  const tenantB = service.createTenant({
    name: "Tenant Comissoes B",
    modules: ["dashboard", "commissions"],
  });
  const adminA = service.createUser({
    tenantId: tenantA.id,
    name: "Admin Comissoes A",
    email: "commission-admin-a@example.com",
    roles: ["tenant_admin"],
  });
  const adminB = service.createUser({
    tenantId: tenantB.id,
    name: "Admin Comissoes B",
    email: "commission-admin-b@example.com",
    roles: ["tenant_admin"],
  });
  const financeA = service.createUser({
    tenantId: tenantA.id,
    name: "Financeiro Comissoes A",
    email: "commission-finance-a@example.com",
    roles: ["finance"],
  });
  const viewerA = service.createUser({
    tenantId: tenantA.id,
    name: "Viewer Comissoes A",
    email: "commission-viewer-a@example.com",
    roles: ["viewer"],
  });

  return { tenantA, tenantB, adminA, adminB, financeA, viewerA };
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

function payloadOf(body: { readonly data?: Record<string, unknown> }): Record<string, unknown> {
  return (body.data?.payload as Record<string, unknown> | undefined) ?? {};
}

function nestedPayloadOf(body: { readonly data?: Record<string, unknown> }): Record<string, unknown> {
  return (payloadOf(body).nested as Record<string, unknown> | undefined) ?? {};
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
