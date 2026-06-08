import type { DomainEventEnvelope } from "../../infra/events/domain-event.types.js";
import { env } from "../../config/env.js";
import type {
  CreateNotificationInput,
  ListNotificationFilters,
  Notification,
  NotificationActorContext,
  NotificationError,
} from "./notification.types.js";
import { NotificationError as NotificationRouteError } from "./notification.types.js";
import {
  InMemoryNotificationRepository,
  type NotificationRepository,
} from "./notification.repository.js";
import { NotificationRecipientResolver } from "./notification.recipient-resolver.js";

export class NotificationService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly recipientResolver = new NotificationRecipientResolver(repository),
  ) {}

  createNotification(input: CreateNotificationInput): Promise<Notification> {
    return this.repository.create({
      ...input,
      metadata: sanitizeNotificationMetadata(input.metadata),
    });
  }

  async createManyNotifications(inputs: readonly CreateNotificationInput[]): Promise<readonly Notification[]> {
    return this.repository.createMany(
      inputs.map((input) => ({
        ...input,
        metadata: sanitizeNotificationMetadata(input.metadata),
      })),
    );
  }

  listMyNotifications(actor: NotificationActorContext, filters: ListNotificationFilters = {}): Promise<readonly Notification[]> {
    return this.repository.listByRecipient({
      tenantId: actor.tenantId,
      recipientUserId: actor.userId,
      filters,
    });
  }

  countUnread(actor: NotificationActorContext): Promise<number> {
    return this.repository.countUnread({
      tenantId: actor.tenantId,
      recipientUserId: actor.userId,
    });
  }

  async markAsRead(actor: NotificationActorContext, notificationId: string): Promise<Notification> {
    const notification = await this.repository.markAsRead({
      tenantId: actor.tenantId,
      recipientUserId: actor.userId,
      notificationId,
    });

    if (!notification) {
      throw new NotificationRouteError(404, "NOTIFICATION_NOT_FOUND", "notification_not_found", "Notification not found.");
    }

    return notification;
  }

  markAllAsRead(actor: NotificationActorContext): Promise<number> {
    return this.repository.markAllAsRead({
      tenantId: actor.tenantId,
      recipientUserId: actor.userId,
    });
  }

  async archiveNotification(actor: NotificationActorContext, notificationId: string): Promise<Notification> {
    const notification = await this.repository.archive({
      tenantId: actor.tenantId,
      recipientUserId: actor.userId,
      notificationId,
    });

    if (!notification) {
      throw new NotificationRouteError(404, "NOTIFICATION_NOT_FOUND", "notification_not_found", "Notification not found.");
    }

    return notification;
  }

  async createFromDomainEvent(event: DomainEventEnvelope): Promise<readonly Notification[]> {
    const template = notificationTemplateFor(event);
    if (!template || !event.tenantId) return [];

    const recipientUserIds = await this.recipientResolver.resolve(event);
    if (recipientUserIds.length === 0) return [];

    return this.createManyNotifications(
      recipientUserIds.map((recipientUserId) => ({
        tenantId: event.tenantId as string,
        recipientUserId,
        type: template.type,
        title: template.title,
        message: template.message,
        severity: template.severity,
        sourceType: template.sourceType,
        sourceId: template.sourceId,
        actionUrl: template.actionUrl,
        idempotencyKey: `${event.id}:${recipientUserId}`,
        metadata: buildEventMetadata(event),
      })),
    );
  }
}

type NotificationTemplate = Pick<
  CreateNotificationInput,
  "type" | "title" | "message" | "severity" | "sourceType" | "sourceId" | "actionUrl"
>;

function notificationTemplateFor(event: DomainEventEnvelope): NotificationTemplate | null {
  const runId = readString(event.payload.runId);

  if (event.name === "checklist_run.completed") {
    return {
      type: "checklist_run.completed",
      title: "Checklist concluido",
      message: "Uma execucao de checklist foi concluida.",
      severity: "success",
      sourceType: "checklist_run",
      sourceId: runId,
      actionUrl: "/operations/checklists",
    };
  }

  if (event.name === "checklist_run.divergence_reported") {
    return {
      type: "checklist_run.divergence_reported",
      title: "Divergencia em checklist",
      message: "Uma execucao de checklist registrou divergencia e requer acompanhamento.",
      severity: "warning",
      sourceType: "checklist_run",
      sourceId: runId,
      actionUrl: "/operations/checklists",
    };
  }

  if (event.name === "checklist_run.acknowledgement_created") {
    return {
      type: "checklist_run.acknowledgement_created",
      title: "Ciencia registrada",
      message: "A ciencia de responsabilidade de uma divergencia foi registrada.",
      severity: "info",
      sourceType: "checklist_run",
      sourceId: runId,
      actionUrl: "/operations/checklists",
    };
  }

  return null;
}

function buildEventMetadata(event: DomainEventEnvelope) {
  return sanitizeNotificationMetadata({
    eventId: event.id,
    eventName: event.name,
    correlationId: event.correlationId,
    actorId: event.actorId,
    occurredAt: event.occurredAt,
    runId: readString(event.payload.runId),
    templateId: readString(event.payload.templateId),
    status: readString(event.payload.status),
  });
}

const sensitiveKeyPattern =
  /(authorization|access_?token|refresh_?token|password|passwd|pwd|secret|api_?key|token_hash|password_hash|refresh_token_hash|storage_key|storagekey|bucket|private_url|privateurl|path)/i;

export function sanitizeNotificationMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!metadata) return {};

  return compactRecord(sanitizeRecord(metadata));
}

function sanitizeRecord(metadata: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (sensitiveKeyPattern.test(key)) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    sanitized[key] = sanitizeValue(value);
  }

  return sanitized;
}

function sanitizeValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(sanitizeValue).filter((item) => item !== undefined);
  if (typeof value === "object" && value !== null) return sanitizeRecord(value as Record<string, unknown>);
  return value;
}

function compactRecord(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function readString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

const memoryRepository = new InMemoryNotificationRepository();
let defaultServicePromise: Promise<NotificationService> | undefined;

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

  defaultServicePromise ??= createPrismaNotificationService();

  return defaultServicePromise;
}

export function resetNotificationRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaNotificationService(): Promise<NotificationService> {
  const { createPrismaNotificationRepository } = await import("./notification-prisma.repository.js");
  const repository = await createPrismaNotificationRepository();

  return new NotificationService(repository);
}
