import type { WorkOrderPriority, WorkOrderStatus } from "../../work-orders/work-orders.types";

export type FieldLocationStatus =
  | "available"
  | "on_route"
  | "on_site"
  | "in_service"
  | "paused"
  | "offline"
  | "blocked"
  | "unknown";

export type OperationsMapSource = "api" | "mock" | "fallback";

export type FieldLocationItem = {
  readonly id: string;
  readonly operatorId: string;
  readonly userId?: string;
  readonly displayName: string;
  readonly operatorName?: string;
  readonly teamName?: string | null;
  readonly status: FieldLocationStatus;
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyMeters?: number | null;
  readonly speed?: number | null;
  readonly heading?: number | null;
  readonly batteryLevel?: number | null;
  readonly capturedAt: string;
  readonly receivedAt?: string;
  readonly isStale: boolean;
  readonly currentWorkOrder?: OperationsMapWorkOrder | null;
};

export type OperationsMapWorkOrder = {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly status: WorkOrderStatus;
  readonly priority: WorkOrderPriority;
  readonly customerName?: string | null;
  readonly serviceAddress?: string | null;
  readonly scheduledFor?: string | null;
};

export type OperationsMapData = {
  readonly locations: FieldLocationItem[];
  readonly source: OperationsMapSource;
  readonly fallbackReason?: string;
};

export type OperationsMapFilters = {
  readonly status: FieldLocationStatus | "all";
  readonly team: string;
  readonly staleOnly: boolean;
  readonly search: string;
};

export type OperationsMapApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

export type FieldLocationHistoryParams = {
  readonly operatorUserId: string;
  readonly from?: string;
  readonly to?: string;
  readonly limit?: number;
};

export type OperationsMapSummary = {
  readonly total: number;
  readonly available: number;
  readonly onRoute: number;
  readonly inService: number;
  readonly stale: number;
  readonly offlineOrBlocked: number;
};

export const FIELD_LOCATION_STATUSES: readonly FieldLocationStatus[] = [
  "available",
  "on_route",
  "on_site",
  "in_service",
  "paused",
  "offline",
  "blocked",
  "unknown",
];
