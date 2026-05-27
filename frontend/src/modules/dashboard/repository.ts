import { mockAlerts, mockKpis } from "../../mocks/dashboard/dashboard";
import { mockEvents } from "../../mocks/events/events";
import { mockWorkOrders } from "../../mocks/work-orders/workOrders";

export async function getOperationalDashboard() {
  await new Promise((resolve) => window.setTimeout(resolve, 250));
  return {
    kpis: mockKpis,
    alerts: mockAlerts,
    criticalWorkOrders: mockWorkOrders,
    recentEvents: mockEvents,
  };
}
