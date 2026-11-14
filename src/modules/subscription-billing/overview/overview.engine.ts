// B-ASS-09 — o motor PURO da visão de custo × assinatura (plano v2 §3 P2 a P7 e P13; §6 C1). Sem banco, sem relógio, sem
// I/O: o serviço (F6) lê o resumo do rateio, a taxa do mês, as assinaturas e os grupos, e chama estas funções.
//
// F1: o estado do custo (`costStatusOf`), o preço da conversão (`pricingOf`), o custo de uma organização (`tenantCostOf`),
// o alerta (`alertFor`) e o percentual da margem (`marginPct`).
// F2: a linha de organização, a de grupo (`groupLineOf`, com "Sem grupo"), os totais (`totalsOf`), o global (`globalOf`),
// os avisos de vários arquivos no mês (`costSourcesOf`), os dias do período e a montagem da resposta (`buildOverview`).
// Custo ausente falha fechado em TODO agregado (P13): soma só por `sumOrNull`, conversão só por `costToBrlCents`.
//
// As expressões canônicas são o alvo das mutações literais do plano (§6, §C7 11(3)): não reescrever sem emenda.

import type { CloudCostAllocationRun, CloudCostAllocationSummary } from "../../cloud-cost-allocation/index.js";
import { PLATFORM_SYSTEM_ORG_SLUG } from "../../cloud-cost-allocation/cloud-cost-allocation.types.js";
import { groupOfTenantOn, type MemberRow } from "../economic-groups/membership.rules.js";
import { WARNING_PERCENT } from "./overview.constants.js";
import {
  MICRO,
  costToBrlCents,
  formatCents,
  formatHundredths,
  formatMicro,
  rateToMicro,
  roundHalfAwayFromZero,
  subOrNull,
  sumIgnoringNull,
  sumOrNull,
  toMicro,
} from "./overview-money.js";
import {
  COST_VALID_STATUSES,
  ORIGINAL_KNOWN_STATUSES,
  SUBSCRIPTION_BASIS,
  type CostSources,
  type CostStatus,
  type FxRateRef,
  type GlobalJson,
  type GlobalLine,
  type GroupLine,
  type GroupLineJson,
  type GroupRef,
  type OverviewAlert,
  type OverviewData,
  type OverviewGroup,
  type OverviewGroupBy,
  type OverviewTenant,
  type OverviewWarning,
  type Pricing,
  type SubscriptionAmount,
  type TenantCost,
  type TenantLine,
  type TenantLineJson,
  type Totals,
  type TotalsJson,
} from "./overview.types.js";

/** Sem custo válido (P13): moeda que nunca é `"BRL"` e taxa nula — toda conversão por `costToBrlCents` dá `null`. */
export const UNPRICED: Pricing = Object.freeze({ currency: "", rateMicro: null });

/** A moeda do resumo do rateio; `null` quando o resumo não a sabe (nunca se presume real). */
export function summaryCurrencyOf(summary: Pick<CloudCostAllocationSummary, "currency">): string | null {
  return summary.currency ?? null;
}

/**
 * Estado do custo do período (P2), pela `coverage` do resumo e pela taxa do mês para a moeda dele (`rateMicro`; `null`
 * em real ou sem taxa cadastrada). Uma `coverage` que este bloco não conhece falha fechado, como ausência de importação.
 */
export function costStatusOf(summary: CloudCostAllocationSummary, rateMicro: bigint | null): CostStatus {
  if (summary.coverage === "no_run") return "no_run";
  if (summary.coverage !== "imported" && summary.coverage !== "legacy_unscoped") return "no_import";
  const currency = summaryCurrencyOf(summary);
  if (currency === null) return "currency_unknown";
  if (currency !== "BRL" && rateMicro === null) return "fx_missing";
  return summary.coverage === "legacy_unscoped" ? "legacy_unscoped" : "ok";
}

/** A moeda e a taxa da conversão. Sem custo válido, `UNPRICED`: o porteiro único de P13 para toda conversão. */
export function pricingOf(status: CostStatus, currency: string | null, rateMicro: bigint | null): Pricing {
  if (!COST_VALID_STATUSES.includes(status) || currency === null) return UNPRICED;
  return { currency, rateMicro };
}

/**
 * O custo de uma organização no período. Com o original conhecido, a organização que o rateio não citou tem custo
 * **0 de verdade** (o rateio não lhe deu nada; P2); o custo em reais sai de `costToBrlCents`, e só dele.
 */
export function tenantCostOf(
  summary: CloudCostAllocationSummary,
  tenantId: string,
  status: CostStatus,
  pricing: Pricing,
): TenantCost {
  const costMicro = tenantCostMicroOf(summary, tenantId, status);
  return {
    costMicro,
    costCents: costMicro === null ? null : costToBrlCents(costMicro, pricing.currency, pricing.rateMicro),
  };
}

function tenantCostMicroOf(summary: CloudCostAllocationSummary, tenantId: string, status: CostStatus): bigint | null {
  if (!ORIGINAL_KNOWN_STATUSES.includes(status)) return null;
  const entry = summary.tenants.find((tenant) => tenant.tenantId === tenantId);
  return entry === undefined ? 0n : toMicro(entry.allocatedCost);
}

/**
 * Alerta (P4; P11 do dono): custo ausente → `cost_missing`; sem assinatura → `no_subscription`; custo acima da assinatura
 * → `critical`; custo a partir de 80 % de uma assinatura positiva → `warning`; senão `none`. A ordem conta.
 */
export function alertFor(sub: bigint | null, cost: bigint | null): OverviewAlert {
  if (cost === null) return "cost_missing";
  if (sub === null) return "no_subscription";
  if (cost > sub) return "critical";
  if (sub > 0n && cost * 100n >= WARNING_PERCENT * sub) return "warning";
  return "none";
}

/** Margem sobre a assinatura, em percentual com 2 casas (`"46.00"`), metade para longe do zero. `sub > 0`. */
export function marginPct(margin: bigint, sub: bigint): string {
  return formatHundredths(roundHalfAwayFromZero(margin * 10_000n, sub));
}

/** `marginPct`, ou `null` quando a margem ou a assinatura falta, ou a assinatura não é positiva. */
export function marginPctOrNull(margin: bigint | null, sub: bigint | null): string | null {
  if (margin === null || sub === null || sub <= 0n) return null;
  return marginPct(margin, sub);
}

// ---------------------------------------------------------------------------------------------------------------------
// F2 — períodos, linhas, grupo, totais, global e a resposta.

/** Falha de integridade da entrada do motor: a rota responde 500, sem número parcial. */
export type OverviewEngineErrorReason =
  | "invalid_period"
  | "fx_rate_invalid"
  | "tenant_list_incomplete"
  | "subscription_missing"
  | "group_unknown";

export class OverviewEngineError extends Error {
  constructor(
    readonly reason: OverviewEngineErrorReason,
    message: string,
  ) {
    super(`${reason}: ${message}`);
    this.name = "OverviewEngineError";
  }
}

const PERIOD_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

function periodParts(period: string): { readonly year: number; readonly month: number } {
  const match = PERIOD_PATTERN.exec(period);
  if (!match) throw new OverviewEngineError("invalid_period", "o período tem de ser AAAA-MM.");
  return { year: Number(match[1]), month: Number(match[2]) };
}

function utcDay(instant: Date): string {
  return instant.toISOString().slice(0, 10);
}

/** `AAAA-MM-01T00:00:00.000Z`: o início que a visão pede ao resumo do rateio. */
export function firstDayOfPeriod(period: string): Date {
  const { year, month } = periodParts(period);
  return new Date(Date.UTC(year, month - 1, 1));
}

/**
 * `AAAA-MM-<último dia>T00:00:00.000Z`: o FIM que a visão pede ao resumo (plano v2 §3, "a janela"). O resumo casa pelo
 * dia UTC dos dois lados; pedir o dia 1 do mês seguinte devolveria `no_run` em silêncio (K1).
 */
export function lastDayOfPeriod(period: string): Date {
  const { year, month } = periodParts(period);
  return new Date(Date.UTC(year, month, 0));
}

/** O dia 1 do mês seguinte (só para comparar: a janela do resumo NÃO termina nele). */
export function firstDayOfNextPeriod(period: string): Date {
  const { year, month } = periodParts(period);
  return new Date(Date.UTC(year, month, 1));
}

/** O último dia do período como data de calendário (`AAAA-MM-DD`): o dia em que se lê o grupo de cada organização (P5). */
export function lastDateOfPeriod(period: string): string {
  return utcDay(lastDayOfPeriod(period));
}

const MAX_RATE_UNITS = 1000n;

/**
 * A taxa (micro-reais) que converte o custo do período, ou `null`. Só vale a taxa do MESMO mês e da MESMA moeda do resumo
 * (uma taxa de outro par nunca converte); em real não há taxa. Taxa a partir de 1000 é recusada (a rota de câmbio já a
 * recusa; aqui falha fechado).
 */
export function rateMicroFor(period: string, currency: string | null, fxRate: FxRateRef | null): bigint | null {
  if (fxRate === null || currency === null || currency === "BRL") return null;
  if (fxRate.month !== period || fxRate.currencyFrom !== currency) return null;
  const rateMicro = rateToMicro(fxRate.rate);
  if (rateMicro >= MAX_RATE_UNITS * MICRO) {
    throw new OverviewEngineError("fx_rate_invalid", "a taxa do mês tem de ser menor que 1000.");
  }
  return rateMicro;
}

/** A organização da plataforma (slug `platform`) não é linha: o custo dela é `platformOwnCost` (DONO 31/10). */
export function isPlatformTenant(tenant: OverviewTenant): boolean {
  return (tenant.slug ?? "").toLowerCase() === PLATFORM_SYSTEM_ORG_SLUG;
}

/** A linha de uma organização (P2, P3, P4): assinatura e custo separados, margem e alerta deles. */
export function tenantLineOf(
  tenant: OverviewTenant,
  group: OverviewGroup | null,
  subscription: SubscriptionAmount,
  cost: TenantCost,
): TenantLine {
  const marginCents = subOrNull(subscription.subscriptionAmountCents, cost.costCents);
  return {
    tenantId: tenant.tenantId,
    tenantName: tenant.tenantName,
    groupId: group?.groupId ?? null,
    groupName: group?.groupName ?? null,
    subscriptionCents: subscription.subscriptionAmountCents,
    statementTotalCents: subscription.statementTotalCents,
    creditsAppliedCents: subscription.creditsAppliedCents,
    subscriptionSource: subscription.source,
    subscriptionSkipReason: subscription.skipReason,
    estimate: subscription.estimate,
    costMicro: cost.costMicro,
    costCents: cost.costCents,
    marginCents,
    marginPct: marginPctOrNull(marginCents, subscription.subscriptionAmountCents),
    alert: alertFor(subscription.subscriptionAmountCents, cost.costCents),
  };
}

/**
 * A linha de um grupo (P5; Emenda 1 §3.1): a assinatura soma quem a tem (`sumIgnoringNull`); o custo falha fechado
 * (`sumOrNull`) — um membro sem custo basta para o grupo ficar sem custo, margem e percentual, com `cost_missing`.
 * A linha de grupo da visão é montada SÓ por esta função (inclusive "Sem grupo").
 */
export function groupLineOf(group: GroupRef, members: readonly TenantLine[]): GroupLine {
  // As duas somas na forma literal do plano (alvo da M-FX-14).
  const { allocatedCost, subscriptionAmount } = {
    allocatedCost: sumOrNull(members.map((m) => m.costCents)),
    subscriptionAmount: sumIgnoringNull(members.map((m) => m.subscriptionCents)),
  };
  const margin = subOrNull(subscriptionAmount, allocatedCost);
  return {
    groupId: group.groupId,
    groupName: group.groupName,
    memberCount: members.length,
    membersWithoutSubscription: members.filter((m) => m.subscriptionCents === null).length,
    subscriptionAmount,
    creditsApplied: sumIgnoringNull(members.map((m) => m.creditsAppliedCents)),
    allocatedCost,
    margin,
    marginPct: marginPctOrNull(margin, subscriptionAmount),
    alert: alertFor(subscriptionAmount, allocatedCost),
    estimate: members.some((m) => m.estimate),
  };
}

const NO_GROUP: GroupRef = Object.freeze({ groupId: null, groupName: null });

/** "Sem grupo" leva só as somas e a margem: organizações sem relação entre si não têm alerta de cliente (P5). */
function noGroupLineOf(members: readonly TenantLine[]): GroupLine {
  return { ...groupLineOf(NO_GROUP, members), alert: null };
}

/** Os totais das linhas de organização (a soma das linhas de grupo é a mesma, P7). O custo falha fechado (P13). */
export function totalsOf(lines: readonly TenantLine[]): Totals {
  // As duas somas na forma literal do plano (alvo da M-FX-15).
  const { allocatedCost, subscriptionAmount } = {
    allocatedCost: sumOrNull(lines.map((l) => l.costCents)),
    subscriptionAmount: sumIgnoringNull(lines.map((l) => l.subscriptionCents)),
  };
  const margin = subOrNull(subscriptionAmount, allocatedCost);
  return { subscriptionAmount, allocatedCost, margin, marginPct: marginPctOrNull(margin, subscriptionAmount) };
}

/**
 * O global (P6, P7, P13): as assinaturas, o custo das organizações e as quatro linhas próprias (a plataforma, DONO 31/10;
 * o não rateado, por motivo; o resíduo de arredondamento do rateio; o resíduo da conversão), que somam EXATO o custo total
 * importado. Sem custo válido, tudo em reais é `null`; os originais ficam quando a moeda é sabida.
 */
export function globalOf(
  summary: CloudCostAllocationSummary,
  tenantLines: readonly TenantLine[],
  pricing: Pricing,
  status: CostStatus,
): GlobalLine {
  const { currency, rateMicro } = pricing;
  const totalImportedMicro = toMicro(summary.totalImportedCost);
  const platformMicro = toMicro(summary.totalPlatformCost);
  const unallocatedMicro = toMicro(summary.totalUnallocatedCost);
  const residualMicro = toMicro(summary.roundingResidualCost);
  const totalCost = costToBrlCents(totalImportedMicro, currency, rateMicro);
  const subscriptionTotal = sumIgnoringNull(tenantLines.map((l) => l.subscriptionCents));
  // As parcelas na forma literal do plano (alvo da M-FX-12).
  const { tenantsCost, platformOwnCost, unallocatedOther, roundingResidualCost } = {
    tenantsCost: sumOrNull(tenantLines.map((l) => l.costCents)),
    platformOwnCost: costToBrlCents(platformMicro, currency, rateMicro),
    unallocatedOther: costToBrlCents(unallocatedMicro, currency, rateMicro),
    roundingResidualCost: costToBrlCents(residualMicro, currency, rateMicro),
  };
  const conversionResidualCost = subOrNull(totalCost, sumOrNull([tenantsCost, platformOwnCost, unallocatedOther, roundingResidualCost]));
  const originalKnown = ORIGINAL_KNOWN_STATUSES.includes(status);
  const line = {
    subscriptionTotal,
    tenantsCost,
    platformOwnCost,
    unallocatedOther,
    unallocatedByReason: summary.unallocatedByReason.map((item) => ({
      reason: item.reason,
      cost: costToBrlCents(toMicro(item.unallocatedCost), currency, rateMicro),
    })),
    roundingResidualCost,
    conversionResidualCost,
    totalCost,
    margin: subOrNull(subscriptionTotal, totalCost),
    original: {
      currency: originalKnown ? summaryCurrencyOf(summary) : null,
      tenantsCost: originalKnown ? sumOrNull(tenantLines.map((l) => l.costMicro)) : null,
      platformOwnCost: originalKnown ? platformMicro : null,
      unallocatedOther: originalKnown ? unallocatedMicro : null,
      roundingResidualCost: originalKnown ? residualMicro : null,
      totalImportedCost: originalKnown ? totalImportedMicro : null,
    },
  };
  return { ...line, marginPct: marginPctOrNull(line.margin, subscriptionTotal), alert: alertFor(subscriptionTotal, totalCost) };
}

/**
 * Avisos e fontes do custo do mês (P11, H13): conta as runs CONCLUÍDAS da janela EXATA do período (mesmo dia UTC de início
 * e de fim, como o resumo) e as importações distintas delas. Mais de uma: `multiple_imports_in_month`. O valor da visão é
 * sempre o do resumo (a importação publicada); **nunca soma** as runs.
 */
export function costSourcesOf(
  period: string,
  runs: readonly CloudCostAllocationRun[],
  usedImportId: string | null,
): CostSources {
  const start = utcDay(firstDayOfPeriod(period));
  const end = lastDateOfPeriod(period);
  const inWindow = runs.filter(
    (run) => run.status === "completed" && utcDay(run.periodStart) === start && utcDay(run.periodEnd) === end,
  );
  const importIds = [
    ...new Set(inWindow.map((run) => run.metadata.importId).filter((id): id is string => typeof id === "string")),
  ].sort();
  const warnings: OverviewWarning[] = [];
  if (importIds.length > 1) {
    warnings.push("multiple_imports_in_month");
  }
  return { warnings, sources: { runs: inWindow.length, importIds, usedImportId } };
}

/** Tudo o que o serviço (F6) lê e entrega ao motor. */
export type OverviewInput = {
  readonly period: string;
  readonly groupBy: OverviewGroupBy;
  readonly generatedAt: Date;
  /** O resumo do rateio pedido com `[firstDayOfPeriod, lastDayOfPeriod]`. */
  readonly summary: CloudCostAllocationSummary;
  /** As runs de alocação que tocam o período (`listAllocationRuns`); o motor filtra a janela exata. */
  readonly runs: readonly CloudCostAllocationRun[];
  /** A versão vigente da taxa do mês para a moeda do resumo, ou `null`. */
  readonly fxRate: FxRateRef | null;
  /** Todas as organizações (a da plataforma é tirada aqui). Tem de cobrir toda organização do resumo. */
  readonly tenants: readonly OverviewTenant[];
  /** A assinatura do período de cada organização que não é a da plataforma. */
  readonly subscriptions: ReadonlyMap<string, SubscriptionAmount>;
  /** Os grupos, inclusive os excluídos. */
  readonly groups: readonly OverviewGroup[];
  /** Os vínculos das organizações (todos: abertos, fechados e agendados). */
  readonly memberships: readonly MemberRow[];
};

/**
 * A resposta da visão (plano v2 §4.2). Lança `MembershipOverlapError` (dois grupos no mesmo dia, P5) e
 * `OverviewEngineError` (entrada incoerente): nos dois casos, nenhum número sai.
 */
export function buildOverview(input: OverviewInput): OverviewData {
  const { period, summary } = input;
  const currency = summaryCurrencyOf(summary);
  const rateMicro = rateMicroFor(period, currency, input.fxRate);
  const status = costStatusOf(summary, rateMicro);
  const pricing = pricingOf(status, currency, rateMicro);
  const memberDay = lastDateOfPeriod(period);
  const orgs = input.tenants.filter((t) => !isPlatformTenant(t));
  assertSummaryTenantsListed(summary, orgs);
  const groupsById = new Map(input.groups.map((group) => [group.groupId, group]));

  const tenantLines = orgs
    .map((tenant) => {
      const groupId = groupOfTenantOn(input.memberships, tenant.tenantId, memberDay);
      return tenantLineOf(
        tenant,
        groupId === null ? null : requireGroup(groupsById, groupId),
        requireSubscription(input.subscriptions, tenant.tenantId),
        tenantCostOf(summary, tenant.tenantId, status, pricing),
      );
    })
    .sort(byNameThenId((line) => line.tenantName, (line) => line.tenantId));

  const { warnings, sources } = costSourcesOf(period, input.runs, summary.importId);
  const base = {
    period,
    currency: "BRL" as const,
    generatedAt: input.generatedAt.toISOString(),
    cost: {
      status,
      coverage: summary.coverage,
      runId: summary.runId,
      importId: summary.importId,
      currencyOriginal: currency,
      fxRate: pricing.rateMicro === null ? null : formatMicro(pricing.rateMicro),
      fxRateVersion: pricing.rateMicro === null || input.fxRate === null ? null : input.fxRate.version,
      warnings,
      sources,
    },
  };

  switch (input.groupBy) {
    case "tenant":
      return { ...base, groupBy: "tenant", lines: tenantLines.map(tenantLineJson), totals: totalsJson(totalsOf(tenantLines)) };
    case "group":
      return { ...base, groupBy: "group", lines: groupLinesOf(tenantLines).map(groupLineJson), totals: totalsJson(totalsOf(tenantLines)) };
    case "global":
      return { ...base, groupBy: "global", global: globalJson(globalOf(summary, tenantLines, pricing, status)) };
  }
}

/** As linhas de grupo: uma por grupo com membro no último dia do período, por nome, e "Sem grupo" no fim. */
function groupLinesOf(tenantLines: readonly TenantLine[]): GroupLine[] {
  const byGroup = new Map<string, { readonly ref: GroupRef; readonly members: TenantLine[] }>();
  const ungrouped: TenantLine[] = [];
  for (const tenantLine of tenantLines) {
    if (tenantLine.groupId === null) {
      ungrouped.push(tenantLine);
      continue;
    }
    const entry = byGroup.get(tenantLine.groupId) ?? {
      ref: { groupId: tenantLine.groupId, groupName: tenantLine.groupName },
      members: [],
    };
    entry.members.push(tenantLine);
    byGroup.set(tenantLine.groupId, entry);
  }
  const groupLines = [...byGroup.values()]
    .sort(byNameThenId((entry) => entry.ref.groupName ?? "", (entry) => entry.ref.groupId ?? ""))
    .map((entry) => groupLineOf(entry.ref, entry.members));
  if (ungrouped.length > 0) groupLines.push(noGroupLineOf(ungrouped));
  return groupLines;
}

/** Toda organização que o rateio cita tem de estar na lista: senão o custo dela sumiria no resíduo da conversão (P7). */
function assertSummaryTenantsListed(summary: CloudCostAllocationSummary, orgs: readonly OverviewTenant[]): void {
  const listed = new Set(orgs.map((tenant) => tenant.tenantId));
  const missing = summary.tenants.filter((tenant) => !listed.has(tenant.tenantId)).length;
  if (missing > 0) {
    throw new OverviewEngineError("tenant_list_incomplete", `${missing} organização(ões) do rateio fora da lista da visão.`);
  }
}

function requireSubscription(subscriptions: ReadonlyMap<string, SubscriptionAmount>, tenantId: string): SubscriptionAmount {
  const subscription = subscriptions.get(tenantId);
  if (subscription === undefined) {
    throw new OverviewEngineError("subscription_missing", "falta a assinatura do período de uma organização.");
  }
  return subscription;
}

function requireGroup(groupsById: ReadonlyMap<string, OverviewGroup>, groupId: string): OverviewGroup {
  const group = groupsById.get(groupId);
  if (group === undefined) throw new OverviewEngineError("group_unknown", "um vínculo aponta para grupo fora da lista.");
  return group;
}

function byNameThenId<T>(name: (item: T) => string, id: (item: T) => string): (a: T, b: T) => number {
  return (a, b) => name(a).localeCompare(name(b), "pt-BR") || (id(a) < id(b) ? -1 : id(a) > id(b) ? 1 : 0);
}

function cents(value: bigint | null): string | null {
  return value === null ? null : formatCents(value);
}

function micro(value: bigint | null): string | null {
  return value === null ? null : formatMicro(value);
}

function tenantLineJson(line: TenantLine): TenantLineJson {
  return {
    tenantId: line.tenantId,
    tenantName: line.tenantName,
    groupId: line.groupId,
    groupName: line.groupName,
    subscriptionAmount: cents(line.subscriptionCents),
    subscriptionBasis: SUBSCRIPTION_BASIS,
    statementTotal: cents(line.statementTotalCents),
    creditsApplied: cents(line.creditsAppliedCents),
    subscriptionSource: line.subscriptionSource,
    subscriptionSkipReason: line.subscriptionSkipReason,
    estimate: line.estimate,
    allocatedCost: cents(line.costCents),
    allocatedCostOriginal: micro(line.costMicro),
    margin: cents(line.marginCents),
    marginPct: line.marginPct,
    alert: line.alert,
  };
}

function groupLineJson(line: GroupLine): GroupLineJson {
  return {
    groupId: line.groupId,
    groupName: line.groupName,
    memberCount: line.memberCount,
    membersWithoutSubscription: line.membersWithoutSubscription,
    subscriptionAmount: cents(line.subscriptionAmount),
    creditsApplied: cents(line.creditsApplied),
    allocatedCost: cents(line.allocatedCost),
    margin: cents(line.margin),
    marginPct: line.marginPct,
    alert: line.alert,
    estimate: line.estimate,
  };
}

function totalsJson(totals: Totals): TotalsJson {
  return {
    subscriptionAmount: cents(totals.subscriptionAmount),
    allocatedCost: cents(totals.allocatedCost),
    margin: cents(totals.margin),
    marginPct: totals.marginPct,
  };
}

function globalJson(global: GlobalLine): GlobalJson {
  return {
    subscriptionTotal: cents(global.subscriptionTotal),
    tenantsCost: cents(global.tenantsCost),
    platformOwnCost: cents(global.platformOwnCost),
    unallocatedOther: cents(global.unallocatedOther),
    unallocatedByReason: global.unallocatedByReason.map((item) => ({ reason: item.reason, cost: cents(item.cost) })),
    roundingResidualCost: cents(global.roundingResidualCost),
    conversionResidualCost: cents(global.conversionResidualCost),
    totalCost: cents(global.totalCost),
    margin: cents(global.margin),
    marginPct: global.marginPct,
    alert: global.alert,
    original: {
      currency: global.original.currency,
      tenantsCost: micro(global.original.tenantsCost),
      platformOwnCost: micro(global.original.platformOwnCost),
      unallocatedOther: micro(global.original.unallocatedOther),
      roundingResidualCost: micro(global.original.roundingResidualCost),
      totalImportedCost: micro(global.original.totalImportedCost),
    },
  };
}
