import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptServiceQuoteResponse, adaptServiceQuotesResponse } from "./service-quotes.adapter";
import type {
  ServiceQuoteCreatePayload,
  ServiceQuoteItem,
  ServiceQuoteStatus,
  ServiceQuoteUpdatePayload,
  ServiceQuotesApiContext,
  ServiceQuotesData,
  ServiceQuotesFilters,
} from "./service-quotes.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

// D-007: nunca fabricar linhas. Modo mock → dataset vazio (mock honesto); erro real → fallback vazio.
export async function listServiceQuotesFromApi(
  context: ServiceQuotesApiContext,
  params: Partial<ServiceQuotesFilters> = {},
): Promise<ServiceQuotesData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/service-quotes${buildQuery(params)}`, context);
    return adaptServiceQuotesResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar os Orçamentos.",
    };
  }
}

export async function createServiceQuote(
  context: ServiceQuotesApiContext,
  payload: ServiceQuoteCreatePayload,
): Promise<ServiceQuoteItem | null> {
  const response = await apiRequest<unknown>("/service-quotes", {
    ...context,
    method: "POST",
    body: {
      service_catalog_id: payload.serviceCatalogId,
      work_order_id: payload.workOrderId,
      customer_id: payload.customerId,
      price_source: payload.priceSource,
      unit_price: payload.unitPrice,
      quantity: payload.quantity,
      notes: payload.notes,
    },
  });
  return adaptServiceQuoteResponse(response);
}

export async function updateServiceQuote(
  context: ServiceQuotesApiContext,
  id: string,
  patch: ServiceQuoteUpdatePayload,
): Promise<ServiceQuoteItem | null> {
  const response = await apiRequest<unknown>(`/service-quotes/${id}`, {
    ...context,
    method: "PATCH",
    body: { quantity: patch.quantity, notes: patch.notes },
  });
  return adaptServiceQuoteResponse(response);
}

export async function changeServiceQuoteStatus(
  context: ServiceQuotesApiContext,
  id: string,
  status: ServiceQuoteStatus,
): Promise<ServiceQuoteItem | null> {
  const response = await apiRequest<unknown>(`/service-quotes/${id}/status`, {
    ...context,
    method: "PATCH",
    body: { status },
  });
  return adaptServiceQuoteResponse(response);
}

function buildQuery(params: Partial<ServiceQuotesFilters>): string {
  const query = new URLSearchParams();
  const search = params.search?.trim();
  if (search) query.set("search", search);
  if (params.isActive === "active") query.set("is_active", "true");
  if (params.isActive === "inactive") query.set("is_active", "false");
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  return query.size ? `?${query.toString()}` : "";
}
