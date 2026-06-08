import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import { publishDomainEvent } from "../../../infra/events/domain-event.publisher.js";
import type { AuditLogRepository } from "../repositories/audit-log.repository.js";
import type {
  AuditActorType,
  AuditOutcome,
  AuditSeverity,
  EnterpriseAuditLogInput,
  EnterpriseAuditLogRecord,
  EnterpriseAuditMetadata,
} from "./audit-log.types.js";

export type AuditLogRecordLike = Awaited<ReturnType<AuditLogRepository["create"]>>;
export type AuditLogWriter = {
  create(data: Parameters<AuditLogRepository["create"]>[0]): Promise<AuditLogRecordLike>;
};

export type EnterpriseAuditLogServiceOptions = {
  readonly publishEvent?: boolean;
  readonly publishDomainEvent?: typeof publishDomainEvent;
  readonly logger?: Pick<Console, "warn">;
};

const sensitiveKeyPattern =
  /(authorization|access_?token|refresh_?token|password|passwd|pwd|secret|api_?key|token_hash|password_hash|refresh_token_hash)/i;

export class EnterpriseAuditLogService {
  constructor(
    private readonly auditLogs: AuditLogWriter,
    private readonly options: EnterpriseAuditLogServiceOptions = {},
  ) {}

  async record(input: EnterpriseAuditLogInput): Promise<EnterpriseAuditLogRecord> {
    const correlationId = normalizeOptionalString(input.correlationId) ?? randomUUID();
    const outcome = input.outcome ?? "success";
    const severity = input.severity ?? severityForOutcome(outcome);
    const metadata = buildAuditMetadata(input, correlationId, outcome, severity);
    const record = await this.auditLogs.create({
      tenant_id: input.tenantId,
      actor_user_id: input.actorId ?? null,
      action: input.action,
      entity: input.resourceType,
      entity_id: input.resourceId ?? null,
      metadata,
    });
    const auditRecord = {
      id: record.id,
      tenantId: record.tenant_id,
      actorId: record.actor_user_id,
      action: record.action,
      resourceType: record.entity,
      resourceId: record.entity_id,
      outcome,
      severity,
      correlationId,
      createdAt: record.created_at,
    };

    if (this.options.publishEvent ?? true) {
      const publish = this.options.publishDomainEvent ?? publishDomainEvent;

      await publish(
        "audit_log.created",
        {
          auditLogId: auditRecord.id,
          action: auditRecord.action,
          resourceType: auditRecord.resourceType,
          resourceId: auditRecord.resourceId,
          outcome: auditRecord.outcome,
          severity: auditRecord.severity,
        },
        {
          tenantId: auditRecord.tenantId,
          actorId: auditRecord.actorId ?? undefined,
          correlationId: auditRecord.correlationId,
        },
        {
          logger: this.options.logger,
        },
      );
    }

    return auditRecord;
  }
}

export function buildAuditMetadata(
  input: EnterpriseAuditLogInput,
  correlationId = normalizeOptionalString(input.correlationId) ?? randomUUID(),
  outcome: AuditOutcome = input.outcome ?? "success",
  severity: AuditSeverity = input.severity ?? severityForOutcome(outcome),
): Prisma.InputJsonObject {
  return compactJsonObject({
    actorType: input.actorType ?? actorTypeFor(input.actorId),
    actorEmail: normalizeOptionalString(input.actorEmail),
    outcome,
    severity,
    correlationId,
    requestId: normalizeOptionalString(input.requestId),
    ipAddress: normalizeOptionalString(input.ipAddress),
    userAgent: normalizeOptionalString(input.userAgent),
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? undefined,
    ...sanitizeMetadata(input.metadata),
  });
}

export function sanitizeAuditMetadata(
  metadata: EnterpriseAuditMetadata | undefined,
): Prisma.InputJsonObject {
  return compactJsonObject(sanitizeMetadata(metadata));
}

function sanitizeMetadata(metadata: EnterpriseAuditMetadata | undefined): Record<string, unknown> {
  if (!metadata) {
    return {};
  }

  return sanitizeRecord(metadata);
}

function sanitizeRecord(metadata: EnterpriseAuditMetadata): Record<string, unknown> {
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
  if (value === undefined) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue).filter((item) => item !== undefined);
  }

  if (isRecord(value)) {
    return sanitizeRecord(value);
  }

  return value;
}

function compactJsonObject(input: Record<string, unknown>): Prisma.InputJsonObject {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Prisma.InputJsonObject;
}

function severityForOutcome(outcome: AuditOutcome): AuditSeverity {
  if (outcome === "denied") {
    return "warning";
  }

  if (outcome === "failure") {
    return "warning";
  }

  return "info";
}

function actorTypeFor(actorId: string | null | undefined): AuditActorType {
  return actorId ? "user" : "anonymous";
}

function normalizeOptionalString(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized || undefined;
}

function isRecord(value: unknown): value is EnterpriseAuditMetadata {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
