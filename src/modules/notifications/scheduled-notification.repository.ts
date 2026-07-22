import { randomUUID } from "node:crypto";

import type {
  CreateScheduledNotificationInput,
  ScheduledNotification,
  ScheduledNotificationListFilters,
} from "./scheduled-notification.types.js";
import { ScheduledNotificationError } from "./scheduled-notification.types.js";

export interface ScheduledNotificationRepository {
  create(input: CreateScheduledNotificationInput): Promise<ScheduledNotification>;
  // Definição ATIVA (deleted_at NULL) por id, tenant-scoped. null = inexistente/cancelada/cross-tenant.
  findById(tenantId: string, id: string): Promise<ScheduledNotification | null>;
  // Definições ATIVAS do CRIADOR (foundation; a central tenant-wide é PR-20), desc por created_at.
  listByCreator(tenantId: string, createdBy: string, filters?: ScheduledNotificationListFilters): Promise<ScheduledNotification[]>;
  // Total ATIVO do criador (paginação).
  countByCreator(tenantId: string, createdBy: string): Promise<number>;
  // Soft-cancel: status=cancelled + deleted_at (para ocorrências FUTURAS). null = nada a cancelar.
  softCancel(tenantId: string, id: string): Promise<ScheduledNotification | null>;
  // Ocorrência de LEMBRETE devida: status=pending ∧ reminder_at<=now ∧ reminder_fired_at IS NULL (∧ ativa).
  findDueReminders(tenantId: string, now: Date): Promise<ScheduledNotification[]>;
  // Ocorrência PRINCIPAL devida: status=pending ∧ notify_at<=now ∧ fired_at IS NULL (∧ ativa).
  findDueMain(tenantId: string, now: Date): Promise<ScheduledNotification[]>;
  // Guardas de idempotência (barram o re-scan; a unique de entrega é o backstop DURO).
  markReminderFired(tenantId: string, id: string, firedAt: Date): Promise<void>;
  markMainFired(tenantId: string, id: string, firedAt: Date): Promise<void>;
  reset?(): void;
}

export function scheduledNotificationNotFoundError(): ScheduledNotificationError {
  return new ScheduledNotificationError(404, "SCHEDULED_NOTIFICATION_NOT_FOUND", "scheduled_notification_not_found", "Scheduled notification was not found.");
}

export function duplicateClientActionError(): ScheduledNotificationError {
  return new ScheduledNotificationError(409, "SCHEDULED_NOTIFICATION_CONFLICT", "duplicate_client_action_id", "A scheduled notification already exists for this client action id.");
}

export class InMemoryScheduledNotificationRepository implements ScheduledNotificationRepository {
  private readonly entries = new Map<string, ScheduledNotification>();

  async create(input: CreateScheduledNotificationInput): Promise<ScheduledNotification> {
    if (input.clientActionId) {
      const existing = [...this.entries.values()].find(
        (entry) => entry.tenantId === input.tenantId && entry.clientActionId === input.clientActionId,
      );
      if (existing) return existing;
    }

    const now = new Date();
    const entry: ScheduledNotification = {
      id: randomUUID(),
      tenantId: input.tenantId,
      title: input.title,
      message: input.message,
      notifyAt: input.notifyAt,
      remindBeforeMinutes: input.remindBeforeMinutes,
      reminderAt: input.reminderAt,
      visibility: input.visibility,
      customRecipientIds: [...input.customRecipientIds],
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      status: "pending",
      createdBy: input.createdBy,
      clientActionId: input.clientActionId,
      createdAt: now,
      updatedAt: now,
    };
    this.entries.set(entry.id, entry);
    return entry;
  }

  async findById(tenantId: string, id: string): Promise<ScheduledNotification | null> {
    const entry = this.entries.get(id);
    if (!entry || entry.tenantId !== tenantId || entry.deletedAt !== undefined) return null;
    return entry;
  }

  async listByCreator(
    tenantId: string,
    createdBy: string,
    filters?: ScheduledNotificationListFilters,
  ): Promise<ScheduledNotification[]> {
    const all = [...this.entries.values()]
      .filter((entry) => entry.tenantId === tenantId && entry.createdBy === createdBy && entry.deletedAt === undefined)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? 20;
    return all.slice(offset, offset + limit);
  }

  // total ATIVO do criador (o service usa p/ paginação).
  async countByCreator(tenantId: string, createdBy: string): Promise<number> {
    return [...this.entries.values()].filter(
      (entry) => entry.tenantId === tenantId && entry.createdBy === createdBy && entry.deletedAt === undefined,
    ).length;
  }

  async softCancel(tenantId: string, id: string): Promise<ScheduledNotification | null> {
    const entry = await this.findById(tenantId, id);
    if (!entry) return null;
    const updated: ScheduledNotification = { ...entry, status: "cancelled", deletedAt: new Date(), updatedAt: new Date() };
    this.entries.set(updated.id, updated);
    return updated;
  }

  async findDueReminders(tenantId: string, now: Date): Promise<ScheduledNotification[]> {
    return [...this.entries.values()].filter(
      (entry) =>
        entry.tenantId === tenantId &&
        entry.deletedAt === undefined &&
        entry.status === "pending" &&
        entry.reminderAt !== undefined &&
        entry.reminderAt.getTime() <= now.getTime() &&
        entry.reminderFiredAt === undefined,
    );
  }

  async findDueMain(tenantId: string, now: Date): Promise<ScheduledNotification[]> {
    return [...this.entries.values()].filter(
      (entry) =>
        entry.tenantId === tenantId &&
        entry.deletedAt === undefined &&
        entry.status === "pending" &&
        entry.notifyAt.getTime() <= now.getTime() &&
        entry.firedAt === undefined,
    );
  }

  async markReminderFired(tenantId: string, id: string, firedAt: Date): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry || entry.tenantId !== tenantId) return;
    this.entries.set(id, { ...entry, reminderFiredAt: firedAt, updatedAt: new Date() });
  }

  async markMainFired(tenantId: string, id: string, firedAt: Date): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry || entry.tenantId !== tenantId) return;
    this.entries.set(id, { ...entry, firedAt, status: "fired", updatedAt: new Date() });
  }

  reset(): void {
    this.entries.clear();
  }

  // Fixture-only: apaga os guardas de idempotência (reminder_fired_at/fired_at) e volta o status a pending, para
  // provar o BACKSTOP DURO — mesmo re-varrendo uma definição já disparada, a idempotencyKey na unique de entrega
  // de-duplica no repositório de notificações (RN-NOTIF-01), sem depender do guarda.
  clearFiredGuardsForTests(tenantId: string, id: string): boolean {
    const entry = this.entries.get(id);
    if (!entry || entry.tenantId !== tenantId) return false;
    this.entries.set(id, { ...entry, reminderFiredAt: undefined, firedAt: undefined, status: "pending" });
    return true;
  }
}
