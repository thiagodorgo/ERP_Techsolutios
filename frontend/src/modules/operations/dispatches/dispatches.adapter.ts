import type { WorkOrderListItem } from "../../work-orders/work-orders.types";
import type {
  DispatchDetail,
  DispatchEvent,
  DispatchListItem,
  DispatchPagination,
  DispatchPriority,
  DispatchesData,
  DispatchesFilters,
  DispatchesSummary,
  DispatchStatus,
} from "./dispatches.types";

const statusLabels: Record<DispatchStatus, string> = {
  draft: "Rascunho",
  assigned: "Atribuído",
  accepted: "Aceito",
  on_route: "Em deslocamento",
  arrived: "No local",
  in_service: "Em atendimento",
  completed: "Concluído",
  cancelled: "Cancelado",
  reassigned: "Reatribuído",
  failed: "Falhou",
};

const priorityLabels: Record<DispatchPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
  unknown: "Não informada",
};

export function adaptDispatchesResponse(response: unknown, source: DispatchesData["source"] = "api", fallbackReason?: string): DispatchesData {
  const payload = readRecord(response);
  const itemsSource = Array.isArray(response)
    ? response
    : readArray(payload?.items) ?? readArray(payload?.data) ?? readArray(readRecord(payload?.data)?.items) ?? [];
  const items = itemsSource.map((item) => adaptDispatchItem(item)).filter((item): item is DispatchListItem => Boolean(item));

  return {
    items,
    pagination: adaptPagination(payload, items.length),
    source,
    fallbackReason,
  };
}

export function adaptDispatchResponse(response: unknown): DispatchDetail | null {
  const payload = readRecord(response);
  const item = adaptDispatchItem(readRecord(payload?.data) ?? response);
  if (!item) return null;

  const source = readRecord(payload?.data) ?? readRecord(response);
  const timelineSource = readArray(source?.timeline) ?? [];
  return {
    ...item,
    timeline: timelineSource.map((event) => adaptDispatchEvent(event)).filter((event): event is DispatchEvent => Boolean(event)),
  };
}

export function enrichDispatchesWithWorkOrders(items: readonly DispatchListItem[], workOrders: readonly WorkOrderListItem[]): DispatchListItem[] {
  const workOrdersById = new Map(workOrders.map((workOrder) => [workOrder.id, workOrder]));
  return items.map((item) => {
    const workOrder = workOrdersById.get(item.workOrderId);
    if (!workOrder) return item;

    return {
      ...item,
      workOrderCode: workOrder.code,
      workOrderTitle: workOrder.title,
      priority: workOrder.priority,
    };
  });
}

export function filterDispatches(items: readonly DispatchListItem[], filters: DispatchesFilters): DispatchListItem[] {
  const search = normalize(filters.search);
  const operator = filters.operatorUserId.trim();

  return items.filter((item) => {
    if (filters.status !== "all" && item.status !== filters.status) return false;
    if (filters.priority !== "all" && item.priority !== filters.priority) return false;
    if (filters.workOrderId && item.workOrderId !== filters.workOrderId) return false;
    if (operator && item.operatorUserId !== operator) return false;
    if (!search) return true;

    return [item.id, item.workOrderId, item.workOrderCode, item.workOrderTitle, item.operatorUserId, item.observation, item.reason]
      .filter(Boolean)
      .some((value) => normalize(String(value)).includes(search));
  });
}

export function calculateDispatchesSummary(items: readonly DispatchListItem[]): DispatchesSummary {
  return {
    total: items.length,
    assigned: items.filter((item) => item.status === "assigned" || item.status === "accepted" || item.status === "reassigned").length,
    inRoute: items.filter((item) => item.status === "on_route" || item.status === "arrived").length,
    inService: items.filter((item) => item.status === "in_service").length,
    completed: items.filter((item) => item.status === "completed").length,
    cancelled: items.filter((item) => item.status === "cancelled" || item.status === "failed").length,
    urgent: items.filter((item) => item.priority === "urgent").length,
  };
}

export function getDispatchStatusLabel(status: DispatchStatus): string {
  return statusLabels[status];
}

export function getDispatchPriorityLabel(priority: DispatchPriority): string {
  return priorityLabels[priority];
}

export function getDispatchStatusTone(status: DispatchStatus) {
  if (status === "completed") return "success" as const;
  if (status === "cancelled" || status === "failed") return "danger" as const;
  if (status === "draft" || status === "reassigned") return "warning" as const;
  if (status === "assigned" || status === "accepted") return "info" as const;
  return "pending" as const;
}

export function getDispatchPriorityTone(priority: DispatchPriority) {
  if (priority === "urgent") return "danger" as const;
  if (priority === "high") return "warning" as const;
  if (priority === "medium") return "info" as const;
  if (priority === "unknown") return "default" as const;
  return "success" as const;
}

export function formatDispatchDate(value: string | null | undefined): string {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function validateDispatchCreate(input: { readonly workOrderId: string; readonly operatorUserId: string }): string[] {
  const errors: string[] = [];
  if (!input.workOrderId.trim()) errors.push("OS obrigatória.");
  if (!input.operatorUserId.trim()) errors.push("Operador obrigatório.");
  return errors;
}

function adaptDispatchItem(input: unknown): DispatchListItem | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const workOrderId = readString(item, ["workOrderId", "work_order_id"]);
  const operatorUserId = readString(item, ["operatorUserId", "operator_user_id"]);
  const status = normalizeStatus(readString(item, ["status"]));
  const createdAt = readString(item, ["createdAt", "created_at"]) ?? new Date().toISOString();

  if (!id || !workOrderId || !operatorUserId || !status) return null;

  return {
    id,
    workOrderId,
    workOrderCode: readString(item, ["workOrderCode", "work_order_code"]),
    workOrderTitle: readString(item, ["workOrderTitle", "work_order_title"]),
    operatorUserId,
    status,
    priority: normalizePriority(readString(item, ["priority"])) ?? "unknown",
    observation: readNullableString(item, ["observation"]),
    reason: readNullableString(item, ["reason"]),
    acceptedAt: readNullableString(item, ["acceptedAt", "accepted_at"]),
    onRouteAt: readNullableString(item, ["onRouteAt", "on_route_at"]),
    arrivedAt: readNullableString(item, ["arrivedAt", "arrived_at"]),
    inServiceAt: readNullableString(item, ["inServiceAt", "in_service_at"]),
    completedAt: readNullableString(item, ["completedAt", "completed_at"]),
    cancelledAt: readNullableString(item, ["cancelledAt", "cancelled_at"]),
    failedAt: readNullableString(item, ["failedAt", "failed_at"]),
    createdBy: readNullableString(item, ["createdBy", "created_by"]),
    updatedBy: readNullableString(item, ["updatedBy", "updated_by"]),
    createdAt,
    updatedAt: readString(item, ["updatedAt", "updated_at"]),
  };
}

function adaptDispatchEvent(input: unknown): DispatchEvent | null {
  const item = readRecord(input);
  if (!item) return null;

  const id = readString(item, ["id"]);
  const dispatchId = readString(item, ["dispatchId", "dispatch_id"]);
  const workOrderId = readString(item, ["workOrderId", "work_order_id"]);
  const eventType = readString(item, ["eventType", "event_type"]);
  const message = readString(item, ["message"]);
  const createdAt = readString(item, ["createdAt", "created_at"]);
  if (!id || !dispatchId || !workOrderId || !eventType || !message || !createdAt) return null;

  return {
    id,
    dispatchId,
    workOrderId,
    eventType,
    fromStatus: normalizeStatus(readString(item, ["fromStatus", "from_status"])),
    toStatus: normalizeStatus(readString(item, ["toStatus", "to_status"])),
    actorUserId: readNullableString(item, ["actorUserId", "actor_user_id"]),
    message,
    metadata: readRecord(item.metadata) ?? null,
    createdAt,
  };
}

function adaptPagination(payload: Record<string, unknown> | undefined, fallbackTotal: number): DispatchPagination {
  const pagination = readRecord(payload?.pagination) ?? readRecord(readRecord(payload?.data)?.pagination);
  return {
    limit: readNumber(pagination, ["limit"]) ?? 20,
    offset: readNumber(pagination, ["offset"]) ?? 0,
    total: readNumber(pagination, ["total"]) ?? fallbackTotal,
  };
}

function readArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function readString(input: Record<string, unknown> | undefined, keys: readonly string[]): string | undefined {
  if (!input) return undefined;
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function readNullableString(input: Record<string, unknown>, keys: readonly string[]): string | null {
  return readString(input, keys) ?? null;
}

function readNumber(input: Record<string, unknown> | undefined, keys: readonly string[]): number | undefined {
  if (!input) return undefined;
  for (const key of keys) {
    const value = input[key];
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeStatus(value: string | undefined): DispatchStatus | null {
  if (
    value === "draft" ||
    value === "assigned" ||
    value === "accepted" ||
    value === "on_route" ||
    value === "arrived" ||
    value === "in_service" ||
    value === "completed" ||
    value === "cancelled" ||
    value === "reassigned" ||
    value === "failed"
  ) {
    return value;
  }
  return null;
}

function normalizePriority(value: string | undefined): DispatchPriority | null {
  if (value === "low" || value === "medium" || value === "high" || value === "urgent" || value === "unknown") return value;
  return null;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
