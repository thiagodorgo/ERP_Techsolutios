import type { KpiDetail, KpiSourceTag } from "../../components/kpi";
import type { WorkOrdersSource } from "./work-orders.types";

// WS-CARDS-CHARTS-F2 (PR2a) — descritores dos pop-ups dos 4 KPIs da lista de OS (OS abertas / Em andamento /
// Urgentes / Concluídas). Os 4 já são contados de `items` na própria página; aqui só reapresentamos esses
// mesmos números como "participação no total" (razão de contagens já carregadas — permitido por D-007; nada
// é somado nem inventado). Não particionam o total: andamento ⊂ abertas e urgentes é recorte de prioridade —
// por isso cada card mostra a própria fatia contra o total, não uma composição.

export type WorkOrdersKpiCounts = {
  readonly abertas: number;
  readonly andamento: number;
  readonly urgentes: number;
  readonly concluidas: number;
  readonly total: number;
};

export type WorkOrdersKpiKey = "abertas" | "andamento" | "urgentes" | "concluidas";

/** Percentual inteiro de uma parte já contada sobre o total já contado (D-007: razão, não fabricação). */
export function pct(part: number, total: number): string {
  return total > 0 ? `${Math.round((part / total) * 100)}%` : "0%";
}

/** WorkOrdersSource → selo do modal (união idêntica a KpiSourceTag). */
export function mapWorkOrdersSource(source: WorkOrdersSource): KpiSourceTag {
  return source;
}

export function buildWorkOrdersKpiDetails(
  counts: WorkOrdersKpiCounts,
  source: WorkOrdersSource,
): Record<WorkOrdersKpiKey, KpiDetail> {
  const src = mapWorkOrdersSource(source);
  const total = counts.total;
  const totalPart = { label: "Total de OS", value: String(total) } as const;

  return {
    abertas: {
      title: "OS abertas",
      value: String(counts.abertas),
      caption: "Participação no total",
      source: src,
      body: {
        kind: "breakdown",
        parts: [
          { label: "OS abertas", value: `${counts.abertas} (${pct(counts.abertas, total)})`, tone: "info", hint: "status não final" },
          totalPart,
        ],
      },
    },
    andamento: {
      title: "Em andamento",
      value: String(counts.andamento),
      caption: "Participação no total",
      source: src,
      body: {
        kind: "breakdown",
        parts: [
          { label: "Em andamento", value: `${counts.andamento} (${pct(counts.andamento, total)})`, tone: "warning", hint: "em rota, no local, execução ou pausa" },
          totalPart,
        ],
      },
    },
    urgentes: {
      title: "Urgentes",
      value: String(counts.urgentes),
      caption: "Prioridade urgente · participação no total",
      source: src,
      body: {
        kind: "breakdown",
        parts: [
          { label: "Urgentes", value: `${counts.urgentes} (${pct(counts.urgentes, total)})`, tone: "danger", hint: "recorte de prioridade — pode ocorrer em qualquer status" },
          totalPart,
        ],
      },
    },
    concluidas: {
      title: "Concluídas",
      value: String(counts.concluidas),
      caption: "Participação no total",
      source: src,
      body: {
        kind: "breakdown",
        parts: [
          { label: "Concluídas", value: `${counts.concluidas} (${pct(counts.concluidas, total)})`, tone: "success" },
          totalPart,
        ],
      },
    },
  };
}
