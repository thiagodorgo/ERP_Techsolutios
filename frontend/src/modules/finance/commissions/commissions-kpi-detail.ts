import type { KpiDetail, KpiSourceTag } from "../../../components/kpi";
import { formatBRL, formatCommissionCount, formatPeriodLabel } from "./commissions.adapter";

// WS-CARDS-CHARTS-F2 (PR2b) — descritores dos pop-ups dos 3 cards de resumo de Remunerações (escopo 'all').
// Todos os valores já estão nos próprios cards (summary.total agregado no backend; operatorCount/commissionCount
// derivados de summary.items JÁ na tela); aqui só RE-APRESENTAMOS os mesmos números — nada é somado nem
// fabricado (D-007). Nenhuma série temporal é carregada, então nenhum corpo usa gráfico.
//
// CommissionsSource ("api"|"mock"|"fallback") é idêntico a KpiSourceTag → passthrough direto.

export type CommissionsKpiKey = "total" | "operators" | "commissions";

/**
 * `operatorCount` e `commissionCount` são REUTILIZADOS da página (summary.items.length e a soma já computada
 * de summary.items) — o pop-up não recalcula. Todos os cards ficam na própria tela, então não há cta.
 */
export function buildCommissionsKpiDetails(
  summary: { total: number; from: string; to: string },
  operatorCount: number,
  commissionCount: number,
  source: KpiSourceTag,
): Record<CommissionsKpiKey, KpiDetail> {
  return {
    total: {
      title: "Total geral",
      value: formatBRL(summary.total),
      caption: `Período: ${formatPeriodLabel(summary.from, summary.to)}`,
      source,
      body: {
        kind: "explain",
        text: "Soma dos valores de comissão de todos os operadores no período. O backend agrega o total; a tabela abaixo detalha por operador e por OS.",
      },
    },
    operators: {
      title: "Operadores",
      value: operatorCount.toLocaleString("pt-BR"),
      caption: "com comissão no período",
      source,
      body: {
        kind: "explain",
        text: "Número de operadores com pelo menos uma comissão calculada no período selecionado.",
      },
    },
    commissions: {
      title: "Comissões",
      value: formatCommissionCount(commissionCount),
      caption: "no período",
      source,
      body: {
        kind: "explain",
        text: "Número total de comissões calculadas no período, somando todos os operadores.",
      },
    },
  };
}
