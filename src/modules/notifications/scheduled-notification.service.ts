import { env } from "../../config/env.js";
import {
  createDefaultNotificationService,
  createMemoryNotificationService,
  type NotificationService,
} from "./notification.service.js";
import type { CreateNotificationInput } from "./notification.types.js";
import {
  InMemoryScheduledNotificationRepository,
  scheduledNotificationNotFoundError,
  type ScheduledNotificationRepository,
} from "./scheduled-notification.repository.js";
import type {
  FireDueResult,
  ScheduledNotification,
  ScheduledNotificationActorContext,
  ScheduledNotificationOccurrence,
} from "./scheduled-notification.types.js";
import {
  deriveReminderAt,
  parseCustomRecipientIds,
  parseLimit,
  parseNotifyAt,
  parseOffset,
  parseOptionalClientActionId,
  parseOptionalUuid,
  parseRemindBeforeMinutes,
  parseRequiredText,
  parseRequiredUuid,
  parseSourceType,
  parseVisibility,
} from "./scheduled-notification.validators.js";

type RawRecord = Record<string, unknown>;

// Reenfileiramento do job de scan é de 60s (D-Ω4C-NOTIF-SCHEDULER) — reuso do job.worker.ts, SEM node-cron.
export const SCHEDULED_NOTIFICATION_SCAN_INTERVAL_MS = 60_000;

export type ScheduledNotificationListResult = {
  readonly items: readonly ScheduledNotification[];
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export class ScheduledNotificationService {
  constructor(
    private readonly repository: ScheduledNotificationRepository,
    // A camada de ENTREGA (inbox/sino) + a resolução de destinatários vêm do NotificationService existente —
    // o fan-out cai na tabela `notifications` (INTOCADA) e alimenta o sino/central automaticamente.
    private readonly notificationService: NotificationService,
  ) {}

  // POST — cria a DEFINIÇÃO (o popup do AutEM). Dispara INLINE se já vencida (mesmo caminho idempotente) →
  // notificação imediata funciona mesmo com o worker desligado (flag OFF).
  async create(actor: ScheduledNotificationActorContext, body: RawRecord): Promise<ScheduledNotification> {
    const title = parseRequiredText(body.title, "title", 200);
    const message = parseRequiredText(body.message, "message", 2000);
    const notifyAt = parseNotifyAt(body.notify_at ?? body.notifyAt);
    const remindBeforeMinutes = parseRemindBeforeMinutes(body.remind_before_minutes ?? body.remindBeforeMinutes);
    const reminderAt = deriveReminderAt(notifyAt, remindBeforeMinutes);
    const visibility = parseVisibility(body.visibility);
    const customRecipientIds = parseCustomRecipientIds(body.custom_recipient_ids ?? body.customRecipientIds, visibility);
    const sourceType = parseSourceType(body.source_type ?? body.sourceType);
    const sourceId = parseOptionalUuid(body.source_id ?? body.sourceId, "source_id");
    const clientActionId = parseOptionalClientActionId(body.client_action_id ?? body.clientActionId);

    const created = await this.repository.create({
      tenantId: actor.tenantId,
      title,
      message,
      notifyAt,
      remindBeforeMinutes,
      reminderAt,
      visibility,
      customRecipientIds,
      sourceType,
      sourceId,
      clientActionId,
      createdBy: actor.userId,
    });

    const now = new Date();
    const dueNow =
      created.notifyAt.getTime() <= now.getTime() ||
      (created.reminderAt !== undefined && created.reminderAt.getTime() <= now.getTime());
    if (dueNow) {
      await this.fireDue({ tenantId: actor.tenantId, now });
      const refreshed = await this.repository.findById(actor.tenantId, created.id);
      if (refreshed) return refreshed;
    }
    return created;
  }

  async list(actor: ScheduledNotificationActorContext, query: RawRecord): Promise<ScheduledNotificationListResult> {
    const limit = parseLimit(query.limit);
    const offset = parseOffset(query.offset);
    const [items, total] = await Promise.all([
      this.repository.listByCreator(actor.tenantId, actor.userId, { limit, offset }),
      this.repository.countByCreator(actor.tenantId, actor.userId),
    ]);
    return { items, limit, offset, total };
  }

  // GET/:id e DELETE são CREATOR-scoped (foundation; a central tenant-wide é PR-20). Cross-tenant → 404 pelo
  // tenant-scope; cross-criador no mesmo tenant → 404 (§2.8: não vaza custom_recipient_ids a não-criador).
  async get(actor: ScheduledNotificationActorContext, id: string): Promise<ScheduledNotification> {
    const entry = await this.repository.findById(actor.tenantId, parseRequiredUuid(id, "id"));
    if (!entry || entry.createdBy !== actor.userId) {
      throw scheduledNotificationNotFoundError();
    }
    return entry;
  }

  // DELETE = soft-cancel (RN-NOTIF-09): para ocorrências FUTURAS (status=cancelled); as entregas já disparadas
  // permanecem no inbox (fato entregue não se "des-entrega").
  async cancel(actor: ScheduledNotificationActorContext, id: string): Promise<ScheduledNotification> {
    const normalizedId = parseRequiredUuid(id, "id");
    // 404 antes de cancelar (inexistente/cancelada/cross-tenant/cross-criador).
    await this.get(actor, normalizedId);
    const cancelled = await this.repository.softCancel(actor.tenantId, normalizedId);
    if (!cancelled) {
      throw scheduledNotificationNotFoundError();
    }
    return cancelled;
  }

  // Disparo idempotente de UMA janela (RN-NOTIF-01). Cria as entregas na inbox e seta os guardas. Duas chamadas
  // com o MESMO now → mesmas entregas: (1) os guardas fired_at/reminder_fired_at tiram a definição do próximo
  // scan; (2) o backstop DURO é a idempotencyKey `sched:<id>:<occurrence>` na unique de entrega — mesmo que o
  // guarda não tenha sido setado (crash), o createMany devolve a entrega existente (sem duplicar).
  async fireDue(input: { readonly tenantId: string; readonly now: Date }): Promise<FireDueResult> {
    const { tenantId, now } = input;
    let reminders = 0;
    let main = 0;
    let deliveries = 0;

    const dueReminders = await this.repository.findDueReminders(tenantId, now);
    for (const definition of dueReminders) {
      deliveries += await this.dispatch(definition, "reminder");
      await this.repository.markReminderFired(tenantId, definition.id, now);
      reminders += 1;
    }

    const dueMain = await this.repository.findDueMain(tenantId, now);
    for (const definition of dueMain) {
      deliveries += await this.dispatch(definition, "main");
      await this.repository.markMainFired(tenantId, definition.id, now);
      main += 1;
    }

    return { reminders, main, deliveries };
  }

  // Resolve destinatários por VISIBILIDADE (D-Ω4C-NOTIF-VISIBILITY) e cria as entregas (createManyNotifications
  // sanitiza a metadata). private → só o criador; public → todos ATIVOS do tenant; custom → recipients ∩ ativos.
  private async dispatch(definition: ScheduledNotification, occurrence: ScheduledNotificationOccurrence): Promise<number> {
    const recipientIds = await this.resolveRecipients(definition);
    if (recipientIds.length === 0) return 0;

    const type = occurrence === "reminder" ? "scheduled.reminder" : "scheduled.notification";
    const inputs: CreateNotificationInput[] = recipientIds.map((recipientUserId) => ({
      tenantId: definition.tenantId,
      recipientUserId,
      type,
      title: definition.title,
      message: definition.message,
      severity: "info",
      sourceType: definition.sourceType ?? "manual",
      sourceId: definition.sourceId,
      idempotencyKey: `sched:${definition.id}:${occurrence}`,
      metadata: { scheduledNotificationId: definition.id, occurrence },
    }));

    const created = await this.notificationService.createManyNotifications(inputs);
    return created.length;
  }

  private async resolveRecipients(definition: ScheduledNotification): Promise<string[]> {
    if (definition.visibility === "private") {
      return [definition.createdBy];
    }
    const candidates = await this.notificationService.listRecipientCandidates(definition.tenantId);
    const activeIds = candidates.filter((candidate) => candidate.status === "active").map((candidate) => candidate.userId);
    if (definition.visibility === "public") {
      return activeIds;
    }
    // custom: intersecta com os ativos do tenant (descarta stale/cross-tenant no disparo).
    const activeSet = new Set(activeIds);
    return definition.customRecipientIds.filter((id) => activeSet.has(id));
  }
}

// ---------------------------------------------------------------------------
// Runtime factories (espelha notification.service.ts / professional-statement.service.ts).
// ---------------------------------------------------------------------------

const memoryRepository = new InMemoryScheduledNotificationRepository();
let defaultServicePromise: Promise<ScheduledNotificationService> | undefined;

export function createMemoryScheduledNotificationService(): ScheduledNotificationService {
  // Reusa o NotificationService de memória (mesmo singleton de store) → as entregas caem na inbox compartilhada.
  return new ScheduledNotificationService(memoryRepository, createMemoryNotificationService());
}

export function getMemoryScheduledNotificationRepositoryForTests(): InMemoryScheduledNotificationRepository {
  return memoryRepository;
}

export async function createDefaultScheduledNotificationService(): Promise<ScheduledNotificationService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryScheduledNotificationService();
  }
  defaultServicePromise ??= createPrismaScheduledNotificationService();
  return defaultServicePromise;
}

export function resetScheduledNotificationRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaScheduledNotificationService(): Promise<ScheduledNotificationService> {
  const { createPrismaScheduledNotificationRepository } = await import("./scheduled-notification-prisma.repository.js");
  const [repository, notificationService] = await Promise.all([
    createPrismaScheduledNotificationRepository(),
    createDefaultNotificationService(),
  ]);
  return new ScheduledNotificationService(repository, notificationService);
}

// Módulo-função nomeada no plano (D-Ω4C-NOTIF-SCHEDULER): dispara a janela devida de UM tenant usando o serviço
// default (Prisma em prod). Usada pelo job `notifications.scan-due`.
export async function fireDueScheduledNotifications(input: { readonly tenantId: string; readonly now: Date }): Promise<FireDueResult> {
  const service = await createDefaultScheduledNotificationService();
  return service.fireDue(input);
}

// Varredura recorrente: para cada tenant ATIVO (tabela `tenants` é global), dispara a janela devida. Só roda em
// modo prisma (o worker é gated por flag + persistence=prisma). O(tenants) v1 — poucos tenants (R4 do plano).
export async function runScheduledNotificationScan(now: Date = new Date()): Promise<void> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") return;
  const { prisma } = await import("../../database/prisma.js");
  const tenants = await prisma.tenant.findMany({ where: { status: "active" }, select: { id: true } });
  const service = await createDefaultScheduledNotificationService();
  for (const tenant of tenants) {
    await service.fireDue({ tenantId: tenant.id, now });
  }
}
