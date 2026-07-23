import { isMockMode } from "../../../config/env";
import { ApiError, apiRequest } from "../../../services/api/client";
import {
  adaptCommissionCalculationsResponse,
  adaptCommissionSummaryResponse,
  adaptSettlementResult,
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
  SettleCommissionsInput,
  SettleCommissionsResult,
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

// Ω4C PR-10 (D-Ω4C-REM-SETTLE-RAIL) — liquidação em lote (perm `commissions:settle`). Envia só os ids
// selecionados + data/descrição opcionais; o backend trava o valor a calc.amount e credita no extrato.
// Trata os desfechos de requisição inteira honestamente: 404 (linha inexistente/desatualizada) e 422 (payee
// não-profissional) abortam a tx no backend → mensagem PT-BR segura, sem vazar corpo cru.
export async function settleCommissions(
  context: CommissionsApiContext,
  input: SettleCommissionsInput,
): Promise<SettleCommissionsResult> {
  if (isMockMode()) {
    return { kind: "error", message: "A liquidação não está disponível no modo de demonstração." };
  }
  if (input.calculationIds.length === 0) {
    return { kind: "error", message: "Selecione ao menos uma remuneração para liquidar." };
  }

  try {
    const response = await apiRequest<unknown>("/commissions/settlements", {
      ...context,
      method: "POST",
      body: {
        calculationIds: input.calculationIds,
        ...(input.settlementDate ? { settlementDate: input.settlementDate } : {}),
        ...(input.description ? { description: input.description } : {}),
      },
    });
    return { kind: "ok", result: adaptSettlementResult(response) };
  } catch (error) {
    return interpretSettleError(error);
  }
}

function interpretSettleError(error: unknown): SettleCommissionsResult {
  const status = error instanceof ApiError ? error.status : undefined;
  if (status === 404) {
    return { kind: "not_found", message: "Uma ou mais remunerações não foram encontradas. Atualize a lista e tente novamente." };
  }
  if (status === 422) {
    return { kind: "not_a_professional", message: "Um dos selecionados não é um profissional de campo e não pode ser liquidado no extrato." };
  }
  if (status === 401 || status === 403) {
    return { kind: "forbidden", message: "Você não tem permissão para liquidar remunerações." };
  }
  return { kind: "error", message: "Não foi possível liquidar as remunerações. Tente novamente." };
}
