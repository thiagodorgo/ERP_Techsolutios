import type { NotificationService } from "../notifications/notification.service.js";
import type { Notification } from "../notifications/notification.types.js";
import type { InsurancePolicyRepository } from "./insurance-policy.repository.js";

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

/** R4.2 — renewal alert windows, in days before `vigencia_fim`. */
export const INSURANCE_RENEWAL_WINDOWS_DAYS = [30, 15, 7] as const;

/**
 * R4.2 — idempotent insurance renewal alert job (30/15/7 days).
 *
 * For each STORED-`vigente`, active policy (tenant-scoped) whose `vigencia_fim`
 * is still in the future but within the widest window, it emits ONE
 * `Notification` per CROSSED window. A window `W` is crossed when `now` is
 * within `[vigenciaFim - W days, vigenciaFim)`. Keys are STABLE:
 * `insurance:<policyId>:30d | :15d | :7d`.
 *
 * Because the notification repository de-duplicates on
 * `(tenant_id, recipient_user_id, idempotency_key)`, running this twice yields
 * exactly one notification per (policy, window, recipient) — a policy 5 days
 * from expiry has crossed the 30, 15 and 7 windows → up to 3 notifications,
 * each idempotent. Reuses existing storage only (Notification) — no new
 * persistence.
 */
export type RunInsuranceRenewalNotificationsContext = {
  readonly tenantId: string;
  readonly repository: InsurancePolicyRepository;
  readonly notificationService: NotificationService;
  readonly recipientUserIds: readonly string[];
  readonly now?: Date;
  readonly windowsDays?: readonly number[];
};

export async function runInsuranceRenewalNotifications(
  context: RunInsuranceRenewalNotificationsContext,
): Promise<readonly Notification[]> {
  const now = context.now ?? new Date();
  const windowsDays = context.windowsDays ?? INSURANCE_RENEWAL_WINDOWS_DAYS;
  const maxWindowDays = Math.max(...windowsDays);
  const until = new Date(now.getTime() + maxWindowDays * MILLIS_PER_DAY);

  const policies = await context.repository.listExpiringVigente(context.tenantId, now, until);
  const created: Notification[] = [];

  for (const policy of policies) {
    for (const windowDays of windowsDays) {
      const windowStart = policy.vigenciaFim.getTime() - windowDays * MILLIS_PER_DAY;

      // Window crossed when now is within [vigenciaFim - windowDays, vigenciaFim).
      const crossed = now.getTime() >= windowStart && now.getTime() < policy.vigenciaFim.getTime();
      if (!crossed) continue;

      for (const recipientUserId of context.recipientUserIds) {
        const notification = await context.notificationService.createNotification({
          tenantId: context.tenantId,
          recipientUserId,
          type: "insurance.renewal",
          title: "Seguro próximo do vencimento",
          message: `A apólice ${policy.numeroApolice} vence em ${policy.vigenciaFim.toISOString()}.`,
          severity: "warning",
          sourceType: "insurance_policy",
          sourceId: policy.id,
          actionUrl: "/fleet/insurance",
          idempotencyKey: `insurance:${policy.id}:${windowDays}d`,
          metadata: {
            insurancePolicyId: policy.id,
            vehicleId: policy.vehicleId,
            numeroApolice: policy.numeroApolice,
            vigenciaFim: policy.vigenciaFim,
            windowDays,
          },
        });

        created.push(notification);
      }
    }
  }

  return created;
}
