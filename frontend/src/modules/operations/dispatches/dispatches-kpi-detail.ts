import type { KpiDetail, KpiSourceTag } from "../../../components/kpi";
import { pct } from "../../work-orders/work-orders-kpi-detail";
import type { DispatchesSummary } from "./dispatches.types";

// WS-CARDS-CHARTS-F2 (PR2a) — descritores dos pop-ups dos 7 cards de resumo de Despachos. Todos os números
// já estão nos próprios cards (calculateDispatchesSummary); aqui só reapresentamos a composição/participação
// (razão de contagens já carregadas — permitido por D-007). Nenhuma série de despacho é carregada, então
// nunca usamos `chart` nesta superfície.

export type DispatchesKpiKey = keyof DispatchesSummary; // total | assigned | inRoute | inService | completed | cancelled | urgent

export function buildDispatchesKpiDetails(
  summary: DispatchesSummary,
  source: KpiSourceTag = "api",
): Record<DispatchesKpiKey, KpiDetail> {
  const total = summary.total;
  const totalPart = { label: "Total", value: String(total) } as const;
  // 'draft' é o ÚNICO status fora dos 5 buckets — o remainder fecha a conta por identidade aritmética
  // (accepted/reassigned entram em Atribuídos, arrived em Em rota, failed em Cancelados). Nunca negativo.
  const draft = Math.max(0, total - (summary.assigned + summary.inRoute + summary.inService + summary.completed + summary.cancelled));

  return {
    total: {
      title: "Total",
      value: String(total),
      caption: "Composição por situação",
      source,
      body: {
        kind: "breakdown",
        parts: [
          { label: "Atribuídos", value: String(summary.assigned), tone: "info" },
          { label: "Em rota", value: String(summary.inRoute), tone: "info" },
          { label: "Em atendimento", value: String(summary.inService), tone: "warning" },
          { label: "Concluídos", value: String(summary.completed), tone: "success" },
          { label: "Cancelados/Falhos", value: String(summary.cancelled), tone: "danger" },
          { label: "Rascunho", value: String(draft), tone: "neutral", hint: "ainda não enviados" },
        ],
      },
    },
    assigned: {
      title: "Atribuídos",
      value: String(summary.assigned),
      caption: "Participação no total",
      source,
      body: {
        kind: "breakdown",
        parts: [
          { label: "Atribuídos", value: `${summary.assigned} (${pct(summary.assigned, total)})`, tone: "info", hint: "atribuídos + aceitos + reatribuídos" },
          totalPart,
        ],
      },
    },
    inRoute: {
      title: "Em rota",
      value: String(summary.inRoute),
      caption: "Participação no total",
      source,
      body: {
        kind: "breakdown",
        parts: [
          { label: "Em rota", value: `${summary.inRoute} (${pct(summary.inRoute, total)})`, tone: "info", hint: "em rota + no local" },
          totalPart,
        ],
      },
    },
    inService: {
      title: "Em atendimento",
      value: String(summary.inService),
      caption: "Participação no total",
      source,
      body: {
        kind: "breakdown",
        parts: [
          { label: "Em atendimento", value: `${summary.inService} (${pct(summary.inService, total)})`, tone: "warning" },
          totalPart,
        ],
      },
    },
    completed: {
      title: "Concluídos",
      value: String(summary.completed),
      caption: "Participação no total",
      source,
      body: {
        kind: "breakdown",
        parts: [
          { label: "Concluídos", value: `${summary.completed} (${pct(summary.completed, total)})`, tone: "success" },
          totalPart,
        ],
      },
    },
    cancelled: {
      title: "Cancelados",
      value: String(summary.cancelled),
      caption: "Participação no total",
      source,
      body: {
        kind: "breakdown",
        parts: [
          { label: "Cancelados/Falhos", value: `${summary.cancelled} (${pct(summary.cancelled, total)})`, tone: "danger", hint: "cancelados + falhos" },
          totalPart,
        ],
      },
    },
    urgent: {
      title: "Urgentes",
      value: String(summary.urgent),
      caption: "Prioridade urgente · participação no total",
      source,
      body: {
        kind: "breakdown",
        parts: [
          { label: "Urgentes", value: `${summary.urgent} (${pct(summary.urgent, total)})`, tone: "danger", hint: "recorte de prioridade — qualquer status" },
          totalPart,
        ],
      },
    },
  };
}
