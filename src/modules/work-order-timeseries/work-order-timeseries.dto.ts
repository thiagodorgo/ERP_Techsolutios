import type { WorkOrderTimeseriesResult } from "./work-order-timeseries.types.js";

// §2.8 — OMITE tenant_id/token/PII. Só a SÉRIE agregada: janela (datas civis), bucket, fuso e os pontos
// (data + contagens). Sem id de OS, sem nome de cliente, sem coordenada, sem segredo.
export function toWorkOrderTimeseriesDto(result: WorkOrderTimeseriesResult) {
  return {
    from: result.from,
    to: result.to,
    bucket: result.bucket,
    timezone: result.timezone,
    points: result.points.map((point) => ({
      date: point.date,
      created: point.created,
      completed: point.completed,
      cancelled: point.cancelled,
    })),
  };
}
