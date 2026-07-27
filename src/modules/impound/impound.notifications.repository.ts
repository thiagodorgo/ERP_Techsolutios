import { randomUUID } from "node:crypto";

import { FEDERAL_DEFAULTS } from "../jurisdiction/jurisdiction.defaults.js";
import type { ProfileScope } from "../jurisdiction/jurisdiction.types.js";
import type { ImpoundRepository } from "./impound.repository.js";
import type { CanonicalValue } from "./impound.types.js";
import {
  NotificationError,
  type IssueNotificationInput,
  type ListNotificationsInput,
  type MarkDueInput,
  type MarkDueResult,
  type NotificationScheduleContext,
  type ProcessNotification,
  type WaiveNotificationInput,
} from "./impound.notifications.types.js";

// Ação do CustodyEvent NOTIFICATION (discrimina a sub-transição no payload, já que uma MESMA notificação encadeia
// eventos ao ser marcada DEVIDA e ao ser emitida/dispensada).
export type NotificationEventAction = "due" | "issued" | "waived";

// Payload canônico do CustodyEvent NOTIFICATION (I2). §allowlist §2.8 ESTRITA: { event, kind, notificationId,
// dueAt, status, channel? } — ZERO recipient_ref/PII/endereço/tenant_id/process UUID. recipient_ref (já
// minimizado) NÃO entra aqui nem no audit. dueAt = string ISO (canonicalJson exige money/data como string).
export function buildNotificationEventPayload(
  notification: ProcessNotification,
  action: NotificationEventAction,
): CanonicalValue {
  const payload: { [key: string]: CanonicalValue } = {
    event: action,
    kind: notification.kind,
    notificationId: notification.id,
    dueAt: notification.dueAt.toISOString(),
    status: notification.status,
  };
  if (notification.channel) {
    payload.channel = notification.channel;
  }
  return payload;
}

export interface NotificationRepository {
  listNotifications(input: ListNotificationsInput): Promise<readonly ProcessNotification[]>;
  findNotificationById(tenantId: string, notificationId: string): Promise<ProcessNotification | undefined>;
  // Materializa UM marco DEVIDO (idempotente por (tenant,process,kind), sob lock do processo + append NOTIFICATION).
  markDue(input: MarkDueInput): Promise<MarkDueResult>;
  // DUE→ISSUED (carimba issued_at/channel/recipient_ref) + append NOTIFICATION na MESMA tx.
  issue(input: IssueNotificationInput): Promise<ProcessNotification>;
  // DUE→WAIVED (fundamento) + append NOTIFICATION na MESMA tx.
  waive(input: WaiveNotificationInput): Promise<ProcessNotification>;
  // Contexto de agendamento (impound_processes + jurisdiction_profiles). undefined = processo inexistente.
  loadScheduleContext(tenantId: string, processId: string): Promise<NotificationScheduleContext | undefined>;
  // Candidatos do SWEEP: entered_at set, frozen_at NULL, status != JUDICIAL_HOLD, scope PUBLIC_AGREEMENT. Prisma-only
  // (o sweep é gated por persistence=prisma); o InMemory devolve [] (os testes InMemory chamam markDueProcess direto).
  listNotificationCandidates(tenantId: string, limit: number): Promise<readonly string[]>;
  reset?(): void;
}

type StoredProfile = {
  readonly scope: ProfileScope;
  readonly ownerNotifDays: number;
  readonly noticeEdictDay: number;
};

// InMemory (espelha a lógica do Prisma repo 1:1; a corrida/idempotência REAL roda no teste DB-gated). Compõe o
// impound repo de MEMÓRIA para (a) ler o processo (t0/frozen/status/profile) e (b) ENCADEAR o CustodyEvent na
// cadeia existente (reusa impound.appendEvent — NÃO duplica a lógica probatória). Perfis são injetados por teste.
export class InMemoryNotificationRepository implements NotificationRepository {
  private readonly notifications: ProcessNotification[] = [];
  private readonly profiles = new Map<string, StoredProfile>();

  constructor(private readonly impound: Pick<ImpoundRepository, "appendEvent" | "findProcessById">) {}

  async listNotifications(input: ListNotificationsInput): Promise<readonly ProcessNotification[]> {
    return this.notifications
      .filter((notification) => notification.tenantId === input.tenantId && notification.processId === input.processId)
      .sort((left, right) => left.dueAt.getTime() - right.dueAt.getTime());
  }

  async findNotificationById(tenantId: string, notificationId: string): Promise<ProcessNotification | undefined> {
    return this.notifications.find((notification) => notification.tenantId === tenantId && notification.id === notificationId);
  }

  async markDue(input: MarkDueInput): Promise<MarkDueResult> {
    const process = await this.impound.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new NotificationError(404, "NOTIFICATION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    // Idempotência por (tenant, process, kind) — espelha o índice único raw-only. 2ª marcação do MESMO kind = no-op.
    const exists = this.notifications.some(
      (notification) => notification.tenantId === input.tenantId && notification.processId === input.processId && notification.kind === input.kind,
    );
    if (exists) return { created: false };
    const now = new Date();
    const notification: ProcessNotification = {
      id: randomUUID(),
      tenantId: input.tenantId,
      processId: input.processId,
      kind: input.kind,
      status: "DUE",
      dueAt: input.dueAt,
      createdBy: input.actorId,
      updatedBy: input.actorId,
      createdAt: now,
      updatedAt: now,
    };
    this.notifications.push(notification);
    await this.impound.appendEvent({
      tenantId: input.tenantId,
      processId: input.processId,
      event: { type: "NOTIFICATION", payload: buildNotificationEventPayload(notification, "due"), occurredAt: input.occurredAt, actorId: input.actorId },
    });
    return { created: true, notification };
  }

  async issue(input: IssueNotificationInput): Promise<ProcessNotification> {
    const index = this.notifications.findIndex(
      (notification) => notification.tenantId === input.tenantId && notification.id === input.notificationId && notification.processId === input.processId,
    );
    if (index < 0) {
      throw new NotificationError(404, "NOTIFICATION_NOT_FOUND", "notification_not_found", "The notification was not found for this process.");
    }
    if (this.notifications[index].status !== "DUE") {
      throw new NotificationError(409, "NOTIFICATION_CONFLICT", "not_due", "Only a DUE notification can be issued.");
    }
    const updated: ProcessNotification = {
      ...this.notifications[index],
      status: "ISSUED",
      issuedAt: input.issuedAt,
      channel: input.channel,
      recipientRef: input.recipientRef,
      updatedBy: input.actorId,
      updatedAt: new Date(),
    };
    this.notifications[index] = updated;
    await this.impound.appendEvent({
      tenantId: input.tenantId,
      processId: input.processId,
      event: { type: "NOTIFICATION", payload: buildNotificationEventPayload(updated, "issued"), occurredAt: input.occurredAt, actorId: input.actorId },
    });
    return updated;
  }

  async waive(input: WaiveNotificationInput): Promise<ProcessNotification> {
    const index = this.notifications.findIndex(
      (notification) => notification.tenantId === input.tenantId && notification.id === input.notificationId && notification.processId === input.processId,
    );
    if (index < 0) {
      throw new NotificationError(404, "NOTIFICATION_NOT_FOUND", "notification_not_found", "The notification was not found for this process.");
    }
    if (this.notifications[index].status !== "DUE") {
      throw new NotificationError(409, "NOTIFICATION_CONFLICT", "not_due", "Only a DUE notification can be waived.");
    }
    const updated: ProcessNotification = {
      ...this.notifications[index],
      status: "WAIVED",
      reason: input.reason,
      updatedBy: input.actorId,
      updatedAt: new Date(),
    };
    this.notifications[index] = updated;
    await this.impound.appendEvent({
      tenantId: input.tenantId,
      processId: input.processId,
      event: { type: "NOTIFICATION", payload: buildNotificationEventPayload(updated, "waived"), occurredAt: input.occurredAt, actorId: input.actorId },
    });
    return updated;
  }

  async loadScheduleContext(tenantId: string, processId: string): Promise<NotificationScheduleContext | undefined> {
    const process = await this.impound.findProcessById(tenantId, processId);
    if (!process) return undefined;
    const profile = this.profiles.get(`${tenantId}:${process.profileId}`) ?? {
      scope: "PUBLIC_AGREEMENT" as ProfileScope,
      ownerNotifDays: FEDERAL_DEFAULTS.ownerNotifDays,
      noticeEdictDay: FEDERAL_DEFAULTS.noticeEdictDay,
    };
    return {
      tenantId,
      processId,
      enteredAt: process.enteredAt,
      frozenAt: process.frozenAt,
      status: process.status,
      scope: profile.scope,
      ownerNotifDays: profile.ownerNotifDays,
      noticeEdictDay: profile.noticeEdictDay,
    };
  }

  async listNotificationCandidates(): Promise<readonly string[]> {
    // O sweep é PRISMA-only (gated por persistence=prisma); os testes InMemory exercitam markDueProcess direto.
    return [];
  }

  // ── setters de teste ──────────────────────────────────────────────────────────────────────────────────────
  setProfileForTests(tenantId: string, profileId: string, profile: StoredProfile): void {
    this.profiles.set(`${tenantId}:${profileId}`, profile);
  }

  reset(): void {
    this.notifications.length = 0;
    this.profiles.clear();
  }
}
