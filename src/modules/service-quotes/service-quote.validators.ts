import { MONEY_MAX, ServiceQuoteError } from "./service-quote.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

// A1 (crítico) — arredondamento monetário meio-para-cima em 2 casas, aplicado a AMBOS os seams
// (cópia da Tarifa e preço manual) no momento do congelamento. A Tarifa InMemory não arredonda
// (`tariff.validators.parseUnitPrice`) enquanto a Prisma já entrega Decimal(12,2); sem este helper
// no ponto de congelamento, InMemory (10.999) e Prisma (11.00) divergiriam.
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// A3 (crítico) — garante que o valor cabe em Decimal(12,2); acima do teto seria 500 (numeric overflow
// no Postgres). Rejeita como erro de negócio (422) antes de tocar o banco.
export function assertMoneyInRange(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new ServiceQuoteError(400, "SERVICE_QUOTE_INVALID", `invalid_${field}`, `${field} must be a number greater than or equal to zero.`);
  }
  if (value > MONEY_MAX) {
    throw new ServiceQuoteError(422, "SERVICE_QUOTE_UNPROCESSABLE", "quote_total_overflow", `${field} exceeds the maximum monetary value (${MONEY_MAX}).`);
  }
  return value;
}

export function parseUnitPrice(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    throw new ServiceQuoteError(400, "SERVICE_QUOTE_INVALID", "required_unit_price", "unitPrice is required for a manual price source.");
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ServiceQuoteError(400, "SERVICE_QUOTE_INVALID", "invalid_unit_price", "unitPrice must be a number greater than or equal to zero.");
  }
  return parsed;
}

// A4 (crítico) — quantidade estritamente positiva (rejeita 0 e negativo). Default 1 quando ausente.
export function parseQuantity(value: unknown): number {
  if (value === undefined || value === null || value === "") return 1;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new ServiceQuoteError(400, "SERVICE_QUOTE_INVALID", "invalid_quantity", "quantity must be a number greater than zero.");
  }
  return roundMoney(parsed);
}

export function parsePriceSource(value: unknown): "tariff" | "manual" {
  const normalized = optionalString(value);
  if (normalized === undefined) return "tariff";
  if (normalized !== "tariff" && normalized !== "manual") {
    throw new ServiceQuoteError(400, "SERVICE_QUOTE_INVALID", "invalid_price_source", "priceSource must be 'tariff' or 'manual'.");
  }
  return normalized;
}

export function parseCurrency(value: unknown): string {
  const normalized = optionalString(value);
  if (normalized === undefined) return "BRL";
  if (!/^[A-Za-z]{3}$/.test(normalized)) {
    throw new ServiceQuoteError(400, "SERVICE_QUOTE_INVALID", "invalid_currency", "currency must be a 3-letter ISO code.");
  }
  return normalized.toUpperCase();
}

export function parseOptionalNotes(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (normalized.length > 2000) {
    throw new ServiceQuoteError(400, "SERVICE_QUOTE_INVALID", "invalid_notes", "notes must be at most 2000 characters.");
  }
  return normalized;
}

export function parseStatus(value: unknown): string {
  const normalized = optionalString(value);
  if (normalized === undefined) {
    throw new ServiceQuoteError(400, "SERVICE_QUOTE_INVALID", "required_status", "status is required.");
  }
  if (!["approved", "rejected", "void", "draft"].includes(normalized)) {
    throw new ServiceQuoteError(400, "SERVICE_QUOTE_INVALID", "invalid_status", "status must be draft|approved|rejected|void.");
  }
  return normalized;
}

export function readOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new ServiceQuoteError(400, "SERVICE_QUOTE_INVALID", "invalid_boolean", "isActive must be a boolean.");
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = optionalString(value);
  if (normalized === undefined) {
    throw new ServiceQuoteError(400, "SERVICE_QUOTE_INVALID", "required_field", `${field} is required.`);
  }
  if (!uuidPattern.test(normalized)) {
    throw new ServiceQuoteError(400, "SERVICE_QUOTE_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export function parseOptionalUuid(value: unknown, field: string): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (!uuidPattern.test(normalized)) {
    throw new ServiceQuoteError(400, "SERVICE_QUOTE_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new ServiceQuoteError(400, "SERVICE_QUOTE_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }
  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ServiceQuoteError(400, "SERVICE_QUOTE_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }
  return parsed;
}

export function parseOptionalStatusFilter(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  return normalized.slice(0, 40);
}

export function parseOptionalSearch(value: unknown): string | undefined {
  const search = optionalString(value);
  if (!search) return undefined;
  return search.slice(0, 120);
}
