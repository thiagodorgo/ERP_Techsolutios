import { isMockMode } from "../../config/env";
import { apiData } from "../../services/api/client";
import { mockDashboardSummary } from "../../mocks/dashboard/dashboard";
import { adaptDashboardSummary, type DashboardSummaryBundle } from "./dashboard.adapter";
import type { WorkOrdersApiContext } from "../work-orders/work-orders.types";

export type DashboardSource = "api" | "mock" | "error";

export type OperationalDashboard = DashboardSummaryBundle & {
  readonly source: DashboardSource;
  readonly error: boolean;
};

const EMPTY_DASHBOARD: DashboardSummaryBundle = {
  kpis: [],
  alerts: [],
  criticalWorkOrders: [],
  recentEvents: [],
};

/** Busca o agregado real GET /api/v1/dashboard/summary e adapta defensivamente. */
export async function getDashboardSummaryFromApi(context: WorkOrdersApiContext): Promise<DashboardSummaryBundle> {
  const raw = await apiData<unknown>("/dashboard/summary", context);
  return adaptDashboardSummary(raw);
}

/** Painel demonstrativo (mock) já adaptado — síncrono, para semear a tela. */
export function getMockOperationalDashboard(): OperationalDashboard {
  return { ...adaptDashboardSummary(mockDashboardSummary), source: "mock", error: false };
}

/**
 * Fonte única do Dashboard operacional.
 * - Mock (VITE_USE_MOCKS): agregado demonstrativo, pelo MESMO adapter do real.
 * - Real: GET /dashboard/summary (contagens por tenant — autoridade do backend).
 * - Erro no caminho real: retorna resultado VAZIO + `error: true` (D-007) — a
 *   tela mostra estado de erro/vazio, NUNCA dados fabricados/mock.
 */
export async function getOperationalDashboard(context: WorkOrdersApiContext = {}): Promise<OperationalDashboard> {
  if (isMockMode()) {
    return getMockOperationalDashboard();
  }

  try {
    const bundle = await getDashboardSummaryFromApi(context);
    return { ...bundle, source: "api", error: false };
  } catch {
    return { ...EMPTY_DASHBOARD, source: "error", error: true };
  }
}
