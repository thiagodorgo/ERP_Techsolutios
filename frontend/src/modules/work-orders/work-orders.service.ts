import { isMockMode } from "../../config/env";
import { ApiError, apiRequest } from "../../services/api/client";
import { adaptWorkOrderResponse, adaptWorkOrdersResponse, adaptWorkOrderTimelineResponse, hasWorkOrdersList } from "./work-orders.adapter";
import type { WorkOrderAuditLog, WorkOrderAuditLogList } from "./audit-logs.types";
import { getMockWorkOrderDetail, getMockWorkOrdersData, getMockWorkOrderTimeline } from "./work-orders.mock";
import type {
  WorkOrderAssignPayload,
  WorkOrderCancelPayload,
  WorkOrderCreatePayload,
  WorkOrderDetail,
  WorkOrderDetailResult,
  WorkOrderDuplicatePayload,
  WorkOrderEvent,
  WorkOrderMileageCorrectionPayload,
  WorkOrdersApiContext,
  WorkOrdersData,
  WorkOrdersFilters,
  WorkOrdersPagination,
  WorkOrderStatus,
  WorkOrderStatusPayload,
  WorkOrderUpdatePayload,
} from "./work-orders.types";

// B-SAN3-01 (P-008, item 4 do gate SAN3) — este service NÃO fabrica mais OS quando o backend recusa ou responde
// vazio. Antes: lista vazia virava 6 OS inventadas com aviso falso de "sem conexão"; create recusado virava
// `OS-FALLBACK` (e o que o operador digitou se perdia); detalhe 404/403/5xx virava `OS-000101`; timeline vazia
// virava 3 eventos; 2xx sem OS nas mutações virava `?? getMockWorkOrderDetail`. Agora o erro real chega à tela
// como ESTADO (§7: erro · vazio · acesso não permitido · não encontrada · desatualizado). O modo mock EXPLÍCITO
// (`VITE_USE_MOCKS=true`, interruptor de demonstração) continua — e é o ÚNICO caminho que alcança `getMock*`
// (o guard G1 em work-orders-honest-errors.test.tsx fiscaliza).
//
// Contrato (§4.2 do plano):
//   listWorkOrdersFromApi  → nunca lança: 200 com lista → itens (vazio = vazio) · 200 SEM lista → falha + razão (ciclo 2,
//                            C2-N2) · 403 → `forbidden:true` · outro erro → vazio + razão
//   createWorkOrder        → lança ApiError (non-2xx/rede) ou Error("invalid_work_order_response") (2xx sem OS)
//   getWorkOrderFromApi    → nunca lança: `workOrder:null` + `notFound`/`forbidden`/`fallbackReason`
//   getWorkOrderTimeline   → lança ApiError; vazio = []
//   update/advance/assign/cancel/correctMileage → 2xx sem OS lança Error("invalid_work_order_response")

const EMPTY_PAGINATION: WorkOrdersPagination = { limit: 20, offset: 0, total: 0 };

export async function listWorkOrdersFromApi(context: WorkOrdersApiContext, params: Partial<WorkOrdersFilters> = {}): Promise<WorkOrdersData> {
  if (isMockMode()) return getMockWorkOrdersData("mock");

  try {
    const response = await apiRequest<unknown>(`/work-orders${buildQuery(params)}`, context);
    // Ciclo 2 (emenda 3 (r), C2-N2) — 2xx sem lista no corpo não é "vazio": é falha (P2, o desconhecido cai no erro).
    if (!hasWorkOrdersList(response)) {
      return { items: [], pagination: EMPTY_PAGINATION, source: "fallback", fallbackReason: "A resposta não trouxe a lista de ordens de serviço. Tente novamente em instantes.", forbidden: false };
    }
    return adaptWorkOrdersResponse(response, "api");
  } catch (err) {
    // 403 = gate RBAC `work_orders:read` → "acesso não permitido" (não é falha de sistema). Qualquer outro erro
    // (5xx, rede) → vazio + razão; a UI mostra o estado de erro e o auto-refresh tenta de novo. Nada fabricado.
    const forbidden = err instanceof ApiError && err.status === 403;
    return {
      items: [],
      pagination: EMPTY_PAGINATION,
      source: "fallback",
      fallbackReason: forbidden
        ? "Sem permissão para consultar as ordens de serviço."
        : "A consulta às ordens de serviço falhou. Tente novamente em instantes.",
      forbidden,
    };
  }
}

export async function createWorkOrder(context: WorkOrdersApiContext, payload: WorkOrderCreatePayload): Promise<WorkOrderDetail> {
  if (isMockMode()) return { ...getMockWorkOrderDetail("new"), ...payload, id: "mock-created-work-order", code: "OS-MOCK" };

  // Erro do backend (400 vínculo/data inválidos · 422 destination_required · 403 · 5xx) e rede PROPAGAM como
  // ApiError: a página traduz por `reason`/status (work-orders-create.handlers.ts) e NÃO navega. Sem OS na
  // resposta 2xx, falhar alto é mais honesto que inventar uma (espelho de duplicateWorkOrder).
  const response = await apiRequest<unknown>("/work-orders", {
    ...context,
    method: "POST",
    body: payload,
  });
  return requireWorkOrder(response);
}

export async function getWorkOrderFromApi(context: WorkOrdersApiContext, workOrderId: string): Promise<WorkOrderDetailResult> {
  if (isMockMode()) return { workOrder: getMockWorkOrderDetail(workOrderId), source: "mock" };

  try {
    const response = await apiRequest<unknown>(`/work-orders/${workOrderId}`, context);
    const workOrder = adaptWorkOrderResponse(response);
    if (workOrder) return { workOrder, source: "api" };
    return { workOrder: null, source: "fallback", fallbackReason: "A resposta não trouxe uma ordem de serviço válida." };
  } catch (err) {
    if (err instanceof ApiError) {
      // 404 = OS inexistente (ou de outra organização — o backend não vaza existência) → "não encontrada".
      if (err.status === 404) return { workOrder: null, source: "api", notFound: true };
      // 403 = gate RBAC → "acesso não permitido" (não é falha de sistema).
      if (err.status === 403) {
        return { workOrder: null, source: "fallback", forbidden: true, fallbackReason: "Sem permissão para consultar esta ordem de serviço." };
      }
    }
    return { workOrder: null, source: "fallback", fallbackReason: "A consulta à ordem de serviço falhou. Tente novamente em instantes." };
  }
}

export async function updateWorkOrder(context: WorkOrdersApiContext, workOrderId: string, payload: WorkOrderUpdatePayload): Promise<WorkOrderDetail> {
  if (isMockMode()) return { ...getMockWorkOrderDetail(workOrderId), ...payload };

  const response = await apiRequest<unknown>(`/work-orders/${workOrderId}`, {
    ...context,
    method: "PATCH",
    body: payload,
  });
  return requireWorkOrder(response);
}

// Ω3F-6b (coordenador J-Ω3F-6B) — `updateWorkOrderStatus` (PATCH /status) foi REMOVIDO junto do
// `WorkOrderStatusActions`: ambos eram código morto (zero importadores) e o componente listava
// WORK_ORDER_STATUSES inteiro — "Cancelada" incluída — SEM gate de permissão. Remontá-lo reabriria a porta
// dos fundos que o Ω3F-6a acabou de fechar (cancelar sem decisão financeira). O único caminho de
// cancelamento na UI é o item gated do ⋮ → POST /cancel. Se algum dia o status precisar de UI própria,
// ela NÃO deve oferecer `cancelled` (ver P-Ω3F6-STATUS-BYPASS).

// Ω3F-9 (D-Ω3F-9-ANDAMENTO) — "dar andamento" pela linha da lista: avanço de status FORWARD-ONLY reusando
// PATCH /status. `next` vem SEMPRE do mapa nextForwardStatus (nunca `cancelled` — a porta dos fundos do
// Ω3F-6b continua fechada). Como cancel/mileage, o ERRO (non-2xx) NÃO é engolido: propaga para a linha
// mostrar o 409 (transição inválida / corrida). B-SAN3-01: um 2xx sem OS parseável também lança
// (`invalid_work_order_response`) — o chamador (`runAdvance`) já capturava. Em mock, devolve a OS já avançada.
export async function advanceWorkOrderStatus(
  context: WorkOrdersApiContext,
  workOrderId: string,
  next: WorkOrderStatus,
): Promise<WorkOrderDetail> {
  if (isMockMode()) return { ...getMockWorkOrderDetail(workOrderId), status: next };

  const response = await apiRequest<unknown>(`/work-orders/${encodeURIComponent(workOrderId)}/status`, {
    ...context,
    method: "PATCH",
    body: { status: next },
  });
  return requireWorkOrder(response);
}

export async function assignWorkOrder(context: WorkOrdersApiContext, workOrderId: string, payload: WorkOrderAssignPayload): Promise<WorkOrderDetail> {
  if (isMockMode()) return { ...getMockWorkOrderDetail(workOrderId), status: "assigned", assignedOperatorId: payload.operatorId, assignedUserId: payload.userId ?? null };

  const response = await apiRequest<unknown>(`/work-orders/${workOrderId}/assign`, {
    ...context,
    method: "POST",
    body: payload,
  });
  return requireWorkOrder(response);
}

// Ω3F-6b — cancelamento COM decisão financeira (contrato Ω3F-6a):
//   POST /work-orders/:id/cancel  { financial_decision, reason }
// Diferente do PATCH /status legado, esta rota GRAVA o destino do dinheiro. Os erros do backend NÃO são
// engolidos aqui (sem fallback/mock silencioso): o modal precisa do status para dizer o que falhou
// (422 decisão ausente/inválida ou OS não cancelável · 400 motivo · 403 permissão · 404 OS).
export async function cancelWorkOrder(
  context: WorkOrdersApiContext,
  workOrderId: string,
  payload: WorkOrderCancelPayload,
): Promise<WorkOrderDetail> {
  if (isMockMode()) {
    return {
      ...getMockWorkOrderDetail(workOrderId),
      status: "cancelled",
      cancellationReason: payload.reason,
      financialCancellationDecision: payload.financialDecision,
    };
  }

  const response = await apiRequest<unknown>(`/work-orders/${encodeURIComponent(workOrderId)}/cancel`, {
    ...context,
    method: "POST",
    body: {
      financial_decision: payload.financialDecision,
      reason: payload.reason,
    },
  });
  return requireWorkOrder(response);
}

// Ω3F-6b — duplica a OS (contrato Ω3F-6a): POST /work-orders/:id/duplicate → 201 com a OS NOVA (novo code).
// Só `copy_comments`/`copy_checklist` existem: duplicar NÃO herda financeiro/orçamento (preço congelado).
// `client_action_id` torna o duplo-clique idempotente (o replay volta 409, tratado no modal).
export async function duplicateWorkOrder(
  context: WorkOrdersApiContext,
  workOrderId: string,
  payload: WorkOrderDuplicatePayload = {},
): Promise<WorkOrderDetail> {
  if (isMockMode()) {
    return { ...getMockWorkOrderDetail(workOrderId), id: "mock-duplicated-work-order", code: "OS-MOCK-2", status: "open" };
  }

  const response = await apiRequest<unknown>(`/work-orders/${encodeURIComponent(workOrderId)}/duplicate`, {
    ...context,
    method: "POST",
    body: {
      copy_comments: payload.copyComments ?? false,
      copy_checklist: payload.copyChecklist ?? false,
      client_action_id: payload.clientActionId,
    },
  });
  const duplicated = adaptWorkOrderResponse(response);
  // Sem OS válida na resposta não há para onde navegar — falhar alto é mais honesto que inventar uma OS.
  if (!duplicated) throw new Error("invalid_duplicate_response");
  return duplicated;
}

// Ω3F-7b — correção de quilometragem pela BASE (contrato Ω3F-7a): PATCH /work-orders/:id/mileage
//   { mileage_start?, mileage_end? } → 200 com a OS. Como o cancelamento, os erros do backend NÃO são
// engolidos (sem fallback/mock silencioso): o form precisa do status para dizer o que falhou
// (400 mileage_required corpo vazio · 400 invalid_mileage negativo/> 999.999.999,9 · 422 invalid_mileage_range
// final<inicial · 403 sem permissão · 404 OS). Envia só os campos preenchidos, em snake_case.
export async function correctMileage(
  context: WorkOrdersApiContext,
  workOrderId: string,
  payload: WorkOrderMileageCorrectionPayload,
): Promise<WorkOrderDetail> {
  if (isMockMode()) {
    const current = getMockWorkOrderDetail(workOrderId);
    return {
      ...current,
      mileageStart: payload.mileageStart ?? current.mileageStart ?? null,
      mileageEnd: payload.mileageEnd ?? current.mileageEnd ?? null,
      mileageSource: "base",
      mileageCorrectedAt: new Date().toISOString(),
    };
  }

  const body: Record<string, number> = {};
  if (payload.mileageStart !== undefined) body.mileage_start = payload.mileageStart;
  if (payload.mileageEnd !== undefined) body.mileage_end = payload.mileageEnd;

  const response = await apiRequest<unknown>(`/work-orders/${encodeURIComponent(workOrderId)}/mileage`, {
    ...context,
    method: "PATCH",
    body,
  });
  return requireWorkOrder(response);
}

// Ω1b-2 — geocodifica a OS sob demanda (botão "Localizar no mapa"). Devolve se localizou + a razão.
export async function geocodeWorkOrder(
  context: WorkOrdersApiContext,
  workOrderId: string,
): Promise<{ geocoded: boolean; reason?: string }> {
  if (isMockMode()) {
    return { geocoded: false, reason: "Geocodificação indisponível no modo demonstração." };
  }

  const response = (await apiRequest<unknown>(`/work-orders/${workOrderId}/geocode`, {
    ...context,
    method: "POST",
    body: {},
  })) as { data?: { geocoded?: boolean; reason?: string } } | null;
  const data = response?.data;
  return { geocoded: data?.geocoded === true, reason: data?.reason };
}

// B-SAN3-01 — timeline vazia é vazia ("Sem eventos registrados."); erro PROPAGA como ApiError e o hook
// (`nextDetailState`) o traduz em "Histórico indisponível no momento." — distinto do vazio. Nunca 3 eventos inventados.
export async function getWorkOrderTimeline(context: WorkOrdersApiContext, workOrderId: string): Promise<WorkOrderEvent[]> {
  if (isMockMode()) return getMockWorkOrderTimeline(workOrderId);

  const response = await apiRequest<unknown>(`/work-orders/${workOrderId}/timeline`, context);
  return adaptWorkOrderTimelineResponse(response);
}

// Ω3F-8a — aba "Logs da OS": leitura da auditoria filtrada pela OS. GET /work-orders/:id/audit-logs.
// Leitura DEFENSIVA (o backend pode evoluir campos); modo mock → lista vazia honesta (nunca fabrica log).
export async function listWorkOrderAuditLogs(
  context: WorkOrdersApiContext,
  workOrderId: string,
): Promise<WorkOrderAuditLogList> {
  if (isMockMode()) return { items: [] };

  const response = await apiRequest<unknown>(`/work-orders/${encodeURIComponent(workOrderId)}/audit-logs`, context);
  return adaptAuditLogList(response);
}

/** 2xx sem OS parseável: falhar alto é mais honesto que inventar uma OS (espelho de duplicateWorkOrder). */
function requireWorkOrder(response: unknown): WorkOrderDetail {
  const workOrder = adaptWorkOrderResponse(response);
  if (!workOrder) throw new Error("invalid_work_order_response");
  return workOrder;
}

function adaptAuditLogList(response: unknown): WorkOrderAuditLogList {
  const record = asAuditRecord(response);
  const rawItems = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.data)
      ? record.data
      : Array.isArray(response)
        ? response
        : [];
  const items = rawItems
    .map((item) => adaptAuditLog(item))
    .filter((item): item is WorkOrderAuditLog => item !== null);
  return { items };
}

function adaptAuditLog(value: unknown): WorkOrderAuditLog | null {
  const item = asAuditRecord(value);
  const id = readAuditString(item.id);
  const action = readAuditString(item.action);
  if (!id || !action) return null;
  const metadata = item.metadata;
  return {
    id,
    action,
    actorUserId: readAuditString(item.actorUserId ?? item.actor_user_id) ?? null,
    actorName: readAuditString(item.actorName ?? item.actor_name) ?? null,
    entity: readAuditString(item.entity) ?? "",
    entityId: readAuditString(item.entityId ?? item.entity_id) ?? null,
    metadata: typeof metadata === "object" && metadata !== null && !Array.isArray(metadata) ? (metadata as Record<string, unknown>) : null,
    createdAt: readAuditString(item.createdAt ?? item.created_at) ?? "",
  };
}

function asAuditRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function readAuditString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function buildQuery(params: Partial<WorkOrdersFilters>): string {
  const query = new URLSearchParams();
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.priority && params.priority !== "all") query.set("priority", params.priority);
  if (params.search) query.set("search", params.search);
  if (params.assignedOperatorId) query.set("assignedOperatorId", params.assignedOperatorId);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  return query.size ? `?${query.toString()}` : "";
}
