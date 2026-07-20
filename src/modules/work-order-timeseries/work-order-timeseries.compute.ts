import { BUSINESS_TIMEZONE, deriveBusinessDate } from "../../config/business-time.js";
import {
  WORK_ORDER_CANCELLED_STATUS,
  WORK_ORDER_COMPLETED_STATUS,
  type WorkOrderTimeseriesPoint,
  type WorkOrderTimeseriesResult,
  type WorkOrderTimeseriesRow,
  type WorkOrderTimeseriesWindow,
} from "./work-order-timeseries.types.js";

const MS_PER_DAY = 86_400_000;

// Enumera TODOS os dias civis de [from,to] (inclusivo) como 'YYYY-MM-DD'. Aritmética de calendário PURA sobre
// uma âncora UTC (o UTC não tem DST e só lemos Y/M/D de volta via toISOString) — espelha o retrocesso puro de
// cashFlowCompetencias do financial-summary (que faz o mesmo sobre 'YYYY-MM'). Esta é a ESPINHA do zero-fill:
// a lista completa de dias vem daqui, não das linhas.
export function enumerateDays(window: WorkOrderTimeseriesWindow): string[] {
  const start = Date.parse(`${window.from}T00:00:00Z`);
  const end = Date.parse(`${window.to}T00:00:00Z`);
  const out: string[] = [];
  for (let ms = start; ms <= end; ms += MS_PER_DAY) {
    out.push(new Date(ms).toISOString().slice(0, 10));
  }
  return out;
}

// PURO e COMPARTILHADO (InMemory↔Prisma delegam a ESTE compute → paridade garantida). Bucketiza por DIA no
// FUSO DE NEGÓCIO (America/Sao_Paulo, via deriveBusinessDate). Cada MÉTRICA é bucketizada pelo SEU PRÓPRIO
// timestamp (independentes): uma OS criada há 60 dias e concluída hoje entra em `completed` de hoje mas NÃO
// em nenhum `created` da janela.
//   - created   = created_at no dia;
//   - completed = completed_at no dia (só status "completed");
//   - cancelled = cancelled_at no dia (só status "cancelled").
// FALLBACK DOCUMENTADO (decisão): completed/cancelled usam o timestamp TERMINAL respectivo (completed_at/
// cancelled_at), que o repositório carimba SEMPRE ao transicionar (changeStatus/cancel). Se ele faltar (linha
// LEGADA anterior ao carimbo), caímos em created_at — assim o evento é contado HONESTAMENTE (nunca descartado),
// só que ancorado no dia de criação. Contagens são REAIS: nada é fabricado.
// ZERO-FILL: os buckets nascem em 0 para TODO dia da janela (enumerateDays); dias sem OS ficam 0 (honestos,
// não omitidos). Só conta o evento se o dia cair DENTRO da janela.
export function computeWorkOrderTimeseries(
  rows: readonly WorkOrderTimeseriesRow[],
  window: WorkOrderTimeseriesWindow,
): WorkOrderTimeseriesResult {
  const days = enumerateDays(window);
  const buckets = new Map<string, { created: number; completed: number; cancelled: number }>();
  for (const day of days) buckets.set(day, { created: 0, completed: 0, cancelled: 0 });

  for (const row of rows) {
    const createdBucket = buckets.get(deriveBusinessDate(row.createdAt));
    if (createdBucket) createdBucket.created += 1;

    if (row.status === WORK_ORDER_COMPLETED_STATUS) {
      const bucket = buckets.get(deriveBusinessDate(row.completedAt ?? row.createdAt));
      if (bucket) bucket.completed += 1;
    } else if (row.status === WORK_ORDER_CANCELLED_STATUS) {
      const bucket = buckets.get(deriveBusinessDate(row.cancelledAt ?? row.createdAt));
      if (bucket) bucket.cancelled += 1;
    }
  }

  const points: WorkOrderTimeseriesPoint[] = days.map((date) => {
    const bucket = buckets.get(date) ?? { created: 0, completed: 0, cancelled: 0 };
    return { date, created: bucket.created, completed: bucket.completed, cancelled: bucket.cancelled };
  });

  return { from: window.from, to: window.to, bucket: "day", timezone: BUSINESS_TIMEZONE, points };
}
