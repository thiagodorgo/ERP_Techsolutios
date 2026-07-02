import { isMockMode } from "../../config/env";
import { getStoredToken } from "../auth/auth.storage";
import { mockAlerts, mockKpis } from "../../mocks/dashboard/dashboard";
import { mockEvents } from "../../mocks/events/events";
import { mockWorkOrders } from "../../mocks/work-orders/workOrders";
import { listWorkOrdersFromApi } from "../work-orders/work-orders.service";
import { deriveDashboardKpis } from "./dashboard.adapter";

export async function getOperationalDashboard() {
  if (isMockMode()) {
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    return {
      kpis: mockKpis,
      alerts: mockAlerts,
      criticalWorkOrders: mockWorkOrders,
      recentEvents: mockEvents,
    };
  }

  // Modo real: KPIs derivados das OS reais. Alertas/OS-críticas/eventos seguem
  // mock enquanto não há endpoints dedicados (fallback seguro, sem quebrar a UI).
  try {
    const workOrders = await listWorkOrdersFromApi({ token: getStoredToken() ?? undefined });
    return {
      kpis: deriveDashboardKpis(workOrders),
      alerts: mockAlerts,
      criticalWorkOrders: mockWorkOrders,
      recentEvents: mockEvents,
    };
  } catch {
    return {
      kpis: mockKpis,
      alerts: mockAlerts,
      criticalWorkOrders: mockWorkOrders,
      recentEvents: mockEvents,
    };
  }
}
