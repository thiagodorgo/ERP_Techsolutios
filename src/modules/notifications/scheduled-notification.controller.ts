import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toScheduledNotificationDto, toScheduledNotificationListDto } from "./scheduled-notification.dto.js";
import type { ScheduledNotificationService } from "./scheduled-notification.service.js";
import type { ScheduledNotification } from "./scheduled-notification.types.js";

export type ScheduledNotificationServiceResolver = () => Promise<ScheduledNotificationService>;

export class ScheduledNotificationController {
  constructor(private readonly resolveService: ScheduledNotificationServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);
    return { body: toScheduledNotificationListDto(result) };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const entry = await service.get(actor, readRouteParam(request.params.scheduledNotificationId));
    return { data: toScheduledNotificationDto(entry) };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const entry = await service.create(actor, (request.body ?? {}) as Record<string, unknown>);
    await this.audit(request, "scheduled_notification.created", entry);
    return { status: 201, data: toScheduledNotificationDto(entry) };
  }

  async cancel(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const entry = await service.cancel(actor, readRouteParam(request.params.scheduledNotificationId));
    await this.audit(request, "scheduled_notification.cancelled", entry);
    return { data: toScheduledNotificationDto(entry) };
  }

  // §2.8 allowlist — auditoria só com metadados de CONTROLE (visibilidade, tipo de fonte, se tem lembrete, nº de
  // destinatários custom, status). NUNCA tenant_id/client_action_id/título/mensagem/lista de destinatários crua.
  private async audit(request: Request, action: string, entry: ScheduledNotification): Promise<void> {
    await recordRequestAuditBestEffort(request, {
      action,
      resourceType: "scheduled_notification",
      resourceId: entry.id,
      outcome: "success",
      severity: "info",
      metadata: {
        visibility: entry.visibility,
        sourceType: entry.sourceType ?? "manual",
        hasReminder: entry.remindBeforeMinutes !== undefined,
        customRecipientCount: entry.customRecipientIds.length,
        status: entry.status,
      },
    });
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
