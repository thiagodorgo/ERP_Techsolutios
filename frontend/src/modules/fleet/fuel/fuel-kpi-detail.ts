import type { KpiDetail, KpiSourceTag } from "../../../components/kpi";
import { formatBRL, formatKmPerLiter, formatLiters } from "./fuel-logs.adapter";
import type { FuelTotals } from "./fuel-logs.adapter";

// WS-CARDS-CHARTS-F2 (PR2b) — descritores dos pop-ups dos 4 cards de Abastecimento. Os valores já estão nos
// cards (computeFuelTotals sobre a janela filtrada); o pop-up só RE-APRESENTA os mesmos números (D-007).
// Nenhuma série temporal é carregada → nenhum corpo usa gráfico. Todos os cards ficam na própria tela → sem cta.
// FuelLogsSource é idêntico a KpiSourceTag → passthrough direto.

export type FuelKpiKey = "lancamentos" | "litros" | "total" | "kmL";

export function buildFuelKpiDetails(totals: FuelTotals, source: KpiSourceTag): Record<FuelKpiKey, KpiDetail> {
  return {
    lancamentos: {
      title: "Lançamentos na janela",
      value: totals.count.toLocaleString("pt-BR"),
      caption: "após filtros",
      source,
      body: {
        kind: "explain",
        text: "Lançamentos de abastecimento na janela filtrada (viatura/período/situação).",
      },
    },
    litros: {
      title: "Total de litros",
      value: formatLiters(totals.totalLiters),
      caption: "soma da janela filtrada",
      source,
      body: {
        kind: "explain",
        text: "Volume total de combustível abastecido na janela filtrada.",
      },
    },
    total: {
      title: "Total em R$",
      value: formatBRL(totals.totalValue),
      caption: "gasto na janela filtrada",
      source,
      body: {
        kind: "explain",
        text: "Valor total gasto com combustível na janela filtrada.",
      },
    },
    kmL: {
      title: "km/L médio da frota",
      value: formatKmPerLiter(totals.fleetKmPerL),
      caption:
        totals.vehiclesWithEfficiency > 0
          ? `${totals.vehiclesWithEfficiency} viatura(s) com consumo derivado`
          : "Sem consumo derivado na janela",
      source,
      body: {
        kind: "explain",
        text: "Consumo médio (km/L) derivado entre abastecimentos consecutivos. Só viaturas com dois lançamentos e odômetro válido entram no cálculo — por isso a base é menor que o total de lançamentos.",
      },
    },
  };
}
