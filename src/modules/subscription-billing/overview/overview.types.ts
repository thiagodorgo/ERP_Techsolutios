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
