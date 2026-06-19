import {
  createDefaultNotificationService,
  createMemoryNotificationService,
  type NotificationService,
} from "../notifications/notification.service.js";
import {
  InMemoryApprovalRepository,
  type ApprovalRepository,
} from "./approval.repository.js";
import type {
  ApprovalActorContext,
  ApprovalAuditEvent,
  ApprovalEntityType,
  DecideOperationalApprovalInput,
  OperationalApproval,
  RequestOperationalApprovalInput,
} from "./approval.types.js";
import { APPROVAL_ENTITY_TYPES, ApprovalError } from "./approval.types.js";

export class ApprovalService {
  constructor(
    private readonly repository: ApprovalRepository,
    private readonly notifications?: NotificationService,
  ) {}

  async request(input: RequestOperationalApprovalInput): Promise<OperationalApproval> {
    assertEntityType(input.entityType);
    const pendingReason = requiredText(input.pendingReason, "pendingReason");
    const approval = await this.repository.request({ ...input, pendingReason });
    recordApprovalAudit({
      action: "approval.requested",
      tenantId: input.tenantId,
      actorId: input.requestedByUserId,
      approvalId: approval.id,
      entityType: approval.entityType,
      entityId: approval.entityId,
      outcome: "success",
      metadata: {
        status: approval.status,
        work_order_id: approval.workOrderId,
      },
    });
    return approval;
  }

  listPending(actor: ApprovalActorContext, query: Record<string, unknown> = {}) {
    return this.repository.listPending({
      tenantId: actor.tenantId,
      workOrderId: optionalText(query.work_order_id ?? query.workOrderId),
    });
  }

  async get(actor: ApprovalActorContext, approvalId: string): Promise<OperationalApproval> {
    const approval = await this.repository.findById(actor.tenantId, approvalId);
    if (!approval) {
      throw new ApprovalError(404, "APPROVAL_NOT_FOUND", "not_found", "Approval was not found.");
    }
    return approval;
  }

  approve(actor: ApprovalActorContext, approvalId: string, body: Record<string, unknown>) {
    return this.decide(actor, {
      tenantId: actor.tenantId,
      approvalId,
      actorUserId: actor.userId,
      decision: "approved",
      note: optionalText(body.note),
    });
  }

  reject(actor: ApprovalActorContext, approvalId: string, body: Record<string, unknown>) {
    return this.decide(actor, {
      tenantId: actor.tenantId,
      approvalId,
      actorUserId: actor.userId,
      decision: "rejected",
      reason: requiredText(body.reason, "reason"),
    });
  }

  private async decide(
    actor: ApprovalActorContext,
    input: DecideOperationalApprovalInput,
  ): Promise<OperationalApproval> {
    const current = await this.get(actor, input.approvalId);
    if (current.status !== "pending_approval") {
      throw new ApprovalError(
        409,
        "APPROVAL_ALREADY_DECIDED",
        "approval_already_decided",
        "Approval already has a final decision.",
      );
    }

    const approval = await this.repository.decide(input);
    if (!approval) {
      throw new ApprovalError(404, "APPROVAL_NOT_FOUND", "not_found", "Approval was not found.");
    }

    recordApprovalAudit({
      action: approval.status === "approved" ? "approval.approved" : "approval.rejected",
      tenantId: approval.tenantId,
      actorId: actor.userId,
      approvalId: approval.id,
      entityType: approval.entityType,
      entityId: approval.entityId,
      outcome: "success",
      metadata: {
        status: approval.status,
        work_order_id: approval.workOrderId,
        reason_provided: Boolean(approval.rejectionReason),
        note_provided: Boolean(approval.decisionNote),
      },
    });

    await this.notifyDecision(approval);
    return approval;
  }

  private async notifyDecision(approval: OperationalApproval): Promise<void> {
    if (!this.notifications) return;

    await this.notifications.createNotification({
      tenantId: approval.tenantId,
      recipientUserId: approval.requestedByUserId,
      type: `approval.${approval.status}`,
      title: approval.status === "approved" ? "Aprovacao registrada" : "Reprovacao registrada",
      message:
        approval.status === "approved"
          ? "A aprovacao operacional foi registrada."
          : "A aprovacao operacional foi reprovada.",
      severity: approval.status === "approved" ? "success" : "warning",
      sourceType: approval.entityType,
      sourceId: approval.entityId,
      actionUrl: approval.workOrderId ? `/work-orders/${approval.workOrderId}` : undefined,
      idempotencyKey: `${approval.id}:${approval.status}`,
      metadata: {
        approval_id: approval.id,
        status: approval.status,
      },
    });
  }
}

const memoryRepository = new InMemoryApprovalRepository();
let defaultServicePromise: Promise<ApprovalService> | undefined;
const auditEvents: ApprovalAuditEvent[] = [];

export function createMemoryApprovalService(): ApprovalService {
  return new ApprovalService(memoryRepository, createMemoryNotificationService());
}

export async function createDefaultApprovalService(): Promise<ApprovalService> {
  defaultServicePromise ??= createRuntimeApprovalService();
  return defaultServicePromise;
}

export function resetApprovalRuntimeForTests(): void {
  memoryRepository.reset();
  auditEvents.length = 0;
  defaultServicePromise = undefined;
}

export function getApprovalAuditEventsForTests(): readonly ApprovalAuditEvent[] {
  return auditEvents.map((event) => ({ ...event, metadata: { ...event.metadata } }));
}

async function createRuntimeApprovalService(): Promise<ApprovalService> {
  return new ApprovalService(memoryRepository, await createDefaultNotificationService());
}

function assertEntityType(value: string): asserts value is ApprovalEntityType {
  if (!APPROVAL_ENTITY_TYPES.includes(value as ApprovalEntityType)) {
    throw new ApprovalError(400, "APPROVAL_INVALID", "invalid_entity_type", "entityType is invalid.");
  }
}

function requiredText(value: unknown, field: string): string {
  const normalized = optionalText(value);
  if (!normalized) {
    throw new ApprovalError(400, "APPROVAL_INVALID", "required_field", `${field} is required.`);
  }
  return normalized;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function recordApprovalAudit(
  input: Omit<ApprovalAuditEvent, "metadata" | "createdAt"> & {
    readonly metadata?: Readonly<Record<string, unknown>>;
  },
): void {
  auditEvents.push({
    ...input,
    metadata: sanitizeAuditMetadata(input.metadata ?? {}),
    createdAt: new Date().toISOString(),
  });
}

const unsafeAuditKeys = /authorization|bearer|token|base64|file_data|local_path|path|bucket|storage_?key/i;

function sanitizeAuditMetadata(metadata: Readonly<Record<string, unknown>>) {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !unsafeAuditKeys.test(key))
      .map(([key, value]) => [key, sanitizeAuditValue(value)]),
  );
}

function sanitizeAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeAuditValue);
  if (value && typeof value === "object") {
    return sanitizeAuditMetadata(value as Readonly<Record<string, unknown>>);
  }
  return value;
}
