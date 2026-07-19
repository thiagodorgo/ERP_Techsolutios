import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../providers/AuthProvider";
import { useTenantContext } from "../../providers/TenantProvider";
import { listTenantSettingsFromApi } from "./tenant-settings.service";
import type { TenantSettingsApiContext, TenantSettingsData } from "./tenant-settings.types";

// Hook de listagem dos Parâmetros da Organização. Carrega tudo uma vez (poucos itens key-value);
// agrupamento/ordenação são derivados no adapter. Expõe o `context` para o upsert das linhas.
export function useTenantSettings() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [data, setData] = useState<TenantSettingsData>({ items: [], source: "api" });
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const context = useMemo<TenantSettingsApiContext>(
    () => ({
      token: session?.accessToken,
      tenantId: activeContext?.tenantId,
      branchId: activeContext?.branchId,
      role: activeContext?.role,
      permissions: activeContext?.permissions,
    }),
    [activeContext, session?.accessToken],
  );

  // WS-UI-REFRESH — refresh(background): em segundo plano NÃO mostra o skeleton (mantém o valor atual
  // visível, sem flicker no auto-refresh); só a 1ª carga / refresh explícito usa `loading`.
  const refresh = useCallback(async (background = false) => {
    if (!activeContext) return;

    if (background) setIsRefreshing(true);
    else setLoading(true);
    setError(null);
    const next = await listTenantSettingsFromApi(context);
    setData(next);
    if (next.source === "fallback") setError(next.fallbackReason ?? "Fallback local ativo.");
    setLoading(false);
    setIsRefreshing(false);
  }, [activeContext, context]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    items: data.items,
    source: data.source,
    loading,
    isRefreshing,
    error,
    refresh,
    context,
  };
}
