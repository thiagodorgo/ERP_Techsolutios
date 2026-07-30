import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptPatiosDashboardSummary } from "./dashboard.adapter";
import type { PatiosDashboardApiContext, PatiosDashboardSummary } from "./dashboard.types";

// Ω5P PR-20 — cliente do painel gerencial dos Pátios. Chamada ÚNICA via cliente HTTP COMPARTILHADO (`apiRequest`:
// base URL, Bearer, headers de mock, refresh-retry de 401 + limpeza de sessão) — MESMO caminho dos demais módulos
// de Pátios. A UI NÃO recalcula agregado algum: o painel é SÓ leitura do que o backend já somou (I1/I6/I7).
// D-007: modo mock → null (nunca fabrica indicadores); 403/401 propaga (a UI trata como "acesso não permitido").
export async function getPatiosDashboardSummary(context: PatiosDashboardApiContext): Promise<PatiosDashboardSummary | null> {
  if (isMockMode()) return null;
  const response = await apiRequest<unknown>("/patios/dashboard/summary", context);
  return adaptPatiosDashboardSummary(response);
}
