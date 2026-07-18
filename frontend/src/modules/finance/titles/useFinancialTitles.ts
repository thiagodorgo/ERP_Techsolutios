import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { listFinancialTitlesFromApi } from "./financial-titles.service";
import type { FinancialTitleDirection, FinancialTitlesData } from "./financial-titles.types";

// Hook parametrizado por direction — a MESMA lógica alimenta Cobranças (receivable) e Pagamentos
// (payable). O contexto (token/tenant/permissões) vem da sessão/organização ativa e serve tanto ao
// carregamento da lista quanto às ações de escrita (criar/transição de status).
export function useFinancialTitles(direction: FinancialTitleDirection) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [data, setData] = useState<FinancialTitlesData>({
    items: [],
    pagination: { limit: 20, offset: 0, total: 0 },
    source: "api",
  });
  const [loading, setLoading] = useState(true);

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
    const nextData = await listFinancialTitlesFromApi(context, { direction });
    setData(nextData);
    setLoading(false);
  }, [activeContext, context, direction]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    items: data.items,
    pagination: data.pagination,
    source: data.source,
    fallbackReason: data.fallbackReason,
    loading,
    refresh,
    context,
  };
}
