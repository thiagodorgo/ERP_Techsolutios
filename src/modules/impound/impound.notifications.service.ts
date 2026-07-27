import pino from "pino";

import { env } from "../../config/env.js";
import { getMemoryImpoundRepositoryForTests } from "./impound.service.js";
import { computeNotificationSchedule } from "./impound.notifications.js";
import { InMemoryNotificationRepository, type NotificationRepository } from "./impound.notifications.repository.js";
import {
  type IssueNotificationInput,
  type MarkDueProcessResult,
  type NotificationActorContext,
  type ProcessNotification,
  type TenantNotifyScanResult,
  type WaiveNotificationInput,
} from "./impound.notifications.types.js";
import {
  parseNotificationChannel,
  parseOptionalAttachment,
  parseOptionalDateTime,
  parseOptionalRecipientRef,
  parseRequiredReason,
  parseRequiredUuid,
} from "./impound.notifications.validators.js";

type RawRecord = Record<string, unknown>;

const CANDIDATE_PAGE = 500;
// Observabilidade do fail-closed SEM PII (só tenantId/processId/kind/reason). Prazo ausente/<=0 ⇒ marco NÃO
// agendado (o motor puro o omite); o warn torna o marco bloqueado RASTREÁVEL.
const logger = pino({ level: env.LOG_LEVEL });

export class NotificationService {
  constructor(private readonly repository: NotificationRepository) {}

  // GET /impound-processes/:id/notifications — a trilha (impound:read).
  async list(actor: NotificationActorContext, processId: string): Promise<readonly ProcessNotification[]> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    return this.repository.listNotifications({ tenantId: actor.tenantId, processId: normalizedId });
  }

  // POST .../notifications/:id/issue — DUE→ISSUED (impound:notify). Carimba channel/recipient_ref minimizado/
  // issued_at + comprovante Attachment OPCIONAL. A DUE-marking é do SISTEMA (sem ponta HTTP de criação manual).
  async issue(actor: NotificationActorContext, processId: string, notificationId: string, body: RawRecord): Promise<ProcessNotification> {
    const normalizedProcessId = parseRequiredUuid(processId, "processId");
    const normalizedId = parseRequiredUuid(notificationId, "notificationId");
    const input: IssueNotificationInput = {
      tenantId: actor.tenantId,
      processId: normalizedProcessId,
      notificationId: normalizedId,
      channel: parseNotificationChannel(body.channel),
      recipientRef: parseOptionalRecipientRef(body.recipient_ref ?? body.recipientRef),
      issuedAt: parseOptionalDateTime(body.issued_at ?? body.issuedAt, "issuedAt") ?? new Date(),
      comprovante: parseOptionalAttachment(body),
      actorId: actor.userId,
      occurredAt: new Date(),
    };
    return this.repository.issue(input);
  }

  // POST .../notifications/:id/waive — DUE→WAIVED com fundamento (impound:notify).
  async waive(actor: NotificationActorContext, processId: string, notificationId: string, body: RawRecord): Promise<ProcessNotification> {
    const normalizedProcessId = parseRequiredUuid(processId, "processId");
    const normalizedId = parseRequiredUuid(notificationId, "notificationId");
    const input: WaiveNotificationInput = {
      tenantId: actor.tenantId,
      processId: normalizedProcessId,
      notificationId: normalizedId,
      reason: parseRequiredReason(body.reason),
      actorId: actor.userId,
      occurredAt: new Date(),
    };
    return this.repository.waive(input);
  }

  // ── Motor de prazos (I6) — marcação DEVIDA de UM processo. Usado pelo SWEEP. Idempotente/DST-safe/fail-closed.
  // FAIL-CLOSED: scope != público ⇒ não roda o rito; prazo ausente/<=0 ⇒ pula o marco + warn (jamais fabrica data).
  // Congelamento/suspensão: frozen_at set ⇒ sem novo DUE; JUDICIAL_HOLD ⇒ suspenso. Marcos já materializados
  // PERSISTEM (append-only) mesmo se depois liberado — é a trilha probatória.
  async markDueProcess(tenantId: string, processId: string, now: Date, actorId?: string): Promise<MarkDueProcessResult> {
    const ctx = await this.repository.loadScheduleContext(tenantId, processId);
    if (!ctx || !ctx.enteredAt) return { examined: false, marked: 0, errors: 0 };
    // Privado NÃO roda o rito administrativo do art. 328 (resolveDefaults: scope público × privado).
    if (ctx.scope !== "PUBLIC_AGREEMENT") return { examined: false, marked: 0, errors: 0 };
    // Congelamento (RELEASED/AUCTIONED/…→CLOSED) e suspensão judicial (§§14-15) NÃO geram novo DUE.
    if (ctx.frozenAt || ctx.status === "JUDICIAL_HOLD") return { examined: true, marked: 0, errors: 0 };

    const profile = { ownerNotifDays: ctx.ownerNotifDays, noticeEdictDay: ctx.noticeEdictDay };
    const schedule = computeNotificationSchedule(ctx.enteredAt, profile);
    const scheduledKinds = new Set(schedule.map((mark) => mark.kind));

    let errors = 0;
    // FAIL-CLOSED observável: um prazo ausente/<=0 ⇒ o motor NÃO agendou o marco → sinaliza sem PII (jamais fabrica).
    for (const [kind, days] of [
      ["OWNER_INITIAL", ctx.ownerNotifDays],
      ["COMPLEMENTARY_EDICT", ctx.noticeEdictDay],
    ] as const) {
      if (!scheduledKinds.has(kind)) {
        errors += 1;
        logger.warn({ tenantId, processId, kind, days, reason: "missing_or_nonpositive_deadline" }, "impound.notify-due: fail-closed (prazo ausente/<=0); marco NÃO agendado");
      }
    }

    let marked = 0;
    for (const mark of schedule) {
      if (mark.dueAt.getTime() > now.getTime()) continue; // ainda não devida
      const result = await this.repository.markDue({
        tenantId,
        processId,
        kind: mark.kind,
        dueAt: mark.dueAt,
        actorId,
        occurredAt: now,
      });
      if (result.created) marked += 1;
    }
    return { examined: true, marked, errors };
  }

  // Varredura de UM tenant (o sweep chama por tenant). try/catch POR candidato isola o raio de dano — um processo
  // que lance NÃO derruba a varredura dos demais.
  async markDueTenantScan(tenantId: string, now: Date = new Date()): Promise<TenantNotifyScanResult> {
    const candidates = await this.repository.listNotificationCandidates(tenantId, CANDIDATE_PAGE);
    let processed = 0;
    let marked = 0;
    let errors = 0;
    for (const processId of candidates) {
      try {
        const result = await this.markDueProcess(tenantId, processId, now);
        if (result.examined) processed += 1;
        marked += result.marked;
        errors += result.errors;
      } catch {
        errors += 1; // isola o candidato que lança; o scan segue
      }
    }
    return { processed, marked, errors };
  }
}

// ── runtime (env-gate memory×prisma), espelha charge.service.ts ─────────────────────────────────────────────
const memoryRepository = new InMemoryNotificationRepository(getMemoryImpoundRepositoryForTests());
let defaultNotificationServicePromise: Promise<NotificationService> | undefined;

export function createMemoryNotificationService(): NotificationService {
  return new NotificationService(memoryRepository);
}

export function getMemoryNotificationRepositoryForTests(): InMemoryNotificationRepository {
  return memoryRepository;
}

export async function createDefaultNotificationService(): Promise<NotificationService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryNotificationService();
  }
  defaultNotificationServicePromise ??= createPrismaNotificationService();
  return defaultNotificationServicePromise;
}

export function resetNotificationRuntimeForTests(): void {
  memoryRepository.reset();
  defaultNotificationServicePromise = undefined;
}

async function createPrismaNotificationService(): Promise<NotificationService> {
  const { createPrismaNotificationRepository } = await import("./impound.notifications-prisma.repository.js");
  return new NotificationService(await createPrismaNotificationRepository());
}
