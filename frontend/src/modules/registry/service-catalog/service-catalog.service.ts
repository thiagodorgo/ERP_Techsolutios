import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptServiceCatalogResponse, adaptServiceItemResponse } from "./service-catalog.adapter";
import type {
  ServiceCatalogApiContext,
  ServiceCatalogData,
  ServiceCatalogFilters,
  ServiceItem,
  ServiceItemCreatePayload,
  ServiceItemUpdatePayload,
} from "./service-catalog.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

// D-007: nunca fabricar linhas. Modo mock → dataset vazio; erro real → fallback vazio.
export async function listServiceCatalogFromApi(
  context: ServiceCatalogApiContext,
  params: Partial<ServiceCatalogFilters> = {},
): Promise<ServiceCatalogData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/service-catalog${buildQuery(params)}`, context);
    return adaptServiceCatalogResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar o Catálogo de Serviços.",
    };
  }
}

export async function getServiceItem(context: ServiceCatalogApiContext, id: string): Promise<ServiceItem | null> {
  const response = await apiRequest<unknown>(`/service-catalog/${id}`, context);
  return adaptServiceItemResponse(response);
}

export async function createServiceItem(context: ServiceCatalogApiContext, payload: ServiceItemCreatePayload): Promise<ServiceItem | null> {
  const response = await apiRequest<unknown>("/service-catalog", {
    ...context,
    method: "POST",
    body: payload,
  });
  return adaptServiceItemResponse(response);
}

export async function updateServiceItem(context: ServiceCatalogApiContext, id: string, patch: ServiceItemUpdatePayload): Promise<ServiceItem | null> {
  const response = await apiRequest<unknown>(`/service-catalog/${id}`, {
    ...context,
    method: "PATCH",
    body: patch,
  });
  return adaptServiceItemResponse(response);
}

function buildQuery(params: Partial<ServiceCatalogFilters>): string {
  const query = new URLSearchParams();
  const search = params.search?.trim();
  if (search) query.set("search", search);
  if (params.isActive === "active") query.set("is_active", "true");
  if (params.isActive === "inactive") query.set("is_active", "false");
  return query.size ? `?${query.toString()}` : "";
}
