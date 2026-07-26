import { PriceTableError, type PriceTableStatus, TARIFF_SCOPES, type TariffScope } from "./price-table.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUSES: readonly PriceTableStatus[] = ["draft", "published", "archived"];

export function assertNonEmptyString(value: unknown, field: string, maxLength = 160): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new PriceTableError(400, "PRICE_TABLE_INVALID", "required_field", `${field} is required.`);
  }
  if (normalized.length > maxLength) {
    throw new PriceTableError(400, "PRICE_TABLE_INVALID", "field_too_long", `${field} must be at most ${maxLength} characters.`);
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

export function parseOptionalDescription(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (normalized.length > 2000) {
    throw new PriceTableError(400, "PRICE_TABLE_INVALID", "invalid_description", "description must be at most 2000 characters.");
  }
  return normalized;
}

export function parseCurrency(value: unknown): string {
  const normalized = optionalString(value);
  if (normalized === undefined) return "BRL";
  if (!/^[A-Za-z]{3}$/.test(normalized)) {
    throw new PriceTableError(400, "PRICE_TABLE_INVALID", "invalid_currency", "currency must be a 3-letter ISO code.");
  }
  return normalized.toUpperCase();
}

export function parseOptionalVersion(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100000) {
    throw new PriceTableError(400, "PRICE_TABLE_INVALID", "invalid_version", "version must be an integer between 1 and 100000.");
  }
  return parsed;
}

export function parseOptionalDate(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new PriceTableError(400, "PRICE_TABLE_INVALID", `invalid_${field}`, `${field} must be a valid date.`);
  }
  return date;
}

export function parseOptionalStatus(value: unknown): PriceTableStatus | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (!STATUSES.includes(normalized as PriceTableStatus)) {
    throw new PriceTableError(400, "PRICE_TABLE_INVALID", "invalid_status", `status must be one of: ${STATUSES.join(", ")}.`);
  }
  return normalized as PriceTableStatus;
}

// Ω5P PR-03 (D-Ω5P-TAR-02) — scope app-validado no MESMO enum de JurisdictionProfile.scope. Ausente = NULL
// (curinga). Inválido → 400. Belt-and-suspenders com a coluna nullable (sem enum-CHECK no banco, padrão FASE0).
export function parseOptionalScope(value: unknown): TariffScope | undefined {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!normalized) return undefined;
  if (!TARIFF_SCOPES.includes(normalized as TariffScope)) {
    throw new PriceTableError(400, "PRICE_TABLE_INVALID", "invalid_scope", `scope must be one of: ${TARIFF_SCOPES.join(", ")}.`);
  }
  return normalized as TariffScope;
}

// Ω5P PR-03 (D-Ω5P-TAR-05) — vehicle_category é app-code parametrizado por perfil (o catálogo por
// JurisdictionProfile é deferido, FASE0 §5e): validado app-level SEM hardcode/enum-CHECK. Normaliza para
// app-code (letras/dígitos/_), máx. 40. Ausente = NULL (curinga vale-para-todas-as-categorias).
export function parseOptionalVehicleCategory(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!normalized) return undefined;
  if (normalized.length > 40) {
    throw new PriceTableError(400, "PRICE_TABLE_INVALID", "invalid_vehicle_category", "vehicleCategory must be at most 40 characters.");
  }
  if (!/^[A-Z0-9_]+$/.test(normalized)) {
    throw new PriceTableError(400, "PRICE_TABLE_INVALID", "invalid_vehicle_category", "vehicleCategory must contain only letters, digits and underscore.");
  }
  return normalized;
}

export function readOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new PriceTableError(400, "PRICE_TABLE_INVALID", "invalid_boolean", "isActive must be a boolean.");
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = assertNonEmptyString(value, field);
  if (!uuidPattern.test(normalized)) {
    throw new PriceTableError(400, "PRICE_TABLE_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new PriceTableError(400, "PRICE_TABLE_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }
  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new PriceTableError(400, "PRICE_TABLE_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }
  return parsed;
}

export function parseOptionalSearch(value: unknown): string | undefined {
  const search = optionalString(value);
  if (!search) return undefined;
  return search.slice(0, 120);
}
