import type { WorkOrderActorContext } from "./work-order.types.js";

export const APPROVAL_ENTITY_TYPES = [
  "work_order",
  "checklist_run",
  "evidence",
] as const;

export const APPROVAL_STATUSES = [
  "pending_approval",
  "approved",
  "rejected",
] as const;

export type ApprovalEntityType = (typeof APPROVAL_ENTITY_TYPES)[number];
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];
export type ApprovalActorContext = WorkOrderActorContext;

export type OperationalApproval = {
  readonly id: string;
  readonly tenantId: string;
  readonly entityType: ApprovalEntityType;
  readonly entityId: string;
  readonly workOrderId?: string;
  readonly status: ApprovalStatus;
  readonly requestedByUserId: string;
  readonly requestedAt: Date;
  readonly pendingReason: string;
  readonly decidedByUserId?: string;
  readonly decidedAt?: Date;
  readonly decisionNote?: string;
  readonly rejectionReason?: string;
};

export type RequestOperationalApprovalInput = {
  readonly tenantId: string;
  readonly entityType: ApprovalEntityType;
  readonly entityId: string;
  readonly workOrderId?: string;
  readonly requestedByUserId: string;
  readonly pendingReason: string;
};

export type DecideOperationalApprovalInput = {
  readonly tenantId: string;
  readonly approvalId: string;
  readonly actorUserId: string;
  readonly decision: "approved" | "rejected";
  readonly note?: string;
  readonly reason?: string;
};

export type ApprovalAuditEvent = {
  readonly action: "approval.requested" | "approval.approved" | "approval.rejected";
  readonly tenantId: string;
  readonly actorId: string;
  readonly approvalId: string;
  readonly entityType: ApprovalEntityType;
  readonly entityId: string;
  readonly outcome: "success";
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
};

export class ApprovalError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "ApprovalError";
  }
}
