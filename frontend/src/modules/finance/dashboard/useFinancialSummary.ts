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
    setData(await getFinancialSummaryFromApi(context));
    setLoading(false);
  }, [activeContext, context]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, refresh };
}
