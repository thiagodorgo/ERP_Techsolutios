import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

// B-SAN3-24 (24b) — contrato da tela de Fechamento do mês CONTRA O SERVIDOR REAL (R-E2E-JWT, P-CONTRATO, P-ACESSO,
// R-DISPUTA-DO-GET, R-COMPETENCIA-SP). Mesmo arnês do contrato de cheques: `createApp` em memória, usuários no
// `CoreSaasRegistry`, JWT por `signAccessToken`, e as FUNÇÕES REAIS do front (`period-closes.service.ts`,
// `period-actions.ts`, `period-keys.ts`) com `{ token }`. O preparo (conta, título, contestação) vai como administrador
// por cabeçalho. Só TypeScript puro do front entra aqui (roda no job `backend`).
//   B1 (i) lista e lê 2026-07 aberto, com checklist; (ii) fecha como Financeiro (retrato) e reabre como administrador,
//      com motivo; (iii) com 1 título em contestação, fechar sem `force` dá 422 `pending_items_block_close` e o GET
//      relido traz `inDisputeTitles === 1` (a RELEITURA pelo hook é o B4(iv), no arnês do front — N-09 da crítica r2);
//      (iv) forçado com motivo: `closed`, `forced` e o motivo aparado no retrato;
//   B2 `toPeriodKey` = `deriveCompetencia` do servidor nos 4 instantes da virada, com os valores literais;
//   B3 por papel: Fechar e Reabrir oferecidos ⇒ 2xx; negados ⇒ 403 ou 422.

process.env.LOG_LEVEL = "silent";
process.env.JWT_SECRET = "dev-only-change-me";
process.env.JWT_EXPIRES_IN = "15m";
process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.VITE_USE_MOCKS = "false";

const { signAccessToken } = await import("../src/modules/auth/index.js");
const { CoreSaasRegistry } = await import("../src/modules/core-saas/services/core-saas.service.js");
const { MemoryCoreSaasAdapter } = await import("../src/modules/core-saas/services/memory-core-saas.adapter.js");
const { InMemoryCoreSaasStore } = await import("../src/modules/core-saas/store/core-saas.store.js");
const { getRolePermissions } = await import("../src/modules/core-saas/permissions/catalog.js");
const { resetChequeRuntimeForTests } = await import("../src/modules/cheques/index.js");
const { resetFinancialEntryRuntimeForTests } = await import("../src/modules/financial-entries/financial-entry.service.js");
const { resetFinancialAccountRuntimeForTests } = await import("../src/modules/financial-accounts/financial-account.service.js");
const { resetFinancialTitleRuntimeForTests, deriveCompetencia } = await import("../src/modules/financial-titles/index.js");
const { resetFinancialPeriodCloseRuntimeForTests } = await import("../src/modules/financial-period-closes/financial-period-close.service.js");

const front = await import("../frontend/src/modules/finance/period-closes/period-closes.service.ts");
const { periodActionsFor } = await import("../frontend/src/modules/finance/period-closes/period-actions.ts");
const { toPeriodKey } = await import("../frontend/src/modules/finance/period-closes/period-keys.ts");
const { adaptPeriodDetail } = await import("../frontend/src/modules/finance/period-closes/period-closes.adapter.ts");

type Role = "tenant_admin" | "manager" | "finance" | "auditor";
const ROLES: readonly Role[] = ["tenant_admin", "manager", "finance", "auditor"];

type Api = {
  readonly tokens: Readonly<Record<Role, string>>;
  http: (method: string, path: string, body?: unknown) => Promise<{ status: number; body: any }>;
};

function resetAll(): void {
  resetFinancialPeriodCloseRuntimeForTests();
  resetChequeRuntimeForTests();
  resetFinancialEntryRuntimeForTests();
  resetFinancialAccountRuntimeForTests();
  resetFinancialTitleRuntimeForTests();
}

async function withApi(work: (api: Api) => Promise<void>): Promise<void> {
  const { createApp } = await import("../src/app.js");
  resetAll();
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenant = core.createTenant({ name: "B-SAN3-24 fechamento", modules: ["dashboard", "finance"] });
  const tokens = {} as Record<Role, string>;
  for (const role of ROLES) {
    const user = core.createUser({ tenantId: tenant.id, name: `Usuário ${role}`, email: `${role}-${randomUUID().slice(0, 8)}@b24.example.com`, roles: [role] });
    tokens[role] = await signAccessToken({ user_id: user.id, tenant_id: tenant.id, email: user.email, roles: [role] });
  }
  const server: Server = createApp(new MemoryCoreSaasAdapter(core)).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
  process.env.VITE_API_BASE_URL = baseUrl;
  const adminId = randomUUID();
  const http = async (method: string, path: string, body?: unknown) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { "content-type": "application/json", "x-tenant-id": tenant.id, "x-user-id": adminId, "x-role": "tenant_admin" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
  try {
    await work({ tokens, http });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    resetAll();
  }
}

const ctx = (token: string) => ({ token });
const statusOf = (error: unknown) => (error as { status?: number }).status;
const reasonOf = (error: unknown) => (error as { reason?: string }).reason;

async function disputedTitleIn(api: Api, issueDate: string): Promise<string> {
  const created = await api.http("POST", "/financial-titles", {
    direction: "receivable",
    party_type: "customer",
    party_name: "Cliente em contestação",
    amount: 500,
    issue_date: issueDate,
    due_date: "2026-08-15",
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const disputed = await api.http("PATCH", `/financial-titles/${created.body.data.id}/status`, { status: "in_dispute" });
  assert.equal(disputed.status, 200, JSON.stringify(disputed.body));
  return created.body.data.id as string;
}

test("B1 (i)(ii) lista e lê 2026-07 aberto com checklist; fecha como Financeiro (retrato); reabre como administrador, com motivo", async () => {
  await withApi(async (api) => {
    const finance = ctx(api.tokens.finance);
    const open = await front.getPeriod(finance, "2026-07");
    assert.equal(open.status, "open");
    assert.equal(open.snapshot, null);
    assert.deepEqual(open.checklist, { inDisputeTitles: 0, unpaidTitles: 0, unreconciledEntries: 0 });
    const closed = await front.closePeriod(finance, "2026-07", { body: {} });
    assert.equal(closed.status, "closed");
    assert.ok(closed.snapshot, "o retrato congelado volta no fechamento");
    assert.equal(closed.snapshot?.forced, false);
    const listed = await front.listPeriods(finance);
    assert.equal(listed.source, "api");
    assert.deepEqual(listed.items.map((row) => [row.period, row.status]), [["2026-07", "closed"]]);
    const reopened = await front.reopenPeriod(ctx(api.tokens.tenant_admin), "2026-07", "Lançamento esquecido do frete");
    assert.equal(reopened.status, "reopened");
    assert.equal(reopened.reopenReason, "Lançamento esquecido do frete");
  });
});

test("B1 (iii) com 1 título em contestação: fechar sem force dá 422 pending_items_block_close, e o GET relido traz a contagem 1", async () => {
  await withApi(async (api) => {
    await disputedTitleIn(api, "2026-07-10");
    const finance = ctx(api.tokens.finance);
    await assert.rejects(front.closePeriod(finance, "2026-07", { body: {} }), (error: unknown) => statusOf(error) === 422 && reasonOf(error) === "pending_items_block_close");
    const reread = await front.getPeriod(finance, "2026-07");
    assert.equal(reread.status, "open", "nada foi fechado");
    assert.equal(reread.checklist?.inDisputeTitles, 1);
  });
});

test("B1 (iv) forçado com motivo: closed, forced e o motivo APARADO no retrato", async () => {
  await withApi(async (api) => {
    await disputedTitleIn(api, "2026-07-10");
    const closed = await front.closePeriod(ctx(api.tokens.finance), "2026-07", { body: { force: true, reason: "  Cliente confirmou o acerto por e-mail  ".trim() } });
    assert.equal(closed.status, "closed");
    assert.equal(closed.snapshot?.forced, true);
    assert.equal(closed.snapshot?.forcedReason, "Cliente confirmou o acerto por e-mail");
    await assert.rejects(front.closePeriod(ctx(api.tokens.finance), "2026-07", { body: {} }), (error: unknown) => statusOf(error) === 409 && reasonOf(error) === "period_already_closed");
  });
});

test("B1 reabrir sem motivo: 400 reason_required (o corpo do front leva o motivo)", async () => {
  await withApi(async (api) => {
    await front.closePeriod(ctx(api.tokens.finance), "2026-07", { body: {} });
    await assert.rejects(front.reopenPeriod(ctx(api.tokens.tenant_admin), "2026-07", ""), (error: unknown) => statusOf(error) === 400 && reasonOf(error) === "reason_required");
  });
});

test("B2 toPeriodKey = deriveCompetencia do servidor na virada do mês, com os valores literais, e o GET aceita a chave", async () => {
  const cases: readonly [string, string][] = [
    ["2026-07-01T02:00:00Z", "2026-06"],
    ["2026-07-01T03:00:00Z", "2026-07"],
    ["2026-12-31T23:30:00-03:00", "2026-12"],
    ["2027-01-01T02:59:59Z", "2026-12"],
  ];
  for (const [instant, expected] of cases) {
    const date = new Date(instant);
    assert.equal(toPeriodKey(date), expected, instant);
    assert.equal(deriveCompetencia(date), expected, `${instant} (servidor)`);
  }
  await withApi(async (api) => {
    const read = await front.getPeriod(ctx(api.tokens.finance), toPeriodKey(new Date(cases[0][0])));
    assert.equal(read.period, "2026-06");
  });
});

test("B3 por papel: Fechar e Reabrir oferecidos ⇒ 2xx; negados ⇒ 403 ou 422 (aberto e fechado)", async () => {
  await withApi(async (api) => {
    const failures: string[] = [];
    let exercised = 0;
    for (const role of ROLES) {
      const perms = new Set<string>(getRolePermissions(role));
      for (const [index, state] of (["open", "closed"] as const).entries()) {
        for (const action of ["close", "reopen"] as const) {
          // uma competência própria por papel × situação × ação (o servidor não volta uma competência a "aberta").
          const period = `${2020 + ROLES.indexOf(role)}-${String(1 + index * 2 + (action === "reopen" ? 1 : 0)).padStart(2, "0")}`;
          if (state === "closed") {
            const prepared = await api.http("POST", `/financial-periods/${period}/close`, {});
            assert.equal(prepared.status, 200, JSON.stringify(prepared.body));
          }
          const read = await api.http("GET", `/financial-periods/${period}`);
          assert.equal(read.status, 200, JSON.stringify(read.body));
          const current = adaptPeriodDetail(read.body);
          const offered = periodActionsFor(current, perms).includes(action);
          const token = api.tokens[role];
          const label = `${role} · ${state} · ${action}`;
          try {
            if (action === "close") await front.closePeriod(ctx(token), period, { body: {} });
            else await front.reopenPeriod(ctx(token), period, "Motivo do teste B3");
            if (!offered) failures.push(`${label}: NÃO oferecida, mas o servidor aceitou`);
          } catch (error) {
            const status = statusOf(error);
            if (offered) failures.push(`${label}: oferecida, mas recusada (${status} ${reasonOf(error)})`);
            else if (status !== 403 && status !== 422 && status !== 409) failures.push(`${label}: negada com ${status}`);
          }
          exercised++;
        }
      }
      const expected = role === "tenant_admin" ? ["close", "reopen"] : role === "finance" ? ["close"] : [];
      const shown = [...periodActionsFor({ status: "open" }, perms), ...periodActionsFor({ status: "closed" }, perms)].sort();
      assert.deepEqual(shown, [...expected].sort(), `${role}: Fechar/Reabrir oferecidos`);
    }
    assert.deepEqual(failures, []);
    assert.equal(exercised, ROLES.length * 4);
  });
});
