import { isMockMode } from "../../config/env";
import { apiRequest } from "../../services/api/client";
import {
  adaptAbcRecalculateResponse,
  adaptCustodySummaryResponse,
  adaptInventoryItemResponse,
  adaptInventoryItemsResponse,
  adaptStockMovementResponse,
  adaptStockMovementsListResponse,
  adaptStockMovementsResponse,
} from "./inventory.adapter";
import type {
  AbcRecalculateSummary,
  CustodySummary,
  InventoryApiContext,
  InventoryItem,
  InventoryItemCreatePayload,
  InventoryItemUpdatePayload,
  InventoryItemsData,
  InventoryItemsFilters,
  StockEntryPayload,
  StockExitPayload,
  StockMovement,
  StockMovementCreatePayload,
  StockMovementsData,
  StockMovementsFilters,
  StockTransferPayload,
} from "./inventory.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

// D-007: nunca fabricar linhas. Modo mock → dataset vazio; erro real → fallback vazio.
export async function listInventoryItemsFromApi(context: InventoryApiContext, params: Partial<InventoryItemsFilters> = {}): Promise<InventoryItemsData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/inventory-items${buildItemsQuery(params)}`, context);
    return adaptInventoryItemsResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar os itens de estoque.",
    };
  }
}

// GET /inventory-items/:id — busca por ID (a rota de detalhe usa /inventory/:id).
export async function getInventoryItem(context: InventoryApiContext, id: string): Promise<InventoryItem | null> {
  if (isMockMode()) return null;
  const response = await apiRequest<unknown>(`/inventory-items/${id}`, context);
  return adaptInventoryItemResponse(response);
}

export async function createInventoryItem(context: InventoryApiContext, payload: InventoryItemCreatePayload): Promise<InventoryItem | null> {
  const response = await apiRequest<unknown>("/inventory-items", {
    ...context,
    method: "POST",
    body: payload,
  });
  return adaptInventoryItemResponse(response);
}

// Único PATCH do item: edição de campos + desativação/reativação lógica.
// (Saldo NUNCA é editado — só muda via movimento.)
export async function updateInventoryItem(context: InventoryApiContext, id: string, patch: InventoryItemUpdatePayload): Promise<InventoryItem | null> {
  const response = await apiRequest<unknown>(`/inventory-items/${id}`, {
    ...context,
    method: "PATCH",
    body: patch,
  });
  return adaptInventoryItemResponse(response);
}

// F7b — recálculo ABC (rota admin): recomputa as classes por Pareto (valor 12m) e
// devolve o resumo {A,B,C,recalculatedAt}. Reescreve TODAS as classes (confirmar na UI).
export async function recalculateAbc(context: InventoryApiContext): Promise<AbcRecalculateSummary> {
  const response = await apiRequest<unknown>("/inventory-items/abc-recalculate", {
    ...context,
    method: "POST",
    body: {},
  });
  return adaptAbcRecalculateResponse(response);
}

export async function listStockMovementsFromApi(context: InventoryApiContext, params: Partial<StockMovementsFilters> = {}): Promise<StockMovementsData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/stock-movements${buildMovementsQuery(params)}`, context);
    return adaptStockMovementsResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar as movimentações de estoque.",
    };
  }
}

// Movimentações são IMUTÁVEIS: só existe POST (sem PATCH/DELETE).
export async function createStockMovement(context: InventoryApiContext, payload: StockMovementCreatePayload): Promise<StockMovement | null> {
  const response = await apiRequest<unknown>("/stock-movements", {
    ...context,
    method: "POST",
    body: payload,
  });
  return adaptStockMovementResponse(response);
}

// Ω4C PR-08 — Resumo por custódia: Qtd. Base/Profissional/Viatura + tabelas (nome/placa, NUNCA CNH).
export async function getCustodySummary(context: InventoryApiContext, itemId: string): Promise<CustodySummary> {
  const response = await apiRequest<unknown>(`/inventory-items/${itemId}/custody-summary`, context);
  return adaptCustodySummaryResponse(response, itemId);
}

// Ω4C PR-08 — Entrada (ENTRY): sempre para a BASE; quantidade positiva (o backend aplica o sinal).
export async function createStockEntry(context: InventoryApiContext, payload: StockEntryPayload): Promise<StockMovement | null> {
  const response = await apiRequest<unknown>("/stock-movements", {
    ...context,
    method: "POST",
    body: {
      itemId: payload.itemId,
      type: "entrada",
      quantidade: Math.abs(payload.quantidade),
      unitCost: payload.unitCost,
      ...(payload.reason ? { reason: payload.reason } : {}),
    },
  });
  return adaptStockMovementResponse(response);
}

// Ω4C PR-08 — Vincular (LINK, BASE→custódia) / Desvincular (UNLINK, custódia→BASE): par irmão.
export async function createStockTransfer(context: InventoryApiContext, payload: StockTransferPayload): Promise<StockMovement[]> {
  const response = await apiRequest<unknown>("/stock-movements", {
    ...context,
    method: "POST",
    body: {
      itemId: payload.itemId,
      type: payload.type,
      quantidade: Math.abs(payload.quantidade),
      custodyType: payload.custodyType,
      ...(payload.custodyOperatorProfileId ? { custodyOperatorProfileId: payload.custodyOperatorProfileId } : {}),
      ...(payload.custodyVehicleId ? { custodyVehicleId: payload.custodyVehicleId } : {}),
      ...(payload.reason ? { reason: payload.reason } : {}),
    },
  });
  return adaptStockMovementsListResponse(response);
}

// Ω4C PR-08 — Saída (EXIT): origem por custódia + Tipo de Saída (persistido no campo reason no backend).
export async function createStockExit(context: InventoryApiContext, payload: StockExitPayload): Promise<StockMovement | null> {
  const response = await apiRequest<unknown>("/stock-movements", {
    ...context,
    method: "POST",
    body: {
      itemId: payload.itemId,
      type: "saida",
      quantidade: Math.abs(payload.quantidade),
      custodyType: payload.custodyType,
      ...(payload.custodyOperatorProfileId ? { custodyOperatorProfileId: payload.custodyOperatorProfileId } : {}),
      ...(payload.custodyVehicleId ? { custodyVehicleId: payload.custodyVehicleId } : {}),
      ...(payload.exitReason ? { exitReason: payload.exitReason } : {}),
      ...(payload.unitCost !== undefined ? { unitCost: payload.unitCost } : {}),
      ...(payload.reason ? { reason: payload.reason } : {}),
    },
  });
  return adaptStockMovementResponse(response);
}

// Ω4C PR-08 — Estorno = movimento compensatório (o original permanece intacto — razão imutável).
// 409 movement_already_reversed quando já houver estorno; 409 insufficient_balance se ficaria negativo.
export async function reverseStockMovement(
  context: InventoryApiContext,
  movementId: string,
  reason?: string,
): Promise<StockMovement[]> {
  const response = await apiRequest<unknown>(`/stock-movements/${movementId}/reverse`, {
    ...context,
    method: "POST",
    body: reason ? { reason } : {},
  });
  return adaptStockMovementsListResponse(response);
}

function buildItemsQuery(params: Partial<InventoryItemsFilters>): string {
  const query = new URLSearchParams();
  const search = params.search?.trim();
  if (search) query.set("search", search);
  if (params.isActive === "active") query.set("is_active", "true");
  if (params.isActive === "inactive") query.set("is_active", "false");
  if (params.belowMin) query.set("below_min", "true");
  if (params.needsReorder) query.set("needs_reorder", "true");
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  if (params.offset && Number.isFinite(params.offset)) query.set("offset", String(params.offset));
  return query.size ? `?${query.toString()}` : "";
}

function buildMovementsQuery(params: Partial<StockMovementsFilters>): string {
  const query = new URLSearchParams();
  if (params.itemId?.trim()) query.set("item_id", params.itemId.trim());
  if (params.type) query.set("type", params.type);
  if (params.workOrderId?.trim()) query.set("work_order_id", params.workOrderId.trim());
  if (params.from?.trim()) query.set("from", params.from.trim());
  if (params.to?.trim()) query.set("to", params.to.trim());
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  if (params.offset && Number.isFinite(params.offset)) query.set("offset", String(params.offset));
  return query.size ? `?${query.toString()}` : "";
}
