import { TariffError } from "./tariff.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertNonEmptyString(value: unknown, field: string, maxLength = 160): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new TariffError(400, "TARIFF_INVALID", "required_field", `${field} is required.`);
  }
  if (normalized.length > maxLength) {
    throw new TariffError(400, "TARIFF_INVALID", "field_too_long", `${field} must be at most ${maxLength} characters.`);
  }
  return normalized;
}

export function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

export function parseOptionalName(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (normalized.length > 160) {
    throw new TariffError(400, "TARIFF_INVALID", "invalid_name", "name must be at most 160 characters.");
  }
  return normalized;
}

export function parseOrigin(value: unknown): string {
  return assertNonEmptyString(value, "origin", 120);
}

export function parseOptionalOrigin(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  return parseOrigin(normalized);
}

export function parseOptionalRule(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (normalized.length > 2000) {
    throw new TariffError(400, "TARIFF_INVALID", "invalid_rule", "rule must be at most 2000 characters.");
  }
  return normalized;
}

export function parseCurrency(value: unknown): string {
  const normalized = optionalString(value);
  if (normalized === undefined) return "BRL";
  if (!/^[A-Za-z]{3}$/.test(normalized)) {
    throw new TariffError(400, "TARIFF_INVALID", "invalid_currency", "currency must be a 3-letter ISO code.");
  }
  return normalized.toUpperCase();
}

export function parseUnitPrice(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    throw new TariffError(400, "TARIFF_INVALID", "required_field", "unitPrice is required.");
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new TariffError(400, "TARIFF_INVALID", "invalid_unit_price", "unitPrice must be a number greater than or equal to zero.");
  }
  return parsed;
}

export function parseOptionalUnitPrice(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseUnitPrice(value);
}

export function parseOptionalStatus(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (normalized.length > 40) {
    throw new TariffError(400, "TARIFF_INVALID", "invalid_status", "status must be at most 40 characters.");
  }
  return normalized;
}

export function parseOptionalDate(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new TariffError(400, "TARIFF_INVALID", `invalid_${field}`, `${field} must be a valid date.`);
  }
  return date;
}

export function readOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new TariffError(400, "TARIFF_INVALID", "invalid_boolean", "isActive must be a boolean.");
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = assertNonEmptyString(value, field);
  if (!uuidPattern.test(normalized)) {
    throw new TariffError(400, "TARIFF_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export function parseOptionalUuid(value: unknown, field: string): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (!uuidPattern.test(normalized)) {
    throw new TariffError(400, "TARIFF_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new TariffError(400, "TARIFF_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }
  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new TariffError(400, "TARIFF_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }
  return parsed;
}

export function parseOptionalSearch(value: unknown): string | undefined {
  const search = optionalString(value);
  if (!search) return undefined;
  return search.slice(0, 120);
}
