import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../providers/AuthProvider";
import { useTenantContext } from "../../providers/TenantProvider";
import { getWorkOrderFromApi, getWorkOrderTimeline } from "./work-orders.service";
import { initialDetailState, nextDetailState } from "./work-orders.state";

export function useWorkOrderDetail(workOrderId: string | undefined) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  // B-SAN3-01 — o estado (não encontrada ≠ sem permissão ≠ erro ≠ desatualizado ≠ histórico indisponível) é
  // decidido pelo reducer puro `nextDetailState` (work-orders.state.ts). Nada aqui fabrica OS nem evento.
  const [state, setState] = useState(initialDetailState);
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

  // WS-UI-REFRESH — refresh(background): em segundo plano NÃO mostra o skeleton de página inteira (o auto-refresh
  // atualiza a OS e a timeline sem piscar a tela nem remontar as abas; drafts locais das abas sobrevivem).
  // B-SAN3-01 — `allSettled`: a timeline falhar não derruba a OS (vira "Histórico indisponível"), e falha em
  // segundo plano com OS já na tela mantém a OS e marca `stale` (§4.3-3).
  const refresh = useCallback(async (background = false) => {
    if (!activeContext || !workOrderId) return;

    if (background) setIsRefreshing(true);
    else setLoading(true);
    const [detail, timeline] = await Promise.allSettled([
      getWorkOrderFromApi(context, workOrderId),
      getWorkOrderTimeline(context, workOrderId),
    ]);
    setState((prev) => nextDetailState(prev, { detail, timeline }, background));
    setLoading(false);
    setIsRefreshing(false);
  }, [activeContext, context, workOrderId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...state,
    loading,
    isRefreshing,
    refresh,
    context,
  };
}
