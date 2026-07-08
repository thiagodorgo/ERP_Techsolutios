import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptMaintenanceOrderResponse, adaptMaintenanceOrdersResponse } from "./maintenance-orders.adapter";
import type {
  MaintenanceOrder,
  MaintenanceOrderCreatePayload,
  MaintenanceOrderUpdatePayload,
  MaintenanceOrdersApiContext,
  MaintenanceOrdersData,
  MaintenanceOrdersFilters,
} from "./maintenance-orders.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

// D-007: nunca fabricar linhas. Modo mock → dataset vazio; erro real → fallback vazio.
export async function listMaintenanceOrdersFromApi(
  context: MaintenanceOrdersApiContext,
  params: Partial<MaintenanceOrdersFilters> = {},
): Promise<MaintenanceOrdersData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/maintenance-orders${buildQuery(params)}`, context);
    return adaptMaintenanceOrdersResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar as manutenções.",
    };
  }
}

export async function getMaintenanceOrder(context: MaintenanceOrdersApiContext, id: string): Promise<MaintenanceOrder | null> {
  const response = await apiRequest<unknown>(`/maintenance-orders/${id}`, context);
  return adaptMaintenanceOrderResponse(response);
}

export async function createMaintenanceOrder(
  context: MaintenanceOrdersApiContext,
  payload: MaintenanceOrderCreatePayload,
): Promise<MaintenanceOrder | null> {
  const response = await apiRequest<unknown>("/maintenance-orders", {
    ...context,
    method: "POST",
    body: payload,
  });
  return adaptMaintenanceOrderResponse(response);
}

// Único PATCH do módulo: edição de campos, transição de situação e desativação lógica.
export async function updateMaintenanceOrder(
  context: MaintenanceOrdersApiContext,
  id: string,
  patch: MaintenanceOrderUpdatePayload,
): Promise<MaintenanceOrder | null> {
  const response = await apiRequest<unknown>(`/maintenance-orders/${id}`, {
    ...context,
    method: "PATCH",
    body: patch,
  });
  return adaptMaintenanceOrderResponse(response);
}

function buildQuery(params: Partial<MaintenanceOrdersFilters>): string {
  const query = new URLSearchParams();
  const search = params.search?.trim();
  if (search) query.set("search", search);
  if (params.vehicleId?.trim()) query.set("vehicle_id", params.vehicleId.trim());
  if (params.type) query.set("type", params.type);
  if (params.status) query.set("status", params.status);
  if (params.from?.trim()) query.set("scheduled_from", params.from.trim());
  if (params.to?.trim()) query.set("scheduled_to", params.to.trim());
  if (params.isActive === "active") query.set("is_active", "true");
  if (params.isActive === "inactive") query.set("is_active", "false");
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  if (params.offset && Number.isFinite(params.offset)) query.set("offset", String(params.offset));
  return query.size ? `?${query.toString()}` : "";
}
