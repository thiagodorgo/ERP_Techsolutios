import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { listTagsFromApi } from "./tags.service";
import type { TagsData, TagsFilters } from "./tags.types";

// Hook de listagem de Etiquetas. Carrega a janela (limit) uma vez; busca/situação/
// ordenação/paginação são client-side na dense-list (mesmo padrão dos Cadastros irmãos).
export function useTags(filters: TagsFilters) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [data, setData] = useState<TagsData>({ items: [], pagination: { limit: 20, offset: 0, total: 0 }, source: "api" });
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
    const nextData = await listTagsFromApi(context, filters);
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
