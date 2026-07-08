import type { Permission, Role } from "../core-saas/permissions/catalog.js";
import type {
  WorkOrderEventType,
  WorkOrderPriority,
  WorkOrderStatus,
} from "../work-orders/work-order.types.js";
import { WORK_ORDER_STATUSES } from "../work-orders/work-order.types.js";

export type DashboardActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

/**
 * Statuses that close a work order's lifecycle. A work order in one of these is
 * never counted as "overdue" and never surfaces in the critical list, even when
 * its scheduled date is in the past.
 */
export const DASHBOARD_TERMINAL_STATUSES: readonly WorkOrderStatus[] = [
  "completed",
  "cancelled",
  "rejected",
];

/** Number of critical work orders returned by the summary. */
export const DASHBOARD_CRITICAL_LIMIT = 8;

/** Number of recent events returned by the summary. */
export const DASHBOARD_RECENT_EVENTS_LIMIT = 10;

export type WorkOrdersByStatus = Record<WorkOrderStatus, number>;

export type DashboardWorkOrdersSummary = {
  readonly total: number;
  readonly byStatus: WorkOrdersByStatus;
  readonly createdToday: number;
  readonly createdThisWeek: number;
  readonly overdue: number;
};

export type DashboardRegistrySummary = {
  readonly customers: number;
  readonly vehicles: number;
  readonly teams: number;
  readonly services: number;
};

export type DashboardCriticalWorkOrder = {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly status: WorkOrderStatus;
  readonly priority: WorkOrderPriority;
  readonly scheduledFor: Date | null;
  readonly customerName: string | null;
};

export type DashboardRecentEvent = {
  readonly id: string;
  readonly workOrderId: string;
  readonly eventType: WorkOrderEventType;
  readonly message: string;
  readonly createdAt: Date;
};

export type DashboardSummary = {
  readonly workOrders: DashboardWorkOrdersSummary;
  readonly registry: DashboardRegistrySummary;
  readonly criticalWorkOrders: readonly DashboardCriticalWorkOrder[];
  readonly recentEvents: readonly DashboardRecentEvent[];
};

export type DashboardSummaryInput = {
  readonly tenantId: string;
  /** Fixed reference time so "today"/"this week"/"overdue" are deterministic. */
  readonly now: Date;
};

/**
 * Zero-filled status map so every status key is always present in the response,
 * even for tenants with no work order in that status.
 */
export function emptyWorkOrdersByStatus(): WorkOrdersByStatus {
  return WORK_ORDER_STATUSES.reduce((accumulator, status) => {
    accumulator[status] = 0;

    return accumulator;
  }, {} as WorkOrdersByStatus);
}

export class DashboardError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "DashboardError";
  }
}
