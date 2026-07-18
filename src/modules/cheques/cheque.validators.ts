import { parseBusinessDate } from "../../config/business-time.js";
import { createFinancialItemParsers, roundMoney } from "../tariffs/financial-item.shape.js";
import { CHEQUE_DIRECTIONS, ChequeError } from "./cheque.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DIRECTION_ALLOWLIST = new Set<string>(CHEQUE_DIRECTIONS);

// Máquina monetária COMPARTILHADA (mesma de Conta/Título/Lançamento): roundMoney (2 casas) +
// assertMoneyInRange (estoura Decimal(12,2) → 422 amount_overflow). O amount do cheque usa a MESMA faixa do
// lançamento → um cheque registrado é SEMPRE compensável (o create do lançamento não recusará amount_overflow).
const moneyParsers = createFinancialItemParsers(
  {
    invalid: (reason, message) => new ChequeError(400, "CHEQUE_INVALID", reason, message),
    unprocessable: (reason, message) => new ChequeError(422, "CHEQUE_UNPROCESSABLE", reason, message),
  },
  { overflowReason: "amount_overflow" },
);

export { roundMoney };
export const assertMoneyInRange = moneyParsers.assertMoneyInRange;

export function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

function parseOptionalBounded(value: unknown, field: string, maxLength: number): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (normalized.length > maxLength) {
    throw new ChequeError(400, "CHEQUE_INVALID", `invalid_${field}`, `${field} must be at most ${maxLength} characters.`);
  }
  return normalized;
}

function parseRequiredBounded(value: unknown, field: string, maxLength: number): string {
  const normalized = optionalString(value);
  if (normalized === undefined) {
    throw new ChequeError(400, "CHEQUE_INVALID", "required_field", `${field} is required.`);
  }
  if (normalized.length > maxLength) {
    throw new ChequeError(400, "CHEQUE_INVALID", `invalid_${field}`, `${field} must be at most ${maxLength} characters.`);
  }
  return normalized;
}

// direction OBRIGATÓRIO ∈ {received,issued}. Ausente/fora → 400 invalid_direction.
export function parseDirection(value: unknown): string {
  const normalized = optionalString(value)?.toLowerCase();
  if (normalized === undefined || !DIRECTION_ALLOWLIST.has(normalized)) {
    throw new ChequeError(400, "CHEQUE_INVALID", "invalid_direction", "direction must be one of received, issued.");
  }
  return normalized;
}

export function parseChequeNumber(value: unknown): string {
  return parseRequiredBounded(value, "cheque_number", 40);
}

export function parseBank(value: unknown): string {
  return parseRequiredBounded(value, "bank", 120);
}

export function parseOptionalNotes(value: unknown): string | undefined {
  return parseOptionalBounded(value, "notes", 2000);
}

export function parseOptionalBounceReason(value: unknown): string | undefined {
  return parseOptionalBounded(value, "bounce_reason", 500);
}

// amount ESTRITAMENTE > 0, na faixa Decimal(12,2) do lançamento (garante compensabilidade). Ausente/NaN/<=0 →
// 400 invalid_amount; estoura Decimal(12,2) → 422 amount_overflow. Validado no REGISTRO (não só no clear).
export function parseAmount(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    throw new ChequeError(400, "CHEQUE_INVALID", "invalid_amount", "amount must be a number greater than zero.");
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new ChequeError(400, "CHEQUE_INVALID", "invalid_amount", "amount must be a number greater than zero.");
  }
  const rounded = roundMoney(parsed);
  if (rounded <= 0) {
    throw new ChequeError(400, "CHEQUE_INVALID", "invalid_amount", "amount must be a number greater than zero.");
  }
  return assertMoneyInRange(rounded, "amount");
}

// currency = moeda da CONTA. Body opcional: ausente → herda a moeda da conta; presente → precisa BATER
// (senão 422 currency_mismatch). Formato inválido → 400 invalid_currency.
export function resolveCurrency(value: unknown, accountCurrency: string): string {
  const normalized = optionalString(value);
  if (normalized === undefined) return accountCurrency;
  if (!/^[A-Za-z]{3}$/.test(normalized)) {
    throw new ChequeError(400, "CHEQUE_INVALID", "invalid_currency", "currency must be a 3-letter ISO code.");
  }
  const upper = normalized.toUpperCase();
  if (upper !== accountCurrency) {
    throw new ChequeError(422, "CHEQUE_UNPROCESSABLE", "currency_mismatch", "currency must match the account currency.");
  }
  return upper;
}

// due_date OPCIONAL ("bom para"/pré-datado) — MEMO puro (não entra na competência). date-only vira meia-noite
// BR-local (parseBusinessDate), como occurred_at do lançamento. Inválida → 400 invalid_due_date.
export function parseOptionalDueDate(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const date = parseBusinessDate(value);
  if (Number.isNaN(date.getTime())) {
    throw new ChequeError(400, "CHEQUE_INVALID", "invalid_due_date", "due_date must be a valid ISO date.");
  }
  return date;
}

// PATCH nulável (due_date/notes): distingue "ausente" (não mexe) de null explícito (limpa). '' → null (limpa).
export function parseNullableDueDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return parseOptionalDueDate(value) ?? null;
}

export function parseNullableNotes(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return parseOptionalNotes(value) ?? null;
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = optionalString(value);
  if (normalized === undefined) {
    throw new ChequeError(400, "CHEQUE_INVALID", "required_field", `${field} is required.`);
  }
  if (!uuidPattern.test(normalized)) {
    throw new ChequeError(400, "CHEQUE_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new ChequeError(400, "CHEQUE_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }
  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ChequeError(400, "CHEQUE_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }
  return parsed;
}

// Filtros LENIENTES (não são escrita): valor desconhecido simplesmente não casa.
export function parseFilterToken(value: unknown): string | undefined {
  return optionalString(value)?.toLowerCase();
}

export function parseOptionalFilterUuid(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined || !uuidPattern.test(normalized)) return undefined;
  return normalized;
}

export function readOptionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new ChequeError(400, "CHEQUE_INVALID", "invalid_boolean", `${field} must be a boolean.`);
}
