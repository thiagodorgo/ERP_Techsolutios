import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("[R21/M25] POST /commissions/policies recusa scope = engine ou ruleType engine_* com 422 reserved_scope", async () => {
  await withCommissionApi(async ({ baseUrl, seed }) => {
    const scopeRes = await fetch(`${baseUrl}/api/v1/commissions/policies`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
      body: JSON.stringify({
        name: "Política tentando usar scope engine",
        scope: "  ENGINE ",
        vertical: "field_services",
        rules: [],
      }),
    });
    const scopeBody = await readJson(scopeRes);
    assert.equal(scopeRes.status, 422);
    assert.equal((scopeBody.error as Record<string, unknown> | undefined)?.reason, "reserved_scope");

    const ruleRes = await fetch(`${baseUrl}/api/v1/commissions/policies`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
      body: JSON.stringify({
        name: "Política tentando usar ruleType engine_payee",
        scope: "tenant",
        vertical: "field_services",
        rules: [
          {
            ruleType: " Engine_Payee ",
            basisType: "work_order_total",
            rateType: "percent",
            rateValue: 10,
            conditions: { payeeUserId: seed.operatorA.id },
          },
        ],
      }),
    });
    const ruleBody = await readJson(ruleRes);
    assert.equal(ruleRes.status, 422);
    assert.equal((ruleBody.error as Record<string, unknown> | undefined)?.reason, "reserved_scope");
  });
});

test("[R21] POST /commissions/basis-events recusa idempotencyKey engine:* ou sourceEventName engine.* com 422 reserved_key", async () => {
  await withCommissionApi(async ({ baseUrl, seed }) => {
    const keyRes = await fetch(`${baseUrl}/api/v1/commissions/basis-events`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.financeA, "finance"),
      body: JSON.stringify({
        sourceType: "work_order",
        sourceId: randomUUID(),
        sourceEventName: "work_order.completed",
        idempotencyKey: " engine:wo:123:v1 ",
        payload: {},
      }),
    });
    const keyBody = await readJson(keyRes);
    assert.equal(keyRes.status, 422);
    assert.equal((keyBody.error as Record<string, unknown> | undefined)?.reason, "reserved_key");

    const eventRes = await fetch(`${baseUrl}/api/v1/commissions/basis-events`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.financeA, "finance"),
      body: JSON.stringify({
        sourceType: "work_order",
        sourceId: randomUUID(),
        sourceEventName: " ENGINE.work_order.completed ",
        idempotencyKey: "manual-key-1",
        payload: {},
      }),
    });
    const eventBody = await readJson(eventRes);
    assert.equal(eventRes.status, 422);
    assert.equal((eventBody.error as Record<string, unknown> | undefined)?.reason, "reserved_key");
  });
});

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly adminA: User;
  readonly adminB: User;
  readonly managerA: User;
  readonly financeA: User;
  readonly operatorA: User;
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
    name: "Tenant Motor Comissoes A",
    modules: ["dashboard", "commissions"],
  });
  const tenantB = service.createTenant({
    name: "Tenant Motor Comissoes B",
    modules: ["dashboard", "commissions"],
  });
  const adminA = service.createUser({
    tenantId: tenantA.id,
    name: "Admin A",
    email: "motor-admin-a@example.com",
    roles: ["tenant_admin"],
  });
  const adminB = service.createUser({
    tenantId: tenantB.id,
    name: "Admin B",
    email: "motor-admin-b@example.com",
    roles: ["tenant_admin"],
  });
  const managerA = service.createUser({
    tenantId: tenantA.id,
    name: "Manager A",
    email: "motor-manager-a@example.com",
    roles: ["manager"],
  });
  const financeA = service.createUser({
    tenantId: tenantA.id,
    name: "Finance A",
    email: "motor-finance-a@example.com",
    roles: ["finance"],
  });
  const operatorA = service.createUser({
    tenantId: tenantA.id,
    name: "Operator A",
    email: "motor-operator-a@example.com",
    roles: ["operator"],
  });
  const viewerA = service.createUser({
    tenantId: tenantA.id,
    name: "Viewer A",
    email: "motor-viewer-a@example.com",
    roles: ["viewer"],
  });

  return { tenantA, tenantB, adminA, adminB, managerA, financeA, operatorA, viewerA };
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

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
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
