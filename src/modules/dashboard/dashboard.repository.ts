import { getMemoryCustomerRepositoryForTests } from "../customers/customer.service.js";
import { getMemoryServiceCatalogRepositoryForTests } from "../service-catalog/service-catalog.service.js";
import { getMemoryTeamRepositoryForTests } from "../teams/team.service.js";
import { getMemoryVehicleRepositoryForTests } from "../vehicles/vehicle.service.js";
import { getMemoryWorkOrderRepositoryForTests } from "../work-orders/work-order.service.js";
import type {
  WorkOrder,
  WorkOrderEvent,
  WorkOrderPriority,
  WorkOrderStatus,
} from "../work-orders/work-order.types.js";
import type {
  DashboardCriticalWorkOrder,
  DashboardRecentEvent,
  DashboardSummary,
  DashboardSummaryInput,
} from "./dashboard.types.js";
import {
  DASHBOARD_CRITICAL_LIMIT,
  DASHBOARD_RECENT_EVENTS_LIMIT,
  DASHBOARD_TERMINAL_STATUSES,
  emptyWorkOrdersByStatus,
} from "./dashboard.types.js";

/** Large page size so the in-memory scan reads every row for the tenant. */
const FULL_SCAN_LIMIT = Number.MAX_SAFE_INTEGER;

export interface DashboardRepository {
  getSummary(input: DashboardSummaryInput): Promise<DashboardSummary>;
}

export const PRIORITY_WEIGHT: Record<WorkOrderPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/** Minimal projection of a work order needed for the critical-list card. */
type CriticalWorkOrderSource = {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly status: WorkOrderStatus;
  readonly priority: WorkOrderPriority;
  readonly scheduledFor?: Date;
  readonly customerName?: string;
};

/** Minimal projection of a work order event needed for the recent-events feed. */
type RecentEventSource = {
  readonly id: string;
  readonly workOrderId: string;
  readonly eventType: WorkOrderEvent["eventType"];
  readonly message: string;
  readonly createdAt: Date;
};

/** Midnight (local) of the reference day — start of the "today" window. */
export function startOfDay(reference: Date): Date {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);

  return start;
}

/** Reference time minus 7 days — start of the "this week" window. */
export function weekAgoFrom(reference: Date): Date {
  return new Date(reference.getTime() - 7 * 24 * 60 * 60 * 1000);
}

/** Past its scheduled date and not in a terminal status. */
export function isWorkOrderOverdue(
  workOrder: { readonly scheduledFor?: Date; readonly status: WorkOrderStatus },
  now: Date,
): boolean {
  return (
    workOrder.scheduledFor !== undefined &&
    workOrder.scheduledFor.getTime() < now.getTime() &&
    !DASHBOARD_TERMINAL_STATUSES.includes(workOrder.status)
  );
}

/** Overdue, or flagged high/urgent — the candidates for the critical list. */
export function isCriticalWorkOrder(
  workOrder: { readonly scheduledFor?: Date; readonly status: WorkOrderStatus; readonly priority: WorkOrderPriority },
  now: Date,
): boolean {
  return (
    isWorkOrderOverdue(workOrder, now) ||
    workOrder.priority === "high" ||
    workOrder.priority === "urgent"
  );
}

/**
 * Orders critical work orders most-urgent first: overdue ahead of the rest, then
 * the earliest scheduled date, then the higher priority, then the newest.
 */
export function compareCriticalWorkOrders(now: Date) {
  return (left: WorkOrder, right: WorkOrder): number => {
    const leftOverdue = isWorkOrderOverdue(left, now);
    const rightOverdue = isWorkOrderOverdue(right, now);
    if (leftOverdue !== rightOverdue) return leftOverdue ? -1 : 1;

    const leftTime = left.scheduledFor ? left.scheduledFor.getTime() : Number.POSITIVE_INFINITY;
    const rightTime = right.scheduledFor ? right.scheduledFor.getTime() : Number.POSITIVE_INFINITY;
    if (leftTime !== rightTime) return leftTime - rightTime;

    const weight = PRIORITY_WEIGHT[right.priority] - PRIORITY_WEIGHT[left.priority];
    if (weight !== 0) return weight;

    return right.createdAt.getTime() - left.createdAt.getTime();
  };
}

export function toCriticalWorkOrder(workOrder: CriticalWorkOrderSource): DashboardCriticalWorkOrder {
  return {
    id: workOrder.id,
    code: workOrder.code,
    title: workOrder.title,
    status: workOrder.status,
    priority: workOrder.priority,
    scheduledFor: workOrder.scheduledFor ?? null,
    customerName: workOrder.customerName ?? null,
  };
}

export function toRecentEvent(event: RecentEventSource): DashboardRecentEvent {
  return {
    id: event.id,
    workOrderId: event.workOrderId,
    eventType: event.eventType,
    message: event.message,
    createdAt: event.createdAt,
  };
}

/**
 * Computes the summary from the in-memory singletons the cadastro/work-order
 * memory services write to, so anything created via the API is reflected here.
 * Small data sets only — it scans every tenant row and counts in JS.
 */
export class InMemoryDashboardRepository implements DashboardRepository {
  async getSummary(input: DashboardSummaryInput): Promise<DashboardSummary> {
    const { tenantId, now } = input;
    const workOrderRepository = getMemoryWorkOrderRepositoryForTests();

    const workOrders = (
      await workOrderRepository.list({ tenantId, limit: FULL_SCAN_LIMIT, offset: 0 })
    ).items;

    const byStatus = emptyWorkOrdersByStatus();
    const todayStart = startOfDay(now).getTime();
    const weekStart = weekAgoFrom(now).getTime();
    let createdToday = 0;
    let createdThisWeek = 0;
    let overdue = 0;

    for (const workOrder of workOrders) {
      byStatus[workOrder.status] += 1;

      const createdAt = workOrder.createdAt.getTime();
      if (createdAt >= todayStart) createdToday += 1;
      if (createdAt >= weekStart) createdThisWeek += 1;
      if (isWorkOrderOverdue(workOrder, now)) overdue += 1;
    }

    const criticalWorkOrders = [...workOrders]
      .filter((workOrder) => isCriticalWorkOrder(workOrder, now))
      .sort(compareCriticalWorkOrders(now))
      .slice(0, DASHBOARD_CRITICAL_LIMIT)
      .map(toCriticalWorkOrder);

    const events: WorkOrderEvent[] = [];
    for (const workOrder of workOrders) {
      const timeline = await workOrderRepository.listTimeline(tenantId, workOrder.id);
      events.push(...timeline);
    }
    const recentEvents = events
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, DASHBOARD_RECENT_EVENTS_LIMIT)
      .map(toRecentEvent);

    const [customers, vehicles, teams, services] = await Promise.all([
      getMemoryCustomerRepositoryForTests().list({ tenantId, isActive: true, limit: FULL_SCAN_LIMIT, offset: 0 }),
      getMemoryVehicleRepositoryForTests().list({ tenantId, isActive: true, limit: FULL_SCAN_LIMIT, offset: 0 }),
      getMemoryTeamRepositoryForTests().list({ tenantId, isActive: true, limit: FULL_SCAN_LIMIT, offset: 0 }),
      getMemoryServiceCatalogRepositoryForTests().list({ tenantId, isActive: true, limit: FULL_SCAN_LIMIT, offset: 0 }),
    ]);

    return {
      workOrders: {
        total: workOrders.length,
        byStatus,
        createdToday,
        createdThisWeek,
        overdue,
      },
      registry: {
        customers: customers.total,
        vehicles: vehicles.total,
        teams: teams.total,
        services: services.total,
      },
      criticalWorkOrders,
      recentEvents,
    };
  }
}
