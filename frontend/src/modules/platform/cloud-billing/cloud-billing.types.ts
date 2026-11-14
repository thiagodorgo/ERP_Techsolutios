// B-ASS-10b (T5) — tipos da tela de custo e margem da plataforma (Cloud Billing).
// Os cinco tipos JSON da visão espelham `src/modules/subscription-billing/overview/overview.types.ts` do servidor
// (contrato `platform_billing_overview@2026-11.b-ass-09`); o T-CTR-1 (`tests/ass-10b-contrato-overview.test.ts`) confere
// nome por nome. Dinheiro chega como `Money | null`, percentual como `Pct | null`, taxa como `Rate | null` (R-T5-DIN):
// nenhum campo de dinheiro é `number`. Os campos numéricos das rotas antigas (`totalImportedCost`,
// `totalUnblendedCost`) NÃO entram aqui: a tela não os mostra.

import type { Money, Pct, Rate } from "./cloud-billing.money";

// ---- enums do contrato (iguais aos do servidor, mesma ordem) -------------------------------------------------------
export const COST_STATUSES = ["ok", "legacy_unscoped", "no_run", "no_import", "fx_missing", "currency_unknown"] as const;
export type CostStatus = (typeof COST_STATUSES)[number];
/** Com estes, o custo em reais existe (P13). */
export const COST_VALID_STATUSES: readonly CostStatus[] = ["ok", "legacy_unscoped"];

export const OVERVIEW_ALERTS = ["none", "warning", "critical", "no_subscription", "cost_missing"] as const;
export type OverviewAlert = (typeof OVERVIEW_ALERTS)[number];
/** O enum do servidor é aberto (B-ASS-12): um alerta que a tela não conhece aparece neutro, nunca como "Normal". */
export type AlertKind = OverviewAlert | "unknown";

export const OVERVIEW_GROUP_BYS = ["tenant", "group", "global"] as const;
export type OverviewGroupBy = (typeof OVERVIEW_GROUP_BYS)[number];

export const OVERVIEW_WARNINGS = ["multiple_imports_in_month"] as const;
export type OverviewWarning = (typeof OVERVIEW_WARNINGS)[number];

export const SUBSCRIPTION_SOURCES = ["statement", "statement_reopened", "cancelled", "projection", "none"] as const;
export type SubscriptionSource = (typeof SUBSCRIPTION_SOURCES)[number];
export type SubscriptionSkipReason = "no_subscription" | "plan_without_price" | "platform_organization";

// ---- os tipos JSON da visão (nomes iguais aos do servidor) ---------------------------------------------------------
export type OverviewCostJson = {
  readonly status: CostStatus;
  readonly coverage: string;
  readonly runId: string | null;
  readonly importId: string | null;
  readonly currencyOriginal: string | null;
  readonly fxRate: Rate | null;
  readonly fxRateVersion: number | null;
  readonly warnings: readonly OverviewWarning[];
  readonly sources: { readonly runs: number; readonly importIds: readonly string[]; readonly usedImportId: string | null };
};

export type TenantLineJson = {
  readonly tenantId: string;
  readonly tenantName: string;
  readonly groupId: string | null;
  readonly groupName: string | null;
  readonly subscriptionAmount: Money | null;
  readonly subscriptionBasis: "before_credits";
  readonly statementTotal: Money | null;
  readonly creditsApplied: Money | null;
  readonly subscriptionSource: SubscriptionSource;
  readonly subscriptionSkipReason: SubscriptionSkipReason | null;
  readonly estimate: boolean;
  readonly allocatedCost: Money | null;
  readonly allocatedCostOriginal: Money | null;
  readonly margin: Money | null;
  readonly marginPct: Pct | null;
  readonly alert: AlertKind;
};

export type GroupLineJson = {
  readonly groupId: string | null;
  readonly groupName: string | null;
  readonly memberCount: number;
  readonly membersWithoutSubscription: number;
  readonly subscriptionAmount: Money | null;
  readonly creditsApplied: Money | null;
  readonly allocatedCost: Money | null;
  readonly margin: Money | null;
  readonly marginPct: Pct | null;
  readonly alert: AlertKind | null;
  readonly estimate: boolean;
};

export type TotalsJson = {
  readonly subscriptionAmount: Money | null;
  readonly allocatedCost: Money | null;
  readonly margin: Money | null;
  readonly marginPct: Pct | null;
};

export type GlobalJson = {
  readonly subscriptionTotal: Money | null;
  readonly tenantsCost: Money | null;
  readonly platformOwnCost: Money | null;
  readonly unallocatedOther: Money | null;
  readonly unallocatedByReason: readonly { readonly reason: string; readonly cost: Money | null }[];
  readonly roundingResidualCost: Money | null;
  readonly conversionResidualCost: Money | null;
  readonly totalCost: Money | null;
  readonly margin: Money | null;
  readonly marginPct: Pct | null;
  readonly alert: AlertKind;
  readonly original: {
    readonly currency: string | null;
    readonly tenantsCost: Money | null;
    readonly platformOwnCost: Money | null;
    readonly unallocatedOther: Money | null;
    readonly roundingResidualCost: Money | null;
    readonly totalImportedCost: Money | null;
  };
};

type OverviewBase = { readonly period: string; readonly generatedAt: string; readonly cost: OverviewCostJson };
export type TenantOverview = OverviewBase & { readonly lines: readonly TenantLineJson[]; readonly totals: TotalsJson };
export type GroupOverview = OverviewBase & { readonly lines: readonly GroupLineJson[]; readonly totals: TotalsJson };
export type GlobalOverview = OverviewBase & { readonly global: GlobalJson };

// ---- câmbio, grupos, importações e rateios ------------------------------------------------------------------------
export type FxRateVersion = { readonly rate: Rate | null; readonly version: number; readonly createdAt: string };
export type FxMonth = {
  readonly month: string;
  readonly currencyFrom: string;
  readonly rate: Rate | null;
  readonly version: number;
  readonly createdAt: string;
  /** As versões do mês, como o servidor as manda (a vigente é a de `version`). */
  readonly history: readonly FxRateVersion[];
};
export type FxPutResult = { readonly current: FxRateVersion & { readonly month: string }; readonly history: readonly FxRateVersion[] };

export type EconomicGroup = {
  readonly id: string;
  readonly name: string;
  readonly notes: string | null;
  /** Membros vigentes HOJE (o servidor não conta os agendados aqui — B9). */
  readonly memberCount: number;
};
export type GroupMember = {
  readonly tenantId: string;
  readonly tenantName: string;
  /** `AAAA-MM-DD`, vale a partir deste dia. */
  readonly validFrom: string;
  /** `AAAA-MM-DD` exclusivo; `null` = sem fim. */
  readonly validTo: string | null;
  readonly scheduled: boolean;
};
export type EconomicGroupDetail = EconomicGroup & { readonly members: readonly GroupMember[] };

export type CloudCostImportStatus = "pending" | "processing" | "completed" | "failed";
export type CloudCostImport = {
  readonly id: string;
  readonly status: CloudCostImportStatus;
  /** `AAAA-MM` do arquivo (o servidor deriva das linhas); `null` antes de concluir. */
  readonly periodMonth: string | null;
  readonly importedAt: string | null;
  readonly createdAt: string | null;
  readonly rowCount: number;
  readonly currency: string | null;
  readonly duplicateRowsSkipped: number | null;
  readonly errorMessage: string | null;
};

export const ALLOCATION_RUN_STATUSES = ["pending", "processing", "completed", "failed"] as const;
export type CloudAllocationRunStatus = (typeof ALLOCATION_RUN_STATUSES)[number] | "unknown";
export type CloudAllocationRun = {
  readonly id: string;
  readonly status: CloudAllocationRunStatus;
  readonly periodStart: string;
  /** `AAAA-MM` de `periodStart`. */
  readonly periodMonth: string;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly createdAt: string | null;
  readonly errorMessage: string | null;
  readonly metadata: { readonly importResolution?: unknown } | null;
};

/** Uma linha do rateio da organização (composição por serviço), na moeda ORIGINAL do arquivo (B2: sem reais). */
export type TenantAllocationLine = {
  readonly serviceCode: string;
  readonly costCategory: string | null;
  readonly allocatedCostOriginal: Money | null;
  readonly currency: string | null;
};

export type CloudBillingPeriod = {
  readonly start: string;
  readonly end: string;
};

// ---- o que a leitura do mês devolve ------------------------------------------------------------------------------
/** As 3 falhas de integridade do contrato (500, sem número parcial) e a falha genérica. */
export type CloudBillingFailure = "membership_integrity_violation" | "statement_integrity_violation" | "overview_integrity_violation" | "unavailable";

export type CloudBillingSource = "api" | "mock" | "fallback";

export type CloudBillingData = {
  readonly month: string;
  readonly period: CloudBillingPeriod;
  readonly source: CloudBillingSource;
  readonly forbidden: boolean;
  readonly stale: boolean;
  readonly failure: CloudBillingFailure | null;
  readonly tenant: TenantOverview | null;
  readonly group: GroupOverview | null;
  readonly global: GlobalOverview | null;
  /** Câmbio de (mês − 5) a mês, um item por mês que tem taxa. */
  readonly fx: readonly FxMonth[];
  readonly groups: readonly EconomicGroup[];
  /** `null` sem `platform:cloud-costs:read` (a lista não é pedida). */
  readonly imports: readonly CloudCostImport[] | null;
  /** Os rateios do mês, do mais novo para o mais velho. */
  readonly runs: readonly CloudAllocationRun[];
};

export function emptyCloudBilling(month: string, period: CloudBillingPeriod, source: CloudBillingSource): CloudBillingData {
  return { month, period, source, forbidden: false, stale: false, failure: null, tenant: null, group: null, global: null, fx: [], groups: [], imports: null, runs: [] };
}

/** Uma leitura de segundo plano (série de 6 meses, detalhe de grupo): carregando, carregada ou falhou. */
export type BackgroundRead<T> = { readonly state: "loading" } | { readonly state: "ok"; readonly value: T } | { readonly state: "error" };

/** A série de 6 meses, do mais velho ao mês da tela, igual para A, B e C. */
export type CloudBillingSeries = {
  readonly months: readonly string[];
  readonly global: Readonly<Record<string, BackgroundRead<GlobalOverview>>>;
  readonly tenant: Readonly<Record<string, BackgroundRead<TenantOverview>>>;
};
