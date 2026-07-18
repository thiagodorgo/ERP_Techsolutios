import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant } from "../src/modules/core-saas/types/core-saas.types.js";

// Ω4-6 — rotas /api/v1/financial-periods: RBAC (financial_period:*), DTO §2.8 (sem tenant_id, snapshot só
// agregados), fechar/reabrir com trava retroativa, force, pendências bloqueantes, isolamento por organização.

test("POST /financial-periods/:period/close computa snapshot e retorna DTO sem tenant_id", async () => {
  await withPeriodApi(async ({ baseUrl, seed }) => {
    await createTitle(baseUrl, seed.tenantA, { direction: "receivable", party_type: "customer", party_name: "Alfa", amount: 1000, due_date: "2026-09-10", issue_date: "2026-07-10" });
    await createTitle(baseUrl, seed.tenantA, { direction: "payable", party_type: "supplier", party_name: "Beta", amount: 400, due_date: "2026-09-10", issue_date: "2026-07-10" });

    const closed = await requestJson(baseUrl, "/api/v1/financial-periods/2026-07/close", { method: "POST", headers: authHeaders(seed.tenantA, "finance"), body: {} });
    assert.equal(closed.status, 200);
    assert.equal(closed.body.data.status, "closed");
    assert.equal(closed.body.data.tenantId, undefined);
    assert.equal(closed.body.data.tenant_id, undefined);
    assert.equal(closed.body.data.snapshot.material.titles.receivable.sumAmount, 1000);
    assert.equal(closed.body.data.snapshot.material.titles.payable.sumAmount, 400);
    assert.equal(closed.body.data.snapshot.forced, false);
    // snapshot só agregados — nenhum id/nome de título individual.
    assert.equal(JSON.stringify(closed.body.data.snapshot).includes("Alfa"), false);
  });
});

test("GET /financial-periods/:period sem linha → status open + checklist ao vivo; após close → snapshot congelado", async () => {
  await withPeriodApi(async ({ baseUrl, seed }) => {
    const before = await requestJson(baseUrl, "/api/v1/financial-periods/2026-07", { headers: authHeaders(seed.tenantA, "finance") });
    assert.equal(before.status, 200);
    assert.equal(before.body.data.status, "open");
    assert.equal(before.body.data.snapshot, null);
    assert.ok(before.body.data.checklist);

    await createTitle(baseUrl, seed.tenantA, { direction: "receivable", party_type: "customer", party_name: "X", amount: 500, due_date: "2026-09-10", issue_date: "2026-07-10" });
    await requestJson(baseUrl, "/api/v1/financial-periods/2026-07/close", { method: "POST", headers: authHeaders(seed.tenantA, "finance"), body: {} });

    const after = await requestJson(baseUrl, "/api/v1/financial-periods/2026-07", { headers: authHeaders(seed.tenantA, "finance") });
    assert.equal(after.body.data.status, "closed");
    assert.equal(after.body.data.snapshot.material.titles.receivable.sumAmount, 500);
  });
});

test("close trava a escrita retroativa: POST /financial-titles na competência fechada → 422 period_closed; reopen destrava", async () => {
  await withPeriodApi(async ({ baseUrl, seed }) => {
    await createTitle(baseUrl, seed.tenantA, { direction: "receivable", party_type: "customer", party_name: "X", amount: 100, due_date: "2026-09-10", issue_date: "2026-07-10" });
    await requestJson(baseUrl, "/api/v1/financial-periods/2026-07/close", { method: "POST", headers: authHeaders(seed.tenantA, "finance"), body: {} });

    const blocked = await createTitle(baseUrl, seed.tenantA, { direction: "receivable", party_type: "customer", party_name: "Retro", amount: 50, due_date: "2026-09-10", issue_date: "2026-07-10" });
    assert.equal(blocked.status, 422);
    assert.equal(blocked.body.error.reason, "period_closed");

    const reopened = await requestJson(baseUrl, "/api/v1/financial-periods/2026-07/reopen", { method: "POST", headers: authHeaders(seed.tenantA, "tenant_admin"), body: { reason: "correção" } });
    assert.equal(reopened.status, 200);
    assert.equal(reopened.body.data.status, "reopened");

    const allowed = await createTitle(baseUrl, seed.tenantA, { direction: "receivable", party_type: "customer", party_name: "Pós", amount: 50, due_date: "2026-09-10", issue_date: "2026-07-10" });
    assert.equal(allowed.status, 201);
  });
});

test("fechar 2× → 409; reopen sem reason → 400; reopen de aberto → 422; :period inválido → 400", async () => {
  await withPeriodApi(async ({ baseUrl, seed }) => {
    await createTitle(baseUrl, seed.tenantA, { direction: "receivable", party_type: "customer", party_name: "X", amount: 100, due_date: "2026-09-10", issue_date: "2026-07-10" });
    const first = await requestJson(baseUrl, "/api/v1/financial-periods/2026-07/close", { method: "POST", headers: authHeaders(seed.tenantA, "finance"), body: {} });
    assert.equal(first.status, 200);
    const again = await requestJson(baseUrl, "/api/v1/financial-periods/2026-07/close", { method: "POST", headers: authHeaders(seed.tenantA, "finance"), body: {} });
    assert.equal(again.status, 409);
    assert.equal(again.body.error.reason, "period_already_closed");

    const noReason = await requestJson(baseUrl, "/api/v1/financial-periods/2026-07/reopen", { method: "POST", headers: authHeaders(seed.tenantA, "tenant_admin"), body: {} });
    assert.equal(noReason.status, 400);
    assert.equal(noReason.body.error.reason, "reason_required");

    const notClosed = await requestJson(baseUrl, "/api/v1/financial-periods/2026-08/reopen", { method: "POST", headers: authHeaders(seed.tenantA, "tenant_admin"), body: { reason: "x" } });
    assert.equal(notClosed.status, 422);
    assert.equal(notClosed.body.error.reason, "period_not_closed");

    const bad = await requestJson(baseUrl, "/api/v1/financial-periods/2026-13/close", { method: "POST", headers: authHeaders(seed.tenantA, "finance"), body: {} });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.error.reason, "invalid_period");
  });
});

test("pendência bloqueante (in_dispute): 422 pending_items_block_close (corpo lista pendências); force:true+reason → 200", async () => {
  await withPeriodApi(async ({ baseUrl, seed }) => {
    const title = await createTitle(baseUrl, seed.tenantA, { direction: "receivable", party_type: "customer", party_name: "Disputa", amount: 100, due_date: "2026-09-10", issue_date: "2026-07-10" });
    await requestJson(baseUrl, `/api/v1/financial-titles/${title.body.data.id}/status`, { method: "PATCH", headers: authHeaders(seed.tenantA, "finance"), body: { status: "in_dispute" } });

    const blocked = await requestJson(baseUrl, "/api/v1/financial-periods/2026-07/close", { method: "POST", headers: authHeaders(seed.tenantA, "finance"), body: {} });
    assert.equal(blocked.status, 422);
    assert.equal(blocked.body.error.reason, "pending_items_block_close");
    assert.equal(blocked.body.error.details.pending.blocking.inDisputeTitles, 1);

    const forcedNoReason = await requestJson(baseUrl, "/api/v1/financial-periods/2026-07/close", { method: "POST", headers: authHeaders(seed.tenantA, "finance"), body: { force: true } });
    assert.equal(forcedNoReason.status, 400);
    assert.equal(forcedNoReason.body.error.reason, "reason_required");

    const forced = await requestJson(baseUrl, "/api/v1/financial-periods/2026-07/close", { method: "POST", headers: authHeaders(seed.tenantA, "finance"), body: { force: true, reason: "sobreposição" } });
    assert.equal(forced.status, 200);
    assert.equal(forced.body.data.snapshot.forced, true);
    assert.equal(forced.body.data.snapshot.pending.blocking.inDisputeTitles, 1);
  });
});

test("[RBAC] finance fecha (200) mas reopen → 403; tenant_admin/super_admin fazem os dois", async () => {
  await withPeriodApi(async ({ baseUrl, seed }) => {
    await createTitle(baseUrl, seed.tenantA, { direction: "receivable", party_type: "customer", party_name: "X", amount: 100, due_date: "2026-09-10", issue_date: "2026-07-10" });

    const financeClose = await requestJson(baseUrl, "/api/v1/financial-periods/2026-07/close", { method: "POST", headers: authHeaders(seed.tenantA, "finance"), body: {} });
    assert.equal(financeClose.status, 200);
    const financeReopen = await requestJson(baseUrl, "/api/v1/financial-periods/2026-07/reopen", { method: "POST", headers: authHeaders(seed.tenantA, "finance"), body: { reason: "x" } });
    assert.equal(financeReopen.status, 403, "finance NÃO reabre (separação de funções)");

    for (const role of ["tenant_admin", "super_admin"] as const) {
      const reopen = await requestJson(baseUrl, "/api/v1/financial-periods/2026-07/reopen", { method: "POST", headers: authHeaders(seed.tenantA, role), body: { reason: "x" } });
      assert.equal(reopen.status, 200, `reopen as ${role}`);
      const close = await requestJson(baseUrl, "/api/v1/financial-periods/2026-07/close", { method: "POST", headers: authHeaders(seed.tenantA, role), body: {} });
      assert.equal(close.status, 200, `close as ${role}`);
    }
  });
});

test("[RBAC] manager/auditor/viewer leem (200) mas close/reopen → 403; operator/support → 403 até no read; anônimo → 403", async () => {
  await withPeriodApi(async ({ baseUrl, seed }) => {
    for (const role of ["manager", "auditor", "viewer"] as const) {
      const read = await requestJson(baseUrl, "/api/v1/financial-periods/2026-07", { headers: authHeaders(seed.tenantA, role) });
      assert.equal(read.status, 200, `GET as ${role}`);
      const close = await requestJson(baseUrl, "/api/v1/financial-periods/2026-07/close", { method: "POST", headers: authHeaders(seed.tenantA, role), body: {} });
      assert.equal(close.status, 403, `close as ${role}`);
      const reopen = await requestJson(baseUrl, "/api/v1/financial-periods/2026-07/reopen", { method: "POST", headers: authHeaders(seed.tenantA, role), body: { reason: "x" } });
      assert.equal(reopen.status, 403, `reopen as ${role}`);
    }
    for (const role of ["operator", "inventory", "field_technician", "support"] as const) {
      const read = await requestJson(baseUrl, "/api/v1/financial-periods/2026-07", { headers: authHeaders(seed.tenantA, role) });
      assert.equal(read.status, 403, `GET as ${role}`);
    }
    const anon = await requestJson(baseUrl, "/api/v1/financial-periods/2026-07", {});
    assert.equal(anon.status, 403);
  });
});

test("[isolamento] fechar 2026-07 no tenant A não bloqueia B; GET de A por B não vaza o fechamento de A", async () => {
  await withPeriodApi(async ({ baseUrl, seed }) => {
    await createTitle(baseUrl, seed.tenantA, { direction: "receivable", party_type: "customer", party_name: "Só A", amount: 100, due_date: "2026-09-10", issue_date: "2026-07-10" });
    const closeA = await requestJson(baseUrl, "/api/v1/financial-periods/2026-07/close", { method: "POST", headers: authHeaders(seed.tenantA, "finance"), body: {} });
    assert.equal(closeA.status, 200);

    // B escreve na MESMA competência normalmente (isolamento).
    const titleB = await createTitle(baseUrl, seed.tenantB, { direction: "receivable", party_type: "customer", party_name: "Só B", amount: 100, due_date: "2026-09-10", issue_date: "2026-07-10" });
    assert.equal(titleB.status, 201);

    // GET de B na mesma competência → status open (o fechamento de A é invisível).
    const bView = await requestJson(baseUrl, "/api/v1/financial-periods/2026-07", { headers: authHeaders(seed.tenantB, "finance") });
    assert.equal(bView.status, 200);
    assert.equal(bView.body.data.status, "open");
    assert.equal(bView.body.data.snapshot, null);

    // Lista de B não enxerga o fechamento de A.
    const bList = await requestJson(baseUrl, "/api/v1/financial-periods", { headers: authHeaders(seed.tenantB, "finance") });
    assert.equal(bList.status, 200);
    assert.equal(bList.body.items.length, 0);
  });
});

// ---------- harness (espelho de tests/financial-titles-routes.test.ts) ----------

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
};

type PeriodApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withPeriodApi(callback: (context: PeriodApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetFinancialTitleRuntimeForTests },
    { resetFinancialEntryRuntimeForTests },
    { resetFinancialAccountRuntimeForTests },
    { resetFinancialPeriodCloseRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/financial-titles/index.js"),
    import("../src/modules/financial-entries/index.js"),
    import("../src/modules/financial-accounts/index.js"),
    import("../src/modules/financial-period-closes/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetFinancialPeriodCloseRuntimeForTests();
  resetFinancialTitleRuntimeForTests();
  resetFinancialEntryRuntimeForTests();
  resetFinancialAccountRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "Tenant Period A", modules: ["dashboard", "finance"] });
  const tenantB = core.createTenant({ name: "Tenant Period B", modules: ["dashboard", "finance"] });
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed: { tenantA, tenantB } });
  } finally {
    await closeServer(server);
    resetFinancialPeriodCloseRuntimeForTests();
    resetFinancialTitleRuntimeForTests();
    resetFinancialEntryRuntimeForTests();
    resetFinancialAccountRuntimeForTests();
  }
}

function createTitle(baseUrl: string, tenant: Tenant, body: Record<string, unknown>) {
  return requestJson(baseUrl, "/api/v1/financial-titles", { method: "POST", headers: authHeaders(tenant, "finance"), body });
}

function authHeaders(tenant: Tenant, role: string): Record<string, string> {
  return { "x-tenant-id": tenant.id, "x-user-id": randomUUID(), "x-role": role };
}

async function requestJson(
  baseUrl: string,
  path: string,
  init: { method?: string; headers?: Record<string, string>; body?: unknown } = {},
): Promise<{ status: number; body: any }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : undefined };
}

function getBaseUrl(server: Server): Promise<string> {
  return new Promise((resolve) => {
    const address = server.address() as AddressInfo;
    resolve(`http://127.0.0.1:${address.port}`);
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
