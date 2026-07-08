import type { NotificationService } from "../notifications/notification.service.js";
import type { Notification } from "../notifications/notification.types.js";
import type { MaintenanceOrderRepository } from "./maintenance-order.repository.js";

const DEFAULT_WINDOW_DAYS = 7;
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * R2.2 — idempotent "maintenance due" notification job. Finds `preventiva`
 * orders still `agendada` whose `scheduled_for` falls within the next
 * `windowDays` (default 7), tenant-scoped, and creates ONE `Notification` per
 * recipient via the existing NotificationService with a STABLE idempotencyKey
 * (`maintenance_due:<maintenanceOrderId>`). Because the notification repository
 * de-duplicates on `(tenant_id, recipient_user_id, idempotency_key)`, running
 * this twice yields exactly one notification per (order, recipient).
 *
 * Reuses existing storage only (Notification) — no new persistence.
 */
export type RunMaintenanceDueNotificationsContext = {
  readonly tenantId: string;
  readonly repository: MaintenanceOrderRepository;
  readonly notificationService: NotificationService;
  readonly recipientUserIds: readonly string[];
  readonly now?: Date;
  readonly windowDays?: number;
};

export async function runMaintenanceDueNotifications(
  context: RunMaintenanceDueNotificationsContext,
): Promise<readonly Notification[]> {
  const now = context.now ?? new Date();
  const windowDays = context.windowDays ?? DEFAULT_WINDOW_DAYS;
  const until = new Date(now.getTime() + windowDays * MILLIS_PER_DAY);

  const dueOrders = await context.repository.listDuePreventive(context.tenantId, now, until);
  const created: Notification[] = [];

  for (const order of dueOrders) {
    for (const recipientUserId of context.recipientUserIds) {
      const notification = await context.notificationService.createNotification({
        tenantId: context.tenantId,
        recipientUserId,
        type: "maintenance.due",
        title: "Manutenção preventiva próxima",
        message: order.scheduledFor
          ? `Há uma manutenção preventiva agendada para ${order.scheduledFor.toISOString()}.`
          : "Há uma manutenção preventiva agendada.",
        severity: "warning",
        sourceType: "maintenance_order",
        sourceId: order.id,
        actionUrl: "/fleet/maintenance",
        idempotencyKey: `maintenance_due:${order.id}`,
        metadata: {
          maintenanceOrderId: order.id,
          vehicleId: order.vehicleId,
          scheduledFor: order.scheduledFor,
        },
      });

      created.push(notification);
    }
  }

  return created;
}
