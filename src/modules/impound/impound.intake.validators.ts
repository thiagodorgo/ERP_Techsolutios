import { ImpoundError } from "./impound.types.js";
import {
  PHOTO_SET_CODES,
  SIGNATURE_STATUSES,
  type PhotoSetCode,
  type SignatureStatus,
} from "./impound.intake.types.js";

// SET code da foto — validado NO SERVIDOR (nunca metadata livre do cliente).
export function parsePhotoSetCode(value: unknown): PhotoSetCode {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!(PHOTO_SET_CODES as readonly string[]).includes(normalized)) {
    throw new ImpoundError(400, "IMPOUND_INVALID", "invalid_photo_set", `set must be one of: ${PHOTO_SET_CODES.join(", ")}.`);
  }
  return normalized as PhotoSetCode;
}

export function parseSignatureStatus(value: unknown): SignatureStatus | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!(SIGNATURE_STATUSES as readonly string[]).includes(normalized)) {
    throw new ImpoundError(400, "IMPOUND_INVALID", "invalid_signature_status", `signature_status must be one of: ${SIGNATURE_STATUSES.join(", ")}.`);
  }
  return normalized as SignatureStatus;
}

// km Decimal(10,1) — aceita number|string, devolve STRING canônica com 1 casa (nunca number no domínio/payload).
export function parseNullableOdometer(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new ImpoundError(400, "IMPOUND_INVALID", "invalid_odometer", "odometer_km must be a non-negative number.");
  }
  if (numeric > 9_999_999.9) {
    throw new ImpoundError(400, "IMPOUND_INVALID", "invalid_odometer", "odometer_km exceeds the allowed range.");
  }
  return numeric.toFixed(1);
}

// Data ISO obrigatória/opcional da vistoria.
export function parseInspectedAt(value: unknown): Date {
  const date = coerceDate(value);
  if (!date) {
    throw new ImpoundError(400, "IMPOUND_INVALID", "invalid_inspected_at", "inspected_at must be a valid ISO date.");
  }
  return date;
}

export function parseNullableDate(value: unknown, field: string): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const date = coerceDate(value);
  if (!date) {
    throw new ImpoundError(400, "IMPOUND_INVALID", "invalid_date", `${field} must be a valid ISO date.`);
  }
  return date;
}

function coerceDate(value: unknown): Date | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

// Conjuntos obrigatórios configurados no perfil (PATCH-friendly): array de SET codes conhecidos.
export function parseRequiredPhotoSets(value: unknown): PhotoSetCode[] | null {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) {
    throw new ImpoundError(400, "IMPOUND_INVALID", "invalid_required_photo_sets", "required_photo_sets must be an array of set codes.");
  }
  return value.map((entry) => parsePhotoSetCode(entry));
}

// URL da foto (referência de armazenamento). Obrigatória; o storage_key/opacos NUNCA voltam no DTO.
export function parseFileUrl(value: unknown): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new ImpoundError(400, "IMPOUND_INVALID", "required_field", "file_url is required for an intake photo.");
  }
  if (normalized.length > 2048) {
    throw new ImpoundError(400, "IMPOUND_INVALID", "field_too_long", "file_url must be at most 2048 characters.");
  }
  return normalized;
}
