import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptFineResponse, adaptFinesResponse } from "./fines.adapter";
import type { Fine, FineCreatePayload, FineUpdatePayload, FinesApiContext, FinesData, FinesFilters } from "./fines.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

// D-007: nunca fabricar linhas. Modo mock → dataset vazio; erro real → fallback vazio.
export async function listFinesFromApi(context: FinesApiContext, params: Partial<FinesFilters> = {}): Promise<FinesData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/fines${buildQuery(params)}`, context);
    return adaptFinesResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar as multas.",
    };
  }
}

export async function getFine(context: FinesApiContext, id: string): Promise<Fine | null> {
  const response = await apiRequest<unknown>(`/fines/${id}`, context);
  return adaptFineResponse(response);
}

export async function createFine(context: FinesApiContext, payload: FineCreatePayload): Promise<Fine | null> {
  const response = await apiRequest<unknown>("/fines", {
    ...context,
    method: "POST",
    body: payload,
  });
  return adaptFineResponse(response);
}

// Único PATCH do módulo: edição de campos, transição de situação e desativação lógica.
export async function updateFine(context: FinesApiContext, id: string, patch: FineUpdatePayload): Promise<Fine | null> {
  const response = await apiRequest<unknown>(`/fines/${id}`, {
    ...context,
    method: "PATCH",
    body: patch,
  });
  return adaptFineResponse(response);
}

function buildQuery(params: Partial<FinesFilters>): string {
  const query = new URLSearchParams();
  const search = params.search?.trim();
  if (search) query.set("search", search);
  if (params.vehicleId?.trim()) query.set("vehicle_id", params.vehicleId.trim());
  if (params.driverId?.trim()) query.set("driver_id", params.driverId.trim());
  if (params.status) query.set("status", params.status);
  if (params.dueWithinDays && Number.isFinite(params.dueWithinDays)) query.set("due_within_days", String(params.dueWithinDays));
  if (params.isActive === "active") query.set("is_active", "true");
  if (params.isActive === "inactive") query.set("is_active", "false");
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  if (params.offset && Number.isFinite(params.offset)) query.set("offset", String(params.offset));
  return query.size ? `?${query.toString()}` : "";
}
