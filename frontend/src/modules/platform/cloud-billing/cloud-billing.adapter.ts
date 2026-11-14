import { apiRequest } from "../../../services/api/client";
import { asMoney, asPct, asRate, originalAmountOf } from "./cloud-billing.money";
import {
  ALLOCATION_RUN_STATUSES,
  COST_STATUSES,
  OVERVIEW_ALERTS,
  OVERVIEW_WARNINGS,
  SUBSCRIPTION_SOURCES,
  type AlertKind,
  type CloudAllocationRun,
  type CloudBillingPeriod,
  type CloudCostImport,
  type EconomicGroup,
  type EconomicGroupDetail,
  type FxMonth,
  type FxPutResult,
  type FxRateVersion,
  type GlobalJson,
  type GlobalOverview,
  type GroupLineJson,
  type GroupMember,
  type GroupOverview,
  type OverviewCostJson,
  type OverviewGroupBy,
  type SubscriptionSkipReason,
  type TenantAllocationLine,
  type TenantLineJson,
  type TenantOverview,
  type TotalsJson,
} from "./cloud-billing.types";

// B-ASS-10b (T5) — leituras e TODAS as requisições de escrita da tela de custo e margem (plano v2 §6.1, §6.3, §6.4).
// Toda leitura passa `{ method: "GET" }` LITERAL ao `apiRequest`: pelo enunciado do T44 (Emenda 1, A3-r2), chamada sem
// esse literal conta como escrita. O dinheiro é marcado AQUI, na entrada (`asMoney`/`asPct`/`asRate`): número, vazio e
// lixo viram `null` ("—"), nunca zero. Nada aqui soma, subtrai nem converte valor para exibir.

type ApiResponse<T> = { readonly data: T };
type Json = Record<string, unknown>;

function readApi<T>(path: string): Promise<T> {
  return apiRequest<ApiResponse<T>>(path, { method: "GET" }).then((response) => response.data);
}

const enc = encodeURIComponent;

// ---- leituras -------------------------------------------------------------------------------------------------------
export function getTenantOverviewFromApi(month: string): Promise<TenantOverview> {
  return readApi<Json>(overviewPath(month, "tenant")).then(mapTenantOverview);
}
export function getGroupOverviewFromApi(month: string): Promise<GroupOverview> {
  return readApi<Json>(overviewPath(month, "group")).then(mapGroupOverview);
}
export function getGlobalOverviewFromApi(month: string): Promise<GlobalOverview> {
  return readApi<Json>(overviewPath(month, "global")).then(mapGlobalOverview);
}
export function listFxRatesFromApi(from: string, to: string): Promise<FxMonth[]> {
  return readApi<unknown>(`/platform/billing/fx-rates?${new URLSearchParams({ from, to }).toString()}`).then((data) => readArray(data).map(mapFxMonth).filter((item) => item.month));
}
export function listEconomicGroupsFromApi(): Promise<EconomicGroup[]> {
  return readApi<unknown>("/platform/billing/economic-groups").then((data) => readArray(data).map(mapGroup).filter((group) => group.id));
}
export function getEconomicGroupFromApi(groupId: string): Promise<EconomicGroupDetail> {
  return readApi<Json>(`/platform/billing/economic-groups/${enc(groupId)}`).then(mapGroupDetail);
}
export function getEconomicGroupHistoryFromApi(groupId: string): Promise<GroupMember[]> {
  return readApi<unknown>(`/platform/billing/economic-groups/${enc(groupId)}/history`).then((data) => readArray(data).map(mapMember).filter((member) => member.tenantId));
}
export function listCloudCostImportsFromApi(period: CloudBillingPeriod): Promise<CloudCostImport[]> {
  return readApi<unknown>(withPeriod("/platform/cloud-costs/imports", period)).then((data) => readArray(data).map(mapCostImport).filter((item) => item.id));
}
export function listCloudAllocationRunsFromApi(period?: CloudBillingPeriod): Promise<CloudAllocationRun[]> {
  const path = period ? withPeriod("/platform/cloud-cost-allocations/runs", period) : "/platform/cloud-cost-allocations/runs";
  return readApi<unknown>(path).then((data) => readArray(data).map(mapAllocationRun).filter((run) => run.id));
}
export function listTenantAllocationsFromApi(runId: string, tenantId: string): Promise<TenantAllocationLine[]> {
  return readApi<unknown>(`/platform/cloud-cost-allocations/runs/${enc(runId)}/tenant-allocations?${new URLSearchParams({ tenantId }).toString()}`).then((data) =>
    readArray(data).map(mapTenantAllocation).filter((line) => line.serviceCode),
  );
}

// ---- escritas (o T44 só aceita que sejam alcançadas de fora do módulo pela página montada no App.tsx) --------------
export function importCloudCostsFromApi(csv: string): Promise<CloudCostImport> {
  return apiRequest<ApiResponse<Json>>("/platform/cloud-costs/imports/manual-csv", {
    method: "POST",
    body: { csv, metadata: { source: "platform-cloud-billing" } },
  }).then((response) => mapCostImport(response.data));
}

export function runCloudAllocationFromApi(period: CloudBillingPeriod): Promise<CloudAllocationRun> {
  return apiRequest<ApiResponse<Json>>("/platform/cloud-cost-allocations/runs", {
    method: "POST",
    body: { periodStart: period.start, periodEnd: period.end },
  }).then((response) => mapAllocationRun(response.data));
}

export function putFxRateFromApi(month: string, rate: string): Promise<FxPutResult> {
  return apiRequest<ApiResponse<Json>>(`/platform/billing/fx-rates/${enc(month)}`, {
    method: "PUT",
    body: { currencyFrom: "USD", rate },
  }).then((response) => mapFxPut(response.data));
}

export function createEconomicGroupFromApi(input: { readonly name: string; readonly notes: string | null }): Promise<EconomicGroup> {
  return apiRequest<ApiResponse<Json>>("/platform/billing/economic-groups", {
    method: "POST",
    body: { name: input.name, notes: input.notes },
  }).then((response) => mapGroup(response.data));
}

export function updateEconomicGroupFromApi(groupId: string, input: { readonly name?: string; readonly notes?: string | null }): Promise<EconomicGroup> {
  return apiRequest<ApiResponse<Json>>(`/platform/billing/economic-groups/${enc(groupId)}`, {
    method: "PATCH",
    body: { ...input },
  }).then((response) => mapGroup(response.data));
}

export function deleteEconomicGroupFromApi(groupId: string): Promise<EconomicGroup> {
  return apiRequest<ApiResponse<Json>>(`/platform/billing/economic-groups/${enc(groupId)}`, {
    method: "DELETE",
  }).then((response) => mapGroup(response.data));
}

export function putEconomicGroupMembersFromApi(groupId: string, body: { readonly tenantIds: readonly string[]; readonly validFrom: string }): Promise<EconomicGroupDetail> {
  return apiRequest<ApiResponse<Json>>(`/platform/billing/economic-groups/${enc(groupId)}/members`, {
    method: "PUT",
    body: { tenantIds: [...body.tenantIds], validFrom: body.validFrom },
  }).then((response) => mapGroupDetail(response.data));
}

// ---- mapeamento (o dinheiro é marcado aqui) ------------------------------------------------------------------------
function overviewPath(month: string, groupBy: OverviewGroupBy): string {
  return `/platform/billing/overview?${new URLSearchParams({ period: month, groupBy }).toString()}`;
}

function withPeriod(path: string, period: CloudBillingPeriod): string {
  return `${path}?${new URLSearchParams({ periodStart: period.start, periodEnd: period.end }).toString()}`;
}

function mapCost(data: unknown): OverviewCostJson {
  const cost = isRecord(data) ? data : {};
  const sources = isRecord(cost.sources) ? cost.sources : {};
  return {
    status: readEnum(cost.status, COST_STATUSES, "no_run"),
    coverage: readString(cost.coverage) ?? "",
    runId: readString(cost.runId) ?? null,
    importId: readString(cost.importId) ?? null,
    currencyOriginal: readString(cost.currencyOriginal) ?? null,
    fxRate: asRate(cost.fxRate),
    fxRateVersion: readInteger(cost.fxRateVersion),
    warnings: readStringArray(cost.warnings).filter((warning): warning is (typeof OVERVIEW_WARNINGS)[number] => (OVERVIEW_WARNINGS as readonly string[]).includes(warning)),
    sources: {
      runs: readInteger(sources.runs) ?? 0,
      importIds: readStringArray(sources.importIds),
      usedImportId: readString(sources.usedImportId) ?? null,
    },
  };
}

function base(data: Json) {
  return { period: readString(data.period) ?? "", generatedAt: readString(data.generatedAt) ?? "", cost: mapCost(data.cost) };
}

export function mapTenantOverview(data: Json): TenantOverview {
  return { ...base(data), lines: readArray(data.lines).map(mapTenantLine).filter((line) => line.tenantId), totals: mapTotals(data.totals) };
}
export function mapGroupOverview(data: Json): GroupOverview {
  return { ...base(data), lines: readArray(data.lines).map(mapGroupLine), totals: mapTotals(data.totals) };
}
export function mapGlobalOverview(data: Json): GlobalOverview {
  return { ...base(data), global: mapGlobal(data.global) };
}

function mapTenantLine(line: Json): TenantLineJson {
  return {
    tenantId: readString(line.tenantId) ?? "",
    tenantName: readString(line.tenantName) ?? "Organização sem nome",
    groupId: readString(line.groupId) ?? null,
    groupName: readString(line.groupName) ?? null,
    subscriptionAmount: asMoney(line.subscriptionAmount),
    subscriptionBasis: "before_credits",
    statementTotal: asMoney(line.statementTotal),
    creditsApplied: asMoney(line.creditsApplied),
    subscriptionSource: readEnum(line.subscriptionSource, SUBSCRIPTION_SOURCES, "none"),
    subscriptionSkipReason: readSkipReason(line.subscriptionSkipReason),
    estimate: line.estimate === true,
    allocatedCost: asMoney(line.allocatedCost),
    allocatedCostOriginal: asMoney(line.allocatedCostOriginal),
    margin: asMoney(line.margin),
    marginPct: asPct(line.marginPct),
    alert: readAlert(line.alert),
  };
}

function mapGroupLine(line: Json): GroupLineJson {
  return {
    groupId: readString(line.groupId) ?? null,
    groupName: readString(line.groupName) ?? null,
    memberCount: readInteger(line.memberCount) ?? 0,
    membersWithoutSubscription: readInteger(line.membersWithoutSubscription) ?? 0,
    subscriptionAmount: asMoney(line.subscriptionAmount),
    creditsApplied: asMoney(line.creditsApplied),
    allocatedCost: asMoney(line.allocatedCost),
    margin: asMoney(line.margin),
    marginPct: asPct(line.marginPct),
    alert: line.alert === null || line.alert === undefined ? null : readAlert(line.alert),
    estimate: line.estimate === true,
  };
}

function mapTotals(data: unknown): TotalsJson {
  const totals = isRecord(data) ? data : {};
  return { subscriptionAmount: asMoney(totals.subscriptionAmount), allocatedCost: asMoney(totals.allocatedCost), margin: asMoney(totals.margin), marginPct: asPct(totals.marginPct) };
}

function mapGlobal(data: unknown): GlobalJson {
  const global = isRecord(data) ? data : {};
  const original = isRecord(global.original) ? global.original : {};
  return {
    subscriptionTotal: asMoney(global.subscriptionTotal),
    tenantsCost: asMoney(global.tenantsCost),
    platformOwnCost: asMoney(global.platformOwnCost),
    unallocatedOther: asMoney(global.unallocatedOther),
    unallocatedByReason: readArray(global.unallocatedByReason).map((item) => ({ reason: readString(item.reason) ?? "unspecified", cost: asMoney(item.cost) })),
    roundingResidualCost: asMoney(global.roundingResidualCost),
    conversionResidualCost: asMoney(global.conversionResidualCost),
    totalCost: asMoney(global.totalCost),
    margin: asMoney(global.margin),
    marginPct: asPct(global.marginPct),
    alert: readAlert(global.alert),
    original: {
      currency: readString(original.currency) ?? null,
      tenantsCost: asMoney(original.tenantsCost),
      platformOwnCost: asMoney(original.platformOwnCost),
      unallocatedOther: asMoney(original.unallocatedOther),
      roundingResidualCost: asMoney(original.roundingResidualCost),
      totalImportedCost: asMoney(original.totalImportedCost),
    },
  };
}

function mapFxVersion(data: Json): FxRateVersion {
  return { rate: asRate(data.rate), version: readInteger(data.version) ?? 0, createdAt: readString(data.createdAt) ?? "" };
}

function mapFxMonth(data: Json): FxMonth {
  return {
    month: readString(data.month) ?? "",
    currencyFrom: readString(data.currencyFrom) ?? "",
    rate: asRate(data.rate),
    version: readInteger(data.version) ?? 0,
    createdAt: readString(data.createdAt) ?? "",
    history: readArray(data.history).map(mapFxVersion),
  };
}

function mapFxPut(data: Json): FxPutResult {
  const current = isRecord(data.current) ? data.current : {};
  return { current: { ...mapFxVersion(current), month: readString(current.month) ?? "" }, history: readArray(data.history).map(mapFxVersion) };
}

function mapGroup(data: Json): EconomicGroup {
  return { id: readString(data.id) ?? "", name: readString(data.name) ?? "", notes: readString(data.notes) ?? null, memberCount: readInteger(data.memberCount) ?? 0 };
}

function mapMember(data: Json): GroupMember {
  return {
    tenantId: readString(data.tenantId) ?? "",
    tenantName: readString(data.tenantName) ?? "Organização sem nome",
    validFrom: readString(data.validFrom) ?? "",
    validTo: readString(data.validTo) ?? null,
    scheduled: data.scheduled === true,
  };
}

function mapGroupDetail(data: Json): EconomicGroupDetail {
  return { ...mapGroup(data), members: readArray(data.members).map(mapMember).filter((member) => member.tenantId) };
}

function mapCostImport(data: Json): CloudCostImport {
  const metadata = isRecord(data.metadata) ? data.metadata : {};
  return {
    id: readString(data.id) ?? "",
    status: readEnum(data.status, ["pending", "processing", "completed", "failed"] as const, "pending"),
    periodMonth: readString(data.periodStart)?.slice(0, 7) ?? null,
    importedAt: readString(data.importedAt) ?? null,
    createdAt: readString(data.createdAt) ?? null,
    rowCount: readInteger(data.rowCount) ?? 0,
    currency: readString(data.currency) ?? null,
    duplicateRowsSkipped: readInteger(metadata.duplicateRowsSkipped),
    errorMessage: readString(data.errorMessage) ?? null,
  };
}

export function mapAllocationRun(data: Json): CloudAllocationRun {
  const periodStart = readString(data.periodStart) ?? "";
  return {
    id: readString(data.id) ?? "",
    status: readEnum(data.status, ALLOCATION_RUN_STATUSES, "unknown"),
    periodStart,
    periodMonth: periodStart.slice(0, 7),
    startedAt: readString(data.startedAt) ?? null,
    completedAt: readString(data.completedAt) ?? null,
    createdAt: readString(data.createdAt) ?? null,
    errorMessage: readString(data.errorMessage) ?? null,
    metadata: isRecord(data.metadata) ? { importResolution: data.metadata.importResolution } : null,
  };
}

function mapTenantAllocation(data: Json): TenantAllocationLine {
  return {
    serviceCode: readString(data.serviceCode) ?? "",
    costCategory: readString(data.costCategory) ?? null,
    allocatedCostOriginal: originalAmountOf(data.allocatedCost),
    currency: readString(data.currency) ?? null,
  };
}

function readAlert(value: unknown): AlertKind {
  return readEnum(value, OVERVIEW_ALERTS, "unknown");
}
function readSkipReason(value: unknown): SubscriptionSkipReason | null {
  return value === "no_subscription" || value === "plan_without_price" || value === "platform_organization" ? value : null;
}
function readArray(value: unknown): Json[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}
function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}
function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}
function readInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}
function readEnum<T extends string, F extends string>(value: unknown, allowed: readonly T[], fallback: F): T | F {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}
function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
