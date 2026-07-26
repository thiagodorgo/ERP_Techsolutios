import {
  CUSTODY_EVENT_TYPES,
  IMPOUND_STATUSES,
  ImpoundError,
  type CustodyEventType,
  type ImpoundStatus,
} from "./impound.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertNonEmptyString(value: unknown, field: string, maxLength = 160): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new ImpoundError(400, "IMPOUND_INVALID", "required_field", `${field} is required.`);
  }
  if (normalized.length > maxLength) {
    throw new ImpoundError(400, "IMPOUND_INVALID", "field_too_long", `${field} must be at most ${maxLength} characters.`);
  }
  return normalized;
}

export function optionalString(value: unknown, maxLength = 240): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return undefined;
  if (normalized.length > maxLength) {
    throw new ImpoundError(400, "IMPOUND_INVALID", "field_too_long", `field must be at most ${maxLength} characters.`);
  }
  return normalized;
}

// PATCH nullable: undefined = não mexe; ""/null = limpa (null); string = novo valor.
export function nullableString(value: unknown, maxLength = 240): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return optionalString(value, maxLength) ?? null;
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = assertNonEmptyString(value, field);
  if (!uuidPattern.test(normalized)) {
    throw new ImpoundError(400, "IMPOUND_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export function parseOptionalUuid(value: unknown, field: string): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (!uuidPattern.test(normalized)) {
    throw new ImpoundError(400, "IMPOUND_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export function readOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new ImpoundError(400, "IMPOUND_INVALID", "invalid_boolean", "boolean field must be true or false.");
}

export function parseOptionalYear(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1900 || parsed > 2100) {
    throw new ImpoundError(400, "IMPOUND_INVALID", "invalid_year", "vehicleYear must be an integer between 1900 and 2100.");
  }
  return parsed;
}

// PATCH nullable year.
export function nullableYear(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return parseOptionalYear(value) ?? null;
}

// D-Ω5P-09 / CHECK impound_processes_identity_chk (belt-and-suspenders no app):
// - não-identificado ⇒ justificativa obrigatória, e placa/chassi/renavam IGNORADOS (não devem ser exigidos);
// - identificado ⇒ ao menos um de placa/chassi/renavam.
export type IdentityInput = {
  readonly vehiclePlate?: string;
  readonly vehicleChassis?: string;
  readonly vehicleRenavam?: string;
  readonly vehicleUnidentified: boolean;
  readonly unidentifiedReason?: string;
};

export function assertIdentity(input: IdentityInput): void {
  if (input.vehicleUnidentified) {
    if (!input.unidentifiedReason || !input.unidentifiedReason.trim()) {
      throw new ImpoundError(
        400,
        "IMPOUND_INVALID",
        "unidentified_reason_required",
        "unidentifiedReason is required when the vehicle is unidentified (placa/chassi adulterados).",
      );
    }
    return;
  }
  const hasIdentifier = Boolean(input.vehiclePlate || input.vehicleChassis || input.vehicleRenavam);
  if (!hasIdentifier) {
    throw new ImpoundError(
      400,
      "IMPOUND_INVALID",
      "vehicle_identifier_required",
      "at least one of vehiclePlate/vehicleChassis/vehicleRenavam is required for an identified vehicle.",
    );
  }
}

export function parsePlate(value: unknown): string | undefined {
  const normalized = optionalString(value, 16);
  return normalized ? normalized.toUpperCase() : undefined;
}

export function parseStatus(value: unknown): ImpoundStatus {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!(IMPOUND_STATUSES as readonly string[]).includes(normalized)) {
    throw new ImpoundError(400, "IMPOUND_INVALID", "invalid_status", `status must be one of: ${IMPOUND_STATUSES.join(", ")}.`);
  }
  return normalized as ImpoundStatus;
}

export function parseOptionalStatus(value: unknown): ImpoundStatus | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  return parseStatus(normalized);
}

export function parseEventType(value: unknown): CustodyEventType {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!(CUSTODY_EVENT_TYPES as readonly string[]).includes(normalized)) {
    throw new ImpoundError(400, "IMPOUND_INVALID", "invalid_event_type", `type must be one of: ${CUSTODY_EVENT_TYPES.join(", ")}.`);
  }
  return normalized as CustodyEventType;
}

export function parseOptionalReason(value: unknown): string | undefined {
  return optionalString(value, 500);
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new ImpoundError(400, "IMPOUND_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }
  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ImpoundError(400, "IMPOUND_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }
  return parsed;
}
