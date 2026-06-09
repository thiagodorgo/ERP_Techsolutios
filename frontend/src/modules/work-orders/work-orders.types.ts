export type WorkOrderStatus =
  | "open"
  | "assigned"
  | "accepted"
  | "on_route"
  | "on_site"
  | "in_progress"
  | "paused"
  | "completed"
  | "cancelled"
  | "rejected";

export type WorkOrderPriority = "low" | "medium" | "high" | "urgent";

export type WorkOrderListItem = {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly description?: string | null;
  readonly status: WorkOrderStatus;
  readonly priority: WorkOrderPriority;
  readonly customerName?: string | null;
  readonly customerPhone?: string | null;
  readonly serviceAddress?: string | null;
  readonly serviceCity?: string | null;
  readonly serviceState?: string | null;
  readonly serviceZipCode?: string | null;
  readonly serviceLatitude?: number | null;
  readonly serviceLongitude?: number | null;
  readonly assignedOperatorId?: string | null;
  readonly assignedUserId?: string | null;
  readonly checklistId?: string | null;
  readonly scheduledFor?: string | null;
  readonly startedAt?: string | null;
  readonly arrivedAt?: string | null;
  readonly completedAt?: string | null;
  readonly cancelledAt?: string | null;
  readonly cancellationReason?: string | null;
  readonly createdAt: string;
  readonly updatedAt?: string;
};

export type WorkOrderDetail = WorkOrderListItem & {
  readonly customerDocument?: string | null;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
};

export type WorkOrderEvent = {
  readonly id: string;
  readonly workOrderId?: string;
  readonly eventType: string;
  readonly fromStatus?: WorkOrderStatus | null;
  readonly toStatus?: WorkOrderStatus | null;
  readonly actorUserId?: string | null;
  readonly message: string;
  readonly metadata?: Record<string, unknown> | null;
  readonly createdAt: string;
};

export type WorkOrdersPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type WorkOrdersSource = "api" | "mock" | "fallback";

export type WorkOrdersData = {
  readonly items: WorkOrderListItem[];
  readonly pagination: WorkOrdersPagination;
  readonly source: WorkOrdersSource;
  readonly fallbackReason?: string;
};

export type WorkOrdersFilters = {
  readonly search: string;
  readonly status: WorkOrderStatus | "all";
  readonly priority: WorkOrderPriority | "all";
  readonly assignedOperatorId: string;
  readonly from: string;
  readonly to: string;
};

export type WorkOrdersApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

export type WorkOrderCreatePayload = {
  readonly title: string;
  readonly description?: string;
  readonly customerName?: string;
  readonly customerPhone?: string;
  readonly serviceAddress?: string;
  readonly serviceCity?: string;
  readonly serviceState?: string;
  readonly serviceZipCode?: string;
  readonly serviceLatitude?: number | null;
  readonly serviceLongitude?: number | null;
  readonly priority: WorkOrderPriority;
  readonly scheduledFor?: string | null;
};

export type WorkOrderUpdatePayload = Partial<WorkOrderCreatePayload> & {
  readonly checklistId?: string | null;
};

export type WorkOrderStatusPayload = {
  readonly status: WorkOrderStatus;
  readonly message?: string;
  readonly cancellationReason?: string;
};

export type WorkOrderAssignPayload = {
  readonly operatorId: string;
  readonly userId?: string;
  readonly message?: string;
};

export type WorkOrdersSummary = {
  readonly total: number;
  readonly open: number;
  readonly assigned: number;
  readonly inService: number;
  readonly completed: number;
  readonly cancelled: number;
  readonly urgent: number;
};

export const WORK_ORDER_STATUSES: readonly WorkOrderStatus[] = [
  "open",
  "assigned",
  "accepted",
  "on_route",
  "on_site",
  "in_progress",
  "paused",
  "completed",
  "cancelled",
  "rejected",
];

export const WORK_ORDER_PRIORITIES: readonly WorkOrderPriority[] = ["low", "medium", "high", "urgent"];
