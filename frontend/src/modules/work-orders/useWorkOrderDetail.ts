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
    if (!activeContext || !workOrderId) return;

    setLoading(true);
    const [detail, events] = await Promise.all([
      getWorkOrderFromApi(context, workOrderId),
      getWorkOrderTimeline(context, workOrderId),
    ]);
    setWorkOrder(detail.workOrder);
    setSource(detail.source);
    setFallbackReason(detail.fallbackReason);
    setTimeline(events);
    setLoading(false);
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
    refresh,
    context,
  };
}
