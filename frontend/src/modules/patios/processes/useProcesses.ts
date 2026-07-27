import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { listProcessesFromApi } from "./processes.service";
import type { ProcessesData, ProcessesFilters } from "./processes.types";

// Hook de listagem de Processos de custódia. Carrega a janela (limit) uma vez; filtros de estado/pátio/placa são
// client-side na dense-list (mesmo padrão dos cadastros irmãos: yards/profiles/registry).
export function useProcesses(filters: ProcessesFilters) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [data, setData] = useState<ProcessesData>({ items: [], pagination: { limit: 20, offset: 0, total: 0 }, source: "api" });
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  const refresh = useCallback(async (background = false) => {
    if (!activeContext) return;

    if (background) setIsRefreshing(true);
    else setLoading(true);
    setError(null);
    const nextData = await listProcessesFromApi(context, filters);
    setData(nextData);
    if (nextData.source === "fallback") setError(nextData.fallbackReason ?? "Fallback local ativo.");
    setLoading(false);
    setIsRefreshing(false);
  }, [activeContext, context, filters]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    items: data.items,
    pagination: data.pagination,
    source: data.source,
    loading,
    isRefreshing,
    error,
    refresh,
  };
}
