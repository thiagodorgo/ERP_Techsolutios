import type { KpiDetail, KpiSourceTag } from "../../../components/kpi";
import { EXPIRING_SOON_DAYS } from "./insurance.adapter";
import type { InsuranceTotals } from "./insurance.adapter";

// WS-CARDS-CHARTS-F2 (PR2b) — descritores dos pop-ups dos 4 cards de Seguros. Os valores já estão nos cards
// (computeInsuranceTotals sobre a janela filtrada); o pop-up só RE-APRESENTA os mesmos números (D-007).
// Nenhuma série temporal é carregada → nenhum corpo usa gráfico. Todos os cards ficam na própria tela → sem cta.
// InsuranceSource é idêntico a KpiSourceTag → passthrough direto.
//
// O card "Total" usa breakdown reaproveitando as contagens irmãs JÁ na tela. ATENÇÃO: NÃO é partição —
// "A vencer" é um SUBCONJUNTO das vigentes (expiringSoon ⊂ vigente), por isso o `hint` "subconjunto das
// vigentes" é obrigatório para não sugerir uma soma falsa (vigentes + a vencer + vencidas ≠ total).

export type InsuranceKpiKey = "total" | "vigentes" | "aVencer" | "vencidas";

const nf = (value: number) => value.toLocaleString("pt-BR");

export function buildInsuranceKpiDetails(totals: InsuranceTotals, source: KpiSourceTag): Record<InsuranceKpiKey, KpiDetail> {
  return {
    total: {
      title: "Total de apólices",
      value: nf(totals.count),
      caption: "na janela filtrada",
      source,
      body: {
        kind: "breakdown",
        parts: [
          { label: "Vigentes", value: nf(totals.vigenteCount), tone: "success" },
          { label: `A vencer (≤${EXPIRING_SOON_DAYS} dias)`, value: nf(totals.expiringSoonCount), tone: "warning", hint: "subconjunto das vigentes" },
          { label: "Vencidas", value: nf(totals.vencidaCount), tone: "danger" },
        ],
      },
    },
    vigentes: {
      title: "Vigentes",
      value: nf(totals.vigenteCount),
      source,
      body: { kind: "explain", text: "Apólices com vigência em curso na janela filtrada." },
    },
    aVencer: {
      title: `A vencer (≤${EXPIRING_SOON_DAYS} dias)`,
      value: nf(totals.expiringSoonCount),
      source,
      body: {
        kind: "explain",
        text: `Apólices vigentes perto do fim da vigência (janela de ${EXPIRING_SOON_DAYS} dias).`,
      },
    },
    vencidas: {
      title: "Vencidas",
      value: nf(totals.vencidaCount),
      source,
      body: {
        kind: "explain",
        text: 'Apólices com vigência encerrada. A situação "vencida" é derivada das datas, não editada manualmente.',
      },
    },
  };
}
