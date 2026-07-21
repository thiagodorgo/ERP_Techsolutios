import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant } from "../src/modules/core-saas/types/core-saas.types.js";

// Ω4C PR-03 — rotas /api/v1/professional-statements (Extrato do profissional): AJUSTE (201), saldo DERIVADO
// (Σcredit − Σdebit), parcelamento fiel, trava RN-EXT-01 (409 statement_entry_locked), isolamento 404,
// §2.8/LGPD (DTO sem tenant_id/source_id/CNH), RBAC (professional_statements:* — read amplo / write finance+admins).

const CNH_SECRET = "99887766554";

test("POST /professional-statements cria AJUSTE (201) — DTO §2.8: sem tenant_id/source_id/CNH; parcela > 0", async () => {
  await withStatementApi(async ({ baseUrl, seed, operatorProfileA }) => {
    const created = await requestJson(baseUrl, "/api/v1/professional-statements", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: {
        operator_profile_id: operatorProfileA,
        direction: "debit",
        description: "Desconto de EPI",
        amount: 100,
        installment_total: 1,
        first_due_date: "2026-08-05",
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.entryType, "adjustment");
    assert.equal(created.body.data.direction, "debit");
    assert.equal(created.body.data.sourceType, "manual");
    assert.equal(created.body.data.installmentTotal, 1);
    assert.equal(created.body.data.totalAmount, 100);
    assert.equal(created.body.data.installments.length, 1);
    assert.equal(created.body.data.installments[0].amount, 100);
    assert.ok(created.body.data.installments[0].amount > 0);
    // §2.8/LGPD — nunca tenant_id/source_id/client_action_id/CNH no payload.
    const serialized = JSON.stringify(created.body);
    assert.equal(serialized.includes("tenant_id"), false);
    assert.equal(serialized.includes("tenantId"), false);
    assert.equal(serialized.includes("sourceId"), false);
    assert.equal(serialized.includes("source_id"), false);
    assert.equal(serialized.includes("clientActionId"), false);
    assert.equal(serialized.includes(CNH_SECRET), false);
  });
});

test("parcelamento fiel: amount 100 em 3x → 33.34 + 33.33 + 33.33 = 100 (resto na 1ª); vencimentos mensais", async () => {
  await withStatementApi(async ({ baseUrl, seed, operatorProfileA }) => {
    const created = await requestJson(baseUrl, "/api/v1/professional-statements", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: {
        operator_profile_id: operatorProfileA,
        direction: "debit",
        description: "Parcelado",
        amount: 100,
        installment_total: 3,
        first_due_date: "2026-08-10",
      },
    });
    assert.equal(created.status, 201);
    const amounts = created.body.data.installments.map((i: { amount: number }) => i.amount);
    assert.deepEqual(amounts, [33.34, 33.33, 33.33]);
    const sum = Math.round(amounts.reduce((a: number, b: number) => a + b, 0) * 100) / 100;
    assert.equal(sum, 100);
    const months = created.body.data.installments.map((i: { dueDate: string }) => i.dueDate.slice(0, 7));
    assert.deepEqual(months, ["2026-08", "2026-09", "2026-10"]);
  });
});

test("amount pequeno demais p/ o nº de parcelas → 422 installment_amount_too_small", async () => {
  await withStatementApi(async ({ baseUrl, seed, operatorProfileA }) => {
    const res = await requestJson(baseUrl, "/api/v1/professional-statements", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: {
        operator_profile_id: operatorProfileA,
        direction: "debit",
        description: "Impossível",
        amount: 0.02,
        installment_total: 3,
        first_due_date: "2026-08-10",
      },
    });
    assert.equal(res.status, 422);
    assert.equal(res.body.error.reason, "installment_amount_too_small");
  });
});

test("saldo DERIVADO server-side: Σcredit − Σdebit; runningBalance por linha (EXT-05)", async () => {
  await withStatementApi(async ({ baseUrl, seed, operatorProfileA }) => {
    await requestJson(baseUrl, "/api/v1/professional-statements", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { operator_profile_id: operatorProfileA, direction: "debit", description: "Dano (desconto)", amount: 100, first_due_date: "2026-08-01" },
    });
    await requestJson(baseUrl, "/api/v1/professional-statements", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { operator_profile_id: operatorProfileA, direction: "credit", description: "Bônus (provento)", amount: 30, first_due_date: "2026-09-01" },
    });

    const statement = await requestJson(baseUrl, `/api/v1/professional-statements?operatorProfileId=${operatorProfileA}`, {
      headers: authHeaders(seed.tenantA, "finance"),
    });
    assert.equal(statement.status, 200);
    assert.equal(statement.body.summary.totalDebits, 100);
    assert.equal(statement.body.summary.totalCredits, 30);
    assert.equal(statement.body.summary.currentBalance, -70);
    assert.equal(statement.body.summary.count, 2);
    // ordem asc por due_date: [debit 08-01 → -100] depois [credit 09-01 → -70]
    assert.equal(statement.body.items[0].runningBalance, -100);
    assert.equal(statement.body.items[1].runningBalance, -70);
    assert.equal(statement.body.professionalName, "João Guincho");
    assert.equal(statement.body.operatorProfileId, operatorProfileA);
  });
});

test("GET extrato sem operatorProfileId → 400 operator_profile_required (nunca lista global — EXT-03)", async () => {
  await withStatementApi(async ({ baseUrl, seed }) => {
    const res = await requestJson(baseUrl, "/api/v1/professional-statements", { headers: authHeaders(seed.tenantA, "finance") });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.reason, "operator_profile_required");
  });
});

test("RN-EXT-01: PATCH de campo financeiro (amount) → 409 statement_entry_locked; só description editável", async () => {
  await withStatementApi(async ({ baseUrl, seed, operatorProfileA }) => {
    const created = await requestJson(baseUrl, "/api/v1/professional-statements", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { operator_profile_id: operatorProfileA, direction: "debit", description: "Original", amount: 100, installment_total: 2, first_due_date: "2026-08-10" },
    });
    const groupId = created.body.data.groupId;

    const lockedAmount = await requestJson(baseUrl, `/api/v1/professional-statements/${groupId}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { amount: 999 },
    });
    assert.equal(lockedAmount.status, 409);
    assert.equal(lockedAmount.body.error.reason, "statement_entry_locked");

    const lockedDirection = await requestJson(baseUrl, `/api/v1/professional-statements/${groupId}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { direction: "credit", description: "tentativa" },
    });
    assert.equal(lockedDirection.status, 409);
    assert.equal(lockedDirection.body.error.reason, "statement_entry_locked");

    const okDescription = await requestJson(baseUrl, `/api/v1/professional-statements/${groupId}`, {
      method: "PATCH",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { description: "Descrição corrigida" },
    });
    assert.equal(okDescription.status, 200);
    assert.equal(okDescription.body.data.description, "Descrição corrigida");
    assert.equal(okDescription.body.data.installments.length, 2);
  });
});

test("RN-EXT-01: DELETE bloqueado se ≥ 1 parcela liquidada (settled) → 409; grupo todo-pending → soft-delete OK", async () => {
  await withStatementApi(async ({ baseUrl, seed, operatorProfileA, settleInstallment }) => {
    // grupo com parcela liquidada → DELETE 409
    const locked = await requestJson(baseUrl, "/api/v1/professional-statements", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { operator_profile_id: operatorProfileA, direction: "debit", description: "Travado", amount: 200, installment_total: 2, first_due_date: "2026-08-10" },
    });
    const lockedGroupId = locked.body.data.groupId;
    assert.equal(settleInstallment(seed.tenantA.id, lockedGroupId, 1), true);
    const blocked = await requestJson(baseUrl, `/api/v1/professional-statements/${lockedGroupId}`, {
      method: "DELETE",
      headers: authHeaders(seed.tenantA, "finance"),
    });
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.error.reason, "statement_entry_locked");

    // grupo todo-pending → soft-delete atômico OK; some do extrato
    const removable = await requestJson(baseUrl, "/api/v1/professional-statements", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { operator_profile_id: operatorProfileA, direction: "credit", description: "Removível", amount: 50, installment_total: 2, first_due_date: "2026-08-10" },
    });
    const removableGroupId = removable.body.data.groupId;
    const removed = await requestJson(baseUrl, `/api/v1/professional-statements/${removableGroupId}`, {
      method: "DELETE",
      headers: authHeaders(seed.tenantA, "finance"),
    });
    assert.equal(removed.status, 200);
    assert.equal(removed.body.data.installments.length, 2);

    // retirado → GET/:groupId 404; e não aparece mais no extrato
    const gone = await requestJson(baseUrl, `/api/v1/professional-statements/${removableGroupId}`, {
      headers: authHeaders(seed.tenantA, "finance"),
    });
    assert.equal(gone.status, 404);
    const statement = await requestJson(baseUrl, `/api/v1/professional-statements?operatorProfileId=${operatorProfileA}`, {
      headers: authHeaders(seed.tenantA, "finance"),
    });
    // sobrou só o grupo travado (2 parcelas)
    assert.equal(statement.body.items.every((i: { groupId: string }) => i.groupId !== removableGroupId), true);
  });
});

test("[isolamento] extrato/grupo de outra organização → 404 (EXT-03/EXT-08)", async () => {
  await withStatementApi(async ({ baseUrl, seed, operatorProfileA }) => {
    const created = await requestJson(baseUrl, "/api/v1/professional-statements", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { operator_profile_id: operatorProfileA, direction: "debit", description: "Só do A", amount: 100, first_due_date: "2026-08-10" },
    });
    const groupId = created.body.data.groupId;

    // tenantB não enxerga o profissional de A → 404 operator_profile_not_found
    const crossLedger = await requestJson(baseUrl, `/api/v1/professional-statements?operatorProfileId=${operatorProfileA}`, {
      headers: authHeaders(seed.tenantB, "finance"),
    });
    assert.equal(crossLedger.status, 404);
    assert.equal(crossLedger.body.error.reason, "operator_profile_not_found");

    // tenantB não enxerga o grupo de A → 404 statement_group_not_found
    const crossGroup = await requestJson(baseUrl, `/api/v1/professional-statements/${groupId}`, {
      headers: authHeaders(seed.tenantB, "finance"),
    });
    assert.equal(crossGroup.status, 404);
    assert.equal(crossGroup.body.error.reason, "statement_group_not_found");
  });
});

test("[RBAC] finance/tenant_admin/super_admin criam (201) e leem (200)", async () => {
  await withStatementApi(async ({ baseUrl, seed, operatorProfileA }) => {
    for (const role of ["finance", "tenant_admin", "super_admin"] as const) {
      const created = await requestJson(baseUrl, "/api/v1/professional-statements", {
        method: "POST",
        headers: authHeaders(seed.tenantA, role),
        body: { operator_profile_id: operatorProfileA, direction: "credit", description: `Por ${role}`, amount: 10, first_due_date: "2026-08-10" },
      });
      assert.equal(created.status, 201, `POST as ${role}`);
      const ledger = await requestJson(baseUrl, `/api/v1/professional-statements?operatorProfileId=${operatorProfileA}`, {
        headers: authHeaders(seed.tenantA, role),
      });
      assert.equal(ledger.status, 200, `GET as ${role}`);
    }
  });
});

test("[RBAC] manager/auditor/viewer leem (200) mas recebem 403 em POST/PATCH/DELETE", async () => {
  await withStatementApi(async ({ baseUrl, seed, operatorProfileA }) => {
    const created = await requestJson(baseUrl, "/api/v1/professional-statements", {
      method: "POST",
      headers: authHeaders(seed.tenantA, "finance"),
      body: { operator_profile_id: operatorProfileA, direction: "debit", description: "Alvo RBAC", amount: 100, first_due_date: "2026-08-10" },
    });
    const groupId = created.body.data.groupId;

    for (const role of ["manager", "auditor", "viewer"] as const) {
      const ledger = await requestJson(baseUrl, `/api/v1/professional-statements?operatorProfileId=${operatorProfileA}`, {
        headers: authHeaders(seed.tenantA, role),
      });
      assert.equal(ledger.status, 200, `GET as ${role}`);

      const post = await requestJson(baseUrl, "/api/v1/professional-statements", {
        method: "POST",
        headers: authHeaders(seed.tenantA, role),
        body: { operator_profile_id: operatorProfileA, direction: "debit", description: `Proibido ${role}`, amount: 10, first_due_date: "2026-08-10" },
      });
      assert.equal(post.status, 403, `POST as ${role}`);

      const patch = await requestJson(baseUrl, `/api/v1/professional-statements/${groupId}`, {
        method: "PATCH",
        headers: authHeaders(seed.tenantA, role),
        body: { description: "hack" },
      });
      assert.equal(patch.status, 403, `PATCH as ${role}`);

      const del = await requestJson(baseUrl, `/api/v1/professional-statements/${groupId}`, {
        method: "DELETE",
        headers: authHeaders(seed.tenantA, role),
      });
      assert.equal(del.status, 403, `DELETE as ${role}`);
    }
  });
});

test("[RBAC] operator/inventory/field_technician/support → 403 em tudo (folha sensível; nem leem)", async () => {
  await withStatementApi(async ({ baseUrl, seed, operatorProfileA }) => {
    for (const role of ["operator", "inventory", "field_technician", "support"] as const) {
      const ledger = await requestJson(baseUrl, `/api/v1/professional-statements?operatorProfileId=${operatorProfileA}`, {
        headers: authHeaders(seed.tenantA, role),
      });
      assert.equal(ledger.status, 403, `GET as ${role}`);
      const post = await requestJson(baseUrl, "/api/v1/professional-statements", {
        method: "POST",
        headers: authHeaders(seed.tenantA, role),
        body: { operator_profile_id: operatorProfileA, direction: "debit", description: `Bloqueado ${role}`, amount: 10, first_due_date: "2026-08-10" },
      });
      assert.equal(post.status, 403, `POST as ${role}`);
    }
  });
});

test("[RBAC] requisição anônima (sem headers) → 403", async () => {
  await withStatementApi(async ({ baseUrl, operatorProfileA }) => {
    const anon = await requestJson(baseUrl, `/api/v1/professional-statements?operatorProfileId=${operatorProfileA}`);
    assert.equal(anon.status, 403);
  });
});

// ---------- harness (espelho de tests/financial-titles-routes.test.ts) ----------

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
};

type StatementApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
  readonly operatorProfileA: string;
  readonly settleInstallment: (tenantId: string, groupId: string, installmentNumber: number) => boolean;
};

async function withStatementApi(callback: (context: StatementApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { resetProfessionalStatementRuntimeForTests, getMemoryProfessionalStatementRepositoryForTests },
    { resetOperatorProfileRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/professional-statements/index.js"),
    import("../src/modules/operator-profiles/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetProfessionalStatementRuntimeForTests();
  resetOperatorProfileRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "Tenant Statement A", modules: ["dashboard", "finance"] });
  const tenantB = core.createTenant({ name: "Tenant Statement B", modules: ["dashboard", "finance"] });
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  // Profissional do tenant A (via API, como tenant_admin) — o extrato é POR profissional. full_name é o rótulo
  // exposto; cnh_number NUNCA deve vazar no extrato (§2.8/LGPD).
  const profile = await requestJson(baseUrl, "/api/v1/operator-profiles", {
    method: "POST",
    headers: authHeaders(tenantA, "tenant_admin"),
    body: { user_id: randomUUID(), full_name: "João Guincho", cnh_number: CNH_SECRET },
  });
  assert.equal(profile.status, 201);
  const operatorProfileA = profile.body.data.id as string;

  const settleInstallment = (tenantId: string, groupId: string, installmentNumber: number): boolean =>
    getMemoryProfessionalStatementRepositoryForTests().settleInstallmentForTests(tenantId, groupId, installmentNumber);

  try {
    await callback({ baseUrl, seed: { tenantA, tenantB }, operatorProfileA, settleInstallment });
  } finally {
    await closeServer(server);
    resetProfessionalStatementRuntimeForTests();
    resetOperatorProfileRuntimeForTests();
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
