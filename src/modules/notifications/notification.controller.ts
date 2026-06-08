import type { Request } from "express";

import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toNotificationDto } from "./notification.dto.js";
import type { NotificationService } from "./notification.service.js";
import {
  NOTIFICATION_SEVERITIES,
  NOTIFICATION_STATUSES,
  NotificationError,
  type ListNotificationFilters,
} from "./notification.types.js";

export type NotificationServiceResolver = () => Promise<NotificationService>;

export class NotificationController {
  constructor(private readonly resolveService: NotificationServiceResolver) {}

  async listMyNotifications(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const notifications = await service.listMyNotifications(actor, parseNotificationFilters(request.query));

    return {
      data: notifications.map(toNotificationDto),
    };
  }

  async countUnread(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const count = await service.countUnread(actor);

    return {
      data: {
        count,
      },
    };
  }

  async markAsRead(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const notification = await service.markAsRead(actor, readRouteParam(request.params.notificationId));

    return {
      data: toNotificationDto(notification),
    };
  }

  async markAllAsRead(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const count = await service.markAllAsRead(actor);

    return {
      data: {
        updated: count,
      },
    };
  }

  async archive(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const notification = await service.archiveNotification(actor, readRouteParam(request.params.notificationId));

    return {
      data: toNotificationDto(notification),
    };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}

function parseNotificationFilters(query: Request["query"]): ListNotificationFilters {
  return {
    status: parseEnum(query.status, NOTIFICATION_STATUSES, "status"),
    severity: parseEnum(query.severity, NOTIFICATION_SEVERITIES, "severity"),
    type: parseOptionalString(query.type),
    sourceType: parseOptionalString(query.sourceType),
    limit: parseLimit(query.limit),
  };
}

function parseEnum<TValue extends string>(
  value: unknown,
  allowed: readonly TValue[],
  field: string,
): TValue | undefined {
  const normalized = parseOptionalString(value);
  if (!normalized) return undefined;
  if (allowed.includes(normalized as TValue)) return normalized as TValue;

  throw new NotificationError(400, "NOTIFICATION_FILTER_INVALID", "invalid_filter", `${field} filter is invalid.`);
}

function parseOptionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

function parseLimit(value: unknown): number | undefined {
  const normalized = parseOptionalString(value);
  if (!normalized) return undefined;
  const parsed = Number.parseInt(normalized, 10);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new NotificationError(400, "NOTIFICATION_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }

  return parsed;
}
