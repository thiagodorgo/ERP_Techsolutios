import { createFinancialItemParsers, roundMoney } from "../tariffs/financial-item.shape.js";
import {
  FINANCIAL_ENTRY_DIRECTIONS,
  FINANCIAL_ENTRY_DIVERGENCE_TYPES,
  FINANCIAL_ENTRY_PAYMENT_METHODS,
  FinancialEntryError,
} from "./financial-entry.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DIRECTION_ALLOWLIST = new Set<string>(FINANCIAL_ENTRY_DIRECTIONS);
const PAYMENT_METHOD_ALLOWLIST = new Set<string>(FINANCIAL_ENTRY_PAYMENT_METHODS);
const DIVERGENCE_TYPE_ALLOWLIST = new Set<string>(FINANCIAL_ENTRY_DIVERGENCE_TYPES);

// Máquina monetária COMPARTILHADA (mesma de Conta/Título/Orçamento): roundMoney (2 casas) +
// assertMoneyInRange (estoura Decimal(12,2) → 422 amount_overflow). Error-factory DESTE módulo.
const moneyParsers = createFinancialItemParsers(
  {
    invalid: (reason, message) => new FinancialEntryError(400, "FINANCIAL_ENTRY_INVALID", reason, message),
    unprocessable: (reason, message) => new FinancialEntryError(422, "FINANCIAL_ENTRY_UNPROCESSABLE", reason, message),
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
    throw new FinancialEntryError(400, "FINANCIAL_ENTRY_INVALID", `invalid_${field}`, `${field} must be at most ${maxLength} characters.`);
  }
  return normalized;
}

export function parseOptionalCategory(value: unknown): string | undefined {
  return parseOptionalBounded(value, "category", 80);
}

export function parseOptionalDescription(value: unknown): string | undefined {
  return parseOptionalBounded(value, "description", 2000);
}

// direction OBRIGATÓRIO ∈ {in,out}. Ausente ou fora da allowlist → 400 invalid_direction.
export function parseDirection(value: unknown): string {
  const normalized = optionalString(value)?.toLowerCase();
  if (normalized === undefined || !DIRECTION_ALLOWLIST.has(normalized)) {
    throw new FinancialEntryError(400, "FINANCIAL_ENTRY_INVALID", "invalid_direction", "direction must be one of in, out.");
  }
  return normalized;
}

// payment_method OBRIGATÓRIO ∈ {cash,pix,boleto,card,transfer,check}. Ausente/fora → 400.
export function parsePaymentMethod(value: unknown): string {
  const normalized = optionalString(value)?.toLowerCase();
  if (normalized === undefined || !PAYMENT_METHOD_ALLOWLIST.has(normalized)) {
    throw new FinancialEntryError(
      400,
      "FINANCIAL_ENTRY_INVALID",
      "invalid_payment_method",
      "payment_method must be one of cash, pix, boleto, card, transfer, check.",
    );
  }
  return normalized;
}

// amount ESTRITAMENTE > 0. Ausente/NaN/<= 0 → 400 invalid_amount; estoura Decimal(12,2) → 422 amount_overflow.
export function parseAmount(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    throw new FinancialEntryError(400, "FINANCIAL_ENTRY_INVALID", "invalid_amount", "amount must be a number greater than zero.");
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new FinancialEntryError(400, "FINANCIAL_ENTRY_INVALID", "invalid_amount", "amount must be a number greater than zero.");
  }
  const rounded = roundMoney(parsed);
  if (rounded <= 0) {
    throw new FinancialEntryError(400, "FINANCIAL_ENTRY_INVALID", "invalid_amount", "amount must be a number greater than zero.");
  }
  // assertMoneyInRange cobre o estouro do Decimal(12,2) → 422 amount_overflow (o piso já foi tratado acima).
  return assertMoneyInRange(rounded, "amount");
}

// currency = moeda da CONTA. Body opcional: ausente → herda a moeda da conta; presente → precisa BATER com
// a conta (senão 422 currency_mismatch). Formato inválido (não 3 letras) → 400 invalid_currency.
export function resolveCurrency(value: unknown, accountCurrency: string): string {
  const normalized = optionalString(value);
  if (normalized === undefined) return accountCurrency;
  if (!/^[A-Za-z]{3}$/.test(normalized)) {
    throw new FinancialEntryError(400, "FINANCIAL_ENTRY_INVALID", "invalid_currency", "currency must be a 3-letter ISO code.");
  }
  const upper = normalized.toUpperCase();
  if (upper !== accountCurrency) {
    throw new FinancialEntryError(422, "FINANCIAL_ENTRY_UNPROCESSABLE", "currency_mismatch", "currency must match the account currency.");
  }
  return upper;
}

// occurred_at OPCIONAL; default = server now. Base da competencia (nunca vem do corpo).
export function parseOccurredAt(value: unknown): Date {
  if (value === undefined || value === null || value === "") return new Date();
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new FinancialEntryError(400, "FINANCIAL_ENTRY_INVALID", "invalid_occurred_at", "occurred_at must be a valid ISO date.");
  }
  return date;
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = optionalString(value);
  if (normalized === undefined) {
    throw new FinancialEntryError(400, "FINANCIAL_ENTRY_INVALID", "required_field", `${field} is required.`);
  }
  if (!uuidPattern.test(normalized)) {
    throw new FinancialEntryError(400, "FINANCIAL_ENTRY_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

// token opaco de idempotência do cliente — sanidade de tamanho (a idempotência real é o índice parcial).
export function parseOptionalClientActionId(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (normalized.length > 120) {
    throw new FinancialEntryError(400, "FINANCIAL_ENTRY_INVALID", "invalid_client_action_id", "clientActionId must be at most 120 characters.");
  }
  return normalized;
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new FinancialEntryError(400, "FINANCIAL_ENTRY_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }
  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new FinancialEntryError(400, "FINANCIAL_ENTRY_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }
  return parsed;
}

// Filtros são LENIENTES (não são entrada de escrita): valor desconhecido simplesmente não casa.
export function parseFilterToken(value: unknown): string | undefined {
  return optionalString(value)?.toLowerCase();
}

export function parseOptionalFilterUuid(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined || !uuidPattern.test(normalized)) return undefined;
  return normalized;
}

// Filtro de data (from/to do occurred_at) — LENIENTE: data inválida vira undefined (não 400).
export function parseOptionalFilterDate(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function readOptionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new FinancialEntryError(400, "FINANCIAL_ENTRY_INVALID", "invalid_boolean", `${field} must be a boolean.`);
}

// reconciled OBRIGATÓRIO e ESTRITO no write-path do reconcile. Ausente/não-boolean → 400 invalid_reconciled.
export function parseReconciledFlag(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new FinancialEntryError(400, "FINANCIAL_ENTRY_INVALID", "invalid_reconciled", "reconciled must be a boolean.");
}

// divergence_type OPCIONAL ∈ {value,date}. Ausente/vazio → undefined (conciliação LIMPA, sem ressalva).
// Fora da allowlist → 400 invalid_divergence_type.
export function parseOptionalDivergenceType(value: unknown): string | undefined {
  const normalized = optionalString(value)?.toLowerCase();
  if (normalized === undefined) return undefined;
  if (!DIVERGENCE_TYPE_ALLOWLIST.has(normalized)) {
    throw new FinancialEntryError(400, "FINANCIAL_ENTRY_INVALID", "invalid_divergence_type", "divergence_type must be one of value, date.");
  }
  return normalized;
}

export function parseOptionalReconciliationRef(value: unknown): string | undefined {
  return parseOptionalBounded(value, "reconciliation_ref", 200);
}

// Filtro de conciliação (?reconciled=) — LENIENTE: valor desconhecido vira undefined (não 400). Diferente de
// readOptionalBoolean (estrito, serve o write-path include_deleted).
export function parseOptionalFilterBoolean(value: unknown): boolean | undefined {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return undefined;
}
