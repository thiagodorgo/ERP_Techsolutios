import {
  FUEL_TYPES,
  FuelLogError,
  STATION_TYPES,
  type FuelType,
  type StationType,
} from "./fuel-log.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertNonEmptyString(value: unknown, field: string, maxLength = 160): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw new FuelLogError(400, "FUEL_LOG_INVALID", "required_field", `${field} is required.`);
  }

  if (normalized.length > maxLength) {
    throw new FuelLogError(400, "FUEL_LOG_INVALID", "field_too_long", `${field} must be at most ${maxLength} characters.`);
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
    throw new FuelLogError(400, "FUEL_LOG_INVALID", `invalid_${field}`, `${field} must be between ${min} and ${max} characters.`);
  }

  return normalized;
}

export function parseOptionalStation(value: unknown): string | undefined {
  return boundedOptionalString(value, "station", 0, 160);
}

export function parseOptionalNotes(value: unknown): string | undefined {
  return boundedOptionalString(value, "notes", 0, 2000);
}

export function parseFuelType(value: unknown, fallback: FuelType | undefined): FuelType {
  if (value === undefined || value === null || value === "") {
    if (fallback === undefined) {
      throw new FuelLogError(400, "FUEL_LOG_INVALID", "required_field", "fuel_type is required.");
    }
    return fallback;
  }

  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (FUEL_TYPES.includes(normalized as FuelType)) {
    return normalized as FuelType;
  }

  throw new FuelLogError(
    400,
    "FUEL_LOG_INVALID",
    "invalid_fuel_type",
    `fuel_type must be one of: ${FUEL_TYPES.join(", ")}.`,
  );
}

export function parseOptionalFuelType(value: unknown): FuelType | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseFuelType(value, undefined);
}

/**
 * Ω4C PR-05 — enum-app do posto (internal|external), SEM CHECK no banco (validado aqui). Sem valor no
 * corpo → cai no `fallback` (default external, compat). Termo inválido → 400 invalid_station_type.
 */
export function parseStationType(value: unknown, fallback: StationType | undefined): StationType {
  if (value === undefined || value === null || value === "") {
    if (fallback === undefined) {
      throw new FuelLogError(400, "FUEL_LOG_INVALID", "required_field", "station_type is required.");
    }
    return fallback;
  }

  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (STATION_TYPES.includes(normalized as StationType)) {
    return normalized as StationType;
  }

  throw new FuelLogError(
    400,
    "FUEL_LOG_INVALID",
    "invalid_station_type",
    `station_type must be one of: ${STATION_TYPES.join(", ")}.`,
  );
}

export function parseOptionalStationType(value: unknown): StationType | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseStationType(value, undefined);
}

function parseNumber(value: unknown, field: string): number {
  if (value === undefined || value === null || value === "") {
    throw new FuelLogError(400, "FUEL_LOG_INVALID", "required_field", `${field} is required.`);
  }
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new FuelLogError(400, "FUEL_LOG_INVALID", `invalid_${field}`, `${field} must be a number.`);
  }

  return parsed;
}

export function parseLiters(value: unknown): number {
  const parsed = parseNumber(value, "liters");

  if (parsed <= 0) {
    throw new FuelLogError(400, "FUEL_LOG_INVALID", "invalid_liters", "liters must be greater than zero.");
  }

  return parsed;
}

export function parseOptionalLiters(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseLiters(value);
}

export function parseTotalValue(value: unknown): number {
  const parsed = parseNumber(value, "total_value");

  if (parsed < 0) {
    throw new FuelLogError(400, "FUEL_LOG_INVALID", "invalid_total_value", "total_value must be greater than or equal to zero.");
  }

  return parsed;
}

export function parseOptionalTotalValue(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseTotalValue(value);
}

export function parseOdometer(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    throw new FuelLogError(400, "FUEL_LOG_INVALID", "required_field", "odometer is required.");
  }
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new FuelLogError(400, "FUEL_LOG_INVALID", "invalid_odometer", "odometer must be a non-negative integer.");
  }

  return parsed;
}

export function parseOptionalOdometer(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseOdometer(value);
}

export function parseFueledAt(value: unknown): Date {
  if (value === undefined || value === null || value === "") {
    return new Date();
  }

  return parseRequiredDate(value, "fueled_at");
}

export function parseRequiredDate(value: unknown, field: string): Date {
  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new FuelLogError(400, "FUEL_LOG_INVALID", "invalid_date", `${field} must be a valid ISO date.`);
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

  throw new FuelLogError(400, "FUEL_LOG_INVALID", "invalid_boolean", "isActive must be a boolean.");
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = assertNonEmptyString(value, field);

  if (!uuidPattern.test(normalized)) {
    throw new FuelLogError(400, "FUEL_LOG_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
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
    throw new FuelLogError(400, "FUEL_LOG_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }

  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new FuelLogError(400, "FUEL_LOG_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }

  return parsed;
}

export function parseOptionalSearch(value: unknown): string | undefined {
  const search = optionalString(value);
  if (!search) return undefined;

  return search.slice(0, 120);
}
