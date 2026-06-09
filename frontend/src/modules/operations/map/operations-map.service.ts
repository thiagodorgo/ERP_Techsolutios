import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptFieldLocationsResponse } from "./operations-map.adapter";
import { getMockOperationsMapData } from "./operations-map.mock";
import type {
  FieldLocationHistoryParams,
  FieldLocationItem,
  OperationsMapApiContext,
  OperationsMapData,
} from "./operations-map.types";

export async function getLatestFieldLocations(context: OperationsMapApiContext): Promise<OperationsMapData> {
  if (isMockMode()) return getMockOperationsMapData("mock");

  try {
    const response = await apiRequest<unknown>("/field-locations/latest", context);
    const locations = adaptFieldLocationsResponse(response);

    if (locations.length === 0) {
      return getMockOperationsMapData("fallback", "A API retornou lista vazia.");
    }

    return {
      locations,
      source: "api",
    };
  } catch {
    return getMockOperationsMapData("fallback", "Nao foi possivel consultar a API de localizacao.");
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
