import { ServiceCatalogError } from "./service-catalog.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertNonEmptyString(value: unknown, field: string, maxLength = 160): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw new ServiceCatalogError(400, "SERVICE_CATALOG_INVALID", "required_field", `${field} is required.`);
  }

  if (normalized.length > maxLength) {
    throw new ServiceCatalogError(400, "SERVICE_CATALOG_INVALID", "field_too_long", `${field} must be at most ${maxLength} characters.`);
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
    throw new ServiceCatalogError(400, "SERVICE_CATALOG_INVALID", `invalid_${field}`, `${field} must be between ${min} and ${max} characters.`);
  }

  return normalized;
}

export function parseName(value: unknown): string {
  return assertNonEmptyString(value, "name", 160);
}

export function parseOptionalCategory(value: unknown): string | undefined {
  return boundedOptionalString(value, "category", 0, 80);
}

export function parseOptionalDescription(value: unknown): string | undefined {
  return boundedOptionalString(value, "description", 0, 2000);
}

export function parseOptionalStatus(value: unknown): string | undefined {
  return boundedOptionalString(value, "status", 0, 40);
}

export function parseOptionalDurationMinutes(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100000) {
    throw new ServiceCatalogError(400, "SERVICE_CATALOG_INVALID", "invalid_estimated_duration_minutes", "estimatedDurationMinutes must be an integer between 0 and 100000.");
  }

  return parsed;
}

export function parseOptionalBasePrice(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  const parsed = typeof value === "number" ? value : Number(String(value).trim());

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ServiceCatalogError(400, "SERVICE_CATALOG_INVALID", "invalid_base_price", "basePrice must be a number greater than or equal to zero.");
  }

  return Math.round(parsed * 100) / 100;
}

export function readOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;

  throw new ServiceCatalogError(400, "SERVICE_CATALOG_INVALID", "invalid_boolean", "isActive must be a boolean.");
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = assertNonEmptyString(value, field);

  if (!uuidPattern.test(normalized)) {
    throw new ServiceCatalogError(400, "SERVICE_CATALOG_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
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
    throw new ServiceCatalogError(400, "SERVICE_CATALOG_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }

  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ServiceCatalogError(400, "SERVICE_CATALOG_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }

  return parsed;
}

export function parseOptionalSearch(value: unknown): string | undefined {
  const search = optionalString(value);
  if (!search) return undefined;

  return search.slice(0, 120);
}
