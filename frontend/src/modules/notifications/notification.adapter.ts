import { apiRequest } from "../../services/api/client";
import type {
  NotificationApiContext,
  NotificationItem,
  NotificationListFilters,
  NotificationSeverity,
  NotificationStatus,
  NotificationUnreadCount,
} from "./notification.types";

type ApiResponse<T> = {
  data: T;
};

type NotificationApiItem = Omit<NotificationItem, "sourceType" | "sourceId" | "actionUrl" | "readAt" | "createdAt" | "updatedAt"> & {
  sourceType?: string;
  source_type?: string;
  sourceId?: string;
  source_id?: string;
  actionUrl?: string;
  action_url?: string;
  readAt?: string | null;
  read_at?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
};

export function listNotificationsFromApi(
  context: NotificationApiContext,
  filters: NotificationListFilters = {},
): Promise<NotificationItem[]> {
  const query = toQueryString(filters);
  return apiRequest<ApiResponse<NotificationApiItem[]>>(`/notifications${query}`, toRequestOptions(context)).then((response) =>
    response.data.map(mapNotification),
  );
}

export function getUnreadNotificationCountFromApi(context: NotificationApiContext): Promise<NotificationUnreadCount> {
  return apiRequest<ApiResponse<NotificationUnreadCount>>("/notifications/unread-count", toRequestOptions(context)).then(
    (response) => response.data,
  );
}

export function markNotificationAsReadFromApi(
  context: NotificationApiContext,
  notificationId: string,
): Promise<NotificationItem> {
  return apiRequest<ApiResponse<NotificationApiItem>>(`/notifications/${notificationId}/read`, {
    ...toRequestOptions(context),
    method: "POST",
  }).then((response) => mapNotification(response.data));
}

export function markAllNotificationsAsReadFromApi(context: NotificationApiContext): Promise<NotificationUnreadCount> {
  return apiRequest<ApiResponse<NotificationUnreadCount>>("/notifications/read-all", {
    ...toRequestOptions(context),
    method: "POST",
  }).then((response) => response.data);
}

export function archiveNotificationFromApi(context: NotificationApiContext, notificationId: string): Promise<NotificationItem> {
  return apiRequest<ApiResponse<NotificationApiItem>>(`/notifications/${notificationId}/archive`, {
    ...toRequestOptions(context),
    method: "POST",
  }).then((response) => mapNotification(response.data));
}

function toRequestOptions(context: NotificationApiContext) {
  return {
    token: context.token,
    tenantId: context.tenantId,
    branchId: context.branchId,
    role: context.role,
    permissions: context.permissions ? [...context.permissions] : undefined,
  };
}

function toQueryString(filters: NotificationListFilters): string {
  const params = new URLSearchParams();

  if (filters.status) params.set("status", filters.status);
  if (filters.severity) params.set("severity", filters.severity);
  if (filters.type) params.set("type", filters.type);
  if (filters.sourceType) params.set("sourceType", filters.sourceType);
  if (typeof filters.limit === "number") params.set("limit", String(filters.limit));

  const query = params.toString();
  return query ? `?${query}` : "";
}

function mapNotification(item: NotificationApiItem): NotificationItem {
  const now = new Date().toISOString();

  return {
    id: item.id,
    type: item.type,
    title: item.title,
    message: item.message,
    severity: normalizeSeverity(item.severity),
    status: normalizeStatus(item.status),
    sourceType: item.sourceType ?? item.source_type,
    sourceId: item.sourceId ?? item.source_id,
    actionUrl: item.actionUrl ?? item.action_url,
    metadata: item.metadata,
    readAt: item.readAt ?? item.read_at ?? null,
    createdAt: item.createdAt ?? item.created_at ?? now,
    updatedAt: item.updatedAt ?? item.updated_at ?? now,
  };
}

function normalizeStatus(status: string): NotificationStatus {
  if (status === "read" || status === "archived") return status;
  return "unread";
}

function normalizeSeverity(severity: string): NotificationSeverity {
  if (severity === "success" || severity === "warning" || severity === "critical") return severity;
  return "info";
}
