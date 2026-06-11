import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isMockMode } from "../../../config/env";
import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { getMockOperationsMapData } from "./operations-map.mock";
import { getLatestFieldLocations, subscribeOperationsMapEvents } from "./operations-map.service";
import type { OperationsMapData } from "./operations-map.types";

const POLL_INTERVAL_MS = 30_000;

type OperationsMapHookState = OperationsMapData & {
  readonly loading: boolean;
  readonly isRefreshing: boolean;
  readonly error?: string;
  readonly refreshedAt?: string;
};

export function useOperationsMap() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const initialData = useMemo(
    () => (isMockMode() ? getMockOperationsMapData("mock") : { locations: [], source: "api" as const }),
    [],
  );
  const [state, setState] = useState<OperationsMapHookState>({
    ...initialData,
    loading: !isMockMode(),
    isRefreshing: false,
    refreshedAt: isMockMode() ? new Date().toISOString() : undefined,
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshingRef = useRef(false);

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

  const refresh = useCallback(async (background = false) => {
    if (!activeContext) return;
    if (background && refreshingRef.current) return;

    refreshingRef.current = true;
    setState((current) => {
      const hasExistingData = current.locations.length > 0;
      return {
        ...current,
        loading: !background && !hasExistingData,
        isRefreshing: background || hasExistingData,
        error: undefined,
      };
    });

    const data = await getLatestFieldLocations(context);
    setState({
      ...data,
      loading: false,
      isRefreshing: false,
      error: data.source === "fallback" ? data.fallbackReason : undefined,
      refreshedAt: new Date().toISOString(),
    });
    refreshingRef.current = false;
  }, [activeContext, context]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      void refresh(true);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [autoRefresh, refresh]);

  useEffect(() => {
    if (isMockMode() || !activeContext || !context.permissions?.includes("field_location:read")) return;

    return subscribeOperationsMapEvents(context, {
      onEvent: () => {
        void refresh(true);
      },
      onError: () => undefined,
    });
  }, [activeContext, context, refresh]);

  return {
    ...state,
    refresh,
    autoRefresh,
    setAutoRefresh,
  };
}
