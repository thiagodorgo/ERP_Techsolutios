import type { Permission, Role } from "../core-saas/permissions/catalog.js";

// Ω4C PR-04 (D-Ω4C-NOTIF-MODEL) — DEFINIÇÃO de notificação agendada (o "cadastro" avulso do AutEM). Camada
// separada da tabela `notifications` (ENTREGA/inbox). Enums em INGLÊS no código/schema; labels PT-BR
// (PRIVADA/PÚBLICA/PERSONALIZADA) só na fronteira de apresentação. SEM CHECK no banco — validado na app.

export const SCHEDULED_NOTIFICATION_VISIBILITIES = ["private", "public", "custom"] as const;
export const SCHEDULED_NOTIFICATION_STATUSES = ["pending", "fired", "cancelled"] as const;
export const SCHEDULED_NOTIFICATION_SOURCE_TYPES = [
  "maintenance_item",
  "fine",
  "insurance_policy",
  "financial_title",
  "manual",
] as const;

export type ScheduledNotificationVisibility = (typeof SCHEDULED_NOTIFICATION_VISIBILITIES)[number];
export type ScheduledNotificationStatus = (typeof SCHEDULED_NOTIFICATION_STATUSES)[number];
export type ScheduledNotificationSourceType = (typeof SCHEDULED_NOTIFICATION_SOURCE_TYPES)[number];

// Ocorrência de disparo: cada definição tem no máx. 2 (LEMBRETE em reminder_at, PRINCIPAL em notify_at). O
// occurrence entra na idempotencyKey da entrega (`sched:<id>:<occurrence>`) — backstop DURO contra duplicação.
export type ScheduledNotificationOccurrence = "reminder" | "main";

export type ScheduledNotificationActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

export type ScheduledNotification = {
  readonly id: string;
  readonly tenantId: string;
  readonly title: string;
  readonly message: string;
  readonly notifyAt: Date;
  readonly remindBeforeMinutes?: number;
  readonly reminderAt?: Date;
  readonly visibility: string;
  readonly customRecipientIds: readonly string[];
  readonly sourceType?: string;
  readonly sourceId?: string;
  readonly status: string;
  readonly reminderFiredAt?: Date;
  readonly firedAt?: Date;
  readonly createdBy: string;
  readonly clientActionId?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date;
};

export type CreateScheduledNotificationInput = {
  readonly tenantId: string;
  readonly title: string;
  readonly message: string;
  readonly notifyAt: Date;
  readonly remindBeforeMinutes?: number;
  readonly reminderAt?: Date;
  readonly visibility: string;
  readonly customRecipientIds: readonly string[];
  readonly sourceType?: string;
  readonly sourceId?: string;
  readonly clientActionId?: string;
  readonly createdBy: string;
};

export type ScheduledNotificationListFilters = {
  readonly limit?: number;
  readonly offset?: number;
};

// Resultado do disparo de uma janela (fireDue). deliveries = entregas efetivas criadas na inbox (deduped por
// idempotencyKey) — a invariante RN-NOTIF-01 exige que 2 chamadas com o MESMO now devolvam o mesmo total.
export type FireDueResult = {
  readonly reminders: number;
  readonly main: number;
  readonly deliveries: number;
};

export class ScheduledNotificationError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "ScheduledNotificationError";
  }
}
