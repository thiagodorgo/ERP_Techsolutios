import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptFuelLogResponse, adaptFuelLogsResponse } from "./fuel-logs.adapter";
import type {
  FuelLog,
  FuelLogCreatePayload,
  FuelLogUpdatePayload,
  FuelLogsApiContext,
  FuelLogsData,
  FuelLogsFilters,
} from "./fuel-logs.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

// D-007: nunca fabricar linhas. Modo mock → dataset vazio; erro real → fallback vazio.
export async function listFuelLogsFromApi(context: FuelLogsApiContext, params: Partial<FuelLogsFilters> = {}): Promise<FuelLogsData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/fuel-logs${buildQuery(params)}`, context);
    return adaptFuelLogsResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar os abastecimentos.",
    };
  }
}

export async function getFuelLog(context: FuelLogsApiContext, id: string): Promise<FuelLog | null> {
  const response = await apiRequest<unknown>(`/fuel-logs/${id}`, context);
  return adaptFuelLogResponse(response);
}

export async function createFuelLog(context: FuelLogsApiContext, payload: FuelLogCreatePayload): Promise<FuelLog | null> {
  const response = await apiRequest<unknown>("/fuel-logs", {
    ...context,
    method: "POST",
    body: payload,
  });
  return adaptFuelLogResponse(response);
}

export async function updateFuelLog(context: FuelLogsApiContext, id: string, patch: FuelLogUpdatePayload): Promise<FuelLog | null> {
  const response = await apiRequest<unknown>(`/fuel-logs/${id}`, {
    ...context,
    method: "PATCH",
    body: patch,
  });
  return adaptFuelLogResponse(response);
}

function buildQuery(params: Partial<FuelLogsFilters>): string {
  const query = new URLSearchParams();
  const search = params.search?.trim();
  if (search) query.set("search", search);
  if (params.vehicleId?.trim()) query.set("vehicle_id", params.vehicleId.trim());
  if (params.from?.trim()) query.set("from", params.from.trim());
  if (params.to?.trim()) query.set("to", params.to.trim());
  if (params.isActive === "active") query.set("is_active", "true");
  if (params.isActive === "inactive") query.set("is_active", "false");
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  return query.size ? `?${query.toString()}` : "";
}
