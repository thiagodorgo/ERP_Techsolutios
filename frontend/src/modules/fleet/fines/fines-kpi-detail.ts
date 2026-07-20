import type { KpiDetail, KpiSourceTag } from "../../../components/kpi";
import { formatValor } from "./fines.adapter";
import type { FinesTotals } from "./fines.adapter";

// WS-CARDS-CHARTS-F2 (PR2b) — descritores dos pop-ups dos 3 cards de Multas. Os valores já estão nos cards
// (computeFinesTotals sobre a janela filtrada); o pop-up só RE-APRESENTA os mesmos números (D-007). Nenhuma
// série temporal é carregada, então nenhum corpo usa gráfico. Todos os cards ficam na própria tela → sem cta.
// FinesSource é idêntico a KpiSourceTag → passthrough direto.

export type FinesKpiKey = "total" | "valor" | "dueSoon";

export function buildFinesKpiDetails(totals: FinesTotals, source: KpiSourceTag): Record<FinesKpiKey, KpiDetail> {
  return {
    total: {
      title: "Total de multas",
      value: totals.count.toLocaleString("pt-BR"),
      caption: "na janela filtrada",
      source,
      body: {
        kind: "explain",
        text: "Quantidade de multas na janela carregada, respeitando os filtros de situação, viatura e prazo aplicados.",
      },
    },
    valor: {
      title: "Valor total",
      value: formatValor(totals.totalValor),
      caption: "soma da janela filtrada",
      source,
      body: {
        kind: "explain",
        text: "Soma dos valores das multas presentes na janela filtrada.",
      },
    },
    dueSoon: {
      title: "A vencer (≤7 dias)",
      value: totals.dueSoonCount.toLocaleString("pt-BR"),
      caption: "prazos de recurso ou pagamento próximos",
      source,
      body: {
        kind: "explain",
        text: 'Multas com prazo de recurso ou de pagamento vencendo em até 7 dias. Use o botão "A vencer" para filtrar a lista.',
      },
    },
  };
}
