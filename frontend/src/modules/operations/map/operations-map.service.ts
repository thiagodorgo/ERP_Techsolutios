import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptFieldLocationsResponse, attachWorkOrdersToFieldLocations } from "./operations-map.adapter";
import { getMockOperationsMapData } from "./operations-map.mock";
import { adaptWorkOrdersResponse } from "../../work-orders/work-orders.adapter";
import { getMockWorkOrdersData } from "../../work-orders/work-orders.mock";
import type {
  FieldLocationHistoryParams,
  FieldLocationItem,
  OperationsMapApiContext,
  OperationsMapData,
} from "./operations-map.types";
import type { WorkOrderListItem } from "../../work-orders/work-orders.types";

export async function getLatestFieldLocations(context: OperationsMapApiContext): Promise<OperationsMapData> {
  if (isMockMode()) return getMockOperationsMapData("mock");

  try {
    const response = await apiRequest<unknown>("/field-locations/latest", context);
    const locations = adaptFieldLocationsResponse(response);

    if (locations.length === 0) {
      return enrichOperationsMapData(context, getMockOperationsMapData("fallback", "A API retornou lista vazia."));
    }

    return enrichOperationsMapData(context, {
      locations,
      source: "api",
    });
  } catch {
    return enrichOperationsMapData(context, getMockOperationsMapData("fallback", "Nao foi possivel consultar a API de localizacao."));
  }
}

export async function getFieldLocationHistory(
  context: OperationsMapApiContext,
  params: FieldLocationHistoryParams,
): Promise<FieldLocationItem[]> {
  if (isMockMode()) {
    return getMockOperationsMapData("mock").locations.filter((location) => location.operatorId === params.operatorUserId);
  }

  const query = new URLSearchParams({
    operatorUserId: params.operatorUserId,
    ...(params.from ? { from: params.from } : {}),
    ...(params.to ? { to: params.to } : {}),
    ...(params.limit ? { limit: String(params.limit) } : {}),
  });
  const response = await apiRequest<unknown>(`/field-locations/history?${query.toString()}`, context);

  return adaptFieldLocationsResponse(response);
}

async function enrichOperationsMapData(
  context: OperationsMapApiContext,
  data: OperationsMapData,
): Promise<OperationsMapData> {
  if (!hasWorkOrdersRead(context)) return data;

  const workOrders = await listReadableWorkOrdersForMap(context, data.source !== "api");
  if (workOrders.length === 0) return data;

  return {
    ...data,
    locations: attachWorkOrdersToFieldLocations(data.locations, workOrders),
  };
}

async function listReadableWorkOrdersForMap(context: OperationsMapApiContext, fallbackToMock: boolean): Promise<WorkOrderListItem[]> {
  if (isMockMode()) return getMockWorkOrdersData("mock").items;

  try {
    const response = await apiRequest<unknown>("/work-orders", context);
    const items = adaptWorkOrdersResponse(response, "api").items;
    return items.length > 0 || !fallbackToMock ? items : getMockWorkOrdersData("fallback").items;
  } catch {
    return fallbackToMock ? getMockWorkOrdersData("fallback").items : [];
  }
}

function hasWorkOrdersRead(context: OperationsMapApiContext): boolean {
  return context.permissions?.includes("work_orders:read") ?? false;
}
