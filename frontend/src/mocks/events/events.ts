import type { DomainEvent } from "../../modules/events/types";

export const mockEvents: DomainEvent[] = [
  {
    id: "evt-1",
    name: "WorkOrderSlaBreached",
    aggregateId: "wo-10021",
    aggregateType: "work-order",
    tenantId: "ten-industrial-01",
    branchId: "fil-sp-01",
    occurredAt: "2026-05-26T13:30:00-03:00",
    state: "processing",
    payload: { code: "OS-10021", previousState: "attention" },
  },
  {
    id: "evt-2",
    name: "ApprovalRequested",
    aggregateId: "wo-10021",
    aggregateType: "approval",
    tenantId: "ten-industrial-01",
    branchId: "fil-sp-01",
    occurredAt: "2026-05-26T13:41:00-03:00",
    state: "queued",
    payload: { amount: 4820, nextApprover: "Gestor Operacional" },
  },
  {
    id: "evt-3",
    name: "LogisticsQueueUpdated",
    aggregateId: "q-critical",
    aggregateType: "logistics",
    tenantId: "ten-industrial-01",
    branchId: "fil-sp-01",
    occurredAt: "2026-05-26T13:45:00-03:00",
    state: "reconciled",
    payload: { criticalCount: 4 },
  },
];
