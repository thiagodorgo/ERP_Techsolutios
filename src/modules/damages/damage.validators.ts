import {
  DAMAGE_GRAVIDADES,
  DAMAGE_STATUSES,
  DamageError,
  type DamageGravidade,
  type DamageStatus,
} from "./damage.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * R5.1 — restricted, strictly linear state machine (mirrors the insurance / fines
 * table-driven guards). Only the transitions listed here are legal; `resolvido`
 * is terminal. A no-op (from === to) is tolerated so idempotent PATCHes never
 * fail. Any other transition is a 422 (`invalid_status_transition`).
 */
export const DAMAGE_STATUS_TRANSITIONS: Readonly<Record<DamageStatus, readonly DamageStatus[]>> = {
  registrado: ["em_tratativa"],
  em_tratativa: ["resolvido"],
  resolvido: [],
};

export function assertDamageStatusTransition(from: DamageStatus, to: DamageStatus): void {
  if (from === to) return;
  if (DAMAGE_STATUS_TRANSITIONS[from].includes(to)) return;

  throw new DamageError(
    422,
    "DAMAGE_INVALID",
    "invalid_status_transition",
    `Transição de dano inválida: de "${from}" para "${to}".`,
  );
}

export function assertNonEmptyString(value: unknown, field: string, maxLength = 5000): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw new DamageError(400, "DAMAGE_INVALID", "required_field", `${field} is required.`);
  }

  if (normalized.length > maxLength) {
    throw new DamageError(400, "DAMAGE_INVALID", "field_too_long", `${field} must be at most ${maxLength} characters.`);
  }

  return normalized;
}

export function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";

  return normalized || undefined;
}

export function parseDescricao(value: unknown): string {
  return assertNonEmptyString(value, "descricao", 5000);
}

export function parseOptionalDescricao(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseDescricao(value);
}

export function parseGravidade(value: unknown): DamageGravidade {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if ((DAMAGE_GRAVIDADES as readonly string[]).includes(normalized)) {
    return normalized as DamageGravidade;
  }

  throw new DamageError(
    400,
    "DAMAGE_INVALID",
    normalized ? "invalid_gravidade" : "required_field",
    `gravidade must be one of: ${DAMAGE_GRAVIDADES.join(", ")}.`,
  );
}

export function parseOptionalGravidade(value: unknown): DamageGravidade | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseGravidade(value);
}

export function parseDamageStatus(value: unknown): DamageStatus {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if ((DAMAGE_STATUSES as readonly string[]).includes(normalized)) {
    return normalized as DamageStatus;
  }

  throw new DamageError(
    400,
    "DAMAGE_INVALID",
    "invalid_status",
    `status must be one of: ${DAMAGE_STATUSES.join(", ")}.`,
  );
}

export function parseOptionalDamageStatus(value: unknown): DamageStatus | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseDamageStatus(value);
}

export function parseCusto(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new DamageError(400, "DAMAGE_INVALID", `invalid_${field}`, `${field} must be a number.`);
  }
  if (parsed < 0) {
    throw new DamageError(400, "DAMAGE_INVALID", `invalid_${field}`, `${field} must be greater than or equal to zero.`);
  }

  return parsed;
}

export function parseRequiredDate(value: unknown, field: string): Date {
  if (value === undefined || value === null || value === "") {
    throw new DamageError(400, "DAMAGE_INVALID", "required_field", `${field} is required.`);
  }
  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new DamageError(400, "DAMAGE_INVALID", "invalid_date", `${field} must be a valid ISO date.`);
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

  throw new DamageError(400, "DAMAGE_INVALID", "invalid_boolean", "isActive must be a boolean.");
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = assertNonEmptyString(value, field, 160);

  if (!uuidPattern.test(normalized)) {
    throw new DamageError(400, "DAMAGE_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
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
    throw new DamageError(400, "DAMAGE_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }

  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new DamageError(400, "DAMAGE_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }

  return parsed;
}

export function parseOptionalSearch(value: unknown): string | undefined {
  const search = optionalString(value);
  if (!search) return undefined;

  return search.slice(0, 120);
}
