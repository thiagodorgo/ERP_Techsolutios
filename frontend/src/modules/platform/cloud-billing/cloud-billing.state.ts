// B-SAN3-06b A1 (revisão do PR 411) — o dinheiro exibido é sempre do período rotulado. Regra pura, fora do hook, para
// ser testável sem React (espelho de `../refresh-state.ts`). Uma resposta de um período que já não é o selecionado é
// descartada; a resposta do período novo nunca herda o dado do período anterior como "desatualizado"; e a tela trata
// dado de outro período como carregando, nunca o exibe sob o rótulo do mês selecionado. Nada aqui calcula valor.
//
// B-ASS-10b (T5) — o estado da tela (`modo`, `alvo`, `aberta`, `busca`) e o MODELO ÚNICO (`buildCloudBillingView`) que as
// 3 aparências (A · Fiel à referência, B · Analítica, C · Fechamento e grupos) recebem. O modelo só filtra, ordena (por
// `compareMoney`) e conta linhas: nenhum valor é somado, subtraído, multiplicado nem dividido (R-T5-DIN, L7). As regras
// de filtro e de ordem são as da maquete aprovada (`filtraOrg`, `linhasOrg`, `parcelas`, `aplicarAlvo`).

import { nextRefreshState } from "../refresh-state";
import { currentGroupOf, membershipIndex, scheduledEntries } from "./cloud-billing.groups";
import { reasonLabel } from "./cloud-billing.labels";
import { compareMoney, marginBandOf, type Money, type Pct, type Rate } from "./cloud-billing.money";
import { monthsEndingAt, periodForMonth, shiftMonth } from "./cloud-billing.service";
import {
  COST_VALID_STATUSES,
  type AlertKind,
  type BackgroundRead,
  type CloudAllocationRun,
  type CloudBillingData,
  type CloudBillingPeriod,
  type CloudBillingSeries,
  type CloudCostImport,
  type CostStatus,
  type EconomicGroup,
  type EconomicGroupDetail,
  type FxMonth,
  type GlobalJson,
  type GroupLineJson,
  type OverviewWarning,
  type TenantAllocationLine,
  type TenantLineJson,
  type TotalsJson,
} from "./cloud-billing.types";

export function isSamePeriod(left: CloudBillingPeriod, right: CloudBillingPeriod): boolean {
  return left.start === right.start && left.end === right.end;
}

export function isPeriodOfMonth(period: CloudBillingPeriod, month: string): boolean {
  try {
    return isSamePeriod(period, periodForMonth(month));
  } catch {
    return false;
  }
}

export function nextCloudBillingState(current: CloudBillingData, next: CloudBillingData, background: boolean, selected: CloudBillingPeriod): CloudBillingData {
  if (!isSamePeriod(next.period, selected)) return current;
  if (!isSamePeriod(current.period, next.period)) return { ...next, stale: false };
  return nextRefreshState(current, next, background);
}

// ---- o estado da tela ---------------------------------------------------------------------------------------------
export type ListMode = "tenant" | "group" | "global";
export type CloudBillingUi = {
  readonly modo: ListMode;
  /** O bloco clicado que filtra a lista (`custo`, `alert:critical`, `org:<id>`, `nr`, `faixa:neg`…), ou nenhum. */
  readonly alvo: string | null;
  /** A linha aberta (`t:<tenantId>`, `g:<groupId|sem>`, `p:<parcela>`); uma por vez. */
  readonly aberta: string | null;
  readonly busca: string;
};
export const INITIAL_UI: CloudBillingUi = { modo: "tenant", alvo: null, aberta: null, busca: "" };

const GLOBAL_TARGETS = new Set(["orgs", "plat", "nr", "res", "arr", "conv"]);
export function isGlobalTarget(key: string): boolean {
  return GLOBAL_TARGETS.has(key) || key.startsWith("nr:");
}

export const tenantRowId = (tenantId: string) => `t:${tenantId}`;
export const groupRowId = (groupId: string | null) => `g:${groupId ?? "sem"}`;
export const parcelRowId = (key: string) => `p:${key}`;

/** Clicar num bloco (`aplicarAlvo` da maquete). O mesmo bloco de novo tira o filtro. `mes:` é da página (troca o mês). */
export function selectTarget(ui: CloudBillingUi, key: string, parcels: readonly Parcel[] = []): CloudBillingUi {
  if (key.startsWith("grp:")) {
    const id = groupRowId(key.slice(4) === "sem" ? null : key.slice(4));
    const same = ui.modo === "group" && ui.aberta === id;
    return { modo: "group", alvo: null, busca: "", aberta: same ? null : id };
  }
  if (ui.alvo === key) return { ...ui, alvo: null, aberta: null };
  if (isGlobalTarget(key)) {
    const matching = parcels.filter((parcel) => parcelMatches(parcel, key));
    return { modo: "global", alvo: key, busca: "", aberta: matching.length === 1 ? parcelRowId(matching[0]!.key) : null };
  }
  return { modo: "tenant", alvo: key, busca: "", aberta: key.startsWith("org:") ? tenantRowId(key.slice(4)) : null };
}
export function clearTarget(ui: CloudBillingUi): CloudBillingUi {
  return { ...ui, alvo: null, aberta: null };
}
export function toggleRow(ui: CloudBillingUi, rowId: string): CloudBillingUi {
  return { ...ui, aberta: ui.aberta === rowId ? null : rowId };
}
export function setListMode(ui: CloudBillingUi, modo: ListMode): CloudBillingUi {
  return { ...ui, modo, alvo: null, aberta: null };
}
export function setSearch(ui: CloudBillingUi, busca: string): CloudBillingUi {
  return { ...ui, busca, aberta: null };
}

const TARGET_LABEL: Readonly<Record<string, string>> = {
  custo: "Com custo no mês",
  sub: "Com assinatura no mês",
  est: "Assinatura estimada",
  alerta: "Em alerta (crítico ou atenção)",
  semass: "Sem assinatura própria",
  margem: "Menor margem primeiro",
  "alert:critical": "Situação: crítico",
  "alert:warning": "Situação: atenção",
  "alert:none": "Situação: normal",
  "alert:no_subscription": "Sem assinatura própria",
  "alert:cost_missing": "Situação: sem custo",
  "alert:unknown": "Situação não reconhecida",
  "faixa:neg": "Margem negativa",
  "faixa:0": "Margem de 0 a 20 %",
  "faixa:20": "Margem de 20 a 50 %",
  "faixa:50": "Margem acima de 50 %",
  orgs: "Parcela: organizações",
  plat: "Parcela: custo da plataforma",
  nr: "Parcela: não rateado",
  res: "Parcela: resíduos",
  arr: "Parcela: arredondamento",
  conv: "Parcela: conversão",
};

// ---- o modelo -----------------------------------------------------------------------------------------------------
export type ParcelTone = "orgs" | "plat" | "nr" | "arr" | "conv";
export type Parcel = {
  /** `orgs`, `plat`, `nr:<motivo>`, `arr`, `conv` — também o `alvo` do bloco. */
  readonly key: string;
  readonly tone: ParcelTone;
  readonly reason: string | null;
  readonly cost: Money | null;
  /** O valor na moeda do arquivo; `null` quando o servidor não manda (motivo e conversão — B7). */
  readonly original: Money | null;
};

export type GroupRow = {
  readonly rowId: string;
  readonly line: GroupLineJson;
  /** As organizações do grupo no mês (as linhas de `tenant` com o mesmo grupo). */
  readonly members: readonly TenantLineJson[];
  /** Quem assina (membros com assinatura no mês). */
  readonly payers: readonly TenantLineJson[];
  /** Desde quando cada membro está no grupo (`validFrom`), dos detalhes lidos; ausente = não lido. */
  readonly memberSince: Readonly<Record<string, string>>;
  /** Agendamentos deste grupo ("X entra em <data>"); `null` = os detalhes não carregaram. */
  readonly scheduled: readonly { readonly tenantName: string; readonly validFrom: string }[] | null;
};

export type SeriesPoint = {
  readonly month: string;
  readonly state: "loading" | "ok" | "error";
  readonly subscription: Money | null;
  readonly cost: Money | null;
  readonly margin: Money | null;
  readonly marginPct: Pct | null;
  /** O custo da plataforma do mês (`global.platformOwnCost`), para a dica "mês anterior" do indicador. */
  readonly platformCost: Money | null;
  readonly costValid: boolean;
  readonly fxRate: Rate | null;
  /** Linhas `critical` + `warning` do mês (contagem); `null` sem a leitura por organização ou sem custo válido. */
  readonly alertCount: number | null;
};

export type TenantSeriesPoint = { readonly month: string; readonly state: "loading" | "ok" | "error"; readonly subscription: Money | null; readonly cost: Money | null };

export type CloudBillingCounts = {
  readonly lineCount: number;
  readonly criticalCount: number;
  readonly warningCount: number;
  readonly normalCount: number;
  readonly noSubscriptionCount: number;
  readonly costMissingCount: number;
  readonly unknownCount: number;
  readonly estimateCount: number;
  /** Assinaturas em demonstrativo fechado, pago ou cancelado. */
  readonly closedCount: number;
  readonly withoutSubscriptionCount: number;
};

export type CloudBillingView = {
  readonly month: string;
  readonly currentMonth: string;
  readonly today: string;
  readonly isCurrentMonth: boolean;
  readonly monthOptions: readonly string[];
  readonly status: CostStatus;
  readonly costValid: boolean;
  /** O custo na moeda do arquivo é conhecido (`ok`, `legacy_unscoped`, `fx_missing`). */
  readonly originalKnown: boolean;
  readonly warnings: readonly OverviewWarning[];
  readonly originalCurrency: string | null;
  readonly global: GlobalJson | null;
  readonly tenantTotals: TotalsJson | null;
  readonly lines: readonly TenantLineJson[];
  readonly counts: CloudBillingCounts;
  readonly fx: FxMonth | null;
  readonly fxByMonth: Readonly<Record<string, FxMonth>>;
  readonly runs: readonly CloudAllocationRun[];
  readonly lastCompletedRun: CloudAllocationRun | null;
  /** Rateio `pending`/`processing` sem rateio concluído depois dele (run presa). */
  readonly pendingRun: CloudAllocationRun | null;
  readonly imports: readonly CloudCostImport[] | null;
  readonly groups: readonly EconomicGroup[];
  readonly ui: CloudBillingUi;
  readonly filterLabel: string | null;
  readonly tenantRows: readonly TenantLineJson[];
  readonly groupRows: readonly GroupRow[];
  readonly parcels: readonly Parcel[];
  readonly parcelRows: readonly Parcel[];
  /** As 5 organizações de maior custo do mês (ordem por `compareMoney`). */
  readonly topCost: readonly TenantLineJson[];
  readonly minMarginLine: TenantLineJson | null;
  readonly series: readonly SeriesPoint[];
  readonly seriesFailed: readonly string[];
  readonly previous: SeriesPoint | null;
  readonly tenantSeries: Readonly<Record<string, readonly TenantSeriesPoint[]>>;
  readonly composition: Readonly<Record<string, BackgroundRead<readonly TenantAllocationLine[]>>>;
  /** Grupos cadastrados sem organização no mês (painel da C). */
  readonly emptyGroups: readonly EconomicGroup[];
  /** Todos os agendamentos; `null` = alguma leitura de detalhe falhou; `"loading"` enquanto carregam. */
  readonly scheduled: readonly { readonly tenantName: string; readonly groupName: string; readonly validFrom: string }[] | null | "loading";
  /** O grupo de hoje de cada organização (para "Mudar de grupo" e "hoje no <grupo>"). */
  readonly currentGroupByTenant: Readonly<Record<string, { readonly groupId: string; readonly groupName: string }>>;
  /** O arquivo de custo que o servidor usou no mês (`cost.importId`); os outros do mês aparecem como substituídos. */
  readonly usedImportId: string | null;
  readonly empty: boolean;
};

export type CloudBillingViewInput = {
  readonly data: CloudBillingData;
  readonly series: CloudBillingSeries;
  readonly groupDetails: Readonly<Record<string, BackgroundRead<EconomicGroupDetail>>>;
  readonly composition?: Readonly<Record<string, BackgroundRead<readonly TenantAllocationLine[]>>>;
  readonly ui: CloudBillingUi;
  readonly currentMonth: string;
  readonly today: string;
};

const ALERT_ORDER: Readonly<Record<AlertKind, number>> = { critical: 0, warning: 1, none: 2, no_subscription: 3, cost_missing: 4, unknown: 5 };

function tenantMatches(line: TenantLineJson, alvo: string | null): boolean {
  if (!alvo) return true;
  if (alvo === "custo") return line.allocatedCost !== null;
  if (alvo === "sub") return line.subscriptionAmount !== null;
  if (alvo === "est") return line.estimate;
  if (alvo === "alerta") return line.alert === "critical" || line.alert === "warning";
  if (alvo === "semass") return line.subscriptionAmount === null;
  if (alvo.startsWith("alert:")) return line.alert === alvo.slice(6);
  if (alvo.startsWith("faixa:")) return marginBandOf(line.marginPct) === alvo.slice(6);
  if (alvo.startsWith("org:")) return line.tenantId === alvo.slice(4);
  return true;
}

export function parcelMatches(parcel: Parcel, alvo: string | null): boolean {
  if (!alvo || !isGlobalTarget(alvo)) return true;
  if (alvo === "nr") return parcel.tone === "nr";
  if (alvo === "res") return parcel.key === "arr" || parcel.key === "conv";
  return parcel.key === alvo;
}

function searchText(text: string): string {
  return text.toLocaleLowerCase("pt-BR").trim();
}

export function sortTenantLines(lines: readonly TenantLineJson[], byMargin: boolean): TenantLineJson[] {
  const copy = [...lines];
  if (byMargin) return copy.sort((a, b) => compareMoney(a.marginPct, b.marginPct) || a.tenantName.localeCompare(b.tenantName, "pt-BR"));
  return copy.sort((a, b) => ALERT_ORDER[a.alert] - ALERT_ORDER[b.alert] || compareMoney(b.allocatedCost, a.allocatedCost) || a.tenantName.localeCompare(b.tenantName, "pt-BR"));
}

function buildParcels(global: GlobalJson | null): Parcel[] {
  if (!global) return [];
  return [
    { key: "orgs", tone: "orgs", reason: null, cost: global.tenantsCost, original: global.original.tenantsCost },
    { key: "plat", tone: "plat", reason: null, cost: global.platformOwnCost, original: global.original.platformOwnCost },
    ...global.unallocatedByReason.map((item): Parcel => ({ key: `nr:${item.reason}`, tone: "nr", reason: item.reason, cost: item.cost, original: null })),
    { key: "arr", tone: "arr", reason: null, cost: global.roundingResidualCost, original: global.original.roundingResidualCost },
    { key: "conv", tone: "conv", reason: null, cost: global.conversionResidualCost, original: null },
  ];
}

function countLines(lines: readonly TenantLineJson[]): CloudBillingCounts {
  const of = (alert: AlertKind) => lines.filter((line) => line.alert === alert).length;
  return {
    lineCount: lines.length,
    criticalCount: of("critical"),
    warningCount: of("warning"),
    normalCount: of("none"),
    noSubscriptionCount: of("no_subscription"),
    costMissingCount: of("cost_missing"),
    unknownCount: of("unknown"),
    estimateCount: lines.filter((line) => line.estimate).length,
    closedCount: lines.filter((line) => line.subscriptionSource === "statement" || line.subscriptionSource === "cancelled").length,
    withoutSubscriptionCount: lines.filter((line) => line.subscriptionAmount === null).length,
  };
}

function seriesPoint(month: string, input: CloudBillingViewInput, fxByMonth: Readonly<Record<string, FxMonth>>): SeriesPoint {
  const own = month === input.data.month;
  const globalRead: BackgroundRead<{ global: GlobalJson; status: CostStatus }> | undefined = own
    ? input.data.global
      ? { state: "ok", value: { global: input.data.global.global, status: input.data.global.cost.status } }
      : { state: "error" }
    : mapRead(input.series.global[month], (value) => ({ global: value.global, status: value.cost.status }));
  const tenantRead = own ? (input.data.tenant ? { state: "ok" as const, value: input.data.tenant } : { state: "error" as const }) : input.series.tenant[month];
  const fxRate = fxByMonth[month]?.rate ?? null;
  if (!globalRead || globalRead.state === "loading") return { month, state: "loading", subscription: null, cost: null, margin: null, marginPct: null, platformCost: null, costValid: false, fxRate, alertCount: null };
  if (globalRead.state === "error") return { month, state: "error", subscription: null, cost: null, margin: null, marginPct: null, platformCost: null, costValid: false, fxRate, alertCount: null };
  const { global, status } = globalRead.value;
  const costValid = COST_VALID_STATUSES.includes(status);
  const alertCount = costValid && tenantRead?.state === "ok" ? tenantRead.value.lines.filter((line) => line.alert === "critical" || line.alert === "warning").length : null;
  return {
    month,
    state: "ok",
    subscription: global.subscriptionTotal,
    // P13 na tela: sem custo válido, custo e margem ficam ausentes, seja qual for o valor do campo
    cost: costValid ? global.totalCost : null,
    margin: costValid ? global.margin : null,
    platformCost: costValid ? global.platformOwnCost : null,
    marginPct: costValid ? global.marginPct : null,
    costValid,
    fxRate,
    alertCount,
  };
}

function mapRead<T, U>(read: BackgroundRead<T> | undefined, map: (value: T) => U): BackgroundRead<U> | undefined {
  if (!read) return undefined;
  return read.state === "ok" ? { state: "ok", value: map(read.value) } : read;
}

/** P13 (plano v2 §6.2): sem custo válido no mês, TODO custo e margem em reais vira ausência, seja qual for o campo. */
function withoutCost<T extends { readonly allocatedCost: Money | null; readonly margin: Money | null; readonly marginPct: Pct | null }>(line: T): T {
  return { ...line, allocatedCost: null, margin: null, marginPct: null };
}
function globalWithoutCost(global: GlobalJson): GlobalJson {
  return {
    ...global,
    tenantsCost: null,
    platformOwnCost: null,
    unallocatedOther: null,
    unallocatedByReason: global.unallocatedByReason.map((item) => ({ ...item, cost: null })),
    roundingResidualCost: null,
    conversionResidualCost: null,
    totalCost: null,
    margin: null,
    marginPct: null,
  };
}

export function buildCloudBillingView(input: CloudBillingViewInput): CloudBillingView {
  const { data, ui, currentMonth, today } = input;
  const status: CostStatus = data.global?.cost.status ?? data.tenant?.cost.status ?? "no_run";
  const costValid = COST_VALID_STATUSES.includes(status);
  const originalKnown = costValid || status === "fx_missing";
  const rawLines = data.tenant?.lines ?? [];
  const lines = costValid ? rawLines : rawLines.map(withoutCost);
  const global = data.global ? (costValid ? data.global.global : globalWithoutCost(data.global.global)) : null;
  const tenantTotals = data.tenant ? (costValid ? data.tenant.totals : withoutCost({ ...data.tenant.totals })) : null;
  const groupLines = (data.group?.lines ?? []).map((line) => (costValid ? line : withoutCost(line)));

  const fxByMonth: Record<string, FxMonth> = {};
  for (const item of data.fx) if (item.currencyFrom === "USD" || !fxByMonth[item.month]) fxByMonth[item.month] = item;
  const fx = fxByMonth[data.month] ?? null;

  const details = Object.values(input.groupDetails).flatMap((read) => (read.state === "ok" ? [read.value] : []));
  const detailsLoading = Object.values(input.groupDetails).some((read) => read.state === "loading") || (data.groups.length > 0 && Object.keys(input.groupDetails).length === 0);
  const detailsFailed = Object.values(input.groupDetails).some((read) => read.state === "error");
  const index = membershipIndex(details);

  const query = searchText(ui.busca);
  const searched = (line: TenantLineJson) => !query || searchText(line.tenantName).includes(query) || (line.groupName !== null && searchText(line.groupName).includes(query));
  const tenantRows = sortTenantLines(lines.filter((line) => tenantMatches(line, ui.alvo) && searched(line)), ui.alvo === "margem");

  const groupRows: GroupRow[] = groupLines
    .map((line): GroupRow => {
      const members = lines.filter((tenant) => tenant.groupId === line.groupId);
      const detail = line.groupId ? details.find((item) => item.id === line.groupId) : undefined;
      const memberSince: Record<string, string> = {};
      for (const member of detail?.members ?? []) if (member.validFrom <= today) memberSince[member.tenantId] = member.validFrom;
      const scheduled = line.groupId === null ? [] : detail ? detail.members.filter((member) => member.validFrom > today).map((member) => ({ tenantName: member.tenantName, validFrom: member.validFrom })) : null;
      return { rowId: groupRowId(line.groupId), line, members, payers: members.filter((member) => member.subscriptionAmount !== null), memberSince, scheduled };
    })
    .filter((row) => !query || searchText(row.line.groupName ?? "Sem grupo").includes(query) || row.members.some((member) => searchText(member.tenantName).includes(query)));

  const parcels = buildParcels(global);
  const parcelRows = parcels.filter((parcel) => parcelMatches(parcel, ui.alvo));
  const topCost = sortTenantLines(lines.filter((line) => line.allocatedCost !== null), false)
    .sort((a, b) => compareMoney(b.allocatedCost, a.allocatedCost))
    .slice(0, 5);
  const minMarginLine = [...lines].filter((line) => line.marginPct !== null).sort((a, b) => compareMoney(a.marginPct, b.marginPct))[0] ?? null;

  const months = input.series.months.length ? input.series.months : monthsEndingAt(data.month, 6);
  const series = months.map((month) => seriesPoint(month, input, fxByMonth));
  const tenantSeries: Record<string, TenantSeriesPoint[]> = {};
  for (const line of rawLines) {
    tenantSeries[line.tenantId] = months.map((month) => {
      const read = month === data.month ? (data.tenant ? { state: "ok" as const, value: data.tenant } : { state: "error" as const }) : input.series.tenant[month];
      if (!read || read.state === "loading") return { month, state: "loading", subscription: null, cost: null };
      if (read.state === "error") return { month, state: "error", subscription: null, cost: null };
      const own = read.value.lines.find((item) => item.tenantId === line.tenantId);
      const valid = COST_VALID_STATUSES.includes(read.value.cost.status);
      return { month, state: "ok", subscription: own?.subscriptionAmount ?? null, cost: valid ? (own?.allocatedCost ?? null) : null };
    });
  }

  const runs = data.runs;
  const lastCompletedRun = runs.find((run) => run.status === "completed") ?? null;
  const latestRun = runs[0] ?? null;
  const pendingRun = latestRun && (latestRun.status === "pending" || latestRun.status === "processing") ? latestRun : null;

  const groupIdsInMonth = new Set(groupLines.map((line) => line.groupId).filter((id): id is string => id !== null));
  const currentGroupByTenant: Record<string, { groupId: string; groupName: string }> = {};
  for (const tenantId of index.keys()) {
    const current = currentGroupOf(index, tenantId, today);
    if (current) currentGroupByTenant[tenantId] = { groupId: current.groupId, groupName: current.groupName };
  }

  const empty = !!data.global && rawLines.every((line) => line.subscriptionAmount === null && line.allocatedCost === null) && data.global.global.subscriptionTotal === null && data.global.global.totalCost === null;

  return {
    month: data.month,
    currentMonth,
    today,
    isCurrentMonth: data.month === currentMonth,
    monthOptions: monthsEndingAt(currentMonth, 12).reverse(),
    status,
    costValid,
    originalKnown,
    warnings: data.global?.cost.warnings ?? data.tenant?.cost.warnings ?? [],
    originalCurrency: data.global?.global.original.currency ?? data.global?.cost.currencyOriginal ?? null,
    global,
    tenantTotals,
    lines,
    counts: countLines(lines),
    fx,
    fxByMonth,
    runs,
    lastCompletedRun,
    pendingRun,
    imports: data.imports,
    groups: data.groups,
    ui,
    filterLabel: ui.alvo ? targetLabel(ui.alvo, lines) : null,
    tenantRows,
    groupRows,
    parcels,
    parcelRows,
    topCost,
    minMarginLine,
    series,
    seriesFailed: series.filter((point) => point.state === "error").map((point) => point.month),
    previous: series.find((point) => point.month === shiftMonth(data.month, -1)) ?? null,
    tenantSeries,
    composition: input.composition ?? {},
    emptyGroups: data.groups.filter((group) => !groupIdsInMonth.has(group.id)),
    scheduled: detailsFailed ? null : detailsLoading ? "loading" : scheduledEntries(details, today),
    currentGroupByTenant,
    usedImportId: data.global?.cost.importId ?? data.tenant?.cost.importId ?? null,
    empty,
  };
}

function targetLabel(alvo: string, lines: readonly TenantLineJson[]): string {
  if (alvo.startsWith("org:")) return `Organização: ${lines.find((line) => line.tenantId === alvo.slice(4))?.tenantName ?? "sem nome"}`;
  if (alvo.startsWith("nr:")) return `Não rateado: ${reasonLabel(alvo.slice(3)).toLocaleLowerCase("pt-BR")}`;
  return TARGET_LABEL[alvo] ?? "Filtro da lista";
}
