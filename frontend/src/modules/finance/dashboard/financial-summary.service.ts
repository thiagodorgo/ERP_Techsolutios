import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptFinancialSummaryResponse } from "./financial-summary.adapter";
import type { FinancialSummaryApiContext, FinancialSummaryData } from "./financial-summary.types";
import { emptyFinancialSummary } from "./financial-summary.types";

// D-007: nunca fabricar número. Modo mock → agregado ZERADO (mock honesto); erro real → fallback zerado com
// motivo. Agregados vêm SOMADOS do backend (o front nunca soma; P-Ω4-2B-KPI-AGREGADO resolvido no Ω4-8a).
export async function getFinancialSummaryFromApi(context: FinancialSummaryApiContext): Promise<FinancialSummaryData> {
  if (isMockMode()) {
    return { ...emptyFinancialSummary(), source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>("/financial-summary", context);
    return adaptFinancialSummaryResponse(response, "api");
  } catch {
    return { ...emptyFinancialSummary(), source: "fallback", fallbackReason: "Não foi possível consultar o resumo financeiro." };
  }
}
