import { createFinancialItemParsers, roundMoney } from "../tariffs/financial-item.shape.js";
import { ServiceQuoteError } from "./service-quote.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

// C3 (Ω3F-3a, junta J-Ω3F-0) — os helpers monetários (roundMoney/assertMoneyInRange/parseUnitPrice/
// parseQuantity/parsePriceSource/parseCurrency) agora vivem no shape COMPARTILHADO
// src/modules/tariffs/financial-item.shape.ts (A1/A3/A4 documentados lá), parametrizados pela
// error-factory deste módulo. Contrato INALTERADO: mesmos reasons/mensagens/status de antes —
// a suíte tests/service-quotes.test.ts prova a paridade.
const moneyParsers = createFinancialItemParsers(
  {
    invalid: (reason, message) => new ServiceQuoteError(400, "SERVICE_QUOTE_INVALID", reason, message),
    unprocessable: (reason, message) => new ServiceQuoteError(422, "SERVICE_QUOTE_UNPROCESSABLE", reason, message),
  },
  { overflowReason: "quote_total_overflow" },
);

export { roundMoney };
export const assertMoneyInRange = moneyParsers.assertMoneyInRange;
export const parseUnitPrice = moneyParsers.parseUnitPrice;
export const parseQuantity = moneyParsers.parseQuantity;
export const parsePriceSource = moneyParsers.parsePriceSource;
export const parseCurrency = moneyParsers.parseCurrency;

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
