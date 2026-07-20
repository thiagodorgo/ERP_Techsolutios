import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../providers/AuthProvider";
import { useTenantContext } from "../../providers/TenantProvider";
import { getWorkOrderTimeseries } from "./work-order-timeseries.service";
import type { WorkOrderTimeseriesData } from "./work-order-timeseries.types";
import { emptyTimeseries } from "./work-order-timeseries.types";

const DEFAULT_DAYS = 30;

// WS-CARDS-CHARTS-F2 — carrega a série diária de OS (abertas/concluídas/canceladas) da organização ativa
// para o gráfico do Dashboard Operacional. Espelha useFinancialSummary: monta o `context` da sessão/
// organização, faz refresh no mount e quando o contexto muda, e expõe {data,loading,isRefreshing,refresh}.
// Os números vêm do backend (o front nunca soma; D-007).
//
// `enabled` (default true) gateia o fetch pela permissão `work_orders:read`: quem não tem a permissão NÃO
// dispara GET /operations/work-orders-timeseries (nenhum 403 na montagem nem a cada auto-refresh). Nesse
// caso o estado inicial já é `forbidden:true` → o card mostra "Acesso não permitido" (§7) e os pop-ups de
// "Concluídas"/"OS hoje" degradam para explicação honesta (chartUsable=false quando forbidden).
export function useWorkOrderTimeseries(days: number = DEFAULT_DAYS, enabled: boolean = true) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [data, setData] = useState<WorkOrderTimeseriesData>(() =>
    enabled ? emptyTimeseries("api") : { ...emptyTimeseries("fallback"), forbidden: true },
  );
  const [loading, setLoading] = useState(enabled);
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

  // WS-UI-REFRESH — refresh(background): em segundo plano NÃO mostra o skeleton (mantém o gráfico atual
  // visível, sem flicker no auto-refresh); só a 1ª carga usa `loading`.
  const refresh = useCallback(async (background = false) => {
    if (!enabled) return; // sem work_orders:read → nenhum fetch (nem no auto-refresh)
    if (!activeContext) return;
    if (background) setIsRefreshing(true);
    else setLoading(true);
    setData(await getWorkOrderTimeseries(context, { days }));
    setLoading(false);
    setIsRefreshing(false);
  }, [enabled, activeContext, context, days]);

  useEffect(() => {
    if (!enabled) {
      // Sem permissão: nenhum fetch; estado "acesso não permitido" honesto (D-007).
      setData({ ...emptyTimeseries("fallback"), forbidden: true });
      setLoading(false);
      return;
    }
    void refresh();
  }, [enabled, refresh]);

  return { data, loading, isRefreshing, refresh };
}
