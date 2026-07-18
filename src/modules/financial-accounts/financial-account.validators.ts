import { createFinancialItemParsers, roundMoney } from "../tariffs/financial-item.shape.js";
import { FinancialAccountError } from "./financial-account.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const KIND_ALLOWLIST = new Set(["cash", "bank", "wallet"]);
// v1 — moeda única. NÃO aceitamos 3 letras quaisquer (diferente do shape compartilhado do
// Financeiro da OS): só BRL. Novas moedas exigem decisão de escopo (câmbio/saldo em outra moeda).
const CURRENCY_ALLOWLIST = new Set(["BRL"]);

// Máquina monetária COMPARTILHADA (mesma de Orçamento/Financeiro da OS): roundMoney (2 casas) +
// assertMoneyInRange (rejeita negativo com 400 invalid_opening_balance; estoura Decimal(12,2) → 422
// opening_balance_overflow). A error-factory abaixo é DESTE módulo.
const moneyParsers = createFinancialItemParsers(
  {
    invalid: (reason, message) => new FinancialAccountError(400, "FINANCIAL_ACCOUNT_INVALID", reason, message),
    unprocessable: (reason, message) => new FinancialAccountError(422, "FINANCIAL_ACCOUNT_UNPROCESSABLE", reason, message),
  },
  { overflowReason: "opening_balance_overflow" },
);

export { roundMoney };
export const assertMoneyInRange = moneyParsers.assertMoneyInRange;

export function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

export function assertNonEmptyString(value: unknown, field: string, maxLength = 160): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new FinancialAccountError(400, "FINANCIAL_ACCOUNT_INVALID", "required_field", `${field} is required.`);
  }
  if (normalized.length > maxLength) {
    throw new FinancialAccountError(400, "FINANCIAL_ACCOUNT_INVALID", "field_too_long", `${field} must be at most ${maxLength} characters.`);
  }
  return normalized;
}

export function parseName(value: unknown): string {
  return assertNonEmptyString(value, "name", 160);
}

function parseOptionalBounded(value: unknown, field: string, maxLength: number): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (normalized.length > maxLength) {
    throw new FinancialAccountError(400, "FINANCIAL_ACCOUNT_INVALID", `invalid_${field}`, `${field} must be at most ${maxLength} characters.`);
  }
  return normalized;
}

export function parseOptionalBankName(value: unknown): string | undefined {
  return parseOptionalBounded(value, "bank_name", 120);
}

export function parseOptionalAgency(value: unknown): string | undefined {
  return parseOptionalBounded(value, "agency", 20);
}

export function parseOptionalAccountNumber(value: unknown): string | undefined {
  return parseOptionalBounded(value, "account_number", 40);
}

export function parseOptionalDocument(value: unknown): string | undefined {
  return parseOptionalBounded(value, "document", 20);
}

export function parseOptionalNotes(value: unknown): string | undefined {
  return parseOptionalBounded(value, "notes", 2000);
}

// kind ∈ {cash,bank,wallet}; default cash. Fora da allowlist → 400 invalid_kind.
export function parseKind(value: unknown): string {
  const normalized = optionalString(value);
  if (normalized === undefined) return "cash";
  const lower = normalized.toLowerCase();
  if (!KIND_ALLOWLIST.has(lower)) {
    throw new FinancialAccountError(400, "FINANCIAL_ACCOUNT_INVALID", "invalid_kind", "kind must be one of cash, bank, wallet.");
  }
  return lower;
}

// currency ∈ {BRL} no v1; default BRL. Qualquer outra moeda → 400 invalid_currency.
export function parseCurrency(value: unknown): string {
  const normalized = optionalString(value);
  if (normalized === undefined) return "BRL";
  const upper = normalized.toUpperCase();
  if (!CURRENCY_ALLOWLIST.has(upper)) {
    throw new FinancialAccountError(400, "FINANCIAL_ACCOUNT_INVALID", "invalid_currency", "currency must be BRL.");
  }
  return upper;
}

// Saldo de ABERTURA ≥ 0 (saldo devedor é lançamento, não abertura). Default 0. Arredonda para 2
// casas e valida a faixa Decimal(12,2). Negativo/NaN → 400 invalid_opening_balance; estouro → 422.
export function parseOpeningBalance(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new FinancialAccountError(400, "FINANCIAL_ACCOUNT_INVALID", "invalid_opening_balance", "openingBalance must be a number greater than or equal to zero.");
  }
  return assertMoneyInRange(roundMoney(parsed), "opening_balance");
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = optionalString(value);
  if (normalized === undefined) {
    throw new FinancialAccountError(400, "FINANCIAL_ACCOUNT_INVALID", "required_field", `${field} is required.`);
  }
  if (!uuidPattern.test(normalized)) {
    throw new FinancialAccountError(400, "FINANCIAL_ACCOUNT_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new FinancialAccountError(400, "FINANCIAL_ACCOUNT_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }
  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new FinancialAccountError(400, "FINANCIAL_ACCOUNT_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }
  return parsed;
}

// Filtro ?kind= — lenient: normaliza e repassa; kind desconhecido simplesmente não casa (lista vazia),
// NÃO 400 (filtro não é entrada de escrita).
export function parseKindFilter(value: unknown): string | undefined {
  return optionalString(value)?.toLowerCase();
}

export function readOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new FinancialAccountError(400, "FINANCIAL_ACCOUNT_INVALID", "invalid_boolean", "includeInactive must be a boolean.");
}
