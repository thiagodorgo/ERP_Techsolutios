import { SupplierError } from "./supplier.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Formato básico de e-mail (uma checagem estrutural, não RFC completa).
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function assertNonEmptyString(value: unknown, field: string, maxLength = 160): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new SupplierError(400, "SUPPLIER_INVALID", "required_field", `${field} is required.`);
  }
  if (normalized.length > maxLength) {
    throw new SupplierError(400, "SUPPLIER_INVALID", "field_too_long", `${field} must be at most ${maxLength} characters.`);
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

function parseOptionalBounded(value: unknown, field: string, maxLength: number): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (normalized.length > maxLength) {
    throw new SupplierError(400, "SUPPLIER_INVALID", `invalid_${field}`, `${field} must be at most ${maxLength} characters.`);
  }
  return normalized;
}

export function parseOptionalDocument(value: unknown): string | undefined {
  return parseOptionalBounded(value, "document", 20);
}

export function parseOptionalEmail(value: unknown): string | undefined {
  const normalized = parseOptionalBounded(value, "email", 160);
  if (normalized === undefined) return undefined;
  if (!emailPattern.test(normalized)) {
    throw new SupplierError(400, "SUPPLIER_INVALID", "invalid_email", "email must be a valid email address.");
  }
  return normalized.toLowerCase();
}

export function parseOptionalPhone(value: unknown): string | undefined {
  return parseOptionalBounded(value, "phone", 40);
}

export function parseOptionalAddress(value: unknown): string | undefined {
  return parseOptionalBounded(value, "address", 300);
}

export function parseOptionalCategory(value: unknown): string | undefined {
  return parseOptionalBounded(value, "category", 80);
}

export function parseOptionalNotes(value: unknown): string | undefined {
  return parseOptionalBounded(value, "notes", 2000);
}

// Status é texto livre curto (≤40); default "active". Soft-delete usa is_active=false.
export function parseOptionalStatus(value: unknown): string | undefined {
  return parseOptionalBounded(value, "status", 40);
}

export function readOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new SupplierError(400, "SUPPLIER_INVALID", "invalid_boolean", "isActive must be a boolean.");
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = assertNonEmptyString(value, field);
  if (!uuidPattern.test(normalized)) {
    throw new SupplierError(400, "SUPPLIER_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new SupplierError(400, "SUPPLIER_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }
  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new SupplierError(400, "SUPPLIER_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }
  return parsed;
}

export function parseOptionalSearch(value: unknown): string | undefined {
  const search = optionalString(value);
  if (!search) return undefined;
  return search.slice(0, 120);
}
