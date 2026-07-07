import { TeamError } from "./team.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertNonEmptyString(value: unknown, field: string, maxLength = 160): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw new TeamError(400, "TEAM_INVALID", "required_field", `${field} is required.`);
  }

  if (normalized.length > maxLength) {
    throw new TeamError(400, "TEAM_INVALID", "field_too_long", `${field} must be at most ${maxLength} characters.`);
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
    throw new TeamError(400, "TEAM_INVALID", `invalid_${field}`, `${field} must be between ${min} and ${max} characters.`);
  }

  return normalized;
}

export function parseName(value: unknown): string {
  return assertNonEmptyString(value, "name", 160);
}

export function parseOptionalStatus(value: unknown): string | undefined {
  return boundedOptionalString(value, "status", 0, 40);
}

export function parseOptionalNotes(value: unknown): string | undefined {
  return boundedOptionalString(value, "notes", 0, 2000);
}

export function parseOptionalRoleInTeam(value: unknown): string | undefined {
  return boundedOptionalString(value, "role_in_team", 0, 80);
}

// User identifiers may be UUIDs (persistent store) or opaque ids from the
// in-memory registry (e.g. "usr_..."). They are validated as non-empty strings
// here; same-tenant integrity is enforced by the composite FK on the DB layer.
export function parseMemberUserId(value: unknown): string {
  return assertNonEmptyString(value, "userId", 128);
}

export function parseOptionalLeaderUserId(value: unknown): string | undefined {
  return boundedOptionalString(value, "leader_user_id", 0, 128);
}

export function readOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;

  throw new TeamError(400, "TEAM_INVALID", "invalid_boolean", "isActive must be a boolean.");
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = assertNonEmptyString(value, field);

  if (!uuidPattern.test(normalized)) {
    throw new TeamError(400, "TEAM_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }

  return normalized;
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new TeamError(400, "TEAM_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }

  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new TeamError(400, "TEAM_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }

  return parsed;
}

export function parseOptionalSearch(value: unknown): string | undefined {
  const search = optionalString(value);
  if (!search) return undefined;

  return search.slice(0, 120);
}
