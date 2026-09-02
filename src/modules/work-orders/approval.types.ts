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
  readonly action:
    | "approval.requested"
    | "approval.approved"
    | "approval.rejected"
    // B-O6R-07a (Ω6R-SEC-002) — a RECUSA por segregação de função deixa rastro. Uma tentativa de
    // autoaprovação recusada em silêncio é indistinguível de "ninguém tentou": o padrão que se quer
    // detectar é justamente a repetição.
    | "approval.self_decision_denied";
  readonly tenantId: string;
  readonly actorId: string;
  readonly approvalId: string;
  readonly entityType: ApprovalEntityType;
  readonly entityId: string;
  // `denied` entra com a recusa de SoD. Continua sendo um enum fechado: o auditor lê o desfecho, não
  // um texto livre.
  readonly outcome: "success" | "denied";
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
