export type WorkOrderStatus =
  | "draft"
  | "scheduled"
  | "waiting_approval"
  | "dispatched"
  | "in_transit"
  | "in_service"
  | "blocked"
  | "completed"
  | "cancelled";

export type Priority = "low" | "medium" | "high" | "critical";

export type SlaState = "on_track" | "attention" | "breached";

export type WorkOrder = {
  id: string;
  code: string;
  customer: string;
  location: string;
  serviceType: string;
  status: WorkOrderStatus;
  priority: Priority;
  slaState: SlaState;
  slaDueAt: string;
  branchId: string;
  branchName: string;
  team: string;
  vehicle: string;
  technician: string;
  blocked: boolean;
  blockReason?: string;
  approvalState: "none" | "requested" | "approved" | "rejected";
  estimatedCost: number;
  billableValue: number;
  checklistProgress: number;
  evidenceCount: number;
  updatedAt: string;
};

export type WorkOrderTimelineItem = {
  id: string;
  at: string;
  title: string;
  actor: string;
  detail: string;
  state: "audit" | "info" | "success" | "warning" | "danger";
};

export type WorkOrderEvidence = {
  id: string;
  type: "photo" | "document" | "signature";
  title: string;
  capturedBy: string;
  capturedAt: string;
  auditHash: string;
};
