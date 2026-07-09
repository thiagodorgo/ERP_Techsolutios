import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import {
  adaptCommissionCalculationsResponse,
  adaptCommissionSummaryResponse,
  buildCalculationsPath,
  buildCommissionsQuery,
} from "./commissions.adapter";
import type {
  CommissionCalculationsData,
  CommissionCalculationsFilters,
  CommissionSummaryData,
  CommissionSummaryFilters,
  CommissionSummaryScope,
  CommissionsApiContext,
  MyCommissionCalculationsFilters,
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

const CALCULATIONS_FALLBACK = "Não foi possível consultar o detalhamento por origem.";

function emptyCalculations(source: CommissionCalculationsData["source"], fallbackReason?: string): CommissionCalculationsData {
  return { items: [], pagination: { ...EMPTY_PAGINATION }, source, fallbackReason };
}

// Detalhamento por origem (cálculos individuais) — escopo `all` (commissions:read).
// Filtra por operador via payee_id. D-007: modo mock → vazio; erro real → fallback com motivo.
export async function fetchCommissionCalculations(
  context: CommissionsApiContext,
  filters: CommissionCalculationsFilters = {},
): Promise<CommissionCalculationsData> {
  if (isMockMode()) return emptyCalculations("mock");

  try {
    const response = await apiRequest<unknown>(buildCalculationsPath("all", filters), context);
    return adaptCommissionCalculationsResponse(response, "api");
  } catch {
    return emptyCalculations("fallback", CALCULATIONS_FALLBACK);
  }
}

// Detalhamento por origem do PRÓPRIO chamador — escopo `own` (commissions:read_own).
// Endpoint dedicado `/mine`: o backend fixa o payee = ator autenticado, então NÃO enviamos
// payee_id (operador não tem commissions:read; a rota geral responderia 403). Mesmo DTO
// enriquecido (sourceType/sourceId). D-007: modo mock → vazio; erro real → fallback com motivo.
export async function fetchMyCommissionCalculations(
  context: CommissionsApiContext,
  filters: MyCommissionCalculationsFilters = {},
): Promise<CommissionCalculationsData> {
  if (isMockMode()) return emptyCalculations("mock");

  try {
    const response = await apiRequest<unknown>(buildCalculationsPath("own", filters), context);
    return adaptCommissionCalculationsResponse(response, "api");
  } catch {
    return emptyCalculations("fallback", CALCULATIONS_FALLBACK);
  }
}
