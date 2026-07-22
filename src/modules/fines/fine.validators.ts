import { FINE_STATUSES, FineError, type FineStatus } from "./fine.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * R3.1 — restricted state machine, mirroring field-dispatch / maintenance
 * validators. Only the transitions listed here are legal; `paga` and
 * `cancelada` are terminal. Transition INTO `cancelada` is additionally gated on
 * an admin role at the service layer (403 cancel_requires_admin).
 */
export const FINE_STATUS_TRANSITIONS: Readonly<Record<FineStatus, readonly FineStatus[]>> = {
  recebida: ["em_recurso", "paga", "cancelada"],
  em_recurso: ["deferida", "indeferida", "cancelada"],
  deferida: ["cancelada"],
  indeferida: ["paga", "cancelada"],
  paga: [],
  cancelada: [],
};

/**
 * R3.1 — invalid transition = 422 (clear PT-BR message). A no-op (from === to)
 * is tolerated so idempotent PATCHes never fail.
 */
export function assertFineStatusTransition(from: FineStatus, to: FineStatus): void {
  if (from === to) return;
  if (FINE_STATUS_TRANSITIONS[from].includes(to)) return;

  throw new FineError(
    422,
    "FINE_INVALID",
    "invalid_status_transition",
    `Transição de multa inválida: de "${from}" para "${to}".`,
  );
}

export function assertNonEmptyString(value: unknown, field: string, maxLength = 2000): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw new FineError(400, "FINE_INVALID", "required_field", `${field} is required.`);
  }

  if (normalized.length > maxLength) {
    throw new FineError(400, "FINE_INVALID", "field_too_long", `${field} must be at most ${maxLength} characters.`);
  }

  return normalized;
}

export function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";

  return normalized || undefined;
}

function boundedOptionalString(value: unknown, field: string, min: number, max: number): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;

  if (normalized.length < min || normalized.length > max) {
    throw new FineError(400, "FINE_INVALID", `invalid_${field}`, `${field} must be between ${min} and ${max} characters.`);
  }

  return normalized;
}

export function parseNumeroAuto(value: unknown): string {
  return assertNonEmptyString(value, "numeroAuto", 120);
}

export function parseOptionalNumeroAuto(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseNumeroAuto(value);
}

export function parseOrgao(value: unknown): string {
  return assertNonEmptyString(value, "orgao", 200);
}

export function parseOptionalOrgao(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseOrgao(value);
}

export function parseOptionalDescricao(value: unknown): string | undefined {
  return boundedOptionalString(value, "descricao", 0, 2000);
}

export function parseValor(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    throw new FineError(400, "FINE_INVALID", "required_field", "valor is required.");
  }
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new FineError(400, "FINE_INVALID", "invalid_valor", "valor must be a number.");
  }
  if (parsed < 0) {
    throw new FineError(400, "FINE_INVALID", "invalid_valor", "valor must be greater than or equal to zero.");
  }

  return parsed;
}

export function parseOptionalValor(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseValor(value);
}

export function parsePontos(value: unknown, fallback = 0): number {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new FineError(400, "FINE_INVALID", "invalid_pontos", "pontos must be a non-negative integer.");
  }

  return parsed;
}

export function parseOptionalPontos(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parsePontos(value);
}

// Ω4C PR-07 — parcelas do DESCONTO no extrato quando há condutor responsável. Campo TRANSIENTE (não
// persistido na Fine — override de plano, como `ignore_previous_odometer` do PR-05). int ≥ 1, default 1;
// fora de 1..240 → 400 invalid_responsible_installment_total.
const MAX_RESPONSIBLE_INSTALLMENTS = 240;
export function parseResponsibleInstallmentTotal(value: unknown): number {
  if (value === undefined || value === null || value === "") return 1;
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_RESPONSIBLE_INSTALLMENTS) {
    throw new FineError(
      400,
      "FINE_INVALID",
      "invalid_responsible_installment_total",
      `responsible_installment_total must be an integer between 1 and ${MAX_RESPONSIBLE_INSTALLMENTS}.`,
    );
  }
  return parsed;
}

export function parseFineStatus(value: unknown, fallback?: FineStatus): FineStatus {
  if (value === undefined || value === null || value === "") {
    if (fallback === undefined) {
      throw new FineError(400, "FINE_INVALID", "required_field", "status is required.");
    }
    return fallback;
  }

  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (FINE_STATUSES.includes(normalized as FineStatus)) {
    return normalized as FineStatus;
  }

  throw new FineError(400, "FINE_INVALID", "invalid_status", `status must be one of: ${FINE_STATUSES.join(", ")}.`);
}

export function parseOptionalFineStatus(value: unknown): FineStatus | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseFineStatus(value);
}

export function parseRequiredDate(value: unknown, field: string): Date {
  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new FineError(400, "FINE_INVALID", "invalid_date", `${field} must be a valid ISO date.`);
  }

  return date;
}

export function parseOptionalDate(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseRequiredDate(value, field);
}

export function readOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;

  throw new FineError(400, "FINE_INVALID", "invalid_boolean", "isActive must be a boolean.");
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = assertNonEmptyString(value, field, 160);

  if (!uuidPattern.test(normalized)) {
    throw new FineError(400, "FINE_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }

  return normalized;
}

export function parseOptionalUuid(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseRequiredUuid(value, field);
}

/**
 * A user reference (e.g. driverId). Users are NOT guaranteed to carry a UUID id
 * (the SaaS registry may issue prefixed ids), so this only enforces a bounded
 * non-empty string — the in-tenant resolver is the real existence check.
 */
export function parseOptionalUserId(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return assertNonEmptyString(value, field, 160);
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new FineError(400, "FINE_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }

  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new FineError(400, "FINE_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }

  return parsed;
}

export function parseOptionalDueWithinDays(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 3650) {
    throw new FineError(400, "FINE_FILTER_INVALID", "invalid_due_within_days", "due_within_days must be between 0 and 3650.");
  }

  return parsed;
}

export function parseOptionalSearch(value: unknown): string | undefined {
  const search = optionalString(value);
  if (!search) return undefined;

  return search.slice(0, 120);
}
