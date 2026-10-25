import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import {
  createMemoryFinancialAccountService,
  resetFinancialAccountRuntimeForTests,
} from "../src/modules/financial-accounts/financial-account.service.js";
import {
  createMemoryFinancialEntryService,
  getMemoryFinancialEntryRepositoryForTests,
  resetFinancialEntryRuntimeForTests,
  toFinancialEntryListDto,
  type FinancialEntryActorContext,
} from "../src/modules/financial-entries/index.js";
import {
  createMemoryFinancialTitleService,
  deriveCompetencia,
  resetFinancialTitleRuntimeForTests,
  toFinancialTitleListDto,
} from "../src/modules/financial-titles/index.js";
import { resetChequeRuntimeForTests } from "../src/modules/cheques/index.js";
import { computeFinancialSummary } from "../src/modules/financial-summary/index.js";
import { BUSINESS_TIMEZONE } from "../src/config/business-time.js";

// -----------------------------------------------------------------------------------------------
// B-SAN3-12a — §4.5 e §4.7 do plano v3 (memória). O agregado do extrato somado NO SERVIDOR e agrupado no FUSO DO
// NEGÓCIO (A14, A15, A23, A24), e os campos aditivos de DTO (A17). A paridade memória × Prisma, a virada de fuso no
// Postgres e o RLS do `$queryRaw` estão em `tests/b-san3-12a-entries-aggregate-db.test.ts` e
// `tests/b-san3-12a-aggregate-tz-db.test.ts`.
// -----------------------------------------------------------------------------------------------

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

function actor(tenantId = randomUUID()): FinancialEntryActorContext {
  return { tenantId, userId: randomUUID(), roles: ["finance"], permissions: ["financial_entries:read", "financial_entries:create", "financial_entries:update", "financial_entries:unreconcile"] };
}

function resetAll(): void {
  resetChequeRuntimeForTests();
  resetFinancialEntryRuntimeForTests();
  resetFinancialAccountRuntimeForTests();
  resetFinancialTitleRuntimeForTests();
}

async function setup() {
  resetAll();
  const ctx = actor();
  const accounts = createMemoryFinancialAccountService();
  const entries = createMemoryFinancialEntryService();
  const account = await accounts.create(ctx, { name: `Conta ${randomUUID()}` });
  const other = await accounts.create(ctx, { name: `Conta ${randomUUID()}` });
  return { ctx, accounts, entries, account, other };
}

function domain(error: unknown, statusCode: number, reason: string): boolean {
  return typeof error === "object" && error !== null &&
    (error as { statusCode?: unknown }).statusCode === statusCode &&
    (error as { reason?: unknown }).reason === reason;
}

const at = (iso: string) => iso;

// ------------------------------------------------------------------ A14

test("A14: group_by=none&reconciled=false — count/inflow/outflow somados no servidor com centavos adversariais (0.1+0.2); deletado não conta; outra organização não vaza", async () => {
  const s = await setup();
  const base = { account_id: s.account.id, payment_method: "pix", occurred_at: "2026-10-10T12:00:00-03:00" };
  await s.entries.create(s.ctx, { ...base, direction: "in", amount: 0.1 });
  await s.entries.create(s.ctx, { ...base, direction: "in", amount: 0.2 });
  await s.entries.create(s.ctx, { ...base, direction: "out", amount: 0.3 });
  const gone = await s.entries.create(s.ctx, { ...base, direction: "in", amount: 1000 });
  await s.entries.delete(s.ctx, gone.id);
  const conciliado = await s.entries.create(s.ctx, { ...base, direction: "in", amount: 5 });
  await s.entries.reconcile(s.ctx, conciliado.id, { reconciled: true, expected_reconciled: false, expected_reconciled_at: null });
  const intruder = actor();
  const foreignAccount = await s.accounts.create(intruder, { name: `Conta ${randomUUID()}` });
  await s.entries.create(intruder, { ...base, account_id: foreignAccount.id, direction: "in", amount: 777 });

  const result = await s.entries.aggregate(s.ctx, { group_by: "none", reconciled: "false" });
  assert.equal(result.groupBy, "none");
  assert.equal(result.currency, "BRL");
  assert.equal(result.timezone, BUSINESS_TIMEZONE);
  assert.deepEqual(result.items, [{ bucket: null, count: 3, inflow: 0.3, outflow: 0.3, net: 0 }]);

  const all = await s.entries.aggregate(s.ctx, {});
  assert.deepEqual(all.items, [{ bucket: null, count: 4, inflow: 5.3, outflow: 0.3, net: 5 }]);
  const byAccount = await s.entries.aggregate(s.ctx, { account_id: s.other.id });
  assert.deepEqual(byAccount.items, [], "conta sem movimento → nenhum bucket");
  const outOnly = await s.entries.aggregate(s.ctx, { direction: "out" });
  assert.deepEqual(outOnly.items, [{ bucket: null, count: 1, inflow: 0, outflow: 0.3, net: -0.3 }]);
});

// ------------------------------------------------------------------ A15

test("A15: day com 93 dias → 400 aggregate_range_too_wide; 92 passa; month com 25 meses → 400; 24 passa; group_by inválido → 400", async () => {
  const s = await setup();
  await assert.rejects(() => s.entries.aggregate(s.ctx, { group_by: "day", from: "2026-01-01", to: "2026-04-03" }), (e) => domain(e, 400, "aggregate_range_too_wide"));
  const ok = await s.entries.aggregate(s.ctx, { group_by: "day", from: "2026-01-01", to: "2026-04-02" });
  assert.equal(ok.groupBy, "day");
  await assert.rejects(() => s.entries.aggregate(s.ctx, { group_by: "month", from: "2024-01-01", to: "2026-01-31" }), (e) => domain(e, 400, "aggregate_range_too_wide"));
  const months = await s.entries.aggregate(s.ctx, { group_by: "month", from: "2024-02-01", to: "2026-01-31" });
  assert.equal(months.groupBy, "month");
  await assert.rejects(() => s.entries.aggregate(s.ctx, { group_by: "week" }), (e) => domain(e, 400, "invalid_group_by"));
  await assert.rejects(() => s.entries.aggregate(s.ctx, { group_by: "day", from: "ontem" }), (e) => domain(e, 400, "invalid_from"));
});

// ------------------------------------------------------------------ A23 (memória)

test("A23 (memória): 2026-10-31T23:30-03:00 cai em 2026-10 (mês) e 2026-10-31 (dia); 2026-10-24T22:15-03:00 cai em 2026-10-24 — nunca o mês/dia UTC", async () => {
  const s = await setup();
  await s.entries.create(s.ctx, { account_id: s.account.id, payment_method: "pix", direction: "in", amount: 10, occurred_at: at("2026-10-31T23:30:00-03:00") });
  await s.entries.create(s.ctx, { account_id: s.account.id, payment_method: "pix", direction: "in", amount: 7, occurred_at: at("2026-10-24T22:15:00-03:00") });
  const months = await s.entries.aggregate(s.ctx, { group_by: "month", from: "2026-09-01", to: "2026-11-30" });
  assert.deepEqual(months.items, [{ bucket: "2026-10", count: 2, inflow: 17, outflow: 0, net: 17 }]);
  const days = await s.entries.aggregate(s.ctx, { group_by: "day", from: "2026-10-20", to: "2026-11-02" });
  assert.deepEqual(days.items.map((i) => [i.bucket, i.inflow]), [["2026-10-24", 7], ["2026-10-31", 10]]);
  const onlyNovember = await s.entries.aggregate(s.ctx, { group_by: "day", from: "2026-11-01", to: "2026-11-02" });
  assert.deepEqual(onlyNovember.items, [], "o filtro de datas é a data CIVIL do negócio");
});

// ------------------------------------------------------------------ A24 (memória)

test("A24 (memória): agregado mensal somado por conta == cashFlow do resumo, mês a mês, sobre os mesmos lançamentos", async () => {
  const s = await setup();
  const rows = [
    { account: s.account.id, direction: "in", amount: 100.1, occurred_at: "2026-08-31T23:59:00-03:00" },
    { account: s.account.id, direction: "out", amount: 20.2, occurred_at: "2026-09-01T00:01:00-03:00" },
    { account: s.other.id, direction: "in", amount: 0.1, occurred_at: "2026-09-30T23:30:00-03:00" },
    { account: s.other.id, direction: "in", amount: 0.2, occurred_at: "2026-10-01T01:00:00-03:00" },
    { account: s.account.id, direction: "out", amount: 5, occurred_at: "2026-10-31T23:30:00-03:00" },
  ];
  for (const row of rows) {
    await s.entries.create(s.ctx, { account_id: row.account, direction: row.direction, amount: row.amount, payment_method: "pix", occurred_at: row.occurred_at });
  }
  const perAccount = await Promise.all([s.account.id, s.other.id].map((id) => s.entries.aggregate(s.ctx, { group_by: "month", account_id: id, from: "2026-07-01", to: "2026-12-31" })));
  const summed = new Map<string, { inflow: number; outflow: number }>();
  for (const result of perAccount) {
    for (const item of result.items) {
      const bucket = summed.get(item.bucket!) ?? { inflow: 0, outflow: 0 };
      bucket.inflow = Math.round((bucket.inflow + item.inflow) * 100) / 100;
      bucket.outflow = Math.round((bucket.outflow + item.outflow) * 100) / 100;
      summed.set(item.bucket!, bucket);
    }
  }
  const ledger = await getMemoryFinancialEntryRepositoryForTests().list({ tenantId: s.ctx.tenantId, includeDeleted: false, limit: 100, offset: 0 });
  const summary = computeFinancialSummary({
    titles: [],
    entries: ledger.items.map((e) => ({ direction: e.direction, amount: e.amount, competencia: e.competencia })),
    cheques: [],
    accounts: [],
    currency: "BRL",
    now: new Date("2026-11-15T12:00:00-03:00"),
  });
  for (const point of summary.cashFlow) {
    const mine = summed.get(point.competencia) ?? { inflow: 0, outflow: 0 };
    assert.deepEqual(mine, { inflow: point.inflow, outflow: point.outflow }, `competência ${point.competencia}`);
  }
  assert.equal(deriveCompetencia(new Date("2026-08-31T23:59:00-03:00")), "2026-08");
});

// ------------------------------------------------------------------ A17 — campos aditivos de DTO

test("A17: a lista de lançamentos traz description, metadados de conciliação e updatedAt; a de títulos traz workOrderId; nenhum tenant_id", async () => {
  const s = await setup();
  const entry = await s.entries.create(s.ctx, { account_id: s.account.id, direction: "in", amount: 10, payment_method: "pix", description: "Recebimento balcão" });
  await s.entries.reconcile(s.ctx, entry.id, { reconciled: true, reconciliation_ref: "EXT-1", expected_reconciled: false, expected_reconciled_at: null });
  const list = toFinancialEntryListDto(await s.entries.list(s.ctx, {}));
  const item = list.items[0] as Record<string, unknown>;
  assert.equal(item.description, "Recebimento balcão");
  assert.equal(item.reconciliationRef, "EXT-1");
  assert.equal(typeof item.reconciledAt, "string");
  assert.equal(item.reconciledBy, s.ctx.userId);
  assert.equal(typeof item.updatedAt, "string");
  assert.equal("tenantId" in item || "tenant_id" in item, false);

  const titles = createMemoryFinancialTitleService();
  const workOrderId = randomUUID();
  await titles.createForWorkOrder(s.ctx as never, {
    workOrderId, direction: "receivable", amount: 50, currency: "BRL", partyType: "customer", partyName: "Cliente OS", issueDate: new Date(), dueDate: new Date(),
  } as never);
  const titleList = toFinancialTitleListDto(await titles.list(s.ctx as never, {}));
  const row = titleList.items[0] as Record<string, unknown>;
  assert.equal(row.workOrderId, workOrderId);
  assert.equal("tenantId" in row || "tenant_id" in row, false);
});

// ------------------------------------------------------------------ pela ROTA

test("A14/A15 (HTTP): GET /financial-entries/aggregate responde {groupBy,currency,timezone,items} a quem lê; técnico de campo 403; 400 do teto", async () => {
  const [{ createApp }, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  resetAll();
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenant = core.createTenant({ name: "12a AGG", modules: ["dashboard", "finance"] });
  const server: Server = createApp(new MemoryCoreSaasAdapter(core)).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
  const call = async (role: string, method: string, path: string, payload?: unknown) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method, headers: { "content-type": "application/json", "x-tenant-id": tenant.id, "x-user-id": randomUUID(), "x-role": role },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
  try {
    const account = (await call("finance", "POST", "/financial-accounts", { name: "Caixa" })).body.data;
    await call("finance", "POST", "/financial-entries", { account_id: account.id, direction: "in", amount: 12.5, payment_method: "pix", occurred_at: "2026-10-31T23:30:00-03:00" });
    for (const role of ["finance", "manager", "auditor", "tenant_admin"]) {
      const res = await call(role, "GET", "/financial-entries/aggregate?group_by=month&from=2026-10-01&to=2026-11-30");
      assert.equal(res.status, 200, role);
      assert.deepEqual(res.body.data, { groupBy: "month", currency: "BRL", timezone: "America/Sao_Paulo", items: [{ bucket: "2026-10", count: 1, inflow: 12.5, outflow: 0, net: 12.5 }] }, role);
    }
    assert.equal((await call("field_technician", "GET", "/financial-entries/aggregate")).status, 403);
    const wide = await call("finance", "GET", "/financial-entries/aggregate?group_by=day&from=2026-01-01&to=2026-12-31");
    assert.equal(wide.status, 400);
    assert.equal(wide.body.error.reason, "aggregate_range_too_wide");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    resetAll();
  }
});
