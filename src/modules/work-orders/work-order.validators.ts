import {
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATUSES,
  type WorkOrderPriority,
  type WorkOrderStatus,
  WorkOrderError,
} from "./work-order.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const WORK_ORDER_STATUS_TRANSITIONS: Readonly<Record<WorkOrderStatus, readonly WorkOrderStatus[]>> = {
  open: ["assigned", "cancelled"],
  assigned: ["accepted", "cancelled", "rejected"],
  accepted: ["on_route", "cancelled"],
  on_route: ["on_site", "cancelled"],
  on_site: ["in_progress", "cancelled"],
  in_progress: ["paused", "completed", "cancelled"],
  paused: ["in_progress"],
  completed: [],
  cancelled: [],
  rejected: [],
};

export function assertNonEmptyString(value: unknown, field: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw new WorkOrderError(400, "WORK_ORDER_INVALID", "required_field", `${field} is required.`);
  }

  return normalized;
}

// Ω3-b — corpo de comentário livre da OS. Obrigatório (400 comment_required), limitado a 4000 chars
// (422 comment_too_long). Preserva quebras de linha internas; só apara as bordas.
export function parseComment(value: unknown): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new WorkOrderError(400, "WORK_ORDER_INVALID", "comment_required", "comment message is required.");
  }
  if (normalized.length > 4000) {
    throw new WorkOrderError(422, "WORK_ORDER_UNPROCESSABLE", "comment_too_long", "comment must be at most 4000 characters.");
  }
  return normalized;
}

export function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";

  return normalized || undefined;
}

export function parseWorkOrderPriority(value: unknown, fallback: WorkOrderPriority = "medium"): WorkOrderPriority {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = typeof value === "string" ? value.trim() : "";

  if (WORK_ORDER_PRIORITIES.includes(normalized as WorkOrderPriority)) {
    return normalized as WorkOrderPriority;
  }

  throw new WorkOrderError(400, "WORK_ORDER_INVALID", "invalid_priority", "priority is invalid.");
}

export function parseWorkOrderStatus(value: unknown): WorkOrderStatus {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (WORK_ORDER_STATUSES.includes(normalized as WorkOrderStatus)) {
    return normalized as WorkOrderStatus;
  }

  throw new WorkOrderError(400, "WORK_ORDER_INVALID", "invalid_status", "status is invalid.");
}

export function assertStatusTransition(from: WorkOrderStatus, to: WorkOrderStatus): void {
  if (from === to) return;
  if (WORK_ORDER_STATUS_TRANSITIONS[from].includes(to)) return;

  throw new WorkOrderError(
    409,
    "WORK_ORDER_STATUS_INVALID",
    "invalid_status_transition",
    `Cannot transition work order from ${from} to ${to}.`,
  );
}

export function parseOptionalDate(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new WorkOrderError(400, "WORK_ORDER_INVALID", "invalid_date", `${field} must be a valid ISO date.`);
  }

  return date;
}

// Ω3F-2a — campos dinâmicos por tipo. Aceita SÓ objeto plano (chave string → valor primitivo/null);
// rejeita não-objeto, array e valores aninhados (422). Limita cardinalidade e tamanho de string para
// evitar payload abusivo. NUNCA loga os valores (§2.8: pode conter senha de acesso do residencial).
export function parseServiceDetails(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new WorkOrderError(422, "WORK_ORDER_UNPROCESSABLE", "invalid_service_details", "service_details must be a plain object.");
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 50) {
    throw new WorkOrderError(422, "WORK_ORDER_UNPROCESSABLE", "service_details_too_large", "service_details has too many fields.");
  }

  const result: Record<string, unknown> = {};
  for (const [key, entry] of entries) {
    if (key.length > 100) {
      throw new WorkOrderError(422, "WORK_ORDER_UNPROCESSABLE", "invalid_service_details", "service_details keys are invalid.");
    }
    if (entry !== null && typeof entry === "object") {
      throw new WorkOrderError(422, "WORK_ORDER_UNPROCESSABLE", "invalid_service_details", "service_details values must be primitives.");
    }
    if (typeof entry === "string" && entry.length > 2000) {
      throw new WorkOrderError(422, "WORK_ORDER_UNPROCESSABLE", "service_details_too_large", "service_details value is too long.");
    }
    result[key] = entry;
  }

  return result;
}

export function parseOptionalCoordinate(value: unknown, field: string, min: number, max: number): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new WorkOrderError(400, "WORK_ORDER_INVALID", "invalid_coordinate", `${field} must be between ${min} and ${max}.`);
  }

  return parsed;
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = assertNonEmptyString(value, field);

  if (!uuidPattern.test(normalized)) {
    throw new WorkOrderError(400, "WORK_ORDER_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }

  return normalized;
}

export function parseOptionalUuid(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseRequiredUuid(value, field);
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new WorkOrderError(400, "WORK_ORDER_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }

  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new WorkOrderError(400, "WORK_ORDER_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }

  return parsed;
}

export function parseOptionalSearch(value: unknown): string | undefined {
  const search = optionalString(value);
  if (!search) return undefined;

  return search.slice(0, 120);
}
