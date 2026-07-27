import { CHARGE_KINDS, ChargeError, type ChargeKind } from "./charge.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Dinheiro com sinal (o ADJUSTMENT carrega delta negativo). Até 10 inteiros + 2 decimais (Decimal(12,2)).
const moneyPattern = /^-?\d{1,10}(\.\d{1,2})?$/;
const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

export function parseChargeKind(value: unknown): ChargeKind {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!(CHARGE_KINDS as readonly string[]).includes(normalized)) {
    throw new ChargeError(400, "CHARGE_INVALID", "invalid_kind", `kind must be one of: ${CHARGE_KINDS.join(", ")}.`);
  }
  return normalized as ChargeKind;
}

// kind manual: REMOVAL|ADDITIONAL|ADJUSTMENT — DAILY é PRIVATIVA do motor (nunca criada por HTTP).
export function parseManualChargeKind(value: unknown): Exclude<ChargeKind, "DAILY"> {
  const kind = parseChargeKind(value);
  if (kind === "DAILY") {
    throw new ChargeError(
      422,
      "CHARGE_INVALID",
      "daily_is_engine_only",
      "DAILY charges are produced by the accrual engine only; register REMOVAL/ADDITIONAL/ADJUSTMENT.",
    );
  }
  return kind;
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new ChargeError(400, "CHARGE_INVALID", "required_field", `${field} is required.`);
  }
  if (!uuidPattern.test(normalized)) {
    throw new ChargeError(400, "CHARGE_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export function parseOptionalUuid(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseRequiredUuid(value, field);
}

// Normaliza dinheiro para a string canônica "0.00" (2 casas). allowNegative só p/ o delta do ADJUSTMENT.
export function parseMoney(value: unknown, field: string, allowNegative = false): string {
  const raw = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!raw || !moneyPattern.test(raw)) {
    throw new ChargeError(400, "CHARGE_INVALID", "invalid_amount", `${field} must be a decimal with up to 2 places.`);
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    throw new ChargeError(400, "CHARGE_INVALID", "invalid_amount", `${field} must be a finite decimal.`);
  }
  if (!allowNegative && numeric < 0) {
    throw new ChargeError(400, "CHARGE_INVALID", "negative_amount", `${field} must not be negative.`);
  }
  return toMoneyString(numeric);
}

// Number → "0.00" canônico (2 casas, Decimal(12,2)). Usado p/ tarifa resolvida (number) e para o payload da cadeia.
export function toMoneyString(value: number): string {
  // toFixed(2) evita 0.1+0.2 e normaliza sinal de -0.
  const fixed = (Object.is(value, -0) ? 0 : value).toFixed(2);
  return fixed === "-0.00" ? "0.00" : fixed;
}

// quantity × unitAmount em aritmética de centavos (evita float). Ambos canônicos "0.00".
export function multiplyMoney(quantity: string, unitAmount: string): string {
  const q = Math.round(Number(quantity) * 100);
  const u = Math.round(Number(unitAmount) * 100);
  return toMoneyString((q * u) / 10_000);
}

export function parseOptionalDateOnly(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const raw = typeof value === "string" ? value.trim() : "";
  if (!dateOnlyPattern.test(raw)) {
    throw new ChargeError(400, "CHARGE_INVALID", "invalid_date", `${field} must be an ISO date (YYYY-MM-DD).`);
  }
  const ms = Date.parse(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(ms)) {
    throw new ChargeError(400, "CHARGE_INVALID", "invalid_date", `${field} must be a valid calendar date.`);
  }
  return raw;
}

export function optionalString(value: unknown, maxLength = 500): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return undefined;
  if (normalized.length > maxLength) {
    throw new ChargeError(400, "CHARGE_INVALID", "field_too_long", `field must be at most ${maxLength} characters.`);
  }
  return normalized;
}

export function parseCurrency(value: unknown): string {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!normalized) return "BRL";
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new ChargeError(400, "CHARGE_INVALID", "invalid_currency", "currency must be a 3-letter ISO code.");
  }
  return normalized;
}
