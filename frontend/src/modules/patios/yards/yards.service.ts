import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import {
  adaptYardAreaResponse,
  adaptYardAreasResponse,
  adaptYardOccupancyResponse,
  adaptYardResponse,
  adaptYardsResponse,
  adaptYardSpotResponse,
  adaptYardSpotsResponse,
} from "./yards.adapter";
import type {
  YardAreaCreatePayload,
  YardAreaItem,
  YardAreaUpdatePayload,
  YardCreatePayload,
  YardItem,
  YardOccupancy,
  YardSpotCreatePayload,
  YardSpotItem,
  YardSpotUpdatePayload,
  YardsApiContext,
  YardsData,
  YardsFilters,
  YardUpdatePayload,
} from "./yards.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;
const EMPTY_OCCUPANCY: YardOccupancy = { summary: { total: 0, free: 0, occupied: 0, blocked: 0 }, items: [] };

// D-007: nunca fabricar linhas. Modo mock → dataset vazio (mock honesto); erro real → fallback vazio.
export async function listYardsFromApi(context: YardsApiContext, params: Partial<YardsFilters> = {}): Promise<YardsData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/yards${buildQuery(params)}`, context);
    return adaptYardsResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar os Pátios.",
    };
  }
}

export async function getYard(context: YardsApiContext, yardId: string): Promise<YardItem | null> {
  const response = await apiRequest<unknown>(`/yards/${yardId}`, context);
  return adaptYardResponse(response);
}

export async function createYard(context: YardsApiContext, payload: YardCreatePayload): Promise<YardItem | null> {
  const response = await apiRequest<unknown>("/yards", { ...context, method: "POST", body: payload });
  return adaptYardResponse(response);
}

export async function updateYard(context: YardsApiContext, yardId: string, patch: YardUpdatePayload): Promise<YardItem | null> {
  const response = await apiRequest<unknown>(`/yards/${yardId}`, { ...context, method: "PATCH", body: patch });
  return adaptYardResponse(response);
}

// Áreas (Quadra→Corredor→Fileira). Mock → vazio (D-007). Erro real propaga (a página trata).
export async function listYardAreas(context: YardsApiContext, yardId: string): Promise<YardAreaItem[]> {
  if (isMockMode()) return [];
  const response = await apiRequest<unknown>(`/yards/${yardId}/areas`, context);
  return adaptYardAreasResponse(response);
}

export async function createYardArea(context: YardsApiContext, yardId: string, payload: YardAreaCreatePayload): Promise<YardAreaItem | null> {
  const response = await apiRequest<unknown>(`/yards/${yardId}/areas`, { ...context, method: "POST", body: payload });
  return adaptYardAreaResponse(response);
}

export async function updateYardArea(context: YardsApiContext, areaId: string, patch: YardAreaUpdatePayload): Promise<YardAreaItem | null> {
  const response = await apiRequest<unknown>(`/yard-areas/${areaId}`, { ...context, method: "PATCH", body: patch });
  return adaptYardAreaResponse(response);
}

// Vagas de uma área. Mock → vazio (D-007).
export async function listYardSpots(context: YardsApiContext, areaId: string): Promise<YardSpotItem[]> {
  if (isMockMode()) return [];
  const response = await apiRequest<unknown>(`/yard-areas/${areaId}/spots`, context);
  return adaptYardSpotsResponse(response);
}

export async function createYardSpot(context: YardsApiContext, areaId: string, payload: YardSpotCreatePayload): Promise<YardSpotItem | null> {
  const response = await apiRequest<unknown>(`/yard-areas/${areaId}/spots`, { ...context, method: "POST", body: payload });
  return adaptYardSpotResponse(response);
}

// Bloqueio operacional (FREE⇄BLOCKED) e config da vaga. OCCUPIED é READ-ONLY (alocação por processo = PR-06/08).
export async function updateYardSpot(context: YardsApiContext, spotId: string, patch: YardSpotUpdatePayload): Promise<YardSpotItem | null> {
  const response = await apiRequest<unknown>(`/yard-spots/${spotId}`, { ...context, method: "PATCH", body: patch });
  return adaptYardSpotResponse(response);
}

// Ocupação REAL (PR-08a): resumo + vagas com o processo que as ocupa (mapa de ocupação). Mock → vazio (D-007).
export async function getYardOccupancy(context: YardsApiContext, yardId: string): Promise<YardOccupancy> {
  if (isMockMode()) return { summary: { ...EMPTY_OCCUPANCY.summary }, items: [] };
  const response = await apiRequest<unknown>(`/yards/${yardId}/occupancy`, context);
  return adaptYardOccupancyResponse(response);
}

function buildQuery(params: Partial<YardsFilters>): string {
  const query = new URLSearchParams();
  const search = params.search?.trim();
  if (search) query.set("search", search);
  if (params.isActive === "active") query.set("active", "true");
  if (params.isActive === "inactive") query.set("active", "false");
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  return query.size ? `?${query.toString()}` : "";
}
