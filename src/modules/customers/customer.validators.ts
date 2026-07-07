import { CustomerError } from "./customer.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const documentPattern = /^[0-9./-]+$/;
const phonePattern = /^[0-9+()\s-]+$/;

export function assertNonEmptyString(value: unknown, field: string, maxLength = 160): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw new CustomerError(400, "CUSTOMER_INVALID", "required_field", `${field} is required.`);
  }

  if (normalized.length > maxLength) {
    throw new CustomerError(400, "CUSTOMER_INVALID", "field_too_long", `${field} must be at most ${maxLength} characters.`);
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
    throw new CustomerError(400, "CUSTOMER_INVALID", `invalid_${field}`, `${field} must be between ${min} and ${max} characters.`);
  }

  return normalized;
}

export function parseOptionalDocument(value: unknown): string | undefined {
  const normalized = boundedOptionalString(value, "document", 11, 18);
  if (normalized === undefined) return undefined;

  if (!documentPattern.test(normalized)) {
    throw new CustomerError(400, "CUSTOMER_INVALID", "invalid_document", "document contains invalid characters.");
  }

  return normalized;
}

export function parseOptionalPhone(value: unknown): string | undefined {
  const normalized = boundedOptionalString(value, "phone", 8, 20);
  if (normalized === undefined) return undefined;

  if (!phonePattern.test(normalized)) {
    throw new CustomerError(400, "CUSTOMER_INVALID", "invalid_phone", "phone contains invalid characters.");
  }

  return normalized;
}

export function parseOptionalEmail(value: unknown): string | undefined {
  const normalized = boundedOptionalString(value, "email", 3, 160);
  if (normalized === undefined) return undefined;

  if (!emailPattern.test(normalized)) {
    throw new CustomerError(400, "CUSTOMER_INVALID", "invalid_email", "email is invalid.");
  }

  return normalized;
}

export function parseOptionalAddress(value: unknown): string | undefined {
  return boundedOptionalString(value, "address", 0, 240);
}

export function parseOptionalCity(value: unknown): string | undefined {
  return boundedOptionalString(value, "city", 0, 120);
}

export function parseOptionalState(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;

  if (normalized.length !== 2) {
    throw new CustomerError(400, "CUSTOMER_INVALID", "invalid_state", "state must be a 2-letter code.");
  }

  return normalized;
}

export function parseOptionalZipCode(value: unknown): string | undefined {
  return boundedOptionalString(value, "zip_code", 0, 20);
}

export function parseOptionalNotes(value: unknown): string | undefined {
  return boundedOptionalString(value, "notes", 0, 2000);
}

export function readOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;

  throw new CustomerError(400, "CUSTOMER_INVALID", "invalid_boolean", "isActive must be a boolean.");
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = assertNonEmptyString(value, field);

  if (!uuidPattern.test(normalized)) {
    throw new CustomerError(400, "CUSTOMER_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
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
    throw new CustomerError(400, "CUSTOMER_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }

  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new CustomerError(400, "CUSTOMER_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }

  return parsed;
}

export function parseOptionalSearch(value: unknown): string | undefined {
  const search = optionalString(value);
  if (!search) return undefined;

  return search.slice(0, 120);
}
