import { isMockMode } from "../../config/env";
import { apiRequest } from "../../services/api/client";
import { adaptWorkOrderResponse, adaptWorkOrdersResponse, adaptWorkOrderTimelineResponse } from "./work-orders.adapter";
import { getMockWorkOrderDetail, getMockWorkOrdersData, getMockWorkOrderTimeline } from "./work-orders.mock";
import type {
  WorkOrderAssignPayload,
  WorkOrderCreatePayload,
  WorkOrderDetail,
  WorkOrderEvent,
  WorkOrdersApiContext,
  WorkOrdersData,
  WorkOrdersFilters,
  WorkOrderStatusPayload,
  WorkOrderUpdatePayload,
} from "./work-orders.types";

export async function listWorkOrdersFromApi(context: WorkOrdersApiContext, params: Partial<WorkOrdersFilters> = {}): Promise<WorkOrdersData> {
  if (isMockMode()) return getMockWorkOrdersData("mock");

  try {
    const response = await apiRequest<unknown>(`/work-orders${buildQuery(params)}`, context);
    const data = adaptWorkOrdersResponse(response, "api");
    if (data.items.length === 0) return getMockWorkOrdersData("fallback", "A API retornou lista vazia.");
    return data;
  } catch {
    return getMockWorkOrdersData("fallback", "Nao foi possivel consultar a API de Ordens de Servico.");
  }
}

export async function createWorkOrder(context: WorkOrdersApiContext, payload: WorkOrderCreatePayload): Promise<WorkOrderDetail> {
  if (isMockMode()) return { ...getMockWorkOrderDetail("new"), ...payload, id: "mock-created-work-order", code: "OS-MOCK" };

  try {
    const response = await apiRequest<unknown>("/work-orders", {
      ...context,
      method: "POST",
      body: payload,
    });
    const workOrder = adaptWorkOrderResponse(response);
    if (workOrder) return workOrder;
  } catch {
    return { ...getMockWorkOrderDetail("new"), ...payload, id: "fallback-created-work-order", code: "OS-FALLBACK" };
  }

  return { ...getMockWorkOrderDetail("new"), ...payload, id: "fallback-created-work-order", code: "OS-FALLBACK" };
}

export async function getWorkOrderFromApi(context: WorkOrdersApiContext, workOrderId: string): Promise<{ workOrder: WorkOrderDetail; source: WorkOrdersData["source"]; fallbackReason?: string }> {
  if (isMockMode()) return { workOrder: getMockWorkOrderDetail(workOrderId), source: "mock" };

  try {
    const response = await apiRequest<unknown>(`/work-orders/${workOrderId}`, context);
    const workOrder = adaptWorkOrderResponse(response);
    if (workOrder) return { workOrder, source: "api" };
  } catch {
    return {
      workOrder: getMockWorkOrderDetail(workOrderId),
      source: "fallback",
      fallbackReason: "Nao foi possivel consultar a OS na API.",
    };
  }

  return {
    workOrder: getMockWorkOrderDetail(workOrderId),
    source: "fallback",
    fallbackReason: "A API nao retornou uma OS valida.",
  };
}

export async function updateWorkOrder(context: WorkOrdersApiContext, workOrderId: string, payload: WorkOrderUpdatePayload): Promise<WorkOrderDetail> {
  if (isMockMode()) return { ...getMockWorkOrderDetail(workOrderId), ...payload };

  const response = await apiRequest<unknown>(`/work-orders/${workOrderId}`, {
    ...context,
    method: "PATCH",
    body: payload,
  });
  return adaptWorkOrderResponse(response) ?? getMockWorkOrderDetail(workOrderId);
}

export async function updateWorkOrderStatus(context: WorkOrdersApiContext, workOrderId: string, payload: WorkOrderStatusPayload): Promise<WorkOrderDetail> {
  if (isMockMode()) return { ...getMockWorkOrderDetail(workOrderId), status: payload.status, cancellationReason: payload.cancellationReason ?? null };

  const response = await apiRequest<unknown>(`/work-orders/${workOrderId}/status`, {
    ...context,
    method: "PATCH",
    body: payload,
  });
  return adaptWorkOrderResponse(response) ?? getMockWorkOrderDetail(workOrderId);
}

export async function assignWorkOrder(context: WorkOrdersApiContext, workOrderId: string, payload: WorkOrderAssignPayload): Promise<WorkOrderDetail> {
  if (isMockMode()) return { ...getMockWorkOrderDetail(workOrderId), status: "assigned", assignedOperatorId: payload.operatorId, assignedUserId: payload.userId ?? null };

  const response = await apiRequest<unknown>(`/work-orders/${workOrderId}/assign`, {
    ...context,
    method: "POST",
    body: payload,
  });
  return adaptWorkOrderResponse(response) ?? getMockWorkOrderDetail(workOrderId);
}

export async function getWorkOrderTimeline(context: WorkOrdersApiContext, workOrderId: string): Promise<WorkOrderEvent[]> {
  if (isMockMode()) return getMockWorkOrderTimeline(workOrderId);

  try {
    const response = await apiRequest<unknown>(`/work-orders/${workOrderId}/timeline`, context);
    const timeline = adaptWorkOrderTimelineResponse(response);
    return timeline.length ? timeline : getMockWorkOrderTimeline(workOrderId);
  } catch {
    return getMockWorkOrderTimeline(workOrderId);
  }
}

function buildQuery(params: Partial<WorkOrdersFilters>): string {
  const query = new URLSearchParams();
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.priority && params.priority !== "all") query.set("priority", params.priority);
  if (params.search) query.set("search", params.search);
  if (params.assignedOperatorId) query.set("assignedOperatorId", params.assignedOperatorId);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  return query.size ? `?${query.toString()}` : "";
}
