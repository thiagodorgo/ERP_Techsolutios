import type { Role } from "../core-saas/permissions/catalog.js";
import { runFineDueNotifications } from "../fines/fine.notifications.js";
import { createDefaultFineRepository } from "../fines/fine.service.js";
import { runInsuranceRenewalNotifications } from "../insurance-policies/insurance-policy.notifications.js";
import { createDefaultInsurancePolicyRepository } from "../insurance-policies/insurance-policy.service.js";
import { runReorderPointNotifications } from "../inventory/inventory.notifications.js";
import { createDefaultInventoryRepository } from "../inventory/inventory.service.js";
import { runMaintenanceDueNotifications } from "../maintenance-orders/maintenance-order.notifications.js";
import { createDefaultMaintenanceOrderRepository } from "../maintenance-orders/maintenance-order.service.js";
import { createDefaultNotificationService, type NotificationService } from "./notification.service.js";
import type { NotificationRecipientCandidate } from "./notification.types.js";

/**
 * F10 — fleet-alerts orchestrator.
 *
 * The four idempotent domain producers (R2.2 maintenance due, R3.2 fine due,
 * R4.2 insurance renewal, R7.5 reorder point) already exist but were never run.
 * This app-level orchestrator wires them together: it runs each producer for a
 * tenant with its OWN default repository (the shared singleton in memory mode,
 * Prisma in `prisma` mode) plus the default NotificationService and the resolved
 * recipients, so notifications actually appear.
 *
 * Idempotency is preserved end-to-end: this orchestrator never touches the stable
 * `idempotencyKey` each producer computes, and the notification repository
 * de-duplicates on `(tenant_id, recipient_user_id, idempotency_key)`. Running it
 * twice in the same window yields the SAME notifications (no duplicates).
 */

/**
 * Default management roles whose active users receive fleet alerts. Managers and
 * tenant admins hold every fleet read permission (maintenance/fines/insurance/
 * inventory) plus `notifications:read`, so they are the intended audience; the
 * platform `super_admin` is included for completeness. No new user field.
 */
export const FLEET_ALERT_RECIPIENT_ROLES: readonly Role[] = ["super_admin", "tenant_admin", "manager"];

export type RunFleetAlertsContext = {
  readonly tenantId: string;
  readonly recipientUserIds: readonly string[];
  readonly now?: Date;
};

export type FleetAlertsSummary = {
  readonly maintenance: number;
  readonly fines: number;
  readonly insurance: number;
  readonly reorder: number;
};

/**
 * Pure selection of the fleet-alert recipients from a tenant's candidates: active
 * users holding at least one management role, de-duplicated and order-preserving.
 */
export function selectFleetAlertRecipientIds(
  candidates: readonly NotificationRecipientCandidate[],
): string[] {
  const recipients: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (candidate.status !== "active") continue;
    if (!candidate.roles.some((role) => FLEET_ALERT_RECIPIENT_ROLES.includes(role))) continue;
    if (seen.has(candidate.userId)) continue;

    seen.add(candidate.userId);
    recipients.push(candidate.userId);
  }

  return recipients;
}

/**
 * Resolves the tenant's fleet-alert recipients via the notification service's
 * recipient candidates (which query active tenant users + roles in `prisma` mode).
 * Tenant-scoped throughout.
 */
export async function resolveFleetAlertRecipients(
  tenantId: string,
  service?: NotificationService,
): Promise<string[]> {
  const notificationService = service ?? (await createDefaultNotificationService());

  return selectFleetAlertRecipientIds(await notificationService.listRecipientCandidates(tenantId));
}

/**
 * Runs all four fleet-alert producers for a tenant and reports how many
 * notifications each touched (created OR matched an existing idempotency key —
 * stable across re-runs). Tenant-scoped; `now` is injectable for tests.
 */
export async function runFleetAlerts(context: RunFleetAlertsContext): Promise<FleetAlertsSummary> {
  const now = context.now ?? new Date();

  if (context.recipientUserIds.length === 0) {
    return { maintenance: 0, fines: 0, insurance: 0, reorder: 0 };
  }

  const notificationService = await createDefaultNotificationService();
  const [maintenanceRepository, fineRepository, insuranceRepository, inventoryRepository] = await Promise.all([
    createDefaultMaintenanceOrderRepository(),
    createDefaultFineRepository(),
    createDefaultInsurancePolicyRepository(),
    createDefaultInventoryRepository(),
  ]);

  const maintenance = await runMaintenanceDueNotifications({
    tenantId: context.tenantId,
    repository: maintenanceRepository,
    notificationService,
    recipientUserIds: context.recipientUserIds,
    now,
  });

  const fines = await runFineDueNotifications({
    tenantId: context.tenantId,
    repository: fineRepository,
    notificationService,
    recipientUserIds: context.recipientUserIds,
    now,
  });

  const insurance = await runInsuranceRenewalNotifications({
    tenantId: context.tenantId,
    repository: insuranceRepository,
    notificationService,
    recipientUserIds: context.recipientUserIds,
    now,
  });

  const reorder = await runReorderPointNotifications({
    tenantId: context.tenantId,
    repository: inventoryRepository,
    notificationService,
    recipientUserIds: context.recipientUserIds,
    now,
  });

  return {
    maintenance: maintenance.length,
    fines: fines.length,
    insurance: insurance.length,
    reorder: reorder.length,
  };
}
