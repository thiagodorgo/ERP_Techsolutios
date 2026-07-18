import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant } from "../src/modules/core-saas/types/core-saas.types.js";

// Ω4-1 — rotas /api/v1/financial-accounts: RBAC (financial_accounts:*), DTO §2.8 (sem tenant_id),
// delete lógico (200) e isolamento por organização.

test("POST /financial-accounts cria conta com finance e retorna 201 (DTO omite tenant_id)", async () => {
  await withFinancialAccountApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/financial-accounts", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: {
        name: "Caixa Central",
        kind: "bank",
        opening_balance: 2500.75,
        bank_name: "Nubank",
        account_number: "0001-9",
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.name, "Caixa Central");
    assert.equal(created.body.data.kind, "bank");
    assert.equal(created.body.data.currency, "BRL");
    assert.equal(created.body.data.openingBalance, 2500.75);
    assert.equal(created.body.data.isActive, true);
    assert.equal(created.body.data.tenantId, undefined);
    assert.equal(created.body.data.tenant_id, undefined);
    assert.ok(created.body.data.id);
  });
});

test("GET /financial-accounts filtra por ?kind e exclui inativos por padrão", async () => {
  await withFinancialAccountApi(async ({ baseUrl, seed }) => {
    for (const [name, kind] of [["Cofre", "cash"], ["Itau", "bank"], ["PicPay", "wallet"]] as const) {
      await requestJson(baseUrl, "/api/v1/financial-accounts", {
        method: "POST",
        headers: authHeaders(seed.tenantA, "finance"),
        body: { name, kind },
      });
    }
    const banks = await requestJson(baseUrl, "/api/v1/financial-accounts?kind=bank", {
      headers: authHeaders(seed.tenantA, "finance"),
    });
    assert.equal(banks.status, 200);
    assert.equal(banks.body.items.length, 1);
    assert.equal(banks.body.items[0].name, "Itau");
    assert.equal(banks.body.pagination.total, 1);
  });
});

test("GET/PATCH/DELETE ciclo completo: delete lógico responde 200 com is_active=false e status=inactive", async () => {
  await withFinancialAccountApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/financial-accounts", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { name: "Conta Ciclo" },
    });
    const detail = await requestJson(baseUrl, `/api/v1/financial-accounts/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantA, "finance"),
    });
    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.name, "Conta Ciclo");

    const patched = await requestJson(baseUrl, `/api/v1/financial-accounts/${created.body.data.id}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { name: "Conta Renomeada", kind: "wallet" },
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.data.name, "Conta Renomeada");
    assert.equal(patched.body.data.kind, "wallet");

    const removed = await requestJson(baseUrl, `/api/v1/financial-accounts/${created.body.data.id}`, {
      method: "DELETE",
      headers: authHeaders(seed.tenantA, "finance"),
    });
    assert.equal(removed.status, 200);
    assert.equal(removed.body.data.isActive, false);
    assert.equal(removed.body.data.status, "inactive");

    const list = await requestJson(baseUrl, "/api/v1/financial-accounts", {
      headers: authHeaders(seed.tenantA, "finance"),
    });
    assert.equal(list.body.items.length, 0);
  });
});

test("[isolamento] GET/:id de outra organização → 404 account_not_found", async () => {
  await withFinancialAccountApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/financial-accounts", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { name: "Só do A" },
    });
    const crossTenant = await requestJson(baseUrl, `/api/v1/financial-accounts/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantB, "finance"),
    });
    assert.equal(crossTenant.status, 404);
    assert.equal(crossTenant.body.error.reason, "account_not_found");
  });
});

test("[RBAC] finance/tenant_admin/super_admin criam (201) e leem (200)", async () => {
  await withFinancialAccountApi(async ({ baseUrl, seed }) => {
    for (const role of ["finance", "tenant_admin", "super_admin"] as const) {
      const created = await requestJson(baseUrl, "/api/v1/financial-accounts", {
        method: "POST",
        headers: authHeaders(seed.tenantA, role),
        body: { name: `Conta ${role}` },
      });
      assert.equal(created.status, 201, `POST as ${role}`);
      const list = await requestJson(baseUrl, "/api/v1/financial-accounts", {
        headers: authHeaders(seed.tenantA, role),
      });
      assert.equal(list.status, 200, `GET as ${role}`);
    }
  });
});

test("[RBAC] manager/auditor/viewer leem (200) mas recebem 403 em POST/PATCH/DELETE", async () => {
  await withFinancialAccountApi(async ({ baseUrl, seed }) => {
    // Uma conta existente (criada por finance) para exercitar PATCH/DELETE.
    const created = await requestJson(baseUrl, "/api/v1/financial-accounts", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { name: "Alvo RBAC" },
    });
    const accountId = created.body.data.id;

    for (const role of ["manager", "auditor", "viewer"] as const) {
      const list = await requestJson(baseUrl, "/api/v1/financial-accounts", {
        headers: authHeaders(seed.tenantA, role),
      });
      assert.equal(list.status, 200, `GET as ${role}`);

      const post = await requestJson(baseUrl, "/api/v1/financial-accounts", {
        method: "POST",
        headers: authHeaders(seed.tenantA, role),
        body: { name: `Proibida ${role}` },
      });
      assert.equal(post.status, 403, `POST as ${role}`);

      const patch = await requestJson(baseUrl, `/api/v1/financial-accounts/${accountId}`, {
        method: "PATCH",
        headers: authHeaders(seed.tenantA, role),
        body: { notes: "x" },
      });
      assert.equal(patch.status, 403, `PATCH as ${role}`);

      const del = await requestJson(baseUrl, `/api/v1/financial-accounts/${accountId}`, {
        method: "DELETE",
        headers: authHeaders(seed.tenantA, role),
      });
      assert.equal(del.status, 403, `DELETE as ${role}`);
    }
  });
});

test("[RBAC] operator/inventory/field_technician/support → 403 em tudo (nem leem)", async () => {
  await withFinancialAccountApi(async ({ baseUrl, seed }) => {
    for (const role of ["operator", "inventory", "field_technician", "support"] as const) {
      const list = await requestJson(baseUrl, "/api/v1/financial-accounts", {
        headers: authHeaders(seed.tenantA, role),
      });
      assert.equal(list.status, 403, `GET as ${role}`);
      const post = await requestJson(baseUrl, "/api/v1/financial-accounts", {
        method: "POST",
        headers: authHeaders(seed.tenantA, role),
        body: { name: `Bloqueada ${role}` },
      });
      assert.equal(post.status, 403, `POST as ${role}`);
    }
  });
});

test("[RBAC] requisição anônima (sem headers) → 403", async () => {
  await withFinancialAccountApi(async ({ baseUrl }) => {
    const anon = await requestJson(baseUrl, "/api/v1/financial-accounts", {
      method: "POST",
      body: { name: "Anônima" },
    });
    assert.equal(anon.status, 403);
  });
});

// ---------- harness (espelho de tests/customers-routes.test.ts) ----------

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
};

type FinancialAccountApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withFinancialAccountApi(callback: (context: FinancialAccountApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetFinancialAccountRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/financial-accounts/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetFinancialAccountRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "Tenant Financial Accounts A", modules: ["dashboard", "finance"] });
  const tenantB = core.createTenant({ name: "Tenant Financial Accounts B", modules: ["dashboard", "finance"] });
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed: { tenantA, tenantB } });
  } finally {
    await closeServer(server);
    resetFinancialAccountRuntimeForTests();
  }
}

function authHeaders(tenant: Tenant, role: string): Record<string, string> {
  return { "x-tenant-id": tenant.id, "x-user-id": randomUUID(), "x-role": role };
}

async function requestJson(
  baseUrl: string,
  path: string,
  options: { readonly method?: string; readonly headers?: Record<string, string>; readonly body?: unknown } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
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
