import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { listSuppliersFromApi } from "./suppliers.service";
import type { SuppliersData, SuppliersFilters } from "./suppliers.types";

// Hook de listagem de Fornecedores. Carrega a janela (limit) uma vez; busca/situação/
// ordenação/paginação são client-side na dense-list (mesmo padrão dos Cadastros irmãos).
export function useSuppliers(filters: SuppliersFilters) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [data, setData] = useState<SuppliersData>({ items: [], pagination: { limit: 20, offset: 0, total: 0 }, source: "api" });
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

  // WS-UI-REFRESH — refresh(background): em segundo plano NÃO mostra o skeleton (mantém o dado atual
  // visível, sem flicker no auto-refresh); só a 1ª carga / refresh explícito usa `loading`.
  const refresh = useCallback(async (background = false) => {
    if (!activeContext) return;

    if (background) setIsRefreshing(true);
    else setLoading(true);
    setError(null);
    const nextData = await listSuppliersFromApi(context, filters);
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
