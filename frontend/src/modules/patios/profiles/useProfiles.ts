import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { listProfilesFromApi } from "./profiles.service";
import type { ProfilesData, ProfilesFilters } from "./profiles.types";

// Hook de listagem de Perfis Normativos. Carrega a janela (limit) uma vez; busca/situação/ordenação/paginação
// são client-side na dense-list (padrão dos cadastros irmãos).
export function useProfiles(filters: ProfilesFilters) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [data, setData] = useState<ProfilesData>({ items: [], pagination: { limit: 20, offset: 0, total: 0 }, source: "api" });
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
    const nextData = await listProfilesFromApi(context, filters);
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
