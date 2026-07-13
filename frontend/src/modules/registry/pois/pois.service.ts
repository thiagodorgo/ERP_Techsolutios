import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptPoiResponse, adaptPoisResponse } from "./pois.adapter";
import type {
  PoiCreatePayload,
  PoiItem,
  PoiUpdatePayload,
  PoisApiContext,
  PoisData,
  PoisFilters,
} from "./pois.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

// D-007: nunca fabricar linhas. Modo mock → dataset vazio (mock honesto); erro real → fallback vazio.
export async function listPoisFromApi(context: PoisApiContext, params: Partial<PoisFilters> = {}): Promise<PoisData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/pois${buildQuery(params)}`, context);
    return adaptPoisResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar os Pontos de Interesse.",
    };
  }
}

export async function getPoi(context: PoisApiContext, id: string): Promise<PoiItem | null> {
  const response = await apiRequest<unknown>(`/pois/${id}`, context);
  return adaptPoiResponse(response);
}

export async function createPoi(context: PoisApiContext, payload: PoiCreatePayload): Promise<PoiItem | null> {
  const response = await apiRequest<unknown>("/pois", {
    ...context,
    method: "POST",
    body: payload,
  });
  return adaptPoiResponse(response);
}

export async function updatePoi(context: PoisApiContext, id: string, patch: PoiUpdatePayload): Promise<PoiItem | null> {
  const response = await apiRequest<unknown>(`/pois/${id}`, {
    ...context,
    method: "PATCH",
    body: patch,
  });
  return adaptPoiResponse(response);
}

function buildQuery(params: Partial<PoisFilters>): string {
  const query = new URLSearchParams();
  const search = params.search?.trim();
  if (search) query.set("search", search);
  if (params.isActive === "active") query.set("is_active", "true");
  if (params.isActive === "inactive") query.set("is_active", "false");
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  return query.size ? `?${query.toString()}` : "";
}
