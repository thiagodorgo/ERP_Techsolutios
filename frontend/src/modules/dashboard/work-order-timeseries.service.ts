import { isMockMode } from "../../config/env";
import { ApiError, apiData } from "../../services/api/client";
import { normalizeTimeseriesPoints } from "./work-order-timeseries.adapter";
import type { WorkOrderTimeseriesApiContext, WorkOrderTimeseriesData } from "./work-order-timeseries.types";
import { emptyTimeseries } from "./work-order-timeseries.types";

// WS-CARDS-CHARTS-F2 — service frontend do agregado GET /operations/work-orders-timeseries (#245). Backend
// gateado por `work_orders:read` (403 para finance/inventory/support). D-007: modo mock → série ZERADA
// (nada fabricado); 403 → série vazia + `forbidden:true` (a UI mostra "acesso não permitido", não é erro de
// sistema); qualquer outro erro (5xx/rede) → série vazia + `source:"fallback"` (a UI avisa e tenta no
// próximo ciclo). O front nunca soma nem inventa ponto.

type TimeseriesParams = { readonly days?: number; readonly from?: string; readonly to?: string };

// Envelope do backend após `apiData` desembrulhar `{ data }`.
type TimeseriesEnvelope = { readonly from?: unknown; readonly to?: unknown; readonly points?: unknown };

// days OU from/to — nunca ambos. from/to explícito (par completo) tem prioridade; senão, a janela `days`.
function buildQuery(params: TimeseriesParams): string {
  const query = new URLSearchParams();
  if (params.from && params.to) {
    query.set("from", params.from);
    query.set("to", params.to);
  } else if (typeof params.days === "number" && Number.isFinite(params.days) && params.days > 0) {
    query.set("days", String(Math.trunc(params.days)));
  }
  return query.size ? `?${query.toString()}` : "";
}

export async function getWorkOrderTimeseries(
  context: WorkOrderTimeseriesApiContext,
  params: TimeseriesParams = {},
): Promise<WorkOrderTimeseriesData> {
  // D-007: sem série fabricada em modo mock — a UI mostra o emptyLabel honesto.
  if (isMockMode()) return emptyTimeseries("mock");

  try {
    const envelope = await apiData<TimeseriesEnvelope>(
      `/operations/work-orders-timeseries${buildQuery(params)}`,
      context,
    );
    return {
      from: typeof envelope?.from === "string" ? envelope.from : "",
      to: typeof envelope?.to === "string" ? envelope.to : "",
      points: normalizeTimeseriesPoints(envelope?.points),
      source: "api",
      forbidden: false,
    };
  } catch (err) {
    // 403 = gate RBAC work_orders:read → estado "acesso não permitido" (não é falha de sistema).
    if (err instanceof ApiError && err.status === 403) {
      return { ...emptyTimeseries("fallback"), forbidden: true };
    }
    // Erro real (5xx, rede) → série vazia + fallback. NUNCA fabrica dado; a UI tenta de novo no refresh.
    return emptyTimeseries("fallback");
  }
}
