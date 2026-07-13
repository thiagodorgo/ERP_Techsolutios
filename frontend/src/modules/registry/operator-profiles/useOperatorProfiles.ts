import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { listOperatorProfilesFromApi } from "./operator-profiles.service";
import type { OperatorProfilesData, OperatorProfilesFilters } from "./operator-profiles.types";

// Hook de listagem de Profissionais. Aceita filtro server-side por consentimento (hasConsent):
// ao mudar, a janela é rebuscada; busca/situação/ordenação/paginação são client-side na dense-list.
export function useOperatorProfiles(filters: OperatorProfilesFilters) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [data, setData] = useState<OperatorProfilesData>({ items: [], pagination: { limit: 20, offset: 0, total: 0 }, source: "api" });
  const [loading, setLoading] = useState(false);
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
    const nextData = await listOperatorProfilesFromApi(context, filters);
    setData(nextData);
    if (nextData.source === "fallback") setError(nextData.fallbackReason ?? "Fallback local ativo.");
    setLoading(false);
  }, [activeContext, context, filters]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    items: data.items,
    pagination: data.pagination,
    source: data.source,
    loading,
    error,
    refresh,
  };
}
