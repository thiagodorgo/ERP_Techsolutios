export type DomainEventName =
  | "WorkOrderCreated"
  | "WorkOrderUpdated"
  | "WorkOrderDispatched"
  | "WorkOrderReassigned"
  | "WorkOrderStatusChanged"
  | "WorkOrderSlaBreached"
  | "ApprovalRequested"
  | "ApprovalResolved"
  | "EvidenceAttached"
  | "LogisticsQueueUpdated";

export type AsyncState = "idle" | "queued" | "processing" | "reconciled" | "failed";

export type DomainEvent<TPayload = Record<string, unknown>> = {
  id: string;
  name: DomainEventName;
  aggregateId: string;
  aggregateType: "work-order" | "approval" | "evidence" | "logistics";
  tenantId: string;
  branchId: string;
  occurredAt: string;
  state: AsyncState;
  payload: TPayload;
};

export type CommandEnvelope<TPayload = Record<string, unknown>> = {
  id: string;
  commandName: string;
  tenantId: string;
  branchId: string;
  requestedBy: string;
  requestedAt: string;
  state: AsyncState;
  payload: TPayload;
};
