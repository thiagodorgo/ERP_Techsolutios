import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../../providers/AuthProvider";
import { useTenantContext } from "../../../providers/TenantProvider";
import { getFinancialSummaryFromApi } from "./financial-summary.service";
import type { FinancialSummaryData } from "./financial-summary.types";
import { emptyFinancialSummary } from "./financial-summary.types";

// Carrega o agregado financeiro do tenant (KPIs/fluxo/títulos recentes) da sessão/organização ativa. Os
// números vêm SOMADOS do backend (o front nunca soma; P-Ω4-2B-KPI-AGREGADO resolvido no Ω4-8a).
export function useFinancialSummary() {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [data, setData] = useState<FinancialSummaryData>({ ...emptyFinancialSummary(), source: "api" });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    setData(await getFinancialSummaryFromApi(context));
    setLoading(false);
    setIsRefreshing(false);
  }, [activeContext, context]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, isRefreshing, refresh };
}
