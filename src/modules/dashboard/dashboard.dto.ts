import type { DashboardSummary } from "./dashboard.types.js";

/**
 * Serializes the summary for the `{ data }` envelope. Dates become ISO strings
 * (null when absent); no tenant_id or other internal field is ever exposed.
 */
export function toDashboardSummaryDto(summary: DashboardSummary) {
  return {
    workOrders: {
      total: summary.workOrders.total,
      byStatus: { ...summary.workOrders.byStatus },
      createdToday: summary.workOrders.createdToday,
      createdThisWeek: summary.workOrders.createdThisWeek,
      overdue: summary.workOrders.overdue,
    },
    registry: {
      customers: summary.registry.customers,
      vehicles: summary.registry.vehicles,
      teams: summary.registry.teams,
      services: summary.registry.services,
    },
    criticalWorkOrders: summary.criticalWorkOrders.map((workOrder) => ({
      id: workOrder.id,
      code: workOrder.code,
      title: workOrder.title,
      status: workOrder.status,
      priority: workOrder.priority,
      scheduledFor: workOrder.scheduledFor ? workOrder.scheduledFor.toISOString() : null,
      customerName: workOrder.customerName,
    })),
    recentEvents: summary.recentEvents.map((event) => ({
      id: event.id,
      workOrderId: event.workOrderId,
      eventType: event.eventType,
      message: event.message,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}
