import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { resetFinancialAccountRuntimeForTests } from "../src/modules/financial-accounts/financial-account.service.js";
import {
  UNRECONCILE_DELEGATION_SETTING_KEY,
  buildReconcileAudit,
  createMemoryFinancialEntryService,
  getMemoryFinancialEntryRepositoryForTests,
  resetFinancialEntryRuntimeForTests,
} from "../src/modules/financial-entries/index.js";
import { resetFinancialTitleRuntimeForTests } from "../src/modules/financial-titles/index.js";
import { resetChequeRuntimeForTests } from "../src/modules/cheques/index.js";
import { resetTenantSettingRuntimeForTests } from "../src/modules/tenant-settings/tenant-setting.service.js";
import { parseValue } from "../src/modules/tenant-settings/tenant-setting.validators.js";
import { ROLE_PERMISSIONS } from "../src/modules/core-saas/permissions/catalog.js";

// -----------------------------------------------------------------------------------------------
// B-SAN3-12a — §4.4 e §4.6 do plano v3. DESFAZER conciliação só com privilégio, delegável ao Financeiro por política da
// organização (dono, 24/10: "admin, mas deve existir a opcao do financeiro receber esse privilegio"), a leitura da
// política para a tela, o validador da chave e o CAS OBRIGATÓRIO por estado lógico (A9–A13, A18).
// -----------------------------------------------------------------------------------------------

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

function resetAll(): void {
  resetChequeRuntimeForTests();
  resetFinancialEntryRuntimeForTests();
  resetFinancialAccountRuntimeForTests();
  resetFinancialTitleRuntimeForTests();
  resetTenantSettingRuntimeForTests();
}

type Api = { readonly baseUrl: string; readonly tenantA: { readonly id: string }; readonly tenantB: { readonly id: string } };

async function withApi(work: (api: Api) => Promise<void>): Promise<void> {
  const [{ createApp }, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  resetAll();
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "12a CONC A", modules: ["dashboard", "finance"] });
  const tenantB = core.createTenant({ name: "12a CONC B", modules: ["dashboard", "finance"] });
  const server: Server = createApp(new MemoryCoreSaasAdapter(core)).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
  try {
    await work({ baseUrl, tenantA, tenantB });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    resetAll();
  }
}

async function call(api: Api, tenant: { readonly id: string }, role: string, method: string, path: string, payload?: unknown) {
  const response = await fetch(`${api.baseUrl}${path}`, {
    method,
    headers: { "content-type": "application/json", "x-tenant-id": tenant.id, "x-user-id": randomUUID(), "x-role": role },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function newEntry(api: Api, tenant = api.tenantA) {
  const account = (await call(api, tenant, "finance", "POST", "/financial-accounts", { name: `Conta ${randomUUID()}` })).body.data;
  return (await call(api, tenant, "finance", "POST", "/financial-entries", { account_id: account.id, direction: "in", amount: 50, payment_method: "pix" })).body.data;
}

async function stateOf(api: Api, id: string, tenant = api.tenantA) {
  const entry = (await call(api, tenant, "finance", "GET", `/financial-entries/${id}`)).body.data;
  return { expected_reconciled: entry.reconciled, expected_reconciled_at: entry.reconciledAt };
}

async function reconcileAs(api: Api, role: string, id: string, reconciled: boolean, tenant = api.tenantA) {
  return call(api, tenant, role, "PATCH", `/financial-entries/${id}/reconcile`, { reconciled, ...(await stateOf(api, id, tenant)) });
}

async function setDelegation(api: Api, value: string, tenant = api.tenantA) {
  return call(api, tenant, "tenant_admin", "PUT", `/tenant-settings/${UNRECONCILE_DELEGATION_SETTING_KEY}`, { value });
}

// ------------------------------------------------------------------ A9 / A10

test("A9: desfazer por finance SEM política → 403 unreconcile_forbidden; por tenant_admin → 200; por finance COM a política → 200; manager → 403 da rota", async () => {
  await withApi(async (api) => {
    const entry = await newEntry(api);
    assert.equal((await reconcileAs(api, "finance", entry.id, true)).status, 200);

    const denied = await reconcileAs(api, "finance", entry.id, false);
    assert.equal(denied.status, 403);
    assert.equal(denied.body.error.reason, "unreconcile_forbidden");
    assert.equal((await stateOf(api, entry.id)).expected_reconciled, true, "o 403 não desconciliou");

    const byManager = await reconcileAs(api, "manager", entry.id, false);
    assert.equal(byManager.status, 403, "manager não tem nem a permissão da rota");
    assert.notEqual(byManager.body.error.reason, "unreconcile_forbidden");

    const byAdmin = await reconcileAs(api, "tenant_admin", entry.id, false);
    assert.equal(byAdmin.status, 200);
    assert.equal(byAdmin.body.data.reconciled, false);

    assert.equal((await reconcileAs(api, "finance", entry.id, true)).status, 200);
    assert.equal((await setDelegation(api, "true")).status, 200);
    const delegated = await reconcileAs(api, "finance", entry.id, false);
    assert.equal(delegated.status, 200, "com a política ligada o Financeiro desfaz");

    // a política é da ORGANIZAÇÃO: a outra continua sem ela.
    const other = await newEntry(api, api.tenantB);
    assert.equal((await reconcileAs(api, "finance", other.id, true, api.tenantB)).status, 200);
    assert.equal((await reconcileAs(api, "finance", other.id, false, api.tenantB)).status, 403);

    // desligar devolve o comportamento só-admin na hora.
    assert.equal((await reconcileAs(api, "finance", entry.id, true)).status, 200);
    assert.equal((await setDelegation(api, "false")).status, 200);
    assert.equal((await reconcileAs(api, "finance", entry.id, false)).status, 403);
  });
});

test("A10: conciliar (true) por finance sem política continua 200 — o gate é só do desfazer", async () => {
  await withApi(async (api) => {
    const entry = await newEntry(api);
    const ok = await reconcileAs(api, "finance", entry.id, true);
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.reconciled, true);
  });
});

// ------------------------------------------------------------------ A11

test("A11: GET /financial-entries/reconciliation-policy reflete o ATOR (finance sem política false; com política true; tenant_admin true)", async () => {
  await withApi(async (api) => {
    const read = async (role: string) => (await call(api, api.tenantA, role, "GET", "/financial-entries/reconciliation-policy")).body.data;
    assert.deepEqual(await read("finance"), { canUnreconcile: false, delegatedToFinance: false });
    assert.deepEqual(await read("tenant_admin"), { canUnreconcile: true, delegatedToFinance: false });
    assert.deepEqual(await read("auditor"), { canUnreconcile: false, delegatedToFinance: false });
    await setDelegation(api, "true");
    assert.deepEqual(await read("finance"), { canUnreconcile: true, delegatedToFinance: true });
    assert.deepEqual(await read("manager"), { canUnreconcile: false, delegatedToFinance: true }, "a política só delega ao Financeiro");
    const technician = await call(api, api.tenantA, "field_technician", "GET", "/financial-entries/reconciliation-policy");
    assert.equal(technician.status, 403);
  });
});

// ------------------------------------------------------------------ A12

test("A12: o validador da chave da política decide PELA CHAVE — fora de true|false → 400 invalid_value; outra chave segue livre; finance não liga", async () => {
  await withApi(async (api) => {
    const bad = await setDelegation(api, "sim");
    assert.equal(bad.status, 400);
    assert.equal(bad.body.error.reason, "invalid_value");
    assert.equal((await setDelegation(api, "true")).status, 200);
    const free = await call(api, api.tenantA, "tenant_admin", "PUT", "/tenant-settings/branding.motto", { value: "x" });
    assert.equal(free.status, 200, "chave alheia continua aceitando valor livre");
    const byFinance = await call(api, api.tenantA, "finance", "PUT", `/tenant-settings/${UNRECONCILE_DELEGATION_SETTING_KEY}`, { value: "true" });
    assert.equal(byFinance.status, 403, "só o Administrador liga a política");
  });
  assert.equal(parseValue(UNRECONCILE_DELEGATION_SETTING_KEY, "false"), "false");
  assert.throws(() => parseValue(UNRECONCILE_DELEGATION_SETTING_KEY, "TRUE"), (e: unknown) => (e as { reason?: string }).reason === "invalid_value");
  assert.equal(parseValue("outra.chave", "TRUE"), "TRUE");
});

// ------------------------------------------------------------------ A13 (memória) — CAS obrigatório por estado lógico

test("A13: sem o estado esperado → 400 expected_state_required e nada gravado (ausente, só um dos dois, tipos errados)", async () => {
  await withApi(async (api) => {
    const entry = await newEntry(api);
    for (const extra of [{}, { expected_reconciled: false }, { expected_reconciled_at: null }, { expected_reconciled: "false", expected_reconciled_at: null }, { expected_reconciled: false, expected_reconciled_at: "ontem" }, { expected_reconciled: false, expected_reconciled_at: 0 }]) {
      const res = await call(api, api.tenantA, "finance", "PATCH", `/financial-entries/${entry.id}/reconcile`, { reconciled: true, ...extra });
      assert.equal(res.status, 400, JSON.stringify(extra));
      assert.equal(res.body.error.reason, "expected_state_required", JSON.stringify(extra));
    }
    assert.equal((await stateOf(api, entry.id)).expected_reconciled, false, "nada gravado");
  });
});

test("A13: dois clientes LEEM o mesmo estado e gravam em sequência → o 1º 200, o 2º 409 reconciliation_stale SEMPRE (20 repetições, sem relógio); reconciledBy intocado", async () => {
  await withApi(async (api) => {
    for (let round = 0; round < 20; round += 1) {
      const entry = await newEntry(api);
      const seen = await stateOf(api, entry.id);
      const first = await call(api, api.tenantA, "finance", "PATCH", `/financial-entries/${entry.id}/reconcile`, { reconciled: true, ...seen });
      assert.equal(first.status, 200, `rodada ${round}: 1º`);
      const second = await call(api, api.tenantA, "tenant_admin", "PATCH", `/financial-entries/${entry.id}/reconcile`, { reconciled: true, divergence_type: "value", ...seen });
      assert.equal(second.status, 409, `rodada ${round}: 2º com o estado velho`);
      assert.equal(second.body.error.reason, "reconciliation_stale");
      const after = (await call(api, api.tenantA, "finance", "GET", `/financial-entries/${entry.id}`)).body.data;
      assert.equal(after.reconciledBy, first.body.data.reconciledBy, "o 409 não trocou quem conciliou");
      assert.equal(after.divergenceType, null, "o 409 não gravou a ressalva");
    }
  });
});

test("A13: estado defasado explícito (true com carimbo antigo; true quando a linha está false) → 409; lançamento de outra organização → 404", async () => {
  await withApi(async (api) => {
    const entry = await newEntry(api);
    const ok = await reconcileAs(api, "finance", entry.id, true);
    const stamp = ok.body.data.reconciledAt as string;
    const old = new Date(new Date(stamp).getTime() - 1).toISOString();
    const stale = await call(api, api.tenantA, "tenant_admin", "PATCH", `/financial-entries/${entry.id}/reconcile`, { reconciled: false, expected_reconciled: true, expected_reconciled_at: old });
    assert.equal(stale.status, 409);
    const wrongFlag = await call(api, api.tenantA, "tenant_admin", "PATCH", `/financial-entries/${entry.id}/reconcile`, { reconciled: false, expected_reconciled: false, expected_reconciled_at: null });
    assert.equal(wrongFlag.status, 409);
    const fresh = await call(api, api.tenantA, "tenant_admin", "PATCH", `/financial-entries/${entry.id}/reconcile`, { reconciled: false, expected_reconciled: true, expected_reconciled_at: stamp });
    assert.equal(fresh.status, 200);
    const foreign = await call(api, api.tenantB, "tenant_admin", "PATCH", `/financial-entries/${entry.id}/reconcile`, { reconciled: true, expected_reconciled: false, expected_reconciled_at: null });
    assert.equal(foreign.status, 404);
  });
});

test("A13 (repositório): o CAS de memória compara o par (reconciled, reconciledAt) — sem o par certo, 0 linhas", async () => {
  resetAll();
  const repo = getMemoryFinancialEntryRepositoryForTests();
  const tenantId = randomUUID();
  const created = await repo.create({
    tenantId, accountId: randomUUID(), direction: "in", amount: 10, currency: "BRL", paymentMethod: "pix",
    occurredAt: new Date("2026-10-10T12:00:00.000Z"), competencia: "2026-10",
  });
  const at = new Date("2026-10-11T12:00:00.000Z");
  const base = { tenantId, financialEntryId: created.id, divergenceType: null, reconciliationRef: null, reconciledBy: null };
  assert.equal(await repo.reconcile({ ...base, expectedReconciled: true, expectedReconciledAt: null, reconciled: true, reconciledAt: at }), undefined);
  assert.ok(await repo.reconcile({ ...base, expectedReconciled: false, expectedReconciledAt: null, reconciled: true, reconciledAt: at }));
  assert.equal(await repo.reconcile({ ...base, expectedReconciled: true, expectedReconciledAt: new Date(at.getTime() + 1), reconciled: false, reconciledAt: null }), undefined);
  assert.ok(await repo.reconcile({ ...base, expectedReconciled: true, expectedReconciledAt: at, reconciled: false, reconciledAt: null }));
});

// ------------------------------------------------------------------ auditoria do desfazer (R4)

test("R4: a auditoria do DESFAZER é warning e diz se passou pela delegação; a do conciliar segue info", () => {
  const entry = { id: randomUUID(), reconciled: false, divergenceType: undefined } as never;
  const undone = buildReconcileAudit(entry, true);
  assert.equal(undone.action, "financial_entry.unreconciled");
  assert.equal(undone.severity, "warning");
  assert.deepEqual(undone.metadata, { reconciled: false, divergence_type: null, delegated: true });
  const done = buildReconcileAudit({ id: randomUUID(), reconciled: true, divergenceType: "value" } as never, false);
  assert.equal(done.severity, "info");
  assert.deepEqual(done.metadata, { reconciled: true, divergence_type: "value" });
});

// ------------------------------------------------------------------ A18 — catálogo

test("A18: tenant_admin, super_admin e platform_admin têm cheques:unlink_title e financial_entries:unreconcile; finance, manager e auditor não", () => {
  for (const role of ["tenant_admin", "super_admin", "platform_admin"] as const) {
    for (const permission of ["cheques:unlink_title", "financial_entries:unreconcile"] as const) {
      assert.equal((ROLE_PERMISSIONS[role] as readonly string[]).includes(permission), true, `${role} tem ${permission}`);
    }
  }
  for (const role of ["finance", "manager", "auditor", "operator", "field_technician", "viewer", "support", "inventory"] as const) {
    for (const permission of ["cheques:unlink_title", "financial_entries:unreconcile"] as const) {
      assert.equal((ROLE_PERMISSIONS[role] as readonly string[]).includes(permission), false, `${role} NÃO tem ${permission}`);
    }
  }
});

test("A9 (serviço): sem papel finance a política não vale — manager com financial_entries:update e política ligada segue 403", async () => {
  resetAll();
  const svc = createMemoryFinancialEntryService();
  const tenantId = randomUUID();
  const actor = { tenantId, userId: randomUUID(), roles: ["manager" as const], permissions: ["financial_entries:update" as const] };
  const entry = await getMemoryFinancialEntryRepositoryForTests().create({
    tenantId, accountId: randomUUID(), direction: "in", amount: 10, currency: "BRL", paymentMethod: "pix",
    occurredAt: new Date(), competencia: "2026-10",
  });
  const { createMemoryTenantSettingService } = await import("../src/modules/tenant-settings/tenant-setting.service.js");
  await createMemoryTenantSettingService().upsert({ tenantId, userId: randomUUID(), roles: ["tenant_admin"], permissions: [] }, UNRECONCILE_DELEGATION_SETTING_KEY, { value: "true" });
  await getMemoryFinancialEntryRepositoryForTests().reconcile({
    tenantId, financialEntryId: entry.id, expectedReconciled: false, expectedReconciledAt: null, reconciled: true,
    divergenceType: null, reconciliationRef: null, reconciledAt: new Date("2026-10-12T00:00:00.000Z"), reconciledBy: null,
  });
  await assert.rejects(
    () => svc.reconcile(actor, entry.id, { reconciled: false, expected_reconciled: true, expected_reconciled_at: "2026-10-12T00:00:00.000Z" }),
    (e: unknown) => (e as { reason?: string }).reason === "unreconcile_forbidden",
  );
});
