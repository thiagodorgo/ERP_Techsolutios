import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { listWorkOrdersFromApi } from "../../work-orders/work-orders.service";
import {
  adaptDispatchResponse,
  adaptDispatchesResponse,
  enrichDispatchesWithWorkOrders,
} from "./dispatches.adapter";
import { getMockDispatchDetail, getMockDispatchesData } from "./dispatches.mock";
import type {
  DispatchCreatePayload,
  DispatchDetail,
  DispatchListItem,
  DispatchReassignPayload,
  DispatchStatusPayload,
  DispatchesApiContext,
  DispatchesData,
  DispatchesFilters,
} from "./dispatches.types";

export async function listDispatchesFromApi(context: DispatchesApiContext, params: Partial<DispatchesFilters> = {}): Promise<DispatchesData> {
  if (isMockMode()) return getMockDispatchesData("mock");

  try {
    const response = await apiRequest<unknown>(`/operations/dispatches${buildQuery(params)}`, context);
    const data = adaptDispatchesResponse(response, "api");
    const items = await enrichWithWorkOrdersIfAllowed(context, data.items);
    if (items.length === 0) return getMockDispatchesData("fallback", "A API retornou lista vazia.");
    return { ...data, items };
  } catch {
    return getMockDispatchesData("fallback", "Nao foi possivel consultar a API de Despachos Operacionais.");
  }
}

export async function getDispatchFromApi(
  context: DispatchesApiContext,
  dispatchId: string,
): Promise<{ dispatch: DispatchDetail; source: DispatchesData["source"]; fallbackReason?: string }> {
  if (isMockMode()) return { dispatch: getMockDispatchDetail(dispatchId), source: "mock" };

  try {
    const response = await apiRequest<unknown>(`/operations/dispatches/${dispatchId}`, context);
    const dispatch = adaptDispatchResponse(response);
    if (dispatch) {
      const [enriched] = await enrichWithWorkOrdersIfAllowed(context, [dispatch]);
      return { dispatch: { ...dispatch, ...enriched }, source: "api" };
    }
  } catch {
    return {
      dispatch: getMockDispatchDetail(dispatchId),
      source: "fallback",
      fallbackReason: "Nao foi possivel consultar o despacho na API.",
    };
  }

  return {
    dispatch: getMockDispatchDetail(dispatchId),
    source: "fallback",
    fallbackReason: "A API nao retornou um despacho valido.",
  };
}

export async function createDispatch(context: DispatchesApiContext, payload: DispatchCreatePayload): Promise<DispatchDetail> {
  if (isMockMode()) return { ...getMockDispatchDetail("dispatch-000101"), ...payload, id: "mock-created-dispatch", timeline: [] };

  const response = await apiRequest<unknown>("/operations/dispatches", {
    ...context,
    method: "POST",
    body: payload,
  });
  return adaptDispatchResponse(response) ?? { ...getMockDispatchDetail("dispatch-000101"), ...payload, id: "fallback-created-dispatch" };
}

export async function updateDispatchStatus(context: DispatchesApiContext, dispatchId: string, payload: DispatchStatusPayload): Promise<DispatchDetail> {
  if (isMockMode()) return { ...getMockDispatchDetail(dispatchId), status: payload.status, observation: payload.observation, reason: payload.reason };

  const response = await apiRequest<unknown>(`/operations/dispatches/${dispatchId}/status`, {
    ...context,
    method: "PATCH",
    body: payload,
  });
  return adaptDispatchResponse(response) ?? getMockDispatchDetail(dispatchId);
}

export async function reassignDispatch(context: DispatchesApiContext, dispatchId: string, payload: DispatchReassignPayload): Promise<DispatchDetail> {
  if (isMockMode()) return { ...getMockDispatchDetail(dispatchId), status: "reassigned", operatorUserId: payload.operatorUserId, observation: payload.observation };

  const response = await apiRequest<unknown>(`/operations/dispatches/${dispatchId}/reassign`, {
    ...context,
    method: "PATCH",
    body: payload,
  });
  return adaptDispatchResponse(response) ?? getMockDispatchDetail(dispatchId);
}

async function enrichWithWorkOrdersIfAllowed(context: DispatchesApiContext, items: readonly DispatchListItem[]): Promise<DispatchListItem[]> {
  if (!context.permissions?.includes("work_orders:read")) return [...items];

  try {
    const workOrders = await listWorkOrdersFromApi(context, {});
    return enrichDispatchesWithWorkOrders(items, workOrders.items);
  } catch {
    return [...items];
  }
}

function buildQuery(params: Partial<DispatchesFilters>): string {
  const query = new URLSearchParams();
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  if (params.operatorUserId) query.set("operatorUserId", params.operatorUserId);
  return query.size ? `?${query.toString()}` : "";
}
