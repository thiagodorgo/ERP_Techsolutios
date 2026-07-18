import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant } from "../src/modules/core-saas/types/core-saas.types.js";

// Ω4-2a — rotas /api/v1/financial-titles: RBAC (financial_titles:*), DTO §2.8 (sem tenant_id, com
// overdue/competencia derivados), máquina de status, chokepoint de fechamento, delete lógico (200) e
// isolamento por organização.

test("POST /financial-titles cria título com finance e retorna 201 (DTO omite tenant_id; overdue/competencia)", async () => {
  await withFinancialTitleApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/financial-titles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: {
        direction: "receivable",
        party_type: "customer",
        party_name: "Cliente Alfa",
        amount: 2500.75,
        due_date: "2026-08-10",
        issue_date: "2026-07-10",
        paid_amount: 999,
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.direction, "receivable");
    assert.equal(created.body.data.partyName, "Cliente Alfa");
    assert.equal(created.body.data.amount, 2500.75);
    assert.equal(created.body.data.currency, "BRL");
    assert.equal(created.body.data.paidAmount, 0);
    assert.equal(created.body.data.status, "open");
    assert.equal(created.body.data.competencia, "2026-07");
    assert.equal(created.body.data.active, true);
    assert.equal(typeof created.body.data.overdue, "boolean");
    assert.equal(created.body.data.tenantId, undefined);
    assert.equal(created.body.data.tenant_id, undefined);
    assert.ok(created.body.data.id);
  });
});

test("GET /financial-titles filtra por ?direction e ?overdue", async () => {
  await withFinancialTitleApi(async ({ baseUrl, seed }) => {
    await requestJson(baseUrl, "/api/v1/financial-titles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { direction: "payable", party_type: "supplier", party_name: "Fornecedor", amount: 100, due_date: "2999-01-01" },
    });
    const vencido = await requestJson(baseUrl, "/api/v1/financial-titles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { direction: "receivable", party_type: "customer", party_name: "Cliente", amount: 200, due_date: "2020-01-01", issue_date: "2020-01-01" },
    });

    const payables = await requestJson(baseUrl, "/api/v1/financial-titles?direction=payable", {
      headers: authHeaders(seed.tenantA, "finance"),
    });
    assert.equal(payables.status, 200);
    assert.equal(payables.body.items.length, 1);
    assert.equal(payables.body.items[0].direction, "payable");

    const overdue = await requestJson(baseUrl, "/api/v1/financial-titles?overdue=true", {
      headers: authHeaders(seed.tenantA, "finance"),
    });
    assert.equal(overdue.body.items.length, 1);
    assert.equal(overdue.body.items[0].id, vencido.body.data.id);
    assert.equal(overdue.body.items[0].overdue, true);
  });
});

test("ciclo completo: GET → PATCH → PATCH /status (open→scheduled) → DELETE lógico (200, active=false)", async () => {
  await withFinancialTitleApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/financial-titles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { direction: "receivable", party_type: "customer", party_name: "Ciclo", amount: 300, due_date: "2026-08-10" },
    });
    const id = created.body.data.id;

    const detail = await requestJson(baseUrl, `/api/v1/financial-titles/${id}`, { headers: authHeaders(seed.tenantA, "finance") });
    assert.equal(detail.status, 200);
    assert.equal(detail.body.data.partyName, "Ciclo");

    const patched = await requestJson(baseUrl, `/api/v1/financial-titles/${id}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { amount: 450.5, party_name: "Ciclo Editado" },
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.data.amount, 450.5);
    assert.equal(patched.body.data.partyName, "Ciclo Editado");

    const statusChanged = await requestJson(baseUrl, `/api/v1/financial-titles/${id}/status`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { status: "scheduled", reason: "agendado" },
    });
    assert.equal(statusChanged.status, 200);
    assert.equal(statusChanged.body.data.status, "scheduled");

    const removed = await requestJson(baseUrl, `/api/v1/financial-titles/${id}`, {
      method: "DELETE",
      headers: authHeaders(seed.tenantA, "finance"),
    });
    assert.equal(removed.status, 200);
    assert.equal(removed.body.data.active, false);

    const list = await requestJson(baseUrl, "/api/v1/financial-titles", { headers: authHeaders(seed.tenantA, "finance") });
    assert.equal(list.body.items.length, 0);
  });
});

test("PATCH /:id/status com transição inválida (open→paid) → 422 invalid_status_transition", async () => {
  await withFinancialTitleApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/financial-titles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { direction: "receivable", party_type: "customer", party_name: "X", amount: 100, due_date: "2026-08-10" },
    });
    const res = await requestJson(baseUrl, `/api/v1/financial-titles/${created.body.data.id}/status`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { status: "paid" },
    });
    assert.equal(res.status, 422);
    assert.equal(res.body.error.reason, "invalid_status_transition");
  });
});

test("account_id: válido → 201; inexistente → 400 invalid_account_reference", async () => {
  await withFinancialTitleApi(async ({ baseUrl, seed }) => {
    const account = await requestJson(baseUrl, "/api/v1/financial-accounts", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { name: `Caixa ${randomUUID()}` },
    });
    assert.equal(account.status, 201);

    const withAccount = await requestJson(baseUrl, "/api/v1/financial-titles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { direction: "receivable", party_type: "customer", party_name: "X", amount: 100, due_date: "2026-08-10", account_id: account.body.data.id },
    });
    assert.equal(withAccount.status, 201);
    assert.equal(withAccount.body.data.accountId, account.body.data.id);

    const badAccount = await requestJson(baseUrl, "/api/v1/financial-titles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { direction: "receivable", party_type: "customer", party_name: "X", amount: 100, due_date: "2026-08-10", account_id: randomUUID() },
    });
    assert.equal(badAccount.status, 400);
    assert.equal(badAccount.body.error.reason, "invalid_account_reference");
  });
});

test("chokepoint: competência fechada → POST 422 period_closed", async () => {
  await withFinancialTitleApi(async ({ baseUrl, seed, closePeriod }) => {
    closePeriod(seed.tenantA.id, "2026-07");
    const res = await requestJson(baseUrl, "/api/v1/financial-titles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { direction: "receivable", party_type: "customer", party_name: "X", amount: 100, due_date: "2026-08-10", issue_date: "2026-07-10" },
    });
    assert.equal(res.status, 422);
    assert.equal(res.body.error.reason, "period_closed");
  });
});

test("[isolamento] GET/:id de outra organização → 404 title_not_found", async () => {
  await withFinancialTitleApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/financial-titles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { direction: "receivable", party_type: "customer", party_name: "Só do A", amount: 100, due_date: "2026-08-10" },
    });
    const crossTenant = await requestJson(baseUrl, `/api/v1/financial-titles/${created.body.data.id}`, {
      headers: authHeaders(seed.tenantB, "finance"),
    });
    assert.equal(crossTenant.status, 404);
    assert.equal(crossTenant.body.error.reason, "title_not_found");
  });
});

test("[RBAC] finance/tenant_admin/super_admin criam (201) e leem (200)", async () => {
  await withFinancialTitleApi(async ({ baseUrl, seed }) => {
    for (const role of ["finance", "tenant_admin", "super_admin"] as const) {
      const created = await requestJson(baseUrl, "/api/v1/financial-titles", {
        method: "POST",
        headers: authHeaders(seed.tenantA, role),
        body: { direction: "receivable", party_type: "customer", party_name: `T ${role}`, amount: 100, due_date: "2026-08-10" },
      });
      assert.equal(created.status, 201, `POST as ${role}`);
      const list = await requestJson(baseUrl, "/api/v1/financial-titles", { headers: authHeaders(seed.tenantA, role) });
      assert.equal(list.status, 200, `GET as ${role}`);
    }
  });
});

test("[RBAC] manager/auditor/viewer leem (200) mas recebem 403 em POST/PATCH/PATCH-status/DELETE", async () => {
  await withFinancialTitleApi(async ({ baseUrl, seed }) => {
    const created = await requestJson(baseUrl, "/api/v1/financial-titles", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { direction: "receivable", party_type: "customer", party_name: "Alvo RBAC", amount: 100, due_date: "2026-08-10" },
    });
    const id = created.body.data.id;

    for (const role of ["manager", "auditor", "viewer"] as const) {
      const list = await requestJson(baseUrl, "/api/v1/financial-titles", { headers: authHeaders(seed.tenantA, role) });
      assert.equal(list.status, 200, `GET as ${role}`);

      const post = await requestJson(baseUrl, "/api/v1/financial-titles", {
        method: "POST",
        headers: authHeaders(seed.tenantA, role),
        body: { direction: "payable", party_type: "supplier", party_name: `Proibido ${role}`, amount: 10, due_date: "2026-08-10" },
      });
      assert.equal(post.status, 403, `POST as ${role}`);

      const patch = await requestJson(baseUrl, `/api/v1/financial-titles/${id}`, {
        method: "PATCH",
        headers: authHeaders(seed.tenantA, role),
        body: { amount: 20 },
      });
      assert.equal(patch.status, 403, `PATCH as ${role}`);

      const statusPatch = await requestJson(baseUrl, `/api/v1/financial-titles/${id}/status`, {
        method: "PATCH",
        headers: authHeaders(seed.tenantA, role),
        body: { status: "scheduled" },
      });
      assert.equal(statusPatch.status, 403, `PATCH status as ${role}`);

      const del = await requestJson(baseUrl, `/api/v1/financial-titles/${id}`, {
        method: "DELETE",
        headers: authHeaders(seed.tenantA, role),
      });
      assert.equal(del.status, 403, `DELETE as ${role}`);
    }
  });
});

test("[RBAC] operator/inventory/field_technician/support → 403 em tudo (nem leem)", async () => {
  await withFinancialTitleApi(async ({ baseUrl, seed }) => {
    for (const role of ["operator", "inventory", "field_technician", "support"] as const) {
      const list = await requestJson(baseUrl, "/api/v1/financial-titles", { headers: authHeaders(seed.tenantA, role) });
      assert.equal(list.status, 403, `GET as ${role}`);
      const post = await requestJson(baseUrl, "/api/v1/financial-titles", {
        method: "POST",
        headers: authHeaders(seed.tenantA, role),
        body: { direction: "receivable", party_type: "customer", party_name: `Bloqueado ${role}`, amount: 10, due_date: "2026-08-10" },
      });
      assert.equal(post.status, 403, `POST as ${role}`);
    }
  });
});

test("[RBAC] requisição anônima (sem headers) → 403", async () => {
  await withFinancialTitleApi(async ({ baseUrl }) => {
    const anon = await requestJson(baseUrl, "/api/v1/financial-titles", {
      method: "POST",
      body: { direction: "receivable", party_type: "customer", party_name: "Anônima", amount: 10, due_date: "2026-08-10" },
    });
    assert.equal(anon.status, 403);
  });
});

// ---------- harness (espelho de tests/financial-accounts-routes.test.ts) ----------

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
};

type FinancialTitleApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
  readonly closePeriod: (tenantId: string, period: string) => void;
};

async function withFinancialTitleApi(callback: (context: FinancialTitleApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetFinancialTitleRuntimeForTests, getMemoryFinancialPeriodCloseRepositoryForTests },
    { resetFinancialAccountRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/financial-titles/index.js"),
    import("../src/modules/financial-accounts/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetFinancialTitleRuntimeForTests();
  resetFinancialAccountRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "Tenant Financial Titles A", modules: ["dashboard", "finance"] });
  const tenantB = core.createTenant({ name: "Tenant Financial Titles B", modules: ["dashboard", "finance"] });
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  const closePeriod = (tenantId: string, period: string): void => {
    getMemoryFinancialPeriodCloseRepositoryForTests().setPeriodStatus(tenantId, period, "closed");
  };

  try {
    await callback({ baseUrl, seed: { tenantA, tenantB }, closePeriod });
  } finally {
    await closeServer(server);
    resetFinancialTitleRuntimeForTests();
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
