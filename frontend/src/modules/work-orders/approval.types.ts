import type { WorkOrdersApiContext } from "./work-orders.types";

export type OperationalApprovalStatus =
  | "pending_approval"
  | "approved"
  | "rejected";

export type OperationalApprovalEntityType =
  | "work_order"
  | "checklist_run"
  | "evidence";

export type OperationalApproval = {
  readonly id: string;
  readonly entityType: OperationalApprovalEntityType;
  readonly entityId: string;
  readonly workOrderId?: string | null;
  readonly status: OperationalApprovalStatus;
  readonly requestedBy: string;
  readonly requestedAt: string;
  readonly pendingReason: string;
  readonly decidedBy?: string | null;
  readonly decidedAt?: string | null;
  readonly note?: string | null;
  readonly reason?: string | null;
  readonly safeMessage: string;
};

export type ApprovalApiContext = WorkOrdersApiContext;
