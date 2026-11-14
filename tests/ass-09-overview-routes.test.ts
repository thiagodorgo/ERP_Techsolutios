// B-ASS-09 · F6 — as 10 rotas de plataforma da visão de custo, do câmbio e dos grupos, pelo app real (createApp), em
// memória (plano v2 §4.1, §4.3, §6 C3: R-ACC-1..3; Emenda 2 §2.2: a metade HTTP do T-GRP-12; Emenda 2.1 §2.6 e o visto
// `rev-ass09-e21-cl` A-E21-2: o T-SUB-12). Valores e nomes sintéticos (plano §15).
//
// MUTAÇÕES LITERAIS QUE ESTE ARQUIVO MATA:
//   M-ACC-1  tirar `requirePlatformPermission("platform:billing:read"), ` do `GET /overview`                       → T-ACC-1b
//   M-ACC-4  tirar `requirePlatformPermission("platform:billing:read"), ` do `GET /economic-groups/:groupId/history` → T-ACC-1b
//   M-ACC-5  acrescentar `router.get("/economic-groups/:groupId/members", requirePlatformPermission("platform:billing:read"),
//            (_req, res) => res.json({ data: [] }));`                                                              → T-ACC-1a
//   M-ACC-3  gravar a metadata sem a allowlist (`const picked = pickBillingAuditMetadata(context, OVERVIEW_TRAIL_KEYS);`
//            → `const picked = context;`)                                                                         → T-ACC-3
//   M-MG-7   `periodEnd: lastDayOfPeriod(period)` → `periodEnd: firstDayOfNextPeriod(period)`                      → T-MG-17b
//   M-SUB-12 apagar `if (error instanceof StatementIntegrityError) return statementIntegrity(error, logger);`      → T-SUB-12
//   M-GRP-10h (suplementar) apagar `if (error instanceof MembershipOverlapError) return membershipIntegrity(error, logger, period);`
//            → T-GRP-12 (HTTP)

import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Router } from "express";

import {
  getMemoryCloudCostAllocationRepositoryForTests,
  resetCloudCostAllocationRuntimeForTests,
} from "../src/modules/cloud-cost-allocation/index.js";
import { CoreSaasRegistry } from "../src/modules/core-saas/services/core-saas.service.js";
import { MemoryCoreSaasAdapter } from "../src/modules/core-saas/services/memory-core-saas.adapter.js";
import { InMemoryCoreSaasStore } from "../src/modules/core-saas/store/core-saas.store.js";
import type {
  EconomicGroup,
  EconomicGroupMembership,
  EconomicGroupsRepository,
  MembershipChangesResult,
} from "../src/modules/subscription-billing/economic-groups/economic-groups.repository.js";
import { createEconomicGroupsPlatformRouter } from "../src/modules/subscription-billing/economic-groups/economic-groups.routes.js";
import { createFxRatesPlatformRouter } from "../src/modules/subscription-billing/fx-rates/fx-rates.routes.js";
import {
  getMemoryOverviewEconomicGroupsForTests,
  getMemoryOverviewPlatformAuditForTests,
  getMemoryOverviewTenantListForTests,
  resetOverviewRuntimeForTests,
  setOverviewRuntimeOverridesForTests,
  type OverviewLogger,
} from "../src/modules/subscription-billing/overview/overview.factory.js";
import { createOverviewPlatformRouter } from "../src/modules/subscription-billing/overview/overview.routes.js";
import { OVERVIEW_TRAIL_KEYS } from "../src/modules/subscription-billing/overview/overview.trail.js";
import { daysInPeriod, recompute, snapshotOf } from "../src/modules/subscription-billing/statements/statement.engine.js";
import {
  getMemoryStatementRepositoryForTests,
  resetStatementRuntimeForTests,
} from "../src/modules/subscription-billing/statements/statement.factory.js";
import type { SubscriptionStatement } from "../src/modules/subscription-billing/statements/statement.types.js";
import { createSubscriptionBillingPlatformRouter } from "../src/modules/subscription-billing/subscription-billing.platform.routes.js";

type Json = Record<string, any>;

const BASE = "/api/v1/platform/billing";
const PLATFORM = { "x-user-id": "usr_platform", "x-role": "super_admin" } as const;
const TENANT_ADMIN = { "x-tenant-id": "ten_demo", "x-user-id": "usr_demo", "x-role": "tenant_admin" } as const;
// 2 de novembro de 2026, 09:00 em São Paulo: outubro já encerrou.
const NOV_2 = new Date("2026-11-02T12:00:00.000Z");
const DEC_2 = new Date("2026-12-02T12:00:00.000Z");
const GROUP_ID = "00000000-0000-4000-8000-000000000001";

/** O inventário fechado das 10 rotas (plano v2 §4.1), relativo a `/api/v1/platform/billing`. */
const INVENTORY = [
  "GET /overview",
  "GET /fx-rates",
  "PUT /fx-rates/:month",
  "GET /economic-groups",
  "POST /economic-groups",
  "GET /economic-groups/:groupId",
  "PATCH /economic-groups/:groupId",
  "DELETE /economic-groups/:groupId",
  "PUT /economic-groups/:groupId/members",
  "GET /economic-groups/:groupId/history",
].sort();

/** As 10 rotas com parâmetros concretos, para bater nelas. */
const CONCRETE: ReadonlyArray<readonly [string, string]> = [
  ["GET", "/overview?period=2026-10&groupBy=tenant"],
  ["GET", "/fx-rates?from=2026-10&to=2026-10"],
  ["PUT", "/fx-rates/2026-10"],
  ["GET", "/economic-groups"],
  ["POST", "/economic-groups"],
  ["GET", `/economic-groups/${GROUP_ID}`],
  ["PATCH", `/economic-groups/${GROUP_ID}`],
  ["DELETE", `/economic-groups/${GROUP_ID}`],
  ["PUT", `/economic-groups/${GROUP_ID}/members`],
  ["GET", `/economic-groups/${GROUP_ID}/history`],
];

/** As rotas montadas num router, lidas da pilha do `express.Router` em runtime (como o `san3-05` faz). */
function routesOf(router: Router): string[] {
  const out: string[] = [];
  const visit = (node: { stack?: unknown[] }) => {
    for (const layer of (node.stack ?? []) as Array<{ route?: { path: string; methods: Record<string, boolean> }; handle?: { stack?: unknown[] } }>) {
      if (layer.route) {
        for (const [method, on] of Object.entries(layer.route.methods)) {
          if (on && method !== "_all") out.push(`${method.toUpperCase()} ${layer.route.path}`);
        }
      } else if (layer.handle && Array.isArray(layer.handle.stack)) {
        visit(layer.handle);
      }
    }
  };
  visit(router as unknown as { stack?: unknown[] });
  return out.sort();
}

function capturingLogger(): { readonly logger: OverviewLogger; readonly lines: Array<{ readonly obj: Record<string, unknown>; readonly msg: string }> } {
  const lines: Array<{ readonly obj: Record<string, unknown>; readonly msg: string }> = [];
  return { lines, logger: { error: (obj, msg) => lines.push({ obj, msg }) } };
}

function freshRuntime(clock: Date): void {
  resetOverviewRuntimeForTests();
  resetStatementRuntimeForTests();
  resetCloudCostAllocationRuntimeForTests();
  setOverviewRuntimeOverridesForTests({ clock: () => clock });
}

function seedTenant(tenantId: string, slug: string = `org-${tenantId}`): void {
  getMemoryOverviewTenantListForTests().upsert({ tenantId, tenantName: `Organização ${tenantId.toUpperCase()}`, slug });
}

/** Uma run concluída do rateio na janela exata do mês, com o custo de cada organização. */
async function seedAllocation(
  period: string,
  currency: string,
  costs: ReadonlyArray<readonly [string, number]>,
  extra: { readonly platform?: number; readonly importId?: string } = {},
): Promise<void> {
  const repository = getMemoryCloudCostAllocationRepositoryForTests();
  const last = String(daysInPeriod(period)).padStart(2, "0");
  const periodStart = new Date(`${period}-01T00:00:00.000Z`);
  const periodEnd = new Date(`${period}-${last}T23:59:59.999Z`);
  const allocated = costs.reduce((total, [, cost]) => total + cost, 0);
  const platform = extra.platform ?? 0;
  const run = await repository.createRun({ periodStart, periodEnd, metadata: {} });
  await repository.replaceTenantAllocations(
    run.id,
    costs.map(([tenantId, allocatedCost]) => ({
      allocationRunId: run.id,
      tenantId,
      provider: "aws",
      periodStart,
      periodEnd,
      serviceCode: "AmazonS3",
      usageType: "storage",
      costCategory: "storage",
      allocationMethod: "direct_tenant_tag",
      allocationBasisQuantity: 1,
      allocationRatio: 1,
      allocatedCost,
      currency,
      sourceCostLineItemIds: [],
      metadata: {},
    })),
  );
  await repository.updateRun(run.id, {
    status: "completed",
    totalImportedCost: allocated + platform,
    totalAllocatedCost: allocated,
    totalUnallocatedCost: 0,
    currency,
    completedAt: periodEnd,
    metadata: { importResolution: "explicit", importId: extra.importId ?? "imp-1", totalPlatformCost: platform },
  });
}

/** Um demonstrativo fechado com o retrato do fechamento coerente (preço = total + crédito). */
async function seedClosedStatement(tenantId: string, period: string, totalCents: number): Promise<void> {
  const repository = getMemoryStatementRepositoryForTests();
  const lastDay = daysInPeriod(period);
  const latest = snapshotOf({
    daysInMonth: lastDay,
    segments: [{ subscriptionId: "sub-1", planVersionId: "ver-1", fromDay: 1, toDay: lastDay, monthlyPriceCents: totalCents }],
    terms: { includedUsers: 10, includedStorageMilliGb: 10_000, extraUserPriceCents: 1_500, extraGbPriceCents: 250 },
    measurements: { usersPeak: 1, storagePeakMilliGb: 0, trackedVehicles: 0 },
    perVehiclePriceCents: null,
    adjustmentsCents: 0,
    creditsAppliedCents: 0,
  });
  assert.equal(recompute(latest), totalCents);
  await repository.transaction(tenantId, async (tx) => {
    const { statement } = await tx.insertIfAbsentAndLock({ tenantId, period });
    return tx.saveStatement({ ...statement, status: "closed", totalCents, snapshot: { ...statement.snapshot, latest } });
  });
}

/** Grava a linha EXATAMENTE como pedida (sem retrato): só para o T-SUB-12. */
async function seedStatementRaw(tenantId: string, period: string, patch: Partial<SubscriptionStatement>): Promise<void> {
  await getMemoryStatementRepositoryForTests().transaction(tenantId, async (tx) => {
    const { statement } = await tx.insertIfAbsentAndLock({ tenantId, period });
    return tx.saveStatement({ ...statement, ...patch });
  });
}

async function withApi(callback: (baseUrl: string) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";
  const { createApp } = await import("../src/app.js");
  const app = createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())));
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await callback(`http://127.0.0.1:${port}${BASE}`);
  } finally {
    await new Promise<void>((resolve, reject) => (server as Server).close((error) => (error ? reject(error) : resolve())));
  }
}

async function call(
  baseUrl: string,
  method: string,
  path: string,
  options: { readonly headers?: Record<string, string>; readonly body?: unknown; readonly raw?: string } = {},
): Promise<{ status: number; body: Json; text: string }> {
  const response = await fetch(baseUrl + path, {
    method,
    headers: { "content-type": "application/json", ...(options.headers ?? PLATFORM) },
    body: options.raw ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
  });
  const text = await response.text();
  return { status: response.status, body: text ? (JSON.parse(text) as Json) : {}, text };
}

// ------------------------------------------------------------------------------------------------ R-ACC-1

test("T-ACC-1a · as rotas montadas pelos 3 routers novos são EXATAMENTE as 10 do inventário, e o router de plataforma as monta", () => {
  const mounted = [
    ...routesOf(createOverviewPlatformRouter()),
    ...routesOf(createFxRatesPlatformRouter()),
    ...routesOf(createEconomicGroupsPlatformRouter()),
  ].sort();
  assert.equal(mounted.length, 10, JSON.stringify(mounted));
  assert.deepEqual(mounted, INVENTORY);
  const platform = routesOf(createSubscriptionBillingPlatformRouter());
  for (const route of INVENTORY) assert.ok(platform.includes(route), `o router de plataforma não monta ${route}`);
});

test("T-ACC-1b · ator de organização (tenant_admin) → 403 em cada uma das 10; a plataforma passa da guarda", async () => {
  freshRuntime(NOV_2);
  await withApi(async (baseUrl) => {
    assert.equal(CONCRETE.length, 10);
    for (const [method, path] of CONCRETE) {
      const response = await call(baseUrl, method, path, { headers: TENANT_ADMIN, body: method === "GET" || method === "DELETE" ? undefined : {} });
      assert.equal(response.status, 403, `${method} ${path}`);
      assert.equal(response.body.error.reason, "platform_permission_required", `${method} ${path}`);
    }
    // Controle: a plataforma passa da guarda nas 3 leituras de entrada.
    for (const path of ["/overview?period=2026-10&groupBy=tenant", "/fx-rates?from=2026-10&to=2026-10", "/economic-groups"]) {
      assert.equal((await call(baseUrl, "GET", path)).status, 200, path);
    }
  });
});

// ------------------------------------------------------------------------------------------------ R-ACC-2

test("T-ACC-2 · o cliente não vê custo: GET /billing/subscription sem chave de custo, margem, câmbio nem grupo", async () => {
  freshRuntime(NOV_2);
  await withApi(async (baseUrl) => {
    const response = await fetch(baseUrl.replace("/platform/billing", "/billing/subscription"), { headers: TENANT_ADMIN });
    const text = await response.text();
    const forbidden = ["allocatedCost", "margin", "marginPct", "fxRate", "groupId", "cost"];
    const keys = new Set<string>();
    const walk = (node: unknown) => {
      if (Array.isArray(node)) node.forEach(walk);
      else if (node && typeof node === "object") for (const [key, value] of Object.entries(node)) (keys.add(key), walk(value));
    };
    walk(text ? JSON.parse(text) : {});
    assert.deepEqual(forbidden.filter((key) => keys.has(key)), []);
  });
});

// ------------------------------------------------------------------------------------------------ R1 (visão)

test("T-OV-1 · a visão pela rota: custo em real, assinatura do demonstrativo, margem e alerta, nas 3 formas", async () => {
  freshRuntime(NOV_2);
  seedTenant("a");
  seedTenant("b");
  seedTenant("p", "platform");
  await seedAllocation("2026-10", "BRL", [["a", 100], ["b", 40]], { platform: 10 });
  await seedClosedStatement("a", "2026-10", 100_000);
  await withApi(async (baseUrl) => {
    const byTenant = await call(baseUrl, "GET", "/overview?period=2026-10&groupBy=tenant");
    assert.equal(byTenant.status, 200, byTenant.text);
    const data = byTenant.body.data;
    assert.equal(data.cost.status, "ok");
    assert.deepEqual(data.lines.map((line: Json) => line.tenantId), ["a", "b"], "a organização da plataforma não é linha");
    const [a, b] = data.lines;
    assert.deepEqual(
      [a.subscriptionAmount, a.subscriptionSource, a.allocatedCost, a.margin, a.marginPct, a.alert],
      ["1000.00", "statement", "100.00", "900.00", "90.00", "none"],
    );
    assert.deepEqual([b.subscriptionAmount, b.subscriptionSource, b.allocatedCost, b.alert], [null, "none", "40.00", "no_subscription"]);
    const global = await call(baseUrl, "GET", "/overview?period=2026-10&groupBy=global");
    assert.equal(global.status, 200);
    assert.deepEqual(
      [global.body.data.global.totalCost, global.body.data.global.platformOwnCost, global.body.data.global.margin],
      ["150.00", "10.00", "850.00"],
    );
    const byGroup = await call(baseUrl, "GET", "/overview?period=2026-10&groupBy=group");
    assert.equal(byGroup.status, 200);
    assert.deepEqual(byGroup.body.data.lines.map((line: Json) => line.groupId), [null]);
    // O padrão de `groupBy` é `tenant`.
    assert.equal((await call(baseUrl, "GET", "/overview?period=2026-10")).body.data.groupBy, "tenant");
  });
});

test("T-OV-2 · entrada do R1: 400 invalid_period, 400 invalid_group_by, 422 period_in_future", async () => {
  freshRuntime(NOV_2);
  await withApi(async (baseUrl) => {
    for (const [path, status, reason] of [
      ["/overview?period=2026-13", 400, "invalid_period"],
      ["/overview", 400, "invalid_period"],
      ["/overview?period=2026-10&groupBy=country", 400, "invalid_group_by"],
      ["/overview?period=2026-12", 422, "period_in_future"],
    ] as const) {
      const response = await call(baseUrl, "GET", path);
      assert.deepEqual([response.status, response.body.error?.reason], [status, reason], path);
    }
  });
});

test("T-MG-17b · o serviço pede ao resumo a janela EXATA do mês (fim no último dia): a run do 09a é lida", async () => {
  freshRuntime(NOV_2);
  seedTenant("a");
  await seedAllocation("2026-10", "BRL", [["a", 100]]);
  await withApi(async (baseUrl) => {
    const response = await call(baseUrl, "GET", "/overview?period=2026-10&groupBy=tenant");
    assert.equal(response.status, 200, response.text);
    assert.deepEqual([response.body.data.cost.coverage, response.body.data.cost.status], ["imported", "ok"]);
    assert.equal(response.body.data.lines[0].allocatedCost, "100.00");
  });
});

test("T-FX-5b · a visão usa a versão vigente da taxa (5.500000, versão 2), e o câmbio pela rota guarda o histórico", async () => {
  freshRuntime(NOV_2);
  seedTenant("a");
  await seedAllocation("2026-10", "USD", [["a", 100]]);
  await withApi(async (baseUrl) => {
    const none = await call(baseUrl, "GET", "/overview?period=2026-10&groupBy=tenant");
    assert.deepEqual([none.body.data.cost.status, none.body.data.lines[0].allocatedCost], ["fx_missing", null]);
    for (const rate of ["5.4", "5.500000"]) {
      const put = await call(baseUrl, "PUT", "/fx-rates/2026-10", { body: { currencyFrom: "USD", currencyTo: "BRL", rate } });
      assert.equal(put.status, 200, put.text);
    }
    const listed = await call(baseUrl, "GET", "/fx-rates?from=2026-10&to=2026-10");
    assert.equal(listed.status, 200);
    assert.deepEqual(
      [listed.body.data[0].rate, listed.body.data[0].version, listed.body.data[0].history.map((h: Json) => [h.rate, h.version])],
      ["5.500000", 2, [["5.500000", 2], ["5.400000", 1]]],
    );
    const view = await call(baseUrl, "GET", "/overview?period=2026-10&groupBy=tenant");
    assert.deepEqual(
      [view.body.data.cost.status, view.body.data.cost.fxRate, view.body.data.cost.fxRateVersion, view.body.data.lines[0].allocatedCost],
      ["ok", "5.500000", 2, "550.00"],
    );
  });
});

test("T-FX-6b · câmbio pela rota: 422 rate_invalid, 400 invalid_month, 422 currency_pair_unsupported, 422 fx_month_in_future, 400 invalid_json", async () => {
  freshRuntime(NOV_2);
  await withApi(async (baseUrl) => {
    for (const [path, body, status, reason] of [
      ["/fx-rates/2026-10", { currencyFrom: "USD", rate: "abc" }, 422, "rate_invalid"],
      ["/fx-rates/2026-10", { currencyFrom: "USD", rate: 5.4 }, 422, "rate_invalid"],
      ["/fx-rates/2026-13", { currencyFrom: "USD", rate: "5.4" }, 400, "invalid_month"],
      ["/fx-rates/2026-10", { currencyFrom: "USD", currencyTo: "USD", rate: "5.4" }, 422, "currency_pair_unsupported"],
      ["/fx-rates/2026-12", { currencyFrom: "USD", rate: "5.4" }, 422, "fx_month_in_future"],
    ] as const) {
      const response = await call(baseUrl, "PUT", path, { body });
      assert.deepEqual([response.status, response.body.error?.reason], [status, reason], `${path} ${JSON.stringify(body)}`);
    }
    const malformed = await call(baseUrl, "PUT", "/fx-rates/2026-10", { raw: "{ not json" });
    assert.deepEqual([malformed.status, malformed.body.error?.reason], [400, "invalid_json"]);
    assert.equal((await call(baseUrl, "GET", "/fx-rates?from=2026-10&to=2026-10")).body.data.length, 0, "nada gravado");
    const range = await call(baseUrl, "GET", "/fx-rates?from=2024-01&to=2026-10");
    assert.deepEqual([range.status, range.body.error?.reason], [422, "range_too_large"]);
  });
});

// ------------------------------------------------------------------------------------------------ R4–R10 (grupos)

test("T-GRP-HTTP · os grupos pela rota: criar, nome repetido, membros, histórico, visão por grupo, renomear, excluir com membro", async () => {
  freshRuntime(NOV_2);
  seedTenant("a");
  seedTenant("b");
  seedTenant("p", "platform");
  await seedAllocation("2026-11", "BRL", [["a", 30], ["b", 20]]);
  setOverviewRuntimeOverridesForTests({ clock: () => DEC_2 });
  await withApi(async (baseUrl) => {
    const created = await call(baseUrl, "POST", "/economic-groups", { body: { name: "Grupo 1", notes: "nota sintética" } });
    assert.equal(created.status, 201, created.text);
    const id = created.body.data.id as string;
    assert.deepEqual([created.body.data.name, created.body.data.memberCount], ["Grupo 1", 0]);
    const twin = await call(baseUrl, "POST", "/economic-groups", { body: { name: "  grupo 1 " } });
    assert.deepEqual([twin.status, twin.body.error.reason], [409, "group_name_exists"]);
    assert.deepEqual((await call(baseUrl, "POST", "/economic-groups", { body: { name: "" } })).body.error.reason, "name_invalid");

    const notArray = await call(baseUrl, "PUT", `/economic-groups/${id}/members`, { body: { tenantIds: "a" } });
    assert.deepEqual([notArray.status, notArray.body.error.reason], [400, "invalid_tenant_ids"]);
    const platformIn = await call(baseUrl, "PUT", `/economic-groups/${id}/members`, { body: { tenantIds: ["p"] } });
    assert.deepEqual([platformIn.status, platformIn.body.error.reason], [422, "platform_organization"]);
    const unknown = await call(baseUrl, "PUT", `/economic-groups/${id}/members`, { body: { tenantIds: ["zz"] } });
    assert.deepEqual([unknown.status, unknown.body.error.reason], [404, "tenant_not_found"]);
    const past = await call(baseUrl, "PUT", `/economic-groups/${id}/members`, { body: { tenantIds: ["a"], validFrom: "2026-11-01" } });
    assert.deepEqual([past.status, past.body.error.reason], [422, "membership_retroactive"]);

    const put = await call(baseUrl, "PUT", `/economic-groups/${id}/members`, { body: { tenantIds: ["a", "b"] } });
    assert.equal(put.status, 200, put.text);
    assert.deepEqual(
      put.body.data.members.map((m: Json) => [m.tenantId, m.tenantName, m.validFrom, m.scheduled]),
      [["a", "Organização A", "2026-12-02", false], ["b", "Organização B", "2026-12-02", false]],
    );
    const detail = await call(baseUrl, "GET", `/economic-groups/${id}`);
    assert.equal(detail.body.data.memberCount, 2);
    const history = await call(baseUrl, "GET", `/economic-groups/${id}/history`);
    assert.deepEqual(history.body.data.map((m: Json) => m.tenantId), ["a", "b"]);
    const listed = await call(baseUrl, "GET", "/economic-groups");
    assert.deepEqual(listed.body.data.map((g: Json) => [g.name, g.memberCount]), [["Grupo 1", 2]]);

    const blocked = await call(baseUrl, "DELETE", `/economic-groups/${id}`);
    assert.deepEqual([blocked.status, blocked.body.error.reason], [422, "group_has_members"]);
    const renamed = await call(baseUrl, "PATCH", `/economic-groups/${id}`, { body: { name: "Grupo 2" } });
    assert.deepEqual([renamed.status, renamed.body.data.name], [200, "Grupo 2"]);
    const missing = await call(baseUrl, "GET", "/economic-groups/00000000-0000-4000-8000-0000000000ff");
    assert.deepEqual([missing.status, missing.body.error.reason], [404, "group_not_found"]);
  });
});

test("T-GRP-HTTP-2 · o 422 tenant_in_another_group leva a lista (tenantIds) no corpo, como o contrato; os outros erros seguem com 3 campos (J-566, C3-1)", async () => {
  freshRuntime(NOV_2);
  seedTenant("a");
  seedTenant("b");
  seedTenant("c");
  await withApi(async (baseUrl) => {
    const g1 = (await call(baseUrl, "POST", "/economic-groups", { body: { name: "Grupo 1" } })).body.data.id as string;
    const g2 = (await call(baseUrl, "POST", "/economic-groups", { body: { name: "Grupo 2" } })).body.data.id as string;
    const inG1 = await call(baseUrl, "PUT", `/economic-groups/${g1}/members`, { body: { tenantIds: ["a", "c"] } });
    assert.equal(inG1.status, 200, inG1.text);

    // B está livre; A e C estão no Grupo 1. A lista é a de quem está em outro grupo, na ordem do pedido.
    const refused = await call(baseUrl, "PUT", `/economic-groups/${g2}/members`, { body: { tenantIds: ["c", "b", "a"] } });
    assert.equal(refused.status, 422, refused.text);
    assert.deepEqual(refused.body, {
      error: {
        code: "SUBSCRIPTION_BILLING_INVALID",
        reason: "tenant_in_another_group",
        message: "Uma ou mais organizações já estão em outro grupo nesse período.",
        tenantIds: ["c", "a"],
      },
    });
    const one = await call(baseUrl, "PUT", `/economic-groups/${g2}/members`, { body: { tenantIds: ["a"] } });
    assert.deepEqual([one.status, one.body.error.reason, one.body.error.tenantIds], [422, "tenant_in_another_group", ["a"]]);
    const history = await call(baseUrl, "GET", `/economic-groups/${g2}/history`);
    assert.deepEqual(history.body.data, [], "a troca recusada não gravou vínculo");

    // Só o 422 do contrato ganha o campo: os outros erros da mesma rota seguem com code, reason e message.
    const past = await call(baseUrl, "PUT", `/economic-groups/${g2}/members`, { body: { tenantIds: ["b"], validFrom: "2026-11-01" } });
    assert.equal(past.status, 422, past.text);
    assert.deepEqual(Object.keys(past.body.error).sort(), ["code", "message", "reason"]);
    assert.equal(past.body.error.reason, "membership_retroactive");
    const unknown = await call(baseUrl, "PUT", `/economic-groups/${g2}/members`, { body: { tenantIds: ["zz"] } });
    assert.deepEqual([unknown.status, Object.keys(unknown.body.error).sort()], [404, ["code", "message", "reason"]]);
  });
});

test("T-ACC-3 · a trilha do câmbio e dos grupos só leva as chaves da allowlist, e nunca o nome do grupo nem o da organização", async () => {
  freshRuntime(DEC_2);
  seedTenant("a");
  const audit = getMemoryOverviewPlatformAuditForTests();
  const groups = getMemoryOverviewEconomicGroupsForTests();
  await withApi(async (baseUrl) => {
    assert.equal((await call(baseUrl, "PUT", "/fx-rates/2026-11", { body: { currencyFrom: "USD", rate: "5.1" } })).status, 200);
    const created = await call(baseUrl, "POST", "/economic-groups", { body: { name: "Grupo Sintético Ômega", notes: "nota" } });
    const id = created.body.data.id as string;
    assert.equal((await call(baseUrl, "PATCH", `/economic-groups/${id}`, { body: { name: "Grupo Sintético Ípsilon" } })).status, 200);
    assert.equal((await call(baseUrl, "PUT", `/economic-groups/${id}/members`, { body: { tenantIds: ["a"] } })).status, 200);
    assert.equal((await call(baseUrl, "PUT", `/economic-groups/${id}/members`, { body: { tenantIds: [], validFrom: "2026-12-10" } })).status, 200);
    assert.equal((await call(baseUrl, "DELETE", `/economic-groups/${id}`)).status, 422);
  });
  const platformEntries = audit.list();
  const membershipEvents = groups.listAuditEvents();
  assert.deepEqual(
    platformEntries.map((entry) => entry.action),
    ["platform_fx_rate.recorded", "economic_group.created", "economic_group.updated"],
  );
  assert.deepEqual(membershipEvents.map((event) => [event.action, event.tenantId]), [
    ["economic_group.member_joined", "a"],
    ["economic_group.member_left", "a"],
  ]);
  const allowed = new Set<string>(OVERVIEW_TRAIL_KEYS);
  for (const metadata of [...platformEntries.map((entry) => entry.metadata ?? {}), ...membershipEvents.map((event) => event.metadata)]) {
    assert.deepEqual(Object.keys(metadata).filter((key) => !allowed.has(key)), [], JSON.stringify(metadata));
  }
  // O que tem de estar lá (controle positivo), e o que nunca pode estar.
  assert.deepEqual(platformEntries[0]!.metadata, { month: "2026-11", currency_from: "USD", currency_to: "BRL", rate: "5.100000", version: 1 });
  assert.deepEqual(platformEntries[1]!.metadata, { group_id: platformEntries[1]!.entityId });
  assert.deepEqual(membershipEvents[1]!.metadata, { group_id: membershipEvents[1]!.entityId, valid_from: "2026-12-10", valid_to: "2026-12-10" });
  const serialized = JSON.stringify({ platformEntries, membershipEvents });
  for (const name of ["Grupo Sintético Ômega", "Grupo Sintético Ípsilon", "Organização A", "nota"]) {
    assert.equal(serialized.includes(name), false, `a trilha leva "${name}"`);
  }
  assert.equal(/tenant_id/.test(JSON.stringify(membershipEvents.map((event) => event.metadata))), false, "tenant_id nunca entra na metadata");
});

// ------------------------------------------------------------------------------------------------ 500 de integridade

class OverlappingGroupsRepository implements EconomicGroupsRepository {
  private readonly groups = new Map<string, EconomicGroup>(
    ["g1", "g2"].map((id) => [
      id,
      { id, name: `Grupo ${id}`, notes: null, createdBy: null, updatedBy: null, createdAt: NOV_2, updatedAt: NOV_2, deletedAt: null },
    ]),
  );

  async listMembershipsOfTenants(tenantIds: readonly string[]): Promise<EconomicGroupMembership[]> {
    const rows: EconomicGroupMembership[] = [
      { id: "m1", tenantId: "c", groupId: "g1", validFrom: "2026-11-01", validTo: null, createdBy: null, closedBy: null, createdAt: NOV_2, updatedAt: NOV_2 },
      { id: "m2", tenantId: "c", groupId: "g2", validFrom: "2026-11-15", validTo: null, createdBy: null, closedBy: null, createdAt: NOV_2, updatedAt: NOV_2 },
    ];
    return rows.filter((row) => tenantIds.includes(row.tenantId));
  }

  async getGroup(id: string): Promise<EconomicGroup | null> {
    return this.groups.get(id) ?? null;
  }

  async listGroups(): Promise<EconomicGroup[]> {
    return [...this.groups.values()];
  }

  async createGroup(): Promise<EconomicGroup> {
    throw new Error("não usado");
  }

  async updateGroup(): Promise<EconomicGroup | null> {
    throw new Error("não usado");
  }

  async softDeleteGroup(): Promise<EconomicGroup | null> {
    throw new Error("não usado");
  }

  async applyMembershipChanges(): Promise<MembershipChangesResult> {
    throw new Error("não usado");
  }
}

test("T-GRP-12 (HTTP) · dois grupos da mesma organização no último dia de 2026-11 → 500 membership_integrity_violation, sem número", async () => {
  freshRuntime(DEC_2);
  seedTenant("c");
  seedTenant("d");
  await seedAllocation("2026-11", "BRL", [["c", 10], ["d", 5]]);
  const { logger, lines } = capturingLogger();
  setOverviewRuntimeOverridesForTests({ clock: () => DEC_2, groupsRepository: new OverlappingGroupsRepository(), logger });
  await withApi(async (baseUrl) => {
    for (const groupBy of ["group", "tenant", "global"]) {
      const response = await call(baseUrl, "GET", `/overview?period=2026-11&groupBy=${groupBy}`);
      assert.deepEqual([response.status, response.body.error?.reason], [500, "membership_integrity_violation"], groupBy);
      assert.equal("data" in response.body, false, "nenhum número parcial");
      assert.equal(response.text.includes('"c"') || /tenantId/.test(response.text), false, "a organização não vai no corpo");
    }
  });
  assert.equal(lines.length, 3);
  assert.deepEqual(lines[0]!.obj, { reason: "membership_integrity_violation", period: "2026-11", tenantId: "c" });
});

test("T-SUB-12 · demonstrativo gravado sem retrato → 500 statement_integrity_violation; o motivo, o mês e a organização só no log", async () => {
  freshRuntime(NOV_2);
  seedTenant("a");
  seedTenant("b");
  await seedAllocation("2026-10", "BRL", [["a", 10], ["b", 5]]);
  await seedClosedStatement("a", "2026-10", 50_000);
  await seedStatementRaw("b", "2026-10", { status: "closed", totalCents: 20_000, snapshot: { latest: null, history: [] } });
  const { logger, lines } = capturingLogger();
  setOverviewRuntimeOverridesForTests({ clock: () => NOV_2, logger });
  await withApi(async (baseUrl) => {
    const response = await call(baseUrl, "GET", "/overview?period=2026-10&groupBy=tenant");
    assert.deepEqual([response.status, response.body.error?.reason], [500, "statement_integrity_violation"], response.text);
    assert.equal("data" in response.body, false, "nenhum número parcial");
    assert.equal(/tenantId/.test(response.text), false, "o corpo não leva tenantId");
    assert.equal(response.text.includes('"b"'), false, "o corpo não leva a organização");
  });
  assert.deepEqual(lines.map((line) => line.obj), [{ reason: "statement_snapshot_missing", period: "2026-10", tenantId: "b" }]);
});
