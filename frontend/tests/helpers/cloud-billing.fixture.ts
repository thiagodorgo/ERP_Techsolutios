// B-ASS-10b (T5) — o fixture dos testes da tela de custo e margem. Os payloads têm a FORMA do servidor (os DTOs do
// B-ASS-09: `overview` por organização, grupo e global; câmbio; grupos; importações; rateios); o `CloudBillingData` é
// montado pelos mapeadores REAIS do adapter, então o dinheiro já chega marcado como chegaria da rede. Cada valor de
// dinheiro do mês da tela é ÚNICO, para o T-UI-1 (b) saber de que campo veio cada texto.

import { mapAllocationRun, mapGlobalOverview, mapGroupOverview, mapTenantOverview } from "../../src/modules/platform/cloud-billing/cloud-billing.adapter";
import { buildCloudBillingView, INITIAL_UI, type CloudBillingUi, type CloudBillingView } from "../../src/modules/platform/cloud-billing/cloud-billing.state";
import { monthsEndingAt, periodForMonth } from "../../src/modules/platform/cloud-billing/cloud-billing.service";
import type { BackgroundRead, CloudBillingData, CloudBillingSeries, EconomicGroupDetail, GlobalOverview, TenantOverview } from "../../src/modules/platform/cloud-billing/cloud-billing.types";

export const MONTH = "2026-10";
export const CURRENT_MONTH = "2026-11";
export const TODAY = "2026-11-14";

type Json = Record<string, unknown>;

export const COST_OK: Json = {
  status: "ok",
  coverage: "imported",
  runId: "run-out",
  importId: "imp-out",
  currencyOriginal: "USD",
  fxRate: "5.412300",
  fxRateVersion: 2,
  warnings: [],
  sources: { runs: 1, importIds: ["imp-out"], usedImportId: "imp-out" },
};

const line = (over: Json): Json => ({
  tenantId: "",
  tenantName: "",
  groupId: null,
  groupName: null,
  subscriptionAmount: null,
  subscriptionBasis: "before_credits",
  statementTotal: null,
  creditsApplied: null,
  subscriptionSource: "statement",
  subscriptionSkipReason: null,
  estimate: false,
  allocatedCost: null,
  allocatedCostOriginal: null,
  margin: null,
  marginPct: null,
  alert: "none",
  ...over,
});

export function tenantLines(): Json[] {
  return [
    line({ tenantId: "t1", tenantName: "Guincho Exemplo Ltda", subscriptionAmount: "1990.00", statementTotal: "1990.01", creditsApplied: "0.11", allocatedCost: "2180.62", allocatedCostOriginal: "402.900000", margin: "-190.62", marginPct: "-9.58", alert: "critical" }),
    line({ tenantId: "t2", tenantName: "Frota Vale Transportes", groupId: "g1", groupName: "Grupo Vale", subscriptionAmount: "3290.00", statementTotal: "3001.00", creditsApplied: "289.00", allocatedCost: "2695.87", allocatedCostOriginal: "498.100000", margin: "594.13", marginPct: "18.06", alert: "warning" }),
    line({ tenantId: "t3", tenantName: "Vale Taubaté", groupId: "g1", groupName: "Grupo Vale", subscriptionSource: "none", subscriptionSkipReason: "no_subscription", allocatedCost: "332.32", allocatedCostOriginal: "61.400000", alert: "no_subscription" }),
    line({ tenantId: "t4", tenantName: "Pátio Central Logística", subscriptionAmount: "2490.00", statementTotal: "2490.02", creditsApplied: "0.12", subscriptionSource: "statement_reopened", estimate: true, allocatedCost: "550.70", allocatedCostOriginal: "101.750000", margin: "1939.30", marginPct: "77.88", alert: "none" }),
    line({ tenantId: "t5", tenantName: "Assistência 24h Paulista", subscriptionSource: "none", subscriptionSkipReason: "plan_without_price", allocatedCost: "184.56", allocatedCostOriginal: "34.100000", alert: "no_subscription" }),
  ];
}

export function tenantPayload(month = MONTH, cost: Json = COST_OK, lines: Json[] = tenantLines(), totals: Json = { subscriptionAmount: "7770.00", allocatedCost: "5944.07", margin: "2342.81", marginPct: "30.15" }): Json {
  return { period: month, groupBy: "tenant", currency: "BRL", generatedAt: "2026-11-04T12:20:00.000Z", cost, lines, totals };
}

export function groupPayload(month = MONTH, cost: Json = COST_OK): Json {
  return {
    period: month,
    groupBy: "group",
    currency: "BRL",
    generatedAt: "2026-11-04T12:20:00.000Z",
    cost,
    lines: [
      { groupId: "g1", groupName: "Grupo Vale", memberCount: 2, membersWithoutSubscription: 1, subscriptionAmount: "3290.10", creditsApplied: "289.10", allocatedCost: "3028.19", margin: "261.91", marginPct: "7.96", alert: "warning", estimate: false },
      { groupId: null, groupName: null, memberCount: 3, membersWithoutSubscription: 1, subscriptionAmount: "4480.20", creditsApplied: "0.13", allocatedCost: "2915.88", margin: "1564.32", marginPct: "34.92", alert: null, estimate: true },
    ],
    totals: { subscriptionAmount: "7770.30", allocatedCost: "5944.27", margin: "1826.03", marginPct: "23.50" },
  };
}

export function globalJson(over: Json = {}): Json {
  return {
    subscriptionTotal: "7770.11",
    tenantsCost: "5944.17",
    platformOwnCost: "2091.31",
    unallocatedOther: "223.37",
    unallocatedByReason: [
      { reason: "no_allocation_rule", cost: "152.37" },
      { reason: "unknown_tenant_tag", cost: "71.03" },
    ],
    roundingResidualCost: "0.02",
    conversionResidualCost: "0.04",
    totalCost: "8258.91",
    margin: "-488.80",
    marginPct: "-6.29",
    alert: "critical",
    original: { currency: "USD", tenantsCost: "1101.000000", platformOwnCost: "386.400000", unallocatedOther: "41.250000", roundingResidualCost: "0.003812", totalImportedCost: "1528.653812" },
    ...over,
  };
}

export function globalPayload(month = MONTH, cost: Json = COST_OK, global: Json = globalJson()): Json {
  return { period: month, groupBy: "global", currency: "BRL", generatedAt: "2026-11-04T12:20:00.000Z", cost, global };
}

/** O global de um mês anterior: valores próprios (diferentes dos do mês da tela). */
export function previousGlobalPayload(month: string, index: number): Json {
  const cents = String(10 + index).padStart(2, "0");
  return globalPayload(month, { ...COST_OK, runId: `run-${month}`, importId: `imp-${month}`, fxRate: "5.360100", fxRateVersion: 1 }, globalJson({ subscriptionTotal: `7400.${cents}`, totalCost: `6100.${cents}`, margin: `1300.${cents}`, marginPct: `17.${cents}`, alert: "none" }));
}

export const FX_PAYLOAD: Json[] = [
  { month: "2026-09", currencyFrom: "USD", currencyTo: "BRL", rate: "5.360100", version: 1, createdAt: "2026-10-05T12:00:00.000Z", history: [{ rate: "5.360100", version: 1, createdAt: "2026-10-05T12:00:00.000Z" }] },
  {
    month: MONTH,
    currencyFrom: "USD",
    currencyTo: "BRL",
    rate: "5.412300",
    version: 2,
    createdAt: "2026-11-05T12:00:00.000Z",
    history: [
      { rate: "5.400000", version: 1, createdAt: "2026-11-04T12:00:00.000Z" },
      { rate: "5.412300", version: 2, createdAt: "2026-11-05T12:00:00.000Z" },
    ],
  },
];

export const GROUPS_PAYLOAD: Json[] = [
  { id: "g1", name: "Grupo Vale", notes: null, memberCount: 2, createdAt: "2026-06-01T12:00:00.000Z", updatedAt: "2026-06-01T12:00:00.000Z" },
  { id: "g2", name: "Grupo Vazio", notes: null, memberCount: 0, createdAt: "2026-06-01T12:00:00.000Z", updatedAt: "2026-06-01T12:00:00.000Z" },
];

export const GROUP_DETAILS: Readonly<Record<string, Json>> = {
  g1: {
    ...GROUPS_PAYLOAD[0],
    members: [
      { tenantId: "t2", tenantName: "Frota Vale Transportes", validFrom: "2026-06-01", validTo: null, scheduled: false },
      { tenantId: "t3", tenantName: "Vale Taubaté", validFrom: "2026-06-01", validTo: null, scheduled: false },
      { tenantId: "t9", tenantName: "Reboque Rápido Norte", validFrom: "2026-12-01", validTo: null, scheduled: true },
    ],
  },
  g2: { ...GROUPS_PAYLOAD[1], members: [] },
};

export const IMPORTS_PAYLOAD: Json[] = [
  { id: "imp-out", provider: "aws", sourceType: "manual_csv", status: "completed", periodStart: "2026-10-01T00:00:00.000Z", periodEnd: "2026-10-31T00:00:00.000Z", importedAt: "2026-11-04T12:12:00.000Z", rowCount: 3214, currency: "USD", metadata: { duplicateRowsSkipped: 0 }, createdAt: "2026-11-04T12:12:00.000Z" },
];

export const RUNS_PAYLOAD: Json[] = [
  { id: "run-out", provider: "aws", status: "completed", periodStart: "2026-10-01T00:00:00.000Z", periodEnd: "2026-10-31T00:00:00.000Z", startedAt: "2026-11-04T12:13:00.000Z", completedAt: "2026-11-04T12:13:30.000Z", createdAt: "2026-11-04T12:13:00.000Z", metadata: { importResolution: "latest_completed" } },
];

export type FixtureOptions = {
  readonly cost?: Json;
  readonly tenant?: Json;
  readonly group?: Json;
  readonly global?: Json;
  readonly fx?: Json[];
  readonly imports?: Json[] | null;
  readonly runs?: Json[];
};

/** O `CloudBillingData` do mês, montado pelos mapeadores reais do adapter. */
export function fixtureData(options: FixtureOptions = {}): CloudBillingData {
  const cost = options.cost ?? COST_OK;
  return {
    month: MONTH,
    period: periodForMonth(MONTH),
    source: "api",
    forbidden: false,
    stale: false,
    failure: null,
    tenant: mapTenantOverview(options.tenant ?? tenantPayload(MONTH, cost)),
    group: mapGroupOverview(options.group ?? groupPayload(MONTH, cost)),
    global: mapGlobalOverview(options.global ?? globalPayload(MONTH, cost)),
    fx: (options.fx ?? FX_PAYLOAD).map((item) => ({
      month: String(item.month),
      currencyFrom: String(item.currencyFrom),
      rate: item.rate as never,
      version: Number(item.version),
      createdAt: String(item.createdAt),
      history: (item.history as Json[]).map((version) => ({ rate: version.rate as never, version: Number(version.version), createdAt: String(version.createdAt) })),
    })),
    groups: GROUPS_PAYLOAD.map((group) => ({ id: String(group.id), name: String(group.name), notes: null, memberCount: Number(group.memberCount) })),
    imports:
      options.imports === null
        ? null
        : (options.imports ?? IMPORTS_PAYLOAD).map((item) => ({
            id: String(item.id),
            status: item.status as "completed",
            periodMonth: String(item.periodStart).slice(0, 7),
            importedAt: String(item.importedAt),
            createdAt: String(item.createdAt),
            rowCount: Number(item.rowCount),
            currency: String(item.currency),
            duplicateRowsSkipped: 0,
            errorMessage: null,
          })),
    runs: (options.runs ?? RUNS_PAYLOAD).map((run) => mapAllocationRun(run)),
  };
}

/** A série dos 5 meses anteriores, já carregada (cada mês com valores próprios). */
export function fixtureSeries(state: "ok" | "loading" | "error" = "ok", failed: readonly string[] = []): CloudBillingSeries {
  const months = monthsEndingAt(MONTH, 6);
  const global: Record<string, BackgroundRead<GlobalOverview>> = {};
  const tenant: Record<string, BackgroundRead<TenantOverview>> = {};
  months.slice(0, 5).forEach((month, index) => {
    if (state !== "ok" || failed.includes(month)) {
      global[month] = state === "loading" ? { state: "loading" } : { state: "error" };
      tenant[month] = state === "loading" ? { state: "loading" } : { state: "error" };
      return;
    }
    global[month] = { state: "ok", value: mapGlobalOverview(previousGlobalPayload(month, index)) };
    tenant[month] = { state: "ok", value: mapTenantOverview(tenantPayload(month, { ...COST_OK, runId: `run-${month}` }, tenantLines().map((item) => ({ ...item, allocatedCost: null, margin: null, marginPct: null, allocatedCostOriginal: null })), { subscriptionAmount: null, allocatedCost: null, margin: null, marginPct: null })) };
  });
  return { months, global, tenant };
}

export function fixtureGroupDetails(): Readonly<Record<string, BackgroundRead<EconomicGroupDetail>>> {
  const out: Record<string, BackgroundRead<EconomicGroupDetail>> = {};
  for (const [id, detail] of Object.entries(GROUP_DETAILS)) {
    out[id] = {
      state: "ok",
      value: {
        id,
        name: String(detail.name),
        notes: null,
        memberCount: Number(detail.memberCount),
        members: (detail.members as Json[]).map((member) => ({ tenantId: String(member.tenantId), tenantName: String(member.tenantName), validFrom: String(member.validFrom), validTo: (member.validTo as string | null) ?? null, scheduled: member.scheduled === true })),
      },
    };
  }
  return out;
}

export function fixtureModel(ui: CloudBillingUi = INITIAL_UI, options: FixtureOptions = {}, data: CloudBillingData = fixtureData(options)): CloudBillingView {
  return buildCloudBillingView({ data, series: fixtureSeries(), groupDetails: fixtureGroupDetails(), ui, currentMonth: CURRENT_MONTH, today: TODAY });
}

/** Todo texto decimal do modelo (dinheiro, percentual e taxa), para o T-UI-1 (c). */
export function decimalsOf(value: unknown, out = new Set<string>()): Set<string> {
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) out.add(value);
  else if (Array.isArray(value)) for (const item of value) decimalsOf(item, out);
  else if (value && typeof value === "object") for (const item of Object.values(value)) decimalsOf(item, out);
  return out;
}
