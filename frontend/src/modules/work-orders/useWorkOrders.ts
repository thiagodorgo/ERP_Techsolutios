import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../providers/AuthProvider";
import { useTenantContext } from "../../providers/TenantProvider";
import { filterWorkOrders } from "./work-orders.adapter";
import { listWorkOrdersFromApi } from "./work-orders.service";
import { initialListState, nextListState } from "./work-orders.state";
import type { WorkOrdersFilters } from "./work-orders.types";

export function useWorkOrders(filters: WorkOrdersFilters) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  // B-SAN3-01 — o estado (vazio ≠ erro ≠ sem permissão ≠ desatualizado) é decidido pelo reducer puro
  // `nextListState` (work-orders.state.ts), testável sem React. Nada aqui fabrica item.
  const [state, setState] = useState(initialListState);
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

  // WS-UI-REFRESH — refresh(background): em segundo plano NÃO mostra o skeleton (mantém a lista atual
  // visível, sem flicker no auto-refresh); só a 1ª carga / refresh explícito usa `loading`.
  // B-SAN3-01 — falha em segundo plano com dado já carregado mantém a lista e marca `stale` (§4.3-3).
  const refresh = useCallback(async (background = false) => {
    if (!activeContext) return;

    if (background) setIsRefreshing(true);
    else setLoading(true);
    const result = await listWorkOrdersFromApi(context, filters);
    setState((prev) => nextListState(prev, result, background));
    setLoading(false);
    setIsRefreshing(false);
  }, [activeContext, context, filters]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...state.data,
    items: filterWorkOrders(state.data.items, filters),
    allItems: state.data.items,
    status: state.status,
    loading,
    isRefreshing,
    error: state.error,
    forbidden: state.forbidden,
    stale: state.stale,
    lastUpdatedAt: state.lastUpdatedAt,
    refresh,
    // Ω3F-9 — o mesmo contexto que alimenta a lista serve às ações de linha (avançar status, revogar envio).
    context,
  };
}
