// F7b Estoque avançado — camada de rede da contagem cíclica (/cycle-counts).
// Segue o padrão do inventory.service: mock → vazio; erro de listagem → fallback vazio.
// As mutações (abrir/registrar/fechar/cancelar) PROPAGAM o erro para a UI tratar (422/403).
import { isMockMode } from "../../config/env";
import { apiRequest } from "../../services/api/client";
import {
  adaptCycleCountCloseResponse,
  adaptCycleCountEntryResponse,
  adaptCycleCountResponse,
  adaptCycleCountsResponse,
} from "./cycle-counts.adapter";
import type {
  CycleCount,
  CycleCountCloseResult,
  CycleCountEntry,
  CycleCountsData,
  CycleCountsFilters,
  OpenCycleCountPayload,
} from "./cycle-counts.types";
import type { InventoryApiContext } from "./inventory.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

export async function listCycleCountsFromApi(context: InventoryApiContext, params: Partial<CycleCountsFilters> = {}): Promise<CycleCountsData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/cycle-counts${buildCycleCountsQuery(params)}`, context);
    return adaptCycleCountsResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar as contagens cíclicas.",
    };
  }
}

// GET /cycle-counts/:id — sessão com entries[].
export async function getCycleCount(context: InventoryApiContext, id: string): Promise<CycleCount | null> {
  if (isMockMode()) return null;
  const response = await apiRequest<unknown>(`/cycle-counts/${id}`, context);
  return adaptCycleCountResponse(response);
}

// POST /cycle-counts — abre a sessão e fotografa os saldos da classe escolhida.
export async function openCycleCount(context: InventoryApiContext, payload: OpenCycleCountPayload): Promise<CycleCount | null> {
  const response = await apiRequest<unknown>("/cycle-counts", {
    ...context,
    method: "POST",
    body: payload,
  });
  return adaptCycleCountResponse(response);
}

// PATCH /cycle-counts/:id/entries/:entryId — registra o contado da entrada.
export async function updateCycleCountEntry(
  context: InventoryApiContext,
  id: string,
  entryId: string,
  countedQuantity: number,
): Promise<CycleCountEntry | null> {
  const response = await apiRequest<unknown>(`/cycle-counts/${id}/entries/${entryId}`, {
    ...context,
    method: "PATCH",
    body: { countedQuantity },
  });
  return adaptCycleCountEntryResponse(response);
}

// POST /cycle-counts/:id/close — gera ajustes das variâncias e o relatório.
export async function closeCycleCount(context: InventoryApiContext, id: string): Promise<CycleCountCloseResult> {
  const response = await apiRequest<unknown>(`/cycle-counts/${id}/close`, {
    ...context,
    method: "POST",
    body: {},
  });
  return adaptCycleCountCloseResponse(response);
}

// POST /cycle-counts/:id/cancel — cancela sem gerar ajustes.
export async function cancelCycleCount(context: InventoryApiContext, id: string): Promise<CycleCount | null> {
  const response = await apiRequest<unknown>(`/cycle-counts/${id}/cancel`, {
    ...context,
    method: "POST",
    body: {},
  });
  return adaptCycleCountResponse(response);
}

function buildCycleCountsQuery(params: Partial<CycleCountsFilters>): string {
  const query = new URLSearchParams();
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.abcClass && params.abcClass !== "all") query.set("abc_class", params.abcClass);
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  if (params.offset && Number.isFinite(params.offset)) query.set("offset", String(params.offset));
  return query.size ? `?${query.toString()}` : "";
}
