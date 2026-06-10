import type { DispatchDetail, DispatchEvent, DispatchListItem, DispatchesData } from "./dispatches.types";

const now = "2026-06-09T12:00:00.000Z";

export const mockDispatchItems: DispatchListItem[] = [
  {
    id: "dispatch-000101",
    workOrderId: "11111111-1111-4111-8111-000000000001",
    workOrderCode: "OS-000101",
    workOrderTitle: "Coleta de veiculo para reboque",
    operatorUserId: "usr-ops-02",
    status: "assigned",
    priority: "high",
    observation: "Despacho inicial para coleta.",
    createdAt: "2026-06-09T11:50:00.000Z",
    updatedAt: now,
  },
  {
    id: "dispatch-000102",
    workOrderId: "11111111-1111-4111-8111-000000000003",
    workOrderCode: "OS-000103",
    workOrderTitle: "Deslocamento para atendimento tecnico",
    operatorUserId: "usr-ops-03",
    status: "on_route",
    priority: "urgent",
    observation: "Operador em deslocamento.",
    onRouteAt: "2026-06-09T12:05:00.000Z",
    createdAt: "2026-06-09T11:40:00.000Z",
    updatedAt: now,
  },
  {
    id: "dispatch-000103",
    workOrderId: "11111111-1111-4111-8111-000000000004",
    workOrderCode: "OS-000104",
    workOrderTitle: "Manutencao corretiva em campo",
    operatorUserId: "usr-ops-04",
    status: "in_service",
    priority: "high",
    arrivedAt: "2026-06-09T12:10:00.000Z",
    inServiceAt: "2026-06-09T12:20:00.000Z",
    createdAt: "2026-06-09T11:25:00.000Z",
    updatedAt: now,
  },
  {
    id: "dispatch-000104",
    workOrderId: "11111111-1111-4111-8111-000000000006",
    workOrderCode: "OS-000106",
    workOrderTitle: "Atendimento cancelado pelo cliente",
    operatorUserId: "usr-ops-05",
    status: "cancelled",
    priority: "urgent",
    reason: "Cliente reagendou o atendimento.",
    cancelledAt: "2026-06-09T12:35:00.000Z",
    createdAt: "2026-06-09T10:30:00.000Z",
    updatedAt: "2026-06-09T12:35:00.000Z",
  },
];

export function getMockDispatchesData(source: DispatchesData["source"] = "mock", fallbackReason?: string): DispatchesData {
  return {
    items: mockDispatchItems,
    pagination: {
      limit: 20,
      offset: 0,
      total: mockDispatchItems.length,
    },
    source,
    fallbackReason,
  };
}

export function getMockDispatchDetail(dispatchId: string): DispatchDetail {
  const item = mockDispatchItems.find((dispatch) => dispatch.id === dispatchId) ?? mockDispatchItems[0];
  return {
    ...item,
    timeline: getMockDispatchTimeline(item),
  };
}

export function getMockDispatchTimeline(dispatch: DispatchListItem): DispatchEvent[] {
  return [
    {
      id: `${dispatch.id}-event-1`,
      dispatchId: dispatch.id,
      workOrderId: dispatch.workOrderId,
      eventType: "field_dispatch_created",
      toStatus: "assigned",
      actorUserId: "usr-ops-01",
      message: "Despacho operacional criado.",
      metadata: {},
      createdAt: dispatch.createdAt,
    },
    {
      id: `${dispatch.id}-event-2`,
      dispatchId: dispatch.id,
      workOrderId: dispatch.workOrderId,
      eventType: dispatch.status === "cancelled" ? "field_dispatch_cancelled" : "field_dispatch_status_changed",
      fromStatus: "assigned",
      toStatus: dispatch.status,
      actorUserId: dispatch.operatorUserId,
      message: dispatch.status === "cancelled" ? "Despacho cancelado." : "Status operacional atualizado.",
      metadata: {},
      createdAt: dispatch.updatedAt ?? dispatch.createdAt,
    },
  ];
}
