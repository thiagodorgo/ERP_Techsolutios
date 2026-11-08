import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isMockMode } from "../../config/env";
import { useAuth } from "../../providers/AuthProvider";
import { useTenantContext } from "../../providers/TenantProvider";
import { ApiError, apiData } from "../../services/api/client";
import { listDispatchesFromApi } from "../operations/dispatches/dispatches.service";
import { getLatestFieldLocations } from "../operations/map/operations-map.service";
import { getMockOperationalDashboard, type DashboardSource, type OperationalDashboard } from "./repository";
import { mockDashboardSummary } from "../../mocks/dashboard/dashboard";
import {
  adaptDashboardSummary,
  checkDashboardSummary,
  parseDashboardSummary,
  type DashboardCriticalOrder,
  type DashboardRecentEvent,
  type DashboardSummaryByStatus,
} from "./dashboard.adapter";
import type { OperationalAlert, OperationalKpi } from "./types";
import type { DispatchListItem, DispatchesSource } from "../operations/dispatches/dispatches.types";
import type { FieldLocationItem, OperationsMapSource } from "../operations/map/operations-map.types";

// C3 — fonte única do Dashboard operacional. Primário: o agregado real
// GET /api/v1/dashboard/summary (KPIs, OS críticas, eventos e alertas por
// tenant). Complementares (painéis próprios): GET /operations/dispatches e
// GET /field-locations/latest, que já degradam de forma independente. Erro no
// agregado real → estado de erro/vazio, sem dados fabricados (D-007).
//
// B-APAR-DASH (plano §2.2, aditivo) — o hook passa a dizer o estado §7 de CADA fonte e o "dado desatualizado":
//   - `summaryStatus` / `dispatchesStatus` / `locationsStatus`: carregando · pronto · erro · acesso não permitido (403);
//   - o resumo é fail-closed (`checkDashboardSummary`): campo numérico obrigatório ausente ou inválido é falha, nunca 0;
//   - falha numa atualização em SEGUNDO PLANO mantém o último dado bom da fonte e acende `stale` com `lastUpdatedAt`
//     (a hora da última atualização boa do resumo); na carga inicial a falha aparece como erro (ou 403) da fonte.
// Os campos de antes (`summaryError`, `summarySource`, `dispatchesSource`, `locationsSource`) ficam, com o mesmo sentido.

const EMPTY_SUMMARY: OperationalDashboard = {
  kpis: [],
  alerts: [],
  criticalWorkOrders: [],
  recentEvents: [],
  source: "api",
  error: false,
};

/** Razão que `listDispatchesFromApi` devolve no 403 (`field_dispatch:read`): é por ela que o 403 se distingue da falha. */
export const DISPATCHES_FORBIDDEN_REASON = "Sem permissão para consultar os despachos.";

export type DashboardSourceStatus = "loading" | "ready" | "error" | "forbidden";

export type DashboardData = {
  readonly loading: boolean;
  readonly kpis: OperationalKpi[];
  readonly alerts: OperationalAlert[];
  readonly criticalWorkOrders: DashboardCriticalOrder[];
  readonly recentEvents: DashboardRecentEvent[];
  readonly summarySource: DashboardSource;
  readonly summaryError: boolean;
  readonly dispatches: readonly DispatchListItem[];
  readonly dispatchesSource: DispatchesSource;
  readonly locations: readonly FieldLocationItem[];
  readonly locationsSource: OperationsMapSource;
  readonly isRefreshing: boolean;
  readonly refresh: (background?: boolean) => Promise<void>;
  /** B-APAR-DASH — estado §7 por fonte, o motivo da falha do resumo, a faixa de desatualizado e a hora do último bom. */
  readonly summaryStatus: DashboardSourceStatus;
  readonly summaryReason: string | null;
  readonly dispatchesStatus: DashboardSourceStatus;
  readonly locationsStatus: DashboardSourceStatus;
  readonly stale: boolean;
  readonly lastUpdatedAt: string | null;
  /** As 10 situações do agregado (`workOrders.byStatus`), do último resumo bom; `null` antes dele. */
  readonly byStatus: DashboardSummaryByStatus | null;
};

type SummaryOutcome =
  | { readonly kind: "ok"; readonly value: OperationalDashboard; readonly byStatus: DashboardSummaryByStatus }
  | { readonly kind: "forbidden" }
  | { readonly kind: "error"; readonly reason: string };

async function loadSummary(context: Parameters<typeof apiData>[1]): Promise<SummaryOutcome> {
  if (isMockMode()) return { kind: "ok", value: getMockOperationalDashboard(), byStatus: parseDashboardSummary(mockDashboardSummary).workOrders.byStatus };
  try {
    const raw = await apiData<unknown>("/dashboard/summary", context);
    const check = checkDashboardSummary(raw);
    if (check.source === "fallback") return { kind: "error", reason: check.reason };
    return { kind: "ok", value: { ...adaptDashboardSummary(raw), source: "api", error: false }, byStatus: parseDashboardSummary(raw).workOrders.byStatus };
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) return { kind: "forbidden" };
    return { kind: "error", reason: "Não foi possível carregar os indicadores do painel agora." };
  }
}

export function useDashboardData(): DashboardData {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();

  // Mock (demo) já semeia síncrono para pintar KPIs no primeiro render; o
  // caminho real começa vazio e preenche após a resposta do agregado.
  const [summary, setSummary] = useState<OperationalDashboard>(() => (isMockMode() ? getMockOperationalDashboard() : EMPTY_SUMMARY));
  const [summaryStatus, setSummaryStatus] = useState<DashboardSourceStatus>(() => (isMockMode() ? "ready" : "loading"));
  const [summaryReason, setSummaryReason] = useState<string | null>(null);
  const [byStatus, setByStatus] = useState<DashboardSummaryByStatus | null>(() => (isMockMode() ? parseDashboardSummary(mockDashboardSummary).workOrders.byStatus : null));
  const [dispatches, setDispatches] = useState<readonly DispatchListItem[]>([]);
  const [dispatchesSource, setDispatchesSource] = useState<DispatchesSource>("api");
  const [dispatchesStatus, setDispatchesStatus] = useState<DashboardSourceStatus>("loading");
  const [locations, setLocations] = useState<readonly FieldLocationItem[]>([]);
  const [locationsSource, setLocationsSource] = useState<OperationsMapSource>("api");
  const [locationsStatus, setLocationsStatus] = useState<DashboardSourceStatus>("loading");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stale, setStale] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  // O que cada fonte já mostrou de bom: é o que uma falha em segundo plano mantém na tela.
  const good = useRef({ summary: isMockMode(), dispatches: false, locations: false });

  const context = useMemo(
    () => ({
      token: session?.accessToken,
      tenantId: activeContext?.tenantId,
      branchId: activeContext?.branchId,
      role: activeContext?.role,
      permissions: activeContext?.permissions,
    }),
    [activeContext, session?.accessToken],
  );

  // WS-UI-REFRESH — load(background): em segundo plano NÃO mostra o skeleton (o auto-refresh atualiza os
  // cards/painéis sem piscar), só a 1ª carga / refresh explícito usa `loading`.
  const load = useCallback(async (background = false) => {
    if (!activeContext) return;
    if (background) setIsRefreshing(true);
    else setLoading(true);

    const [summaryResult, dispatchesResult, locationsResult] = await Promise.allSettled([
      loadSummary(context),
      listDispatchesFromApi(context),
      getLatestFieldLocations(context),
    ]);
    let keptLastGood = false;

    // Agregado (fail-closed): falha nunca vira número; em segundo plano mantém o último bom.
    const outcome: SummaryOutcome = summaryResult.status === "fulfilled" ? summaryResult.value : { kind: "error", reason: "Não foi possível carregar os indicadores do painel agora." };
    if (outcome.kind === "ok") {
      setSummary(outcome.value);
      setByStatus(outcome.byStatus);
      setSummaryStatus("ready");
      setSummaryReason(null);
      good.current.summary = true;
      setLastUpdatedAt(new Date().toISOString());
    } else if (outcome.kind === "error" && background && good.current.summary) {
      keptLastGood = true;
    } else {
      setSummary({ ...EMPTY_SUMMARY, source: "error", error: true });
      setByStatus(null);
      setSummaryStatus(outcome.kind === "forbidden" ? "forbidden" : "error");
      setSummaryReason(outcome.kind === "error" ? outcome.reason : null);
      good.current.summary = false;
    }

    // Despachos e localizações: as services nunca lançam (fallback interno); o 403 de despachos vem pela razão.
    const dispatchesData = dispatchesResult.status === "fulfilled" ? dispatchesResult.value : null;
    const dispatchesForbidden = dispatchesData?.source === "fallback" && dispatchesData.fallbackReason === DISPATCHES_FORBIDDEN_REASON;
    if (dispatchesData && dispatchesData.source !== "fallback") {
      setDispatches(dispatchesData.items);
      setDispatchesSource(dispatchesData.source);
      setDispatchesStatus("ready");
      good.current.dispatches = true;
    } else if (!dispatchesForbidden && background && good.current.dispatches) {
      keptLastGood = true;
    } else {
      setDispatches([]);
      setDispatchesSource("fallback");
      setDispatchesStatus(dispatchesForbidden ? "forbidden" : "error");
      good.current.dispatches = false;
    }

    const locationsData = locationsResult.status === "fulfilled" ? locationsResult.value : null;
    if (locationsData && locationsData.source !== "fallback") {
      setLocations(locationsData.locations);
      setLocationsSource(locationsData.source);
      setLocationsStatus("ready");
      good.current.locations = true;
    } else if (background && good.current.locations) {
      keptLastGood = true;
    } else {
      setLocations([]);
      setLocationsSource("fallback");
      setLocationsStatus("error");
      good.current.locations = false;
    }

    setStale(keptLastGood);
    setLoading(false);
    setIsRefreshing(false);
  }, [activeContext, context]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async (background = false) => {
    await load(background);
  }, [load]);

  return {
    loading,
    isRefreshing,
    kpis: summary.kpis,
    alerts: summary.alerts,
    criticalWorkOrders: summary.criticalWorkOrders,
    recentEvents: summary.recentEvents,
    summarySource: summary.source,
    summaryError: summary.error,
    dispatches,
    dispatchesSource,
    locations,
    locationsSource,
    refresh,
    summaryStatus,
    summaryReason,
    dispatchesStatus,
    locationsStatus,
    stale,
    lastUpdatedAt,
    byStatus,
  };
}
