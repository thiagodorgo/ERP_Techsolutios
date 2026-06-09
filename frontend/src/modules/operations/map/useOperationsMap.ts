import { useCallback, useEffect, useMemo, useState } from "react";

import { isMockMode } from "../../../config/env";
import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { getMockOperationsMapData } from "./operations-map.mock";
import { getLatestFieldLocations } from "./operations-map.service";
import type { OperationsMapData } from "./operations-map.types";

type OperationsMapHookState = OperationsMapData & {
  readonly loading: boolean;
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
    refreshedAt: isMockMode() ? new Date().toISOString() : undefined,
  });

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

  const refresh = useCallback(async () => {
    if (!activeContext) return;

    setState((current) => ({
      ...current,
      loading: true,
      error: undefined,
    }));

    const data = await getLatestFieldLocations(context);
    setState({
      ...data,
      loading: false,
      error: data.source === "fallback" ? data.fallbackReason : undefined,
      refreshedAt: new Date().toISOString(),
    });
  }, [activeContext, context]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...state,
    refresh,
  };
}
