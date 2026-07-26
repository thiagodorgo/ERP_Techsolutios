import {
  DAILY_CAPS,
  DAILY_MODELS,
  JurisdictionError,
  PROFILE_SCOPES,
  type DailyCap,
  type DailyModel,
  type ProfileScope,
  type ReleaseRequirement,
} from "./jurisdiction.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Prazo máximo de sanidade (10 anos em dias) — barra lixo óbvio; o domínio real é dezenas de dias.
const MAX_DEADLINE = 3650;
const MAX_RELEASE_REQUIREMENTS = 50;

export function assertNonEmptyString(value: unknown, field: string, maxLength = 160): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new JurisdictionError(400, "JURISDICTION_INVALID", "required_field", `${field} is required.`);
  }
  if (normalized.length > maxLength) {
    throw new JurisdictionError(400, "JURISDICTION_INVALID", "field_too_long", `${field} must be at most ${maxLength} characters.`);
  }
  return normalized;
}

export function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

export function parseName(value: unknown): string {
  return assertNonEmptyString(value, "name", 160);
}

export function parseOptionalName(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  return parseName(normalized);
}

export function parseOptionalNotes(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return null;
  if (normalized.length > 500) {
    throw new JurisdictionError(400, "JURISDICTION_INVALID", "field_too_long", "notes must be at most 500 characters.");
  }
  return normalized;
}

export function parseScope(value: unknown): ProfileScope {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!(PROFILE_SCOPES as readonly string[]).includes(normalized)) {
    throw new JurisdictionError(400, "JURISDICTION_INVALID", "invalid_scope", `scope must be one of: ${PROFILE_SCOPES.join(", ")}.`);
  }
  return normalized as ProfileScope;
}

export function parseOptionalScope(value: unknown): ProfileScope | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  return parseScope(normalized);
}

export function parseDailyModel(value: unknown): DailyModel {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!(DAILY_MODELS as readonly string[]).includes(normalized)) {
    throw new JurisdictionError(400, "JURISDICTION_INVALID", "invalid_daily_model", `dailyModel must be one of: ${DAILY_MODELS.join(", ")}.`);
  }
  return normalized as DailyModel;
}

export function parseOptionalDailyModel(value: unknown): DailyModel | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  return parseDailyModel(normalized);
}

export function parseDailyCap(value: unknown): DailyCap {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!(DAILY_CAPS as readonly string[]).includes(normalized)) {
    throw new JurisdictionError(400, "JURISDICTION_INVALID", "invalid_daily_cap", `dailyCap must be one of: ${DAILY_CAPS.join(", ")}.`);
  }
  return normalized as DailyCap;
}

export function parseOptionalDailyCap(value: unknown): DailyCap | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  return parseDailyCap(normalized);
}

// Prazo > 0 (belt-and-suspenders com o CHECK estrutural da migração, D-Ω5P-JUR-05). <= 0 ou > 3650 -> 400.
export function parsePositiveDeadline(value: unknown, field: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > MAX_DEADLINE) {
    throw new JurisdictionError(400, "JURISDICTION_INVALID", "invalid_deadline", `${field} must be an integer between 1 and ${MAX_DEADLINE}.`);
  }
  return parsed;
}

export function parseOptionalPositiveDeadline(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parsePositiveDeadline(value, field);
}

// Checklist [{code,label,required}]. Qualquer outro shape -> 400 invalid_release_requirements. Máx. 50 itens.
export function parseReleaseRequirements(value: unknown): ReleaseRequirement[] {
  if (value === undefined || value === null || value === "") return [];
  if (!Array.isArray(value)) {
    throw new JurisdictionError(400, "JURISDICTION_INVALID", "invalid_release_requirements", "releaseRequirements must be an array of {code,label,required}.");
  }
  if (value.length > MAX_RELEASE_REQUIREMENTS) {
    throw new JurisdictionError(400, "JURISDICTION_INVALID", "invalid_release_requirements", `releaseRequirements must have at most ${MAX_RELEASE_REQUIREMENTS} items.`);
  }
  return value.map((raw) => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new JurisdictionError(400, "JURISDICTION_INVALID", "invalid_release_requirements", "each release requirement must be an object with {code,label,required}.");
    }
    const item = raw as Record<string, unknown>;
    const code = assertNonEmptyString(item.code, "releaseRequirements[].code", 60);
    const label = assertNonEmptyString(item.label, "releaseRequirements[].label", 160);
    const required = item.required === undefined ? true : readRequiredBoolean(item.required);
    return { code, label, required };
  });
}

export function parseOptionalReleaseRequirements(value: unknown): ReleaseRequirement[] | undefined {
  if (value === undefined) return undefined;
  return parseReleaseRequirements(value);
}

function readRequiredBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new JurisdictionError(400, "JURISDICTION_INVALID", "invalid_release_requirements", "release requirement 'required' must be a boolean.");
}

export function readOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new JurisdictionError(400, "JURISDICTION_INVALID", "invalid_boolean", "boolean field must be true or false.");
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = assertNonEmptyString(value, field);
  if (!uuidPattern.test(normalized)) {
    throw new JurisdictionError(400, "JURISDICTION_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new JurisdictionError(400, "JURISDICTION_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }
  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new JurisdictionError(400, "JURISDICTION_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }
  return parsed;
}

export function parseOptionalSearch(value: unknown): string | undefined {
  const search = optionalString(value);
  if (!search) return undefined;
  return search.slice(0, 120);
}
