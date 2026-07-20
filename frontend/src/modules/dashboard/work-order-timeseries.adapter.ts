import type { WorkOrderTimeseriesPoint } from "./work-order-timeseries.types";

// WS-CARDS-CHARTS-F2 — normalização DEFENSIVA da série do backend (clona a defesa de
// technician-performance.service.ts). NUNCA fabrica ponto (D-007): só normaliza o que o servidor enviou.
// Regra: item sem `date` string é descartado; contagens não-numéricas / NaN / negativas viram 0.

function toCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
}

function adaptPoint(raw: unknown): WorkOrderTimeseriesPoint | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const date = typeof row.date === "string" && row.date.length > 0 ? row.date : null;
  if (!date) return null;

  return {
    date,
    created: toCount(row.created),
    completed: toCount(row.completed),
    cancelled: toCount(row.cancelled),
  };
}

// Aceita `unknown` (o `points` do envelope pode não ser array) e guarda com Array.isArray — nunca quebra.
export function normalizeTimeseriesPoints(raw: unknown): WorkOrderTimeseriesPoint[] {
  if (!Array.isArray(raw)) return [];
  const points: WorkOrderTimeseriesPoint[] = [];
  for (const entry of raw) {
    const adapted = adaptPoint(entry);
    if (adapted) points.push(adapted);
  }
  return points;
}
