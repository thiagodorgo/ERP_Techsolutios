import { isMockMode } from "../../../config/env";
import { ApiError, apiRequest } from "../../../services/api/client";
import { listWorkOrdersFromApi } from "../../work-orders/work-orders.service";
import {
  adaptDispatchResponse,
  adaptDispatchesResponse,
  enrichDispatchesWithWorkOrders,
} from "./dispatches.adapter";
import { getMockDispatchDetail, getMockDispatchesData } from "./dispatches.mock";
import type {
  DispatchCreatePayload,
  DispatchDetail,
  DispatchListItem,
  DispatchPagination,
  DispatchReassignPayload,
  DispatchStatusPayload,
  DispatchesApiContext,
  DispatchesData,
  DispatchesFilters,
} from "./dispatches.types";

// B-SAN3-01 (P-008) — este service NÃO fabrica mais despacho quando o backend recusa ou responde vazio (antes:
// lista vazia/erro → 4 despachos `dispatch-000101..104`, consumidos também pelo Dashboard e pela aba Mobile da
// OS; detalhe com erro → `dispatch-000101` com timeline inventada; 2xx sem despacho → `?? mock`). O modo mock
// EXPLÍCITO (`VITE_USE_MOCKS=true`) continua. Ciclo 2 (P3): o guard G1 (por ALCANCE, sobre a AST) prova por mutação
// que identificador de origem mock só é alcançável no ramo verdadeiro de `isMockMode()` em todo arquivo destes dois
// módulos (`work-orders/**` e `operations/dispatches/**`).
//
// `dispatches.types.ts` não muda (fora do permitido): o 403 da lista se distingue pela razão; o detalhe ganha o
// tipo `DispatchDetailResult` aqui mesmo, aditivo.

const EMPTY_PAGINATION: DispatchPagination = { limit: 20, offset: 0, total: 0 };

export async function listDispatchesFromApi(
  context: DispatchesApiContext,
  params: Partial<DispatchesFilters> = {},
  // Ω3F-7 (pós-análise M1) — `enrich:false` PULA o GET da lista inteira de OS que anexa código/título/
  // prioridade aos despachos. A aba Mobile da OS só lê status+timestamps do despacho, então enriquecer era
  // 1 request extra (a lista completa) para ganho zero. A página de Despachos segue enriquecendo (default).
  options: { readonly enrich?: boolean } = {},
): Promise<DispatchesData> {
  if (isMockMode()) return getMockDispatchesData("mock");

  try {
    const response = await apiRequest<unknown>(`/operations/dispatches${buildQuery(params)}`, context);
    const data = adaptDispatchesResponse(response, "api");
    const items = options.enrich === false ? data.items : await enrichWithWorkOrdersIfAllowed(context, data.items);
    return { ...data, items };
  } catch (err) {
    // 403 = gate RBAC `field_dispatch:read` → sem permissão (não é falha de sistema); outro erro → vazio + razão.
    const forbidden = err instanceof ApiError && err.status === 403;
    return {
      items: [],
      pagination: EMPTY_PAGINATION,
      source: "fallback",
      fallbackReason: forbidden ? "Sem permissão para consultar os despachos." : "A consulta aos despachos falhou. Tente novamente em instantes.",
    };
  }
}

// B-SAN3-01 — resultado do detalhe SEM despacho fabricado (emenda (a) do orquestrador: o único consumidor,
// `OperationsDispatchesPage.loadDetail`, mantém o item da lista já selecionado e avisa). Espelho de
// `WorkOrderDetailResult`. NUNCA lança.
export type DispatchDetailResult = {
  readonly dispatch: DispatchDetail | null;
  readonly source: DispatchesData["source"];
  readonly fallbackReason?: string;
  readonly notFound?: boolean;
  readonly forbidden?: boolean;
};

export async function getDispatchFromApi(context: DispatchesApiContext, dispatchId: string): Promise<DispatchDetailResult> {
  if (isMockMode()) return { dispatch: getMockDispatchDetail(dispatchId), source: "mock" };

  try {
    const response = await apiRequest<unknown>(`/operations/dispatches/${dispatchId}`, context);
    const dispatch = adaptDispatchResponse(response);
    if (!dispatch) return { dispatch: null, source: "fallback", fallbackReason: "A resposta não trouxe um despacho válido." };
    const [enriched] = await enrichWithWorkOrdersIfAllowed(context, [dispatch]);
    return { dispatch: { ...dispatch, ...enriched }, source: "api" };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) return { dispatch: null, source: "api", notFound: true };
      if (err.status === 403) return { dispatch: null, source: "fallback", forbidden: true, fallbackReason: "Sem permissão para consultar este despacho." };
    }
    return { dispatch: null, source: "fallback", fallbackReason: "A consulta ao despacho falhou. Tente novamente em instantes." };
  }
}

export async function createDispatch(context: DispatchesApiContext, payload: DispatchCreatePayload): Promise<DispatchDetail> {
  if (isMockMode()) return { ...getMockDispatchDetail("dispatch-000101"), ...payload, id: "mock-created-dispatch", timeline: [] };

  const response = await apiRequest<unknown>("/operations/dispatches", {
    ...context,
    method: "POST",
    body: payload,
  });
  return requireDispatch(response);
}

export async function updateDispatchStatus(context: DispatchesApiContext, dispatchId: string, payload: DispatchStatusPayload): Promise<DispatchDetail> {
  if (isMockMode()) return { ...getMockDispatchDetail(dispatchId), status: payload.status, observation: payload.observation, reason: payload.reason };

  const response = await apiRequest<unknown>(`/operations/dispatches/${dispatchId}/status`, {
    ...context,
    method: "PATCH",
    body: payload,
  });
  return requireDispatch(response);
}

export async function reassignDispatch(context: DispatchesApiContext, dispatchId: string, payload: DispatchReassignPayload): Promise<DispatchDetail> {
  if (isMockMode()) return { ...getMockDispatchDetail(dispatchId), status: "reassigned", operatorUserId: payload.operatorUserId, observation: payload.observation };

  const response = await apiRequest<unknown>(`/operations/dispatches/${dispatchId}/reassign`, {
    ...context,
    method: "PATCH",
    body: payload,
  });
  return requireDispatch(response);
}

/** 2xx sem despacho parseável: falhar alto é mais honesto que inventar um (os chamadores já capturam). */
function requireDispatch(response: unknown): DispatchDetail {
  const dispatch = adaptDispatchResponse(response);
  if (!dispatch) throw new Error("invalid_dispatch_response");
  return dispatch;
}

async function enrichWithWorkOrdersIfAllowed(context: DispatchesApiContext, items: readonly DispatchListItem[]): Promise<DispatchListItem[]> {
  if (!context.permissions?.includes("work_orders:read")) return [...items];

  try {
    const workOrders = await listWorkOrdersFromApi(context, {});
    return enrichDispatchesWithWorkOrders(items, workOrders.items);
  } catch {
    return [...items];
  }
}

function buildQuery(params: Partial<DispatchesFilters>): string {
  const query = new URLSearchParams();
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  if (params.operatorUserId) query.set("operatorUserId", params.operatorUserId);
  if (params.workOrderId) query.set("workOrderId", params.workOrderId);
  return query.size ? `?${query.toString()}` : "";
}
