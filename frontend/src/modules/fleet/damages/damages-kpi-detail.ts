import type { KpiDetail, KpiSourceTag } from "../../../components/kpi";
import type { DamageTotals } from "./damages.adapter";

// WS-CARDS-CHARTS-F2 (PR2b) — descritores dos pop-ups dos 4 cards de Danos. Os valores já estão nos cards
// (computeDamageTotals sobre a janela filtrada); o pop-up só RE-APRESENTA os mesmos números (D-007).
// Nenhuma série temporal é carregada → nenhum corpo usa gráfico. Todos os cards ficam na própria tela → sem cta.
// DamageSource é idêntico a KpiSourceTag → passthrough direto.
//
// O card "Total" usa breakdown com PARTIÇÃO LIMPA por situação de workflow (registrado/em tratativa/resolvido),
// as três contagens irmãs já na tela — a soma fecha o total (diferente de Seguros, que não particiona).

export type DamagesKpiKey = "total" | "registrados" | "emTratativa" | "resolvidos";

const nf = (value: number) => value.toLocaleString("pt-BR");

export function buildDamagesKpiDetails(totals: DamageTotals, source: KpiSourceTag): Record<DamagesKpiKey, KpiDetail> {
  return {
    total: {
      title: "Total de danos",
      value: nf(totals.count),
      caption: "na janela filtrada",
      source,
      body: {
        kind: "breakdown",
        parts: [
          { label: "Registrados", value: nf(totals.registradoCount), tone: "info" },
          { label: "Em tratativa", value: nf(totals.emTratativaCount), tone: "warning" },
          { label: "Resolvidos", value: nf(totals.resolvidoCount), tone: "success" },
        ],
      },
    },
    registrados: {
      title: "Registrados",
      value: nf(totals.registradoCount),
      source,
      body: { kind: "explain", text: "Danos registrados e ainda não iniciados na tratativa." },
    },
    emTratativa: {
      title: "Em tratativa",
      value: nf(totals.emTratativaCount),
      source,
      body: { kind: "explain", text: "Danos em andamento de reparo/tratativa." },
    },
    resolvidos: {
      title: "Resolvidos",
      value: nf(totals.resolvidoCount),
      source,
      body: { kind: "explain", text: "Danos com tratativa concluída na janela filtrada." },
    },
  };
}
