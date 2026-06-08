import { randomUUID } from "node:crypto";

import type { Permission, Role } from "../core-saas/permissions/catalog.js";
import type {
  CreateNotificationInput,
  ListNotificationFilters,
  Notification,
  NotificationRecipientCandidate,
  NotificationStatus,
} from "./notification.types.js";

export interface NotificationRepository {
  create(input: CreateNotificationInput): Promise<Notification>;
  createMany(inputs: readonly CreateNotificationInput[]): Promise<readonly Notification[]>;
  listByRecipient(input: {
    readonly tenantId: string;
    readonly recipientUserId: string;
    readonly filters?: ListNotificationFilters;
  }): Promise<readonly Notification[]>;
  countUnread(input: { readonly tenantId: string; readonly recipientUserId: string }): Promise<number>;
  markAsRead(input: { readonly tenantId: string; readonly recipientUserId: string; readonly notificationId: string }): Promise<Notification | null>;
  markAllAsRead(input: { readonly tenantId: string; readonly recipientUserId: string }): Promise<number>;
  archive(input: { readonly tenantId: string; readonly recipientUserId: string; readonly notificationId: string }): Promise<Notification | null>;
  listRecipientCandidates(tenantId: string): Promise<readonly NotificationRecipientCandidate[]>;
}

export class InMemoryNotificationRepository implements NotificationRepository {
  private readonly notifications = new Map<string, Notification & { readonly idempotencyKey?: string }>();
  private readonly recipientsByTenant = new Map<string, NotificationRecipientCandidate[]>();

  async create(input: CreateNotificationInput): Promise<Notification> {
    if (input.idempotencyKey) {
      const existing = [...this.notifications.values()].find(
        (notification) =>
          notification.tenantId === input.tenantId &&
          notification.recipientUserId === input.recipientUserId &&
          notification.idempotencyKey === input.idempotencyKey,
      );

      if (existing) return existing;
    }

    const now = new Date();
    const notification: Notification & { readonly idempotencyKey?: string } = {
      id: randomUUID(),
      tenantId: input.tenantId,
      recipientUserId: input.recipientUserId,
      type: input.type,
      title: input.title,
      message: input.message,
      severity: input.severity ?? "info",
      status: "unread",
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      actionUrl: input.actionUrl,
      metadata: input.metadata ?? {},
      idempotencyKey: input.idempotencyKey,
      createdAt: now,
      updatedAt: now,
    };

    this.notifications.set(notification.id, notification);

    return notification;
  }

  async createMany(inputs: readonly CreateNotificationInput[]): Promise<readonly Notification[]> {
    const created: Notification[] = [];

    for (const input of inputs) {
      created.push(await this.create(input));
    }

    return created;
  }

  async listByRecipient(input: {
    readonly tenantId: string;
    readonly recipientUserId: string;
    readonly filters?: ListNotificationFilters;
  }): Promise<readonly Notification[]> {
    const limit = input.filters?.limit ?? 50;

    return [...this.notifications.values()]
      .filter((notification) => matchesRecipient(notification, input.tenantId, input.recipientUserId))
      .filter((notification) => matchesFilters(notification, input.filters))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async countUnread(input: { readonly tenantId: string; readonly recipientUserId: string }): Promise<number> {
    return [...this.notifications.values()].filter(
      (notification) =>
        matchesRecipient(notification, input.tenantId, input.recipientUserId) &&
        notification.status === "unread",
    ).length;
  }

  async markAsRead(input: {
    readonly tenantId: string;
    readonly recipientUserId: string;
    readonly notificationId: string;
  }): Promise<Notification | null> {
    return this.updateStatus(input, "read");
  }

  async markAllAsRead(input: { readonly tenantId: string; readonly recipientUserId: string }): Promise<number> {
    let count = 0;

    for (const notification of this.notifications.values()) {
      if (!matchesRecipient(notification, input.tenantId, input.recipientUserId) || notification.status !== "unread") {
        continue;
      }

      this.notifications.set(notification.id, {
        ...notification,
        status: "read",
        readAt: notification.readAt ?? new Date(),
        updatedAt: new Date(),
      });
      count += 1;
    }

    return count;
  }

  async archive(input: {
    readonly tenantId: string;
    readonly recipientUserId: string;
    readonly notificationId: string;
  }): Promise<Notification | null> {
    return this.updateStatus(input, "archived");
  }

  async listRecipientCandidates(tenantId: string): Promise<readonly NotificationRecipientCandidate[]> {
    return this.recipientsByTenant.get(tenantId) ?? [];
  }

  setRecipientCandidatesForTests(
    tenantId: string,
    candidates: readonly NotificationRecipientCandidate[],
  ): void {
    this.recipientsByTenant.set(tenantId, candidates.map((candidate) => ({ ...candidate })));
  }

  reset(): void {
    this.notifications.clear();
    this.recipientsByTenant.clear();
  }

  private async updateStatus(input: {
    readonly tenantId: string;
    readonly recipientUserId: string;
    readonly notificationId: string;
  }, status: NotificationStatus): Promise<Notification | null> {
    const notification = this.notifications.get(input.notificationId);

    if (!notification || !matchesRecipient(notification, input.tenantId, input.recipientUserId)) {
      return null;
    }

    const updated = {
      ...notification,
      status,
      readAt: status === "read" ? notification.readAt ?? new Date() : notification.readAt,
      updatedAt: new Date(),
    };

    this.notifications.set(updated.id, updated);

    return updated;
  }
}

function matchesRecipient(notification: Notification, tenantId: string, userId: string): boolean {
  return notification.tenantId === tenantId && notification.recipientUserId === userId;
}

function matchesFilters(notification: Notification, filters: ListNotificationFilters | undefined): boolean {
  if (!filters) return true;
  if (filters.status && notification.status !== filters.status) return false;
  if (filters.severity && notification.severity !== filters.severity) return false;
  if (filters.type && notification.type !== filters.type) return false;
  if (filters.sourceType && notification.sourceType !== filters.sourceType) return false;
  return true;
}

export function toRecipientCandidate(input: {
  readonly userId: string;
  readonly status: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
}): NotificationRecipientCandidate {
  return input;
}
