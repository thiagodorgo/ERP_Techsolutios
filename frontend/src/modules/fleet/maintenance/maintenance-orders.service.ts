import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import {
  adaptMaintenanceOrderDetail,
  adaptMaintenanceOrderItemResponse,
  adaptMaintenanceOrderResponse,
  adaptMaintenanceOrdersResponse,
  adaptOdometerSuggestion,
} from "./maintenance-orders.adapter";
import type {
  MaintenanceItemPayload,
  MaintenanceOrder,
  MaintenanceOrderCreatePayload,
  MaintenanceOrderDetail,
  MaintenanceOrderItem,
  MaintenanceOrderUpdatePayload,
  MaintenanceOrdersApiContext,
  MaintenanceOrdersData,
  MaintenanceOrdersFilters,
  OdometerSuggestion,
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

// Ω4C PR-06 — detalhe (cabeçalho + itens + totais DERIVADOS server-side). Fonte única do grid de itens e dos
// totalizadores. D-007: mock → detalhe vazio honesto (nada fabricado).
export async function getMaintenanceOrderDetail(
  context: MaintenanceOrdersApiContext,
  id: string,
): Promise<MaintenanceOrderDetail | null> {
  if (isMockMode()) return null;
  const response = await apiRequest<unknown>(`/maintenance-orders/${id}`, context);
  return adaptMaintenanceOrderDetail(response);
}

// POST /maintenance-orders/:id/items — adiciona 1 item. Erros (422 unit/qty, 404 posse) propagam (ApiError).
export async function addMaintenanceOrderItem(
  context: MaintenanceOrdersApiContext,
  orderId: string,
  payload: MaintenanceItemPayload,
): Promise<MaintenanceOrderItem | null> {
  const response = await apiRequest<unknown>(`/maintenance-orders/${orderId}/items`, {
    ...context,
    method: "POST",
    body: toItemBody(payload),
  });
  return adaptMaintenanceOrderItemResponse(response);
}

// PATCH /maintenance-orders/:id/items/:itemId — edita 1 item.
export async function updateMaintenanceOrderItem(
  context: MaintenanceOrdersApiContext,
  orderId: string,
  itemId: string,
  payload: MaintenanceItemPayload,
): Promise<MaintenanceOrderItem | null> {
  const response = await apiRequest<unknown>(`/maintenance-orders/${orderId}/items/${itemId}`, {
    ...context,
    method: "PATCH",
    body: toItemBody(payload),
  });
  return adaptMaintenanceOrderItemResponse(response);
}

// DELETE /maintenance-orders/:id/items/:itemId — soft-delete ("excluir item").
export async function removeMaintenanceOrderItem(
  context: MaintenanceOrdersApiContext,
  orderId: string,
  itemId: string,
): Promise<void> {
  await apiRequest<unknown>(`/maintenance-orders/${orderId}/items/${itemId}`, {
    ...context,
    method: "DELETE",
  });
}

// GET /maintenance-orders/odometer-suggestion?vehicleId= — maior odômetro conhecido; null sem histórico (D-007).
export async function getOdometerSuggestion(
  context: MaintenanceOrdersApiContext,
  vehicleId: string,
): Promise<OdometerSuggestion | null> {
  if (isMockMode() || !vehicleId) return null;
  try {
    const response = await apiRequest<unknown>(`/maintenance-orders/odometer-suggestion?vehicle_id=${encodeURIComponent(vehicleId)}`, context);
    return adaptOdometerSuggestion(response);
  } catch {
    return null; // erro real → sem sugestão (nunca inventa leitura)
  }
}

function toItemBody(payload: MaintenanceItemPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {
    item_type: payload.itemType,
    description: payload.description,
    unit_value: payload.unitValue,
    quantity: payload.quantity,
  };
  if (payload.notes) body.notes = payload.notes;
  return body;
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
