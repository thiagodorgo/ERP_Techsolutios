import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../providers/AuthProvider";
import { usePermissions } from "../../providers/PermissionProvider";
import { useTenantContext } from "../../providers/TenantProvider";
import { getUnreadNotificationCount } from "../notifications/notification.service";
import { listDispatchesFromApi } from "../operations/dispatches/dispatches.service";
import { getLatestFieldLocations } from "../operations/map/operations-map.service";
import { listAllPendingApprovals } from "../work-orders/approval.service";
import { useWorkOrders } from "../work-orders/useWorkOrders";
import type { DispatchListItem, DispatchesSource } from "../operations/dispatches/dispatches.types";
import type { FieldLocationItem, OperationsMapSource } from "../operations/map/operations-map.types";
import type { OperationalApproval } from "../work-orders/approval.types";
import type { WorkOrdersFilters } from "../work-orders/work-orders.types";

// B-124 — fonte única de dados do Dashboard enriquecido. Carrega em paralelo:
// GET /work-orders (via useWorkOrders) · GET /operations/dispatches ·
// GET /field-locations/latest · GET /notifications/unread-count ·
// GET /approvals/pending. Cada fonte degrada de forma independente (as
// services já aplicam mock atrás de VITE_USE_MOCKS e fallback local seguro);
// aprovações/notificações apenas se marcam como indisponíveis, sem quebrar.

const STABLE_FILTERS: WorkOrdersFilters = {
  search: "",
  status: "all",
  priority: "all",
  assignedOperatorId: "",
  from: "",
  to: "",
};

export type DashboardSourceState = "api" | "mock" | "fallback";

export type DashboardData = {
  readonly loading: boolean;
  readonly workOrders: ReturnType<typeof useWorkOrders>["items"];
  readonly workOrdersSource: DashboardSourceState;
  readonly dispatches: readonly DispatchListItem[];
  readonly dispatchesSource: DispatchesSource;
  readonly locations: readonly FieldLocationItem[];
  readonly locationsSource: OperationsMapSource;
  readonly pendingApprovals: readonly OperationalApproval[];
  readonly approvalsUnavailable: boolean;
  readonly unread: number | null;
  readonly refresh: () => Promise<void>;
};

export function useDashboardData(): DashboardData {
  const { session } = useAuth();
  const { activeContext } = useTenantContext();
  const { permissions } = usePermissions();
  const workOrdersState = useWorkOrders(STABLE_FILTERS);

  const [dispatches, setDispatches] = useState<readonly DispatchListItem[]>([]);
  const [dispatchesSource, setDispatchesSource] = useState<DispatchesSource>("api");
  const [locations, setLocations] = useState<readonly FieldLocationItem[]>([]);
  const [locationsSource, setLocationsSource] = useState<OperationsMapSource>("api");
  const [pendingApprovals, setPendingApprovals] = useState<readonly OperationalApproval[]>([]);
  const [approvalsUnavailable, setApprovalsUnavailable] = useState(false);
  const [unread, setUnread] = useState<number | null>(null);
  const [loadingExtras, setLoadingExtras] = useState(true);

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

  const canReadNotifications = permissions.includes("notifications:read");

  const loadExtras = useCallback(async () => {
    if (!activeContext) return;
    setLoadingExtras(true);

    const [dispatchesResult, locationsResult, approvalsResult, unreadResult] = await Promise.allSettled([
      listDispatchesFromApi(context),
      getLatestFieldLocations(context),
      listAllPendingApprovals(context),
      canReadNotifications ? getUnreadNotificationCount({ ...context, tenantId: activeContext.tenantId }) : Promise.resolve(null),
    ]);

    // Despachos e localizações: as services nunca lançam (fallback interno).
    if (dispatchesResult.status === "fulfilled") {
      setDispatches(dispatchesResult.value.items);
      setDispatchesSource(dispatchesResult.value.source);
    } else {
      setDispatches([]);
      setDispatchesSource("fallback");
    }

    if (locationsResult.status === "fulfilled") {
      setLocations(locationsResult.value.locations);
      setLocationsSource(locationsResult.value.source);
    } else {
      setLocations([]);
      setLocationsSource("fallback");
    }

    // Aprovações: erro (403/404/500/timeout) degrada sem quebrar o Dashboard.
    if (approvalsResult.status === "fulfilled") {
      setPendingApprovals(approvalsResult.value);
      setApprovalsUnavailable(false);
    } else {
      setPendingApprovals([]);
      setApprovalsUnavailable(true);
    }

    if (unreadResult.status === "fulfilled" && unreadResult.value !== null) {
      setUnread(unreadResult.value.count);
    } else {
      setUnread(null);
    }

    setLoadingExtras(false);
  }, [activeContext, canReadNotifications, context]);

  useEffect(() => {
    void loadExtras();
  }, [loadExtras]);

  const refresh = useCallback(async () => {
    await Promise.all([workOrdersState.refresh(), loadExtras()]);
  }, [loadExtras, workOrdersState.refresh]);

  return {
    loading: workOrdersState.loading || loadingExtras,
    workOrders: workOrdersState.items,
    workOrdersSource: workOrdersState.source,
    dispatches,
    dispatchesSource,
    locations,
    locationsSource,
    pendingApprovals,
    approvalsUnavailable,
    unread,
    refresh,
  };
}
