// B-ASS-09 — tipos da visão de custo × assinatura (plano v2 §3, §4.2). Contrato `platform_billing_overview@2026-11.b-ass-09`.

/**
 * Estado do custo do período (plano v2 §3 P2). Os quatro últimos são AUSÊNCIA de custo: deixam `null` todo campo de custo e
 * margem em reais, na linha, no grupo, em `totals` e no global (P13). `legacy_unscoped` mostra o valor com selo.
 */
export const COST_STATUSES = ["ok", "legacy_unscoped", "no_run", "no_import", "fx_missing", "currency_unknown"] as const;
export type CostStatus = (typeof COST_STATUSES)[number];

/** Com estes, o custo em reais existe. */
export const COST_VALID_STATUSES: readonly CostStatus[] = ["ok", "legacy_unscoped"];

/** Com estes, o custo ORIGINAL (na moeda do arquivo) é conhecido — em `fx_missing` falta só a taxa. */
export const ORIGINAL_KNOWN_STATUSES: readonly CostStatus[] = ["ok", "legacy_unscoped", "fx_missing"];

/** Alerta por organização, grupo e global (plano v2 §3 P4). O enum fica aberto para o `B-ASS-12`. */
export const OVERVIEW_ALERTS = ["none", "warning", "critical", "no_subscription", "cost_missing"] as const;
export type OverviewAlert = (typeof OVERVIEW_ALERTS)[number];

/** Moeda e taxa com que o custo do período se converte em reais. */
export type Pricing = {
  /** A moeda do arquivo de custo; `""` quando não há custo válido (nunca `"BRL"`, logo nenhuma conversão dá número). */
  readonly currency: string;
  /** Micro-reais por unidade da moeda; `null` em real (não converte) ou sem taxa. */
  readonly rateMicro: bigint | null;
};

/** O custo de uma organização no período: o original (micro-unidades) e em reais (centavos). */
export type TenantCost = {
  /** `null` quando o original não é conhecido (`no_run`, `no_import`, `currency_unknown`). */
  readonly costMicro: bigint | null;
  /** `null` sempre que o custo em reais não existe (P2, P13). */
  readonly costCents: bigint | null;
};

// ---------------------------------------------------------------------------------------------------------------------
// F2 — entradas e saídas do motor (plano v2 §3 P3 a P7, P11 e P13; §4.2; Emenda 1 §3.1).

export const OVERVIEW_GROUP_BYS = ["tenant", "group", "global"] as const;
export type OverviewGroupBy = (typeof OVERVIEW_GROUP_BYS)[number];

export const OVERVIEW_WARNINGS = ["multiple_imports_in_month"] as const;
export type OverviewWarning = (typeof OVERVIEW_WARNINGS)[number];

/** De onde veio a assinatura do período (plano v2 §3 P3). */
export const SUBSCRIPTION_SOURCES = ["statement", "statement_reopened", "cancelled", "projection", "none"] as const;
export type SubscriptionSource = (typeof SUBSCRIPTION_SOURCES)[number];
export type SubscriptionSkipReason = "no_subscription" | "plan_without_price" | "platform_organization";

/** A base da assinatura (D-9, Q5 com padrão): o total do demonstrativo, líquido do crédito aplicado. */
export const SUBSCRIPTION_BASIS = "statement_total" as const;

/** A assinatura de UMA organização no período, em centavos (montada pela F3, `subscription-amount.ts`). */
export type SubscriptionAmount = {
  /** O que a visão conta como assinatura do mês; `null` = sem assinatura (`none`). */
  readonly subscriptionAmountCents: bigint | null;
  /** O total do demonstrativo, separado; `null` sem demonstrativo lido (projeção ou `none`). */
  readonly statementTotalCents: bigint | null;
  /** O crédito aplicado no demonstrativo, separado; `null` sem demonstrativo lido. */
  readonly creditsAppliedCents: bigint | null;
  readonly subscriptionBasis: typeof SUBSCRIPTION_BASIS;
  readonly source: SubscriptionSource;
  readonly skipReason: SubscriptionSkipReason | null;
  readonly estimate: boolean;
};

/** Uma organização da lista (a da plataforma é reconhecida pelo slug e não vira linha). */
export type OverviewTenant = {
  readonly tenantId: string;
  readonly tenantName: string;
  readonly slug: string | null;
};

/** Um grupo cadastrado. A lista inclui os excluídos: um mês passado pode ter membro de grupo excluído depois. */
export type OverviewGroup = {
  readonly groupId: string;
  readonly groupName: string;
};

/** O grupo de uma linha de grupo; `groupId: null` é a linha "Sem grupo". */
export type GroupRef = {
  readonly groupId: string | null;
  readonly groupName: string | null;
};

/** A versão vigente da taxa do mês para (`month`, `currencyFrom`, `BRL`). */
export type FxRateRef = {
  readonly month: string;
  readonly currencyFrom: string;
  /** Decimal com até 6 casas (`"5.400000"`). */
  readonly rate: string;
  readonly version: number;
};

/** Linha de organização, em centavos (o motor). A serialização em string fica em `overview.engine.ts`. */
export type TenantLine = {
  readonly tenantId: string;
  readonly tenantName: string;
  readonly groupId: string | null;
  readonly groupName: string | null;
  readonly subscriptionCents: bigint | null;
  readonly statementTotalCents: bigint | null;
  readonly creditsAppliedCents: bigint | null;
  readonly subscriptionSource: SubscriptionSource;
  readonly subscriptionSkipReason: SubscriptionSkipReason | null;
  readonly estimate: boolean;
  readonly costMicro: bigint | null;
  readonly costCents: bigint | null;
  readonly marginCents: bigint | null;
  readonly marginPct: string | null;
  readonly alert: OverviewAlert;
};

/** Linha de grupo (Emenda 1 §3.1), em centavos. `alert: null` só na linha "Sem grupo". */
export type GroupLine = {
  readonly groupId: string | null;
  readonly groupName: string | null;
  readonly memberCount: number;
  readonly membersWithoutSubscription: number;
  readonly subscriptionAmount: bigint | null;
  readonly creditsApplied: bigint | null;
  readonly allocatedCost: bigint | null;
  readonly margin: bigint | null;
  readonly marginPct: string | null;
  readonly alert: OverviewAlert | null;
  readonly estimate: boolean;
};

/** Totais das linhas de organização, em centavos. */
export type Totals = {
  readonly subscriptionAmount: bigint | null;
  readonly allocatedCost: bigint | null;
  readonly margin: bigint | null;
  readonly marginPct: string | null;
};

/** O global (P6, P7, P13), em centavos; os originais em micro-unidades. */
export type GlobalLine = {
  readonly subscriptionTotal: bigint | null;
  readonly tenantsCost: bigint | null;
  readonly platformOwnCost: bigint | null;
  readonly unallocatedOther: bigint | null;
  readonly unallocatedByReason: readonly { readonly reason: string; readonly cost: bigint | null }[];
  readonly roundingResidualCost: bigint | null;
  readonly conversionResidualCost: bigint | null;
  readonly totalCost: bigint | null;
  readonly margin: bigint | null;
  readonly marginPct: string | null;
  readonly alert: OverviewAlert;
  readonly original: {
    readonly currency: string | null;
    readonly tenantsCost: bigint | null;
    readonly platformOwnCost: bigint | null;
    readonly unallocatedOther: bigint | null;
    readonly roundingResidualCost: bigint | null;
    readonly totalImportedCost: bigint | null;
  };
};

/** Avisos e fontes do custo do mês (P11, H13): várias importações no mês aparecem, e nunca se somam. */
export type CostSources = {
  readonly warnings: readonly OverviewWarning[];
  readonly sources: { readonly runs: number; readonly importIds: readonly string[]; readonly usedImportId: string | null };
};

// ---------------------------------------------------------------------------------------------------------------------
// F2 — o JSON da visão (plano v2 §4.2): dinheiro em string com 2 casas; originais e taxa com 6; `null` quando ausente.

export type OverviewCostJson = {
  readonly status: CostStatus;
  readonly coverage: string;
  readonly runId: string | null;
  readonly importId: string | null;
  readonly currencyOriginal: string | null;
  readonly fxRate: string | null;
  readonly fxRateVersion: number | null;
  readonly warnings: readonly OverviewWarning[];
  readonly sources: CostSources["sources"];
};

export type TenantLineJson = {
  readonly tenantId: string;
  readonly tenantName: string;
  readonly groupId: string | null;
  readonly groupName: string | null;
  readonly subscriptionAmount: string | null;
  readonly subscriptionBasis: typeof SUBSCRIPTION_BASIS;
  readonly statementTotal: string | null;
  readonly creditsApplied: string | null;
  readonly subscriptionSource: SubscriptionSource;
  readonly subscriptionSkipReason: SubscriptionSkipReason | null;
  readonly estimate: boolean;
  readonly allocatedCost: string | null;
  readonly allocatedCostOriginal: string | null;
  readonly margin: string | null;
  readonly marginPct: string | null;
  readonly alert: OverviewAlert;
};

export type GroupLineJson = {
  readonly groupId: string | null;
  readonly groupName: string | null;
  readonly memberCount: number;
  readonly membersWithoutSubscription: number;
  readonly subscriptionAmount: string | null;
  readonly creditsApplied: string | null;
  readonly allocatedCost: string | null;
  readonly margin: string | null;
  readonly marginPct: string | null;
  readonly alert: OverviewAlert | null;
  readonly estimate: boolean;
};

export type TotalsJson = {
  readonly subscriptionAmount: string | null;
  readonly allocatedCost: string | null;
  readonly margin: string | null;
  readonly marginPct: string | null;
};

export type GlobalJson = {
  readonly subscriptionTotal: string | null;
  readonly tenantsCost: string | null;
  readonly platformOwnCost: string | null;
  readonly unallocatedOther: string | null;
  readonly unallocatedByReason: readonly { readonly reason: string; readonly cost: string | null }[];
  readonly roundingResidualCost: string | null;
  readonly conversionResidualCost: string | null;
  readonly totalCost: string | null;
  readonly margin: string | null;
  readonly marginPct: string | null;
  readonly alert: OverviewAlert;
  readonly original: {
    readonly currency: string | null;
    readonly tenantsCost: string | null;
    readonly platformOwnCost: string | null;
    readonly unallocatedOther: string | null;
    readonly roundingResidualCost: string | null;
    readonly totalImportedCost: string | null;
  };
};

type OverviewBase = {
  readonly period: string;
  readonly currency: "BRL";
  readonly generatedAt: string;
  readonly cost: OverviewCostJson;
};

/** O `data` da resposta: `lines` + `totals` por organização ou por grupo; `global` na visão global. */
export type OverviewData =
  | (OverviewBase & { readonly groupBy: "tenant"; readonly lines: readonly TenantLineJson[]; readonly totals: TotalsJson })
  | (OverviewBase & { readonly groupBy: "group"; readonly lines: readonly GroupLineJson[]; readonly totals: TotalsJson })
  | (OverviewBase & { readonly groupBy: "global"; readonly global: GlobalJson });
