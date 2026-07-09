import type { NotificationService } from "../notifications/notification.service.js";
import type { Notification } from "../notifications/notification.types.js";
import type { InventoryRepository } from "./inventory.repository.js";

const MAX_ITEMS_PER_RUN = 100;

/**
 * R7.5 — idempotent "reorder point reached" notification job. Lists the ACTIVE
 * items whose derived saldo is at/below their reorder point (`needsReorder`,
 * itself derived from lead time + safety stock + 90-day usage) and creates ONE
 * `Notification` per (item, recipient) via the existing NotificationService with a
 * STABLE idempotencyKey `reorder_point:<itemId>:<yyyy-mm-dd>`.
 *
 * The date window makes the key stable within the SAME day: because the
 * notification repository de-duplicates on `(tenant_id, recipient_user_id,
 * idempotency_key)`, running this twice on the same day yields exactly one
 * notification per (item, recipient). The message suggests reposição and links to
 * `/purchase-orders` — it NEVER creates a purchase order (R7.5: no auto-purchase).
 *
 * Reuses existing storage only (Notification) — no new persistence.
 */
export type RunReorderPointNotificationsContext = {
  readonly tenantId: string;
  readonly repository: InventoryRepository;
  readonly notificationService: NotificationService;
  readonly recipientUserIds: readonly string[];
  readonly now?: Date;
};

export async function runReorderPointNotifications(
  context: RunReorderPointNotificationsContext,
): Promise<readonly Notification[]> {
  const now = context.now ?? new Date();
  const day = now.toISOString().slice(0, 10); // yyyy-mm-dd — stable window per item per day.

  const { items } = await context.repository.listItems({
    tenantId: context.tenantId,
    isActive: true,
    needsReorder: true,
    limit: MAX_ITEMS_PER_RUN,
    offset: 0,
  });

  const created: Notification[] = [];

  for (const item of items) {
    for (const recipientUserId of context.recipientUserIds) {
      const notification = await context.notificationService.createNotification({
        tenantId: context.tenantId,
        recipientUserId,
        type: "inventory.reorder_point",
        title: "Ponto de pedido atingido",
        message:
          `O item ${item.sku} (${item.name}) atingiu o ponto de pedido ` +
          `(saldo ${item.saldo}, ponto ${item.reorderPoint ?? "-"}). ` +
          "Considere repor o estoque em /purchase-orders.",
        severity: "warning",
        sourceType: "inventory_item",
        sourceId: item.id,
        actionUrl: "/purchase-orders",
        idempotencyKey: `reorder_point:${item.id}:${day}`,
        metadata: {
          itemId: item.id,
          sku: item.sku,
          saldo: item.saldo,
          reorderPoint: item.reorderPoint,
        },
      });

      created.push(notification);
    }
  }

  return created;
}
