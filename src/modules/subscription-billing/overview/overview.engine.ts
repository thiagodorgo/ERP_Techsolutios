// B-ASS-09 — o motor PURO da visão de custo × assinatura (plano v2 §3 P2 a P7 e P13; §6 C1). Sem banco, sem relógio, sem
// I/O: o serviço (F6) lê o resumo do rateio, a taxa do mês, as assinaturas e os grupos, e chama estas funções.
//
// F1: o estado do custo (`costStatusOf`), o preço da conversão (`pricingOf`), o custo de uma organização (`tenantCostOf`),
// o alerta (`alertFor`) e o percentual da margem (`marginPct`).
//
// As expressões canônicas são o alvo das mutações literais do plano (§6, §C7 11(3)): não reescrever sem emenda.

import type { CloudCostAllocationSummary } from "../../cloud-cost-allocation/index.js";
import { WARNING_PERCENT } from "./overview.constants.js";
import { costToBrlCents, formatHundredths, roundHalfAwayFromZero, toMicro } from "./overview-money.js";
import {
  COST_VALID_STATUSES,
  ORIGINAL_KNOWN_STATUSES,
  type CostStatus,
  type OverviewAlert,
  type Pricing,
  type TenantCost,
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
