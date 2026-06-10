import {
  FIELD_DISPATCH_STATUSES,
  type FieldDispatchStatus,
  FieldDispatchError,
} from "./field-dispatch.types.js";

export const FIELD_DISPATCH_STATUS_TRANSITIONS: Readonly<Record<FieldDispatchStatus, readonly FieldDispatchStatus[]>> = {
  draft: ["assigned", "cancelled"],
  assigned: ["accepted", "on_route", "reassigned", "cancelled", "failed"],
  accepted: ["on_route", "arrived", "reassigned", "cancelled", "failed"],
  on_route: ["arrived", "reassigned", "cancelled", "failed"],
  arrived: ["in_service", "reassigned", "cancelled", "failed"],
  in_service: ["completed", "reassigned", "cancelled", "failed"],
  reassigned: ["accepted", "on_route", "cancelled", "failed"],
  completed: [],
  cancelled: [],
  failed: [],
};

export function parseFieldDispatchStatus(value: unknown, fallback?: FieldDispatchStatus): FieldDispatchStatus {
  if ((value === undefined || value === null || value === "") && fallback) return fallback;
  const normalized = typeof value === "string" ? value.trim() : "";

  if (FIELD_DISPATCH_STATUSES.includes(normalized as FieldDispatchStatus)) {
    return normalized as FieldDispatchStatus;
  }

  throw new FieldDispatchError(400, "FIELD_DISPATCH_INVALID", "invalid_status", "status is invalid.");
}

export function parseInitialFieldDispatchStatus(value: unknown): FieldDispatchStatus {
  const status = parseFieldDispatchStatus(value, "assigned");

  if (status === "draft" || status === "assigned") return status;

  throw new FieldDispatchError(
    400,
    "FIELD_DISPATCH_INVALID",
    "invalid_initial_status",
    "Initial dispatch status must be draft or assigned.",
  );
}

export function assertStatusTransition(from: FieldDispatchStatus, to: FieldDispatchStatus): void {
  if (from === to) return;
  if (FIELD_DISPATCH_STATUS_TRANSITIONS[from].includes(to)) return;

  throw new FieldDispatchError(
    409,
    "FIELD_DISPATCH_STATUS_INVALID",
    "invalid_status_transition",
    `Cannot transition dispatch from ${from} to ${to}.`,
  );
}

export function assertNonTerminalStatus(status: FieldDispatchStatus): void {
  if (status !== "completed" && status !== "cancelled" && status !== "failed") return;

  throw new FieldDispatchError(
    409,
    "FIELD_DISPATCH_STATUS_INVALID",
    "terminal_dispatch",
    `Cannot update dispatch with terminal status ${status}.`,
  );
}

export function assertNonEmptyString(value: unknown, field: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw new FieldDispatchError(400, "FIELD_DISPATCH_INVALID", "required_field", `${field} is required.`);
  }

  return normalized;
}

export function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";

  return normalized || undefined;
}

export function parseRequiredUuid(value: unknown, field: string): string {
  return assertNonEmptyString(value, field);
}

export function parseOptionalUuid(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseRequiredUuid(value, field);
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new FieldDispatchError(400, "FIELD_DISPATCH_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }

  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new FieldDispatchError(400, "FIELD_DISPATCH_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }

  return parsed;
}

export function parseOptionalSearch(value: unknown): string | undefined {
  const search = optionalString(value);
  if (!search) return undefined;

  return search.slice(0, 120);
}
