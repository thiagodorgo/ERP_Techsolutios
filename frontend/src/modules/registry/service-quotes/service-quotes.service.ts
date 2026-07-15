import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptServiceQuoteLineList, adaptServiceQuoteResponse, adaptServiceQuotesResponse } from "./service-quotes.adapter";
import type {
  ServiceQuoteApprovePayload,
  ServiceQuoteApproveResult,
  ServiceQuoteCreatePayload,
  ServiceQuoteLineList,
  ServiceQuoteRow,
  ServiceQuoteShareResult,
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
): Promise<ServiceQuoteRow | null> {
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
): Promise<ServiceQuoteRow | null> {
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
): Promise<ServiceQuoteRow | null> {
  const response = await apiRequest<unknown>(`/service-quotes/${id}/status`, {
    ...context,
    method: "PATCH",
    body: { status },
  });
  return adaptServiceQuoteResponse(response);
}

// Ω3F-4c — linhas-de-item do orçamento (aba Orçamento do hub). GET /service-quotes/:id/items.
// Leitura defensiva; o TOTAL é agregado no backend (o front nunca soma). Mock → vazio (D-007).
export async function listServiceQuoteItems(
  context: ServiceQuotesApiContext,
  quoteId: string,
): Promise<ServiceQuoteLineList> {
  if (isMockMode()) return { items: [], totalAmount: 0, currency: "BRL" };
  const response = await apiRequest<unknown>(`/service-quotes/${encodeURIComponent(quoteId)}/items`, context);
  return adaptServiceQuoteLineList(response);
}

// Ω3F-4b — aprova o orçamento → cria OS (idempotente). Resposta: { data: { ...quote, workOrderId } }.
// Leitura defensiva: aceita tanto data.quote aninhado quanto o quote espalhado com workOrderId ao lado.
export async function approveServiceQuote(
  context: ServiceQuotesApiContext,
  id: string,
  body: ServiceQuoteApprovePayload = {},
): Promise<ServiceQuoteApproveResult> {
  if (isMockMode()) return { quote: null, workOrderId: null };
  const response = await apiRequest<unknown>(`/service-quotes/${encodeURIComponent(id)}/approve`, {
    ...context,
    method: "POST",
    body: {
      service_address: body.serviceAddress,
      service_city: body.serviceCity,
      service_state: body.serviceState,
      service_zip_code: body.serviceZipCode,
      destination_address: body.destinationAddress,
      destination_city: body.destinationCity,
      destination_state: body.destinationState,
      destination_zip_code: body.destinationZipCode,
      activation_mode: body.activationMode,
      priority: body.priority,
      title: body.title,
    },
  });
  const data = readEnvelope(response);
  const nested = readObject(data.quote);
  const quoteSource = nested ?? data;
  const workOrderId =
    readOptionalString(data.workOrderId ?? data.work_order_id) ??
    readOptionalString(quoteSource.createdWorkOrderId ?? quoteSource.created_work_order_id);
  return { quote: adaptServiceQuoteResponse(quoteSource), workOrderId };
}

// Ω3F-4b — compartilhar o orçamento. Resposta: { data: { shareToken, sharePath } }.
export async function shareServiceQuote(
  context: ServiceQuotesApiContext,
  id: string,
): Promise<ServiceQuoteShareResult> {
  if (isMockMode()) return { shareToken: null, sharePath: null };
  const response = await apiRequest<unknown>(`/service-quotes/${encodeURIComponent(id)}/share`, {
    ...context,
    method: "POST",
    body: {},
  });
  const data = readEnvelope(response);
  return {
    shareToken: readOptionalString(data.shareToken ?? data.share_token),
    sharePath: readOptionalString(data.sharePath ?? data.share_path),
  };
}

function buildQuery(params: Partial<ServiceQuotesFilters>): string {
  const query = new URLSearchParams();
  const search = params.search?.trim();
  if (search) query.set("search", search);
  if (params.isActive === "active") query.set("is_active", "true");
  if (params.isActive === "inactive") query.set("is_active", "false");
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  if (params.workOrderId?.trim()) query.set("work_order_id", params.workOrderId.trim());
  return query.size ? `?${query.toString()}` : "";
}

// Desembrulha o envelope `{ data }` do backend com tolerância a shape (nunca lança).
function readEnvelope(response: unknown): Record<string, unknown> {
  const record = readObject(response) ?? {};
  return readObject(record.data) ?? record;
}

function readObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
