import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptTariffResponse, adaptTariffsResponse } from "./tariffs.adapter";
import type {
  TariffCreatePayload,
  TariffItem,
  TariffUpdatePayload,
  TariffsApiContext,
  TariffsData,
  TariffsFilters,
} from "./tariffs.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

// D-007: nunca fabricar linhas. Modo mock → dataset vazio (mock honesto); erro real → fallback vazio.
export async function listTariffsFromApi(context: TariffsApiContext, params: Partial<TariffsFilters> = {}): Promise<TariffsData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/tariffs${buildQuery(params)}`, context);
    return adaptTariffsResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar as Tarifas.",
    };
  }
}

export async function getTariff(context: TariffsApiContext, id: string): Promise<TariffItem | null> {
  const response = await apiRequest<unknown>(`/tariffs/${id}`, context);
  return adaptTariffResponse(response);
}

export async function createTariff(context: TariffsApiContext, payload: TariffCreatePayload): Promise<TariffItem | null> {
  const response = await apiRequest<unknown>("/tariffs", {
    ...context,
    method: "POST",
    body: payload,
  });
  return adaptTariffResponse(response);
}

export async function updateTariff(context: TariffsApiContext, id: string, patch: TariffUpdatePayload): Promise<TariffItem | null> {
  const response = await apiRequest<unknown>(`/tariffs/${id}`, {
    ...context,
    method: "PATCH",
    body: patch,
  });
  return adaptTariffResponse(response);
}

function buildQuery(params: Partial<TariffsFilters>): string {
  const query = new URLSearchParams();
  const search = params.search?.trim();
  if (search) query.set("search", search);
  if (params.priceTableId) query.set("price_table_id", params.priceTableId);
  if (params.isActive === "active") query.set("is_active", "true");
  if (params.isActive === "inactive") query.set("is_active", "false");
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  return query.size ? `?${query.toString()}` : "";
}
