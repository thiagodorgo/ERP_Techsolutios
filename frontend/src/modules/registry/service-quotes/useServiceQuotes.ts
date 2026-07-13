import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { listServiceQuotesFromApi } from "./service-quotes.service";
import type { ServiceQuotesData, ServiceQuotesFilters } from "./service-quotes.types";

// Hook de listagem de Orçamentos. Carrega a janela (limit) uma vez; busca/situação/status/
// ordenação/paginação são client-side na dense-list (mesmo padrão dos Cadastros irmãos).
export function useServiceQuotes(filters: ServiceQuotesFilters) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [data, setData] = useState<ServiceQuotesData>({ items: [], pagination: { limit: 20, offset: 0, total: 0 }, source: "api" });
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
    const nextData = await listServiceQuotesFromApi(context, filters);
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
