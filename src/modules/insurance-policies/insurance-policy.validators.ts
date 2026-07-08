import {
  INSURANCE_EFFECTIVE_STATUSES,
  INSURANCE_STORED_STATUSES,
  InsurancePolicyError,
  type InsuranceEffectiveStatus,
  type InsuranceStoredStatus,
} from "./insurance-policy.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * R4.1 — pure helper for the DERIVED effective status.
 *
 * - `cancelada` if the STORED status is `cancelada` (a cancelled policy stays
 *   cancelled regardless of dates);
 * - otherwise `vencida` when `vigenciaFim < now` (strictly in the past);
 * - otherwise `vigente`.
 *
 * Boundary: a policy whose `vigenciaFim` is exactly `now` is still `vigente`
 * (not yet expired).
 */
export function deriveInsuranceStatus(
  stored: InsuranceStoredStatus,
  vigenciaFim: Date,
  now: Date,
): InsuranceEffectiveStatus {
  if (stored === "cancelada") return "cancelada";
  if (vigenciaFim.getTime() < now.getTime()) return "vencida";

  return "vigente";
}

export function assertNonEmptyString(value: unknown, field: string, maxLength = 2000): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw new InsurancePolicyError(400, "INSURANCE_INVALID", "required_field", `${field} is required.`);
  }

  if (normalized.length > maxLength) {
    throw new InsurancePolicyError(400, "INSURANCE_INVALID", "field_too_long", `${field} must be at most ${maxLength} characters.`);
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
    throw new InsurancePolicyError(400, "INSURANCE_INVALID", `invalid_${field}`, `${field} must be between ${min} and ${max} characters.`);
  }

  return normalized;
}

export function parseSeguradora(value: unknown): string {
  return assertNonEmptyString(value, "seguradora", 200);
}

export function parseOptionalSeguradora(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseSeguradora(value);
}

export function parseNumeroApolice(value: unknown): string {
  return assertNonEmptyString(value, "numeroApolice", 120);
}

export function parseOptionalNumeroApolice(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseNumeroApolice(value);
}

export function parseOptionalCobertura(value: unknown): string | undefined {
  return boundedOptionalString(value, "cobertura", 0, 2000);
}

export function parseValor(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    throw new InsurancePolicyError(400, "INSURANCE_INVALID", "required_field", "valor is required.");
  }
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new InsurancePolicyError(400, "INSURANCE_INVALID", "invalid_valor", "valor must be a number.");
  }
  if (parsed < 0) {
    throw new InsurancePolicyError(400, "INSURANCE_INVALID", "invalid_valor", "valor must be greater than or equal to zero.");
  }

  return parsed;
}

export function parseOptionalValor(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseValor(value);
}

/**
 * R4.1 — parses a status supplied by a WRITE (PATCH). Only the stored statuses
 * (`vigente | cancelada`) are settable; `vencida` is DERIVED, so attempting to
 * set it is a 422 (`cannot_set_derived_status`). Any other value is a 400.
 */
export function parseInsuranceWriteStatus(value: unknown): InsuranceStoredStatus {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (normalized === "vencida") {
    throw new InsurancePolicyError(
      422,
      "INSURANCE_INVALID",
      "cannot_set_derived_status",
      'O status "vencida" é derivado da vigência e não pode ser definido manualmente.',
    );
  }

  if ((INSURANCE_STORED_STATUSES as readonly string[]).includes(normalized)) {
    return normalized as InsuranceStoredStatus;
  }

  throw new InsurancePolicyError(
    400,
    "INSURANCE_INVALID",
    "invalid_status",
    `status must be one of: ${INSURANCE_STORED_STATUSES.join(", ")}.`,
  );
}

export function parseOptionalInsuranceWriteStatus(value: unknown): InsuranceStoredStatus | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseInsuranceWriteStatus(value);
}

/**
 * The list `status` filter understands the DERIVED `vencida` (R4.1). It accepts
 * any effective status (`vigente | vencida | cancelada`); the service translates
 * it into stored-status + date bounds.
 */
export function parseOptionalListStatus(value: unknown): InsuranceEffectiveStatus | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if ((INSURANCE_EFFECTIVE_STATUSES as readonly string[]).includes(normalized)) {
    return normalized as InsuranceEffectiveStatus;
  }

  throw new InsurancePolicyError(
    400,
    "INSURANCE_FILTER_INVALID",
    "invalid_status",
    `status must be one of: ${INSURANCE_EFFECTIVE_STATUSES.join(", ")}.`,
  );
}

export function parseRequiredDate(value: unknown, field: string): Date {
  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new InsurancePolicyError(400, "INSURANCE_INVALID", "invalid_date", `${field} must be a valid ISO date.`);
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

  throw new InsurancePolicyError(400, "INSURANCE_INVALID", "invalid_boolean", "isActive must be a boolean.");
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = assertNonEmptyString(value, field, 160);

  if (!uuidPattern.test(normalized)) {
    throw new InsurancePolicyError(400, "INSURANCE_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }

  return normalized;
}

export function parseOptionalUuid(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseRequiredUuid(value, field);
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new InsurancePolicyError(400, "INSURANCE_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }

  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new InsurancePolicyError(400, "INSURANCE_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }

  return parsed;
}

export function parseOptionalExpiringWithinDays(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 3650) {
    throw new InsurancePolicyError(400, "INSURANCE_FILTER_INVALID", "invalid_expiring_within_days", "expiring_within_days must be between 0 and 3650.");
  }

  return parsed;
}

export function parseOptionalSearch(value: unknown): string | undefined {
  const search = optionalString(value);
  if (!search) return undefined;

  return search.slice(0, 120);
}

/** vigencia_fim must be strictly after vigencia_inicio (400 otherwise). */
export function assertVigenciaRange(vigenciaInicio: Date, vigenciaFim: Date): void {
  if (vigenciaFim.getTime() <= vigenciaInicio.getTime()) {
    throw new InsurancePolicyError(
      400,
      "INSURANCE_INVALID",
      "invalid_vigencia",
      "vigenciaFim deve ser posterior a vigenciaInicio.",
    );
  }
}
