import {
  SPOT_STATUSES,
  VEHICLE_CLASSES,
  YARD_AREA_KINDS,
  YardError,
  type SpotStatus,
  type VehicleClass,
  type YardAreaKind,
} from "./yard.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertNonEmptyString(value: unknown, field: string, maxLength = 160): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new YardError(400, "YARD_INVALID", "required_field", `${field} is required.`);
  }
  if (normalized.length > maxLength) {
    throw new YardError(400, "YARD_INVALID", "field_too_long", `${field} must be at most ${maxLength} characters.`);
  }
  return normalized;
}

export function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

export function parseName(value: unknown): string {
  return assertNonEmptyString(value, "name", 160);
}

export function parseOptionalName(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  return parseName(normalized);
}

export function parseAddress(value: unknown): string {
  return assertNonEmptyString(value, "address", 240);
}

export function parseOptionalAddress(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  return parseAddress(normalized);
}

export function parseCode(value: unknown): string {
  return assertNonEmptyString(value, "code", 60);
}

export function parseOptionalCode(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  return parseCode(normalized);
}

export function parseTimezone(value: unknown): string {
  const normalized = optionalString(value);
  if (normalized === undefined) return "America/Sao_Paulo";
  // IANA-ish: letras/dígitos/_/+/-/ separados por "/". Não valida a existência do fuso (o motor de diárias
  // do PR-07 resolve o offset real); só barra lixo óbvio para não sujar a fundação DST-safe.
  if (normalized.length > 60 || !/^[A-Za-z][A-Za-z0-9_+\-/]*$/.test(normalized)) {
    throw new YardError(400, "YARD_INVALID", "invalid_timezone", "timezone must be a valid IANA-like identifier.");
  }
  return normalized;
}

export function parseOptionalTimezone(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  return parseTimezone(normalized);
}

export function parseOptionalCapacityHint(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 1_000_000) {
    throw new YardError(400, "YARD_INVALID", "invalid_capacity_hint", "capacityHint must be an integer between 0 and 1000000.");
  }
  return parsed;
}

export function parseKind(value: unknown): YardAreaKind {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!(YARD_AREA_KINDS as readonly string[]).includes(normalized)) {
    throw new YardError(400, "YARD_INVALID", "invalid_kind", `kind must be one of: ${YARD_AREA_KINDS.join(", ")}.`);
  }
  return normalized as YardAreaKind;
}

export function parseVehicleClass(value: unknown): VehicleClass {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!normalized) return "ANY";
  if (!(VEHICLE_CLASSES as readonly string[]).includes(normalized)) {
    throw new YardError(400, "YARD_INVALID", "invalid_vehicle_class", `vehicleClass must be one of: ${VEHICLE_CLASSES.join(", ")}.`);
  }
  return normalized as VehicleClass;
}

export function parseOptionalVehicleClass(value: unknown): VehicleClass | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  return parseVehicleClass(normalized);
}

// Bloqueio operacional: só FREE⇄BLOCKED via PATCH (OCCUPIED é atingido só pela alocação transacional).
export function parseOperationalStatus(value: unknown): Extract<SpotStatus, "FREE" | "BLOCKED"> | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  const upper = normalized.toUpperCase();
  if (upper !== "FREE" && upper !== "BLOCKED") {
    if ((SPOT_STATUSES as readonly string[]).includes(upper)) {
      throw new YardError(422, "YARD_STATUS_FORBIDDEN", "status_not_operational", "status can only be set to FREE or BLOCKED here; OCCUPIED is reserved for allocation.");
    }
    throw new YardError(400, "YARD_INVALID", "invalid_status", "status must be FREE or BLOCKED.");
  }
  return upper as Extract<SpotStatus, "FREE" | "BLOCKED">;
}

export function readOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new YardError(400, "YARD_INVALID", "invalid_boolean", "boolean field must be true or false.");
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = assertNonEmptyString(value, field);
  if (!uuidPattern.test(normalized)) {
    throw new YardError(400, "YARD_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export function parseOptionalUuid(value: unknown, field: string): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (!uuidPattern.test(normalized)) {
    throw new YardError(400, "YARD_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

// Nullable UUID para PATCH (permite desassociar branch com null explícito).
export function parseNullableUuid(value: unknown, field: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return parseRequiredUuid(value, field);
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new YardError(400, "YARD_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }
  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new YardError(400, "YARD_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }
  return parsed;
}

export function parseOptionalSearch(value: unknown): string | undefined {
  const search = optionalString(value);
  if (!search) return undefined;
  return search.slice(0, 120);
}
