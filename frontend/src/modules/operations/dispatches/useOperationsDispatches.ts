import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { filterDispatches } from "./dispatches.adapter";
import { listDispatchesFromApi } from "./dispatches.service";
import type { DispatchesData, DispatchesFilters } from "./dispatches.types";

export function useOperationsDispatches(filters: DispatchesFilters) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [data, setData] = useState<DispatchesData>({ items: [], pagination: { limit: 20, offset: 0, total: 0 }, source: "api" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    setLoading(true);
    setError(null);
    const nextData = await listDispatchesFromApi(context, filters);
    setData(nextData);
    if (nextData.source === "fallback") setError(nextData.fallbackReason ?? "Fallback local ativo.");
    setLoading(false);
  }, [activeContext, context, filters]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...data,
    items: filterDispatches(data.items, filters),
    allItems: data.items,
    loading,
    error,
    refresh,
  };
}
