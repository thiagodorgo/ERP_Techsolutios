import { PoiError } from "./poi.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertNonEmptyString(value: unknown, field: string, maxLength = 160): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new PoiError(400, "POI_INVALID", "required_field", `${field} is required.`);
  }
  if (normalized.length > maxLength) {
    throw new PoiError(400, "POI_INVALID", "field_too_long", `${field} must be at most ${maxLength} characters.`);
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
    throw new PoiError(400, "POI_INVALID", `invalid_${field}`, `${field} must be at most ${maxLength} characters.`);
  }
  return normalized;
}

export function parseOptionalCategory(value: unknown): string | undefined {
  return parseOptionalBounded(value, "category", 80);
}

export function parseOptionalAddress(value: unknown): string | undefined {
  return parseOptionalBounded(value, "address", 300);
}

// Ω1 — coordenada = número finito dentro da faixa (|lat|<=90, |lng|<=180). O sentinela 0/0 é
// rejeitado pelo par completo em assertValidCoordinate (um eixo isolado em 0 é legítimo).
function parseCoordinateInRange(value: unknown, field: string, bound: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || Math.abs(parsed) > bound) {
    throw new PoiError(400, "POI_INVALID", "invalid_coordinate", `${field} must be a finite number within ±${bound}.`);
  }
  return parsed;
}

export function parseRequiredLatitude(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    throw new PoiError(400, "POI_INVALID", "required_field", "latitude is required.");
  }
  return parseCoordinateInRange(value, "latitude", 90);
}

export function parseRequiredLongitude(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    throw new PoiError(400, "POI_INVALID", "required_field", "longitude is required.");
  }
  return parseCoordinateInRange(value, "longitude", 180);
}

export function parseOptionalLatitude(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseCoordinateInRange(value, "latitude", 90);
}

export function parseOptionalLongitude(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseCoordinateInRange(value, "longitude", 180);
}

// Ω1b-2 — mesmo predicado do mapa: coordenada válida = número finito, dentro da faixa e não-sentinela 0/0.
export function hasValidCoordinate(latitude: number | undefined, longitude: number | undefined): boolean {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

export function assertValidCoordinate(latitude: number, longitude: number): void {
  if (!hasValidCoordinate(latitude, longitude)) {
    throw new PoiError(400, "POI_INVALID", "invalid_coordinate", "latitude/longitude must be a valid, non-sentinel coordinate.");
  }
}

export function readOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new PoiError(400, "POI_INVALID", "invalid_boolean", "isActive must be a boolean.");
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = assertNonEmptyString(value, field);
  if (!uuidPattern.test(normalized)) {
    throw new PoiError(400, "POI_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new PoiError(400, "POI_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }
  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new PoiError(400, "POI_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }
  return parsed;
}

export function parseOptionalSearch(value: unknown): string | undefined {
  const search = optionalString(value);
  if (!search) return undefined;
  return search.slice(0, 120);
}
