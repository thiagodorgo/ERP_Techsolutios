import { OperatorProfileError } from "./operator-profile.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertNonEmptyString(value: unknown, field: string, maxLength = 160): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new OperatorProfileError(400, "OPERATOR_PROFILE_INVALID", "required_field", `${field} is required.`);
  }
  if (normalized.length > maxLength) {
    throw new OperatorProfileError(400, "OPERATOR_PROFILE_INVALID", "field_too_long", `${field} must be at most ${maxLength} characters.`);
  }
  return normalized;
}

export function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

function parseOptionalBounded(value: unknown, field: string, maxLength: number): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (normalized.length > maxLength) {
    throw new OperatorProfileError(400, "OPERATOR_PROFILE_INVALID", `invalid_${field}`, `${field} must be at most ${maxLength} characters.`);
  }
  return normalized;
}

// Nome profissional opcional (o User já carrega o nome básico).
export function parseOptionalFullName(value: unknown): string | undefined {
  return parseOptionalBounded(value, "full_name", 160);
}

export function parseOptionalCnhNumber(value: unknown): string | undefined {
  return parseOptionalBounded(value, "cnh_number", 20);
}

// Categoria de CNH (ex.: "AB", "D", "E") — texto curto normalizado em maiúsculas.
export function parseOptionalCnhCategory(value: unknown): string | undefined {
  const normalized = parseOptionalBounded(value, "cnh_category", 5);
  return normalized?.toUpperCase();
}

export function parseOptionalPhone(value: unknown): string | undefined {
  return parseOptionalBounded(value, "phone", 40);
}

export function parseOptionalNotes(value: unknown): string | undefined {
  return parseOptionalBounded(value, "notes", 2000);
}

// Datas apenas armazenadas (o selo de "CNH vencida" é do frontend): datas passadas são aceitas.
export function parseOptionalDate(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new OperatorProfileError(400, "OPERATOR_PROFILE_INVALID", `invalid_${field}`, `${field} must be a valid date.`);
  }
  return date;
}

export function readOptionalBoolean(value: unknown, field = "isActive"): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new OperatorProfileError(400, "OPERATOR_PROFILE_INVALID", "invalid_boolean", `${field} must be a boolean.`);
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = assertNonEmptyString(value, field);
  if (!uuidPattern.test(normalized)) {
    throw new OperatorProfileError(400, "OPERATOR_PROFILE_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new OperatorProfileError(400, "OPERATOR_PROFILE_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }
  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new OperatorProfileError(400, "OPERATOR_PROFILE_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }
  return parsed;
}

export function parseOptionalSearch(value: unknown): string | undefined {
  const search = optionalString(value);
  if (!search) return undefined;
  return search.slice(0, 120);
}
