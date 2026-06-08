import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export const NOTIFICATION_STATUSES = ["unread", "read", "archived"] as const;
export const NOTIFICATION_SEVERITIES = ["info", "success", "warning", "critical"] as const;

export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];
export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number];

export type JsonRecord = Record<string, unknown>;

export type Notification = {
  readonly id: string;
  readonly tenantId: string;
  readonly recipientUserId: string;
  readonly type: string;
  readonly title: string;
  readonly message: string;
  readonly severity: NotificationSeverity;
  readonly status: NotificationStatus;
  readonly sourceType?: string;
  readonly sourceId?: string;
  readonly actionUrl?: string;
  readonly metadata: JsonRecord;
  readonly readAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type NotificationActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

export type NotificationRecipientCandidate = {
  readonly userId: string;
  readonly status: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

export type CreateNotificationInput = {
  readonly tenantId: string;
  readonly recipientUserId: string;
  readonly type: string;
  readonly title: string;
  readonly message: string;
  readonly severity?: NotificationSeverity;
  readonly sourceType?: string;
  readonly sourceId?: string;
  readonly actionUrl?: string;
  readonly metadata?: JsonRecord;
  readonly idempotencyKey?: string;
};

export type ListNotificationFilters = {
  readonly status?: NotificationStatus;
  readonly severity?: NotificationSeverity;
  readonly type?: string;
  readonly sourceType?: string;
  readonly limit?: number;
};

export class NotificationError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
  }
}
