import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../providers/AuthProvider";
import { useTenantContext } from "../../providers/TenantProvider";
import { getWorkOrderFromApi, getWorkOrderTimeline } from "./work-orders.service";
import type { WorkOrderDetail, WorkOrderEvent, WorkOrdersSource } from "./work-orders.types";

export function useWorkOrderDetail(workOrderId: string | undefined) {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const [workOrder, setWorkOrder] = useState<WorkOrderDetail | null>(null);
  const [timeline, setTimeline] = useState<WorkOrderEvent[]>([]);
  const [source, setSource] = useState<WorkOrdersSource>("api");
  const [fallbackReason, setFallbackReason] = useState<string | undefined>();
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
  const refresh = useCallback(async (background = false) => {
    if (!activeContext || !workOrderId) return;

    if (background) setIsRefreshing(true);
    else setLoading(true);
    const [detail, events] = await Promise.all([
      getWorkOrderFromApi(context, workOrderId),
      getWorkOrderTimeline(context, workOrderId),
    ]);
    setWorkOrder(detail.workOrder);
    setSource(detail.source);
    setFallbackReason(detail.fallbackReason);
    setTimeline(events);
    setLoading(false);
    setIsRefreshing(false);
  }, [activeContext, context, workOrderId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    workOrder,
    timeline,
    source,
    fallbackReason,
    loading,
    isRefreshing,
    refresh,
    context,
  };
}
