import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptVehicleResponse, adaptVehiclesResponse } from "./vehicles.adapter";
import type {
  Vehicle,
  VehicleCreatePayload,
  VehicleUpdatePayload,
  VehiclesApiContext,
  VehiclesData,
  VehiclesFilters,
} from "./vehicles.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

// D-007: nunca fabricar linhas. Modo mock → dataset vazio; erro real → fallback vazio.
export async function listVehiclesFromApi(context: VehiclesApiContext, params: Partial<VehiclesFilters> = {}): Promise<VehiclesData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/vehicles${buildQuery(params)}`, context);
    return adaptVehiclesResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar a API de Viaturas.",
    };
  }
}

export async function getVehicle(context: VehiclesApiContext, id: string): Promise<Vehicle | null> {
  const response = await apiRequest<unknown>(`/vehicles/${id}`, context);
  return adaptVehicleResponse(response);
}

export async function createVehicle(context: VehiclesApiContext, payload: VehicleCreatePayload): Promise<Vehicle | null> {
  const response = await apiRequest<unknown>("/vehicles", {
    ...context,
    method: "POST",
    body: payload,
  });
  return adaptVehicleResponse(response);
}

export async function updateVehicle(context: VehiclesApiContext, id: string, patch: VehicleUpdatePayload): Promise<Vehicle | null> {
  const response = await apiRequest<unknown>(`/vehicles/${id}`, {
    ...context,
    method: "PATCH",
    body: patch,
  });
  return adaptVehicleResponse(response);
}

function buildQuery(params: Partial<VehiclesFilters>): string {
  const query = new URLSearchParams();
  const search = params.search?.trim();
  if (search) query.set("search", search);
  if (params.isActive === "active") query.set("is_active", "true");
  if (params.isActive === "inactive") query.set("is_active", "false");
  return query.size ? `?${query.toString()}` : "";
}
