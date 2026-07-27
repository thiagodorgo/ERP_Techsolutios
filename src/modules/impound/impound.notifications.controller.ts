import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toProcessNotificationDto, toProcessNotificationListDto } from "./impound.notifications.dto.js";
import type { NotificationService } from "./impound.notifications.service.js";

export type NotificationServiceResolver = () => Promise<NotificationService>;

export class NotificationController {
  constructor(private readonly resolveService: NotificationServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const notifications = await service.list(actor, readRouteParam(request.params.processId));
    return { body: toProcessNotificationListDto(notifications) };
  }

  async issue(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const notification = await service.issue(
      actor,
      readRouteParam(request.params.processId),
      readRouteParam(request.params.notificationId),
      request.body ?? {},
    );
    // Auditoria best-effort SEM PII (§2.8): só id/kind/channel/status — NUNCA recipient_ref/file_url/storage_key.
    await recordRequestAuditBestEffort(request, {
      action: "impound.notification.issued",
      resourceType: "process_notification",
      resourceId: notification.id,
      outcome: "success",
      severity: "info",
      metadata: { kind: notification.kind, channel: notification.channel ?? null, status: notification.status },
    });
    return { data: toProcessNotificationDto(notification) };
  }

  async waive(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const notification = await service.waive(
      actor,
      readRouteParam(request.params.processId),
      readRouteParam(request.params.notificationId),
      request.body ?? {},
    );
    // §2.8: só id/kind/status no metadata (nunca o texto do reason, que pode conter contexto).
    await recordRequestAuditBestEffort(request, {
      action: "impound.notification.waived",
      resourceType: "process_notification",
      resourceId: notification.id,
      outcome: "success",
      severity: "info",
      metadata: { kind: notification.kind, status: notification.status },
    });
    return { data: toProcessNotificationDto(notification) };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
