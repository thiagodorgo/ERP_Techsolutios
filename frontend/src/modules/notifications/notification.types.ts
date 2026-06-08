export type NotificationStatus = "unread" | "read" | "archived";

export type NotificationSeverity = "info" | "success" | "warning" | "critical";

export type NotificationSourceType = "checklist_run" | "audit_log" | "auth" | "system" | string;

export type NotificationMetadata = Record<string, unknown>;

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  status: NotificationStatus;
  sourceType?: NotificationSourceType;
  sourceId?: string;
  actionUrl?: string;
  metadata?: NotificationMetadata;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationListFilters = {
  status?: NotificationStatus;
  severity?: NotificationSeverity;
  type?: string;
  sourceType?: NotificationSourceType;
  limit?: number;
};

export type NotificationUnreadCount = {
  count: number;
};

export type NotificationApiContext = {
  token?: string;
  tenantId: string;
  branchId?: string;
  role?: string;
  permissions?: readonly string[];
};
