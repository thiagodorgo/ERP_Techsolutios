import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptPriceTableResponse, adaptPriceTablesResponse } from "./price-tables.adapter";
import type {
  PriceTableCreatePayload,
  PriceTableItem,
  PriceTableUpdatePayload,
  PriceTablesApiContext,
  PriceTablesData,
  PriceTablesFilters,
} from "./price-tables.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

// D-007: nunca fabricar linhas. Modo mock → dataset vazio (mock honesto); erro real → fallback vazio.
export async function listPriceTablesFromApi(
  context: PriceTablesApiContext,
  params: Partial<PriceTablesFilters> = {},
): Promise<PriceTablesData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/price-tables${buildQuery(params)}`, context);
    return adaptPriceTablesResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar a Tabela de Valores.",
    };
  }
}

export async function getPriceTable(context: PriceTablesApiContext, id: string): Promise<PriceTableItem | null> {
  const response = await apiRequest<unknown>(`/price-tables/${id}`, context);
  return adaptPriceTableResponse(response);
}

export async function createPriceTable(context: PriceTablesApiContext, payload: PriceTableCreatePayload): Promise<PriceTableItem | null> {
  const response = await apiRequest<unknown>("/price-tables", {
    ...context,
    method: "POST",
    body: payload,
  });
  return adaptPriceTableResponse(response);
}

export async function updatePriceTable(context: PriceTablesApiContext, id: string, patch: PriceTableUpdatePayload): Promise<PriceTableItem | null> {
  const response = await apiRequest<unknown>(`/price-tables/${id}`, {
    ...context,
    method: "PATCH",
    body: patch,
  });
  return adaptPriceTableResponse(response);
}

function buildQuery(params: Partial<PriceTablesFilters>): string {
  const query = new URLSearchParams();
  const search = params.search?.trim();
  if (search) query.set("search", search);
  if (params.isActive === "active") query.set("is_active", "true");
  if (params.isActive === "inactive") query.set("is_active", "false");
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  return query.size ? `?${query.toString()}` : "";
}
