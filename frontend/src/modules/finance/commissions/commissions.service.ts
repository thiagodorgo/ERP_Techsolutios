import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import {
  adaptCommissionCalculationsResponse,
  adaptCommissionSummaryResponse,
  buildCommissionsQuery,
} from "./commissions.adapter";
import type {
  CommissionCalculationsData,
  CommissionCalculationsFilters,
  CommissionSummaryData,
  CommissionSummaryFilters,
  CommissionSummaryScope,
  CommissionsApiContext,
} from "./commissions.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

function emptySummary(filters: CommissionSummaryFilters, source: CommissionSummaryData["source"], fallbackReason?: string): CommissionSummaryData {
  return {
    summary: { items: [], total: 0, from: filters.from?.trim() ?? "", to: filters.to?.trim() ?? "" },
    source,
    fallbackReason,
  };
}

// Extrato agregado por operador/período. O escopo é decidido pela permissão do chamador
// (a UI só molda; o backend é a autoridade final):
//   `all` → GET /commissions/statements/summary   (commissions:read)
//   `own` → GET /commissions/statements/my-summary (commissions:read_own — só o chamador)
// D-007: nunca fabricar linhas. Modo mock → vazio; erro real → fallback vazio com motivo.
export async function fetchCommissionSummary(
  context: CommissionsApiContext,
  scope: CommissionSummaryScope,
  filters: CommissionSummaryFilters = {},
): Promise<CommissionSummaryData> {
  if (isMockMode()) return emptySummary(filters, "mock");

  const path = scope === "own" ? "/commissions/statements/my-summary" : "/commissions/statements/summary";
  // my-summary já é do chamador — não propaga payee_id (evita filtro cruzado indevido).
  const query = buildCommissionsQuery(scope === "own" ? { from: filters.from, to: filters.to } : filters);

  try {
    const response = await apiRequest<unknown>(`${path}${query}`, context);
    return adaptCommissionSummaryResponse(response, "api");
  } catch {
    return emptySummary(filters, "fallback", "Não foi possível consultar as remunerações.");
  }
}

// Detalhamento por OS (cálculos individuais) de um operador no período.
// D-007: modo mock → vazio; erro real → fallback vazio com motivo.
export async function fetchCommissionCalculations(
  context: CommissionsApiContext,
  filters: CommissionCalculationsFilters = {},
): Promise<CommissionCalculationsData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/commissions/calculations${buildCommissionsQuery(filters)}`, context);
    return adaptCommissionCalculationsResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar o detalhamento por OS.",
    };
  }
}
