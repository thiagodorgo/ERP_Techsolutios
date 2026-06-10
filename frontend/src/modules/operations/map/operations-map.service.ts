import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptFieldLocationsResponse, attachDispatchesToFieldLocations, attachWorkOrdersToFieldLocations } from "./operations-map.adapter";
import { getMockOperationsMapData } from "./operations-map.mock";
import { adaptDispatchesResponse } from "../dispatches/dispatches.adapter";
import { getMockDispatchesData } from "../dispatches/dispatches.mock";
import { adaptWorkOrdersResponse } from "../../work-orders/work-orders.adapter";
import { getMockWorkOrdersData } from "../../work-orders/work-orders.mock";
import type {
  FieldLocationHistoryParams,
  FieldLocationItem,
  OperationsMapApiContext,
  OperationsMapData,
} from "./operations-map.types";
import type { WorkOrderListItem } from "../../work-orders/work-orders.types";
import type { DispatchListItem } from "../dispatches/dispatches.types";

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
  let enrichedData = data;

  if (hasWorkOrdersRead(context)) {
    const workOrders = await listReadableWorkOrdersForMap(context, data.source !== "api");
    if (workOrders.length > 0) {
      enrichedData = {
        ...enrichedData,
        locations: attachWorkOrdersToFieldLocations(enrichedData.locations, workOrders),
      };
    }
  }

  return enrichOperationsMapWithDispatches(context, enrichedData);
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

async function enrichOperationsMapWithDispatches(
  context: OperationsMapApiContext,
  data: OperationsMapData,
): Promise<OperationsMapData> {
  if (!hasDispatchRead(context)) return data;

  const dispatches = await listReadableDispatchesForMap(context, data.source !== "api");
  if (dispatches.length === 0) return data;

  return {
    ...data,
    locations: attachDispatchesToFieldLocations(data.locations, dispatches),
  };
}

async function listReadableDispatchesForMap(context: OperationsMapApiContext, fallbackToMock: boolean): Promise<DispatchListItem[]> {
  if (isMockMode()) return getMockDispatchesData("mock").items;

  try {
    const response = await apiRequest<unknown>("/operations/dispatches", context);
    const items = adaptDispatchesResponse(response, "api").items;
    return items.length > 0 || !fallbackToMock ? items : getMockDispatchesData("fallback").items;
  } catch {
    return fallbackToMock ? getMockDispatchesData("fallback").items : [];
  }
}

function hasDispatchRead(context: OperationsMapApiContext): boolean {
  return context.permissions?.includes("field_dispatch:read") ?? false;
}
