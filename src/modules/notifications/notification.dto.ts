import type { Notification } from "./notification.types.js";

export function toNotificationDto(notification: Notification) {
  return {
    id: notification.id,
    tenantId: notification.tenantId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    severity: notification.severity,
    status: notification.status,
    sourceType: notification.sourceType ?? null,
    sourceId: notification.sourceId ?? null,
    actionUrl: notification.actionUrl ?? null,
    metadata: notification.metadata,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
    updatedAt: notification.updatedAt.toISOString(),
  };
}
