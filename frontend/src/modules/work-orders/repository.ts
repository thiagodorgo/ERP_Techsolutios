import { mockEvidence, mockTimeline, mockWorkOrders } from "../../mocks/work-orders/workOrders";
import type { WorkOrder } from "./types";

export async function listWorkOrders(): Promise<WorkOrder[]> {
  await new Promise((resolve) => window.setTimeout(resolve, 250));
  return mockWorkOrders;
}

export async function getWorkOrder(workOrderId: string) {
  await new Promise((resolve) => window.setTimeout(resolve, 200));
  const workOrder = mockWorkOrders.find((item) => item.id === workOrderId) ?? mockWorkOrders[0];

  return {
    workOrder,
    timeline: mockTimeline,
    evidence: mockEvidence,
  };
}

export async function createWorkOrderDraft(input: Partial<WorkOrder>) {
  await new Promise((resolve) => window.setTimeout(resolve, 300));
  return {
    id: "wo-draft",
    code: "OS-RASCUNHO",
    ...input,
  };
}
