import type { NotificationService } from "../notifications/notification.service.js";
import type { Notification } from "../notifications/notification.types.js";
import type { FineRepository } from "./fine.repository.js";

const DEFAULT_WINDOW_DAYS = 7;
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * R3.2 — idempotent "fine due" notification job. Finds non-final fines
 * (status NOT in paga/cancelada/deferida) whose `prazo_recurso` OR
 * `prazo_pagamento` falls within the next `windowDays` (default 7),
 * tenant-scoped, and creates ONE `Notification` per recipient via the existing
 * NotificationService with a STABLE idempotencyKey (`fine_due:<fineId>`).
 * Because the notification repository de-duplicates on
 * `(tenant_id, recipient_user_id, idempotency_key)`, running this twice yields
 * exactly one notification per (fine, recipient).
 *
 * Reuses existing storage only (Notification) — no new persistence.
 */
export type RunFineDueNotificationsContext = {
  readonly tenantId: string;
  readonly repository: FineRepository;
  readonly notificationService: NotificationService;
  readonly recipientUserIds: readonly string[];
  readonly now?: Date;
  readonly windowDays?: number;
};

export async function runFineDueNotifications(
  context: RunFineDueNotificationsContext,
): Promise<readonly Notification[]> {
  const now = context.now ?? new Date();
  const windowDays = context.windowDays ?? DEFAULT_WINDOW_DAYS;
  const until = new Date(now.getTime() + windowDays * MILLIS_PER_DAY);

  const dueFines = await context.repository.listDue(context.tenantId, now, until);
  const created: Notification[] = [];

  for (const fine of dueFines) {
    const deadline = fine.prazoPagamento ?? fine.prazoRecurso;

    for (const recipientUserId of context.recipientUserIds) {
      const notification = await context.notificationService.createNotification({
        tenantId: context.tenantId,
        recipientUserId,
        type: "fine.due",
        title: "Multa com prazo próximo",
        message: deadline
          ? `Há uma multa com prazo até ${deadline.toISOString()}.`
          : "Há uma multa com prazo próximo do vencimento.",
        severity: "warning",
        sourceType: "fine",
        sourceId: fine.id,
        actionUrl: "/fleet/fines",
        idempotencyKey: `fine_due:${fine.id}`,
        metadata: {
          fineId: fine.id,
          vehicleId: fine.vehicleId,
          numeroAuto: fine.numeroAuto,
          prazoRecurso: fine.prazoRecurso,
          prazoPagamento: fine.prazoPagamento,
        },
      });

      created.push(notification);
    }
  }

  return created;
}
