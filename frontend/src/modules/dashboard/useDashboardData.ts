import { useCallback, useEffect, useMemo, useState } from "react";

import { isMockMode } from "../../config/env";
import { useAuth } from "../../providers/AuthProvider";
import { useTenantContext } from "../../providers/TenantProvider";
import { listDispatchesFromApi } from "../operations/dispatches/dispatches.service";
import { getLatestFieldLocations } from "../operations/map/operations-map.service";
import { getMockOperationalDashboard, getOperationalDashboard, type DashboardSource, type OperationalDashboard } from "./repository";
import type { DashboardCriticalOrder, DashboardRecentEvent } from "./dashboard.adapter";
import type { OperationalAlert, OperationalKpi } from "./types";
import type { DispatchListItem, DispatchesSource } from "../operations/dispatches/dispatches.types";
import type { FieldLocationItem, OperationsMapSource } from "../operations/map/operations-map.types";

// C3 — fonte única do Dashboard operacional. Primário: o agregado real
// GET /api/v1/dashboard/summary (KPIs, OS críticas, eventos e alertas por
// tenant), via getOperationalDashboard. Complementares (painéis próprios):
// GET /operations/dispatches e GET /field-locations/latest, que já degradam
// de forma independente. Erro no agregado real → estado de erro/vazio, sem
// dados fabricados (D-007).

const EMPTY_SUMMARY: OperationalDashboard = {
  kpis: [],
  alerts: [],
  criticalWorkOrders: [],
  recentEvents: [],
  source: "api",
  error: false,
};

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
};

export function useDashboardData(): DashboardData {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();

  // Mock (demo) já semeia síncrono para pintar KPIs no primeiro render; o
  // caminho real começa vazio e preenche após a resposta do agregado.
  const [summary, setSummary] = useState<OperationalDashboard>(() => (isMockMode() ? getMockOperationalDashboard() : EMPTY_SUMMARY));
  const [dispatches, setDispatches] = useState<readonly DispatchListItem[]>([]);
  const [dispatchesSource, setDispatchesSource] = useState<DispatchesSource>("api");
  const [locations, setLocations] = useState<readonly FieldLocationItem[]>([]);
  const [locationsSource, setLocationsSource] = useState<OperationsMapSource>("api");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      getOperationalDashboard(context),
      listDispatchesFromApi(context),
      getLatestFieldLocations(context),
    ]);

    // Agregado: getOperationalDashboard já resolve erro para estado vazio (D-007).
    if (summaryResult.status === "fulfilled") {
      setSummary(summaryResult.value);
    } else {
      setSummary({ ...EMPTY_SUMMARY, source: "error", error: true });
    }

    // Despachos e localizações: as services nunca lançam (fallback interno).
    if (dispatchesResult.status === "fulfilled") {
      setDispatches(dispatchesResult.value.items);
      setDispatchesSource(dispatchesResult.value.source);
    } else {
      setDispatches([]);
      setDispatchesSource("fallback");
    }

    if (locationsResult.status === "fulfilled") {
      setLocations(locationsResult.value.locations);
      setLocationsSource(locationsResult.value.source);
    } else {
      setLocations([]);
      setLocationsSource("fallback");
    }

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
  };
}
