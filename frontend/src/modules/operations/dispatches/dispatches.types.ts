import type { WorkOrderPriority } from "../../work-orders/work-orders.types";

export type DispatchStatus =
  | "draft"
  | "assigned"
  | "accepted"
  | "on_route"
  | "arrived"
  | "in_service"
  | "completed"
  | "cancelled"
  | "reassigned"
  | "failed";

export type DispatchPriority = WorkOrderPriority | "unknown";

export type DispatchListItem = {
  readonly id: string;
  readonly workOrderId: string;
  readonly workOrderCode?: string;
  readonly workOrderTitle?: string;
  readonly operatorUserId: string;
  readonly status: DispatchStatus;
  readonly priority: DispatchPriority;
  readonly observation?: string | null;
  readonly reason?: string | null;
  readonly acceptedAt?: string | null;
  readonly onRouteAt?: string | null;
  readonly arrivedAt?: string | null;
  readonly inServiceAt?: string | null;
  readonly completedAt?: string | null;
  readonly cancelledAt?: string | null;
  readonly failedAt?: string | null;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
  readonly createdAt: string;
  readonly updatedAt?: string;
};

export type DispatchDetail = DispatchListItem & {
  readonly timeline: DispatchEvent[];
};

export type DispatchEvent = {
  readonly id: string;
  readonly dispatchId: string;
  readonly workOrderId: string;
  readonly eventType: string;
  readonly fromStatus?: DispatchStatus | null;
  readonly toStatus?: DispatchStatus | null;
  readonly actorUserId?: string | null;
  readonly message: string;
  readonly metadata?: Record<string, unknown> | null;
  readonly createdAt: string;
};

export type DispatchPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type DispatchesSource = "api" | "mock" | "fallback";

export type DispatchesData = {
  readonly items: DispatchListItem[];
  readonly pagination: DispatchPagination;
  readonly source: DispatchesSource;
  readonly fallbackReason?: string;
};

export type DispatchesFilters = {
  readonly search: string;
  readonly status: DispatchStatus | "all";
  readonly priority: DispatchPriority | "all";
  readonly operatorUserId: string;
  readonly workOrderId?: string;
};

export type DispatchesApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

export type DispatchCreatePayload = {
  readonly workOrderId: string;
  readonly operatorUserId: string;
  readonly status?: Extract<DispatchStatus, "draft" | "assigned">;
  readonly observation?: string;
};

export type DispatchStatusPayload = {
  readonly status: DispatchStatus;
  readonly observation?: string;
  readonly reason?: string;
};

export type DispatchReassignPayload = {
  readonly operatorUserId: string;
  readonly observation?: string;
  readonly reason?: string;
};

export type DispatchesSummary = {
  readonly total: number;
  readonly assigned: number;
  readonly inRoute: number;
  readonly inService: number;
  readonly completed: number;
  readonly cancelled: number;
  readonly urgent: number;
};

export const DISPATCH_STATUSES: readonly DispatchStatus[] = [
  "draft",
  "assigned",
  "accepted",
  "on_route",
  "arrived",
  "in_service",
  "completed",
  "cancelled",
  "reassigned",
  "failed",
];

export const DISPATCH_PRIORITIES: readonly DispatchPriority[] = ["low", "medium", "high", "urgent", "unknown"];
