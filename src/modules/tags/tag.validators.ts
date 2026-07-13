import { TagError } from "./tag.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Cor hex #RRGGBB (ex.: "#22c55e"). Só validada quando informada.
const colorPattern = /^#[0-9a-fA-F]{6}$/;

export function assertNonEmptyString(value: unknown, field: string, maxLength = 80): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new TagError(400, "TAG_INVALID", "required_field", `${field} is required.`);
  }
  if (normalized.length > maxLength) {
    throw new TagError(400, "TAG_INVALID", "field_too_long", `${field} must be at most ${maxLength} characters.`);
  }
  return normalized;
}

export function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

export function parseName(value: unknown): string {
  return assertNonEmptyString(value, "name", 80);
}

export function parseOptionalColor(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (normalized.length > 20) {
    throw new TagError(400, "TAG_INVALID", "invalid_color", "color must be at most 20 characters.");
  }
  if (!colorPattern.test(normalized)) {
    throw new TagError(400, "TAG_INVALID", "invalid_color", "color must be a hex value like #22c55e.");
  }
  return normalized;
}

export function parseOptionalDescription(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (normalized.length > 500) {
    throw new TagError(400, "TAG_INVALID", "invalid_description", "description must be at most 500 characters.");
  }
  return normalized;
}

export function readOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new TagError(400, "TAG_INVALID", "invalid_boolean", "isActive must be a boolean.");
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = assertNonEmptyString(value, field);
  if (!uuidPattern.test(normalized)) {
    throw new TagError(400, "TAG_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new TagError(400, "TAG_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }
  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new TagError(400, "TAG_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }
  return parsed;
}

export function parseOptionalSearch(value: unknown): string | undefined {
  const search = optionalString(value);
  if (!search) return undefined;
  return search.slice(0, 120);
}
