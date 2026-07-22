import {
  MAINTENANCE_STATUSES,
  MAINTENANCE_TYPES,
  MaintenanceOrderError,
  type MaintenanceStatus,
  type MaintenanceType,
} from "./maintenance-order.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * R2.1 — restricted state machine, mirroring field-dispatch.validators. Only the
 * transitions listed here are legal; `concluida`/`cancelada` are terminal.
 */
export const MAINTENANCE_STATUS_TRANSITIONS: Readonly<Record<MaintenanceStatus, readonly MaintenanceStatus[]>> = {
  agendada: ["em_execucao", "cancelada"],
  em_execucao: ["concluida", "cancelada"],
  concluida: [],
  cancelada: [],
};

/**
 * R2.1 — invalid transition = 422 (message clear, PT-BR-friendly). A no-op
 * (from === to) is tolerated so idempotent PATCHes never fail.
 */
export function assertMaintenanceStatusTransition(from: MaintenanceStatus, to: MaintenanceStatus): void {
  if (from === to) return;
  if (MAINTENANCE_STATUS_TRANSITIONS[from].includes(to)) return;

  throw new MaintenanceOrderError(
    422,
    "MAINTENANCE_INVALID",
    "invalid_status_transition",
    `Transição de manutenção inválida: de "${from}" para "${to}".`,
  );
}

export function assertNonEmptyString(value: unknown, field: string, maxLength = 2000): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw new MaintenanceOrderError(400, "MAINTENANCE_INVALID", "required_field", `${field} is required.`);
  }

  if (normalized.length > maxLength) {
    throw new MaintenanceOrderError(
      400,
      "MAINTENANCE_INVALID",
      "field_too_long",
      `${field} must be at most ${maxLength} characters.`,
    );
  }

  return normalized;
}

export function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";

  return normalized || undefined;
}

function boundedOptionalString(value: unknown, field: string, min: number, max: number): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;

  if (normalized.length < min || normalized.length > max) {
    throw new MaintenanceOrderError(
      400,
      "MAINTENANCE_INVALID",
      `invalid_${field}`,
      `${field} must be between ${min} and ${max} characters.`,
    );
  }

  return normalized;
}

export function parseOptionalSupplier(value: unknown): string | undefined {
  return boundedOptionalString(value, "supplier", 0, 200);
}

export function parseRequiredDescription(value: unknown): string {
  return assertNonEmptyString(value, "description", 2000);
}

export function parseOptionalDescription(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return assertNonEmptyString(value, "description", 2000);
}

export function parseMaintenanceType(value: unknown, fallback?: MaintenanceType): MaintenanceType {
  if (value === undefined || value === null || value === "") {
    if (fallback === undefined) {
      throw new MaintenanceOrderError(400, "MAINTENANCE_INVALID", "required_field", "type is required.");
    }
    return fallback;
  }

  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (MAINTENANCE_TYPES.includes(normalized as MaintenanceType)) {
    return normalized as MaintenanceType;
  }

  throw new MaintenanceOrderError(
    400,
    "MAINTENANCE_INVALID",
    "invalid_type",
    `type must be one of: ${MAINTENANCE_TYPES.join(", ")}.`,
  );
}

export function parseOptionalMaintenanceType(value: unknown): MaintenanceType | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseMaintenanceType(value);
}

export function parseMaintenanceStatus(value: unknown, fallback?: MaintenanceStatus): MaintenanceStatus {
  if (value === undefined || value === null || value === "") {
    if (fallback === undefined) {
      throw new MaintenanceOrderError(400, "MAINTENANCE_INVALID", "required_field", "status is required.");
    }
    return fallback;
  }

  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (MAINTENANCE_STATUSES.includes(normalized as MaintenanceStatus)) {
    return normalized as MaintenanceStatus;
  }

  throw new MaintenanceOrderError(
    400,
    "MAINTENANCE_INVALID",
    "invalid_status",
    `status must be one of: ${MAINTENANCE_STATUSES.join(", ")}.`,
  );
}

export function parseOptionalMaintenanceStatus(value: unknown): MaintenanceStatus | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseMaintenanceStatus(value);
}

export function parseCost(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    throw new MaintenanceOrderError(400, "MAINTENANCE_INVALID", "required_field", "cost is required.");
  }
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new MaintenanceOrderError(400, "MAINTENANCE_INVALID", "invalid_cost", "cost must be a number.");
  }
  if (parsed < 0) {
    throw new MaintenanceOrderError(400, "MAINTENANCE_INVALID", "invalid_cost", "cost must be greater than or equal to zero.");
  }

  return parsed;
}

export function parseOptionalCost(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseCost(value);
}

export function parseOdometer(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    throw new MaintenanceOrderError(400, "MAINTENANCE_INVALID", "required_field", "odometer is required.");
  }
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new MaintenanceOrderError(400, "MAINTENANCE_INVALID", "invalid_odometer", "odometer must be a non-negative integer.");
  }

  return parsed;
}

export function parseOptionalOdometer(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseOdometer(value);
}

export function parseRequiredDate(value: unknown, field: string): Date {
  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new MaintenanceOrderError(400, "MAINTENANCE_INVALID", "invalid_date", `${field} must be a valid ISO date.`);
  }

  return date;
}

export function parseOptionalDate(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseRequiredDate(value, field);
}

export function readOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;

  throw new MaintenanceOrderError(400, "MAINTENANCE_INVALID", "invalid_boolean", "isActive must be a boolean.");
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = assertNonEmptyString(value, field, 160);

  if (!uuidPattern.test(normalized)) {
    throw new MaintenanceOrderError(400, "MAINTENANCE_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
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
    throw new MaintenanceOrderError(400, "MAINTENANCE_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }

  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new MaintenanceOrderError(400, "MAINTENANCE_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }

  return parsed;
}

export function parseOptionalSearch(value: unknown): string | undefined {
  const search = optionalString(value);
  if (!search) return undefined;

  return search.slice(0, 120);
}

// Ω4C PR-06 (R-Ω4C-PR06) — o lembrete de PRÓXIMA manutenção é INTRINSECAMENTE PRIVADO: não há campo de
// visibilidade no contrato de manutenção. O efeito de domínio fixa `visibility: 'private'` na fronteira do
// motor de notificações. Broadcast deliberado (public/custom) só via POST /notifications/scheduled
// (`notifications:create`). Por isso NÃO existe aqui um `parseNextDueVisibility`.
