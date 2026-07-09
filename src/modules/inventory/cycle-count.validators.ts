import { INVENTORY_ABC_CLASSES, type InventoryAbcClass } from "./inventory.types.js";
import {
  CYCLE_COUNT_STATUSES,
  CycleCountError,
  type CycleCountStatus,
} from "./cycle-count.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseOptionalAbcClass(value: unknown): InventoryAbcClass | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";

  if ((INVENTORY_ABC_CLASSES as readonly string[]).includes(normalized)) {
    return normalized as InventoryAbcClass;
  }

  throw new CycleCountError(
    400,
    "CYCLE_COUNT_INVALID",
    "invalid_abc_class",
    `abcClass must be one of: ${INVENTORY_ABC_CLASSES.join(", ")}.`,
  );
}

export function parseOptionalNotes(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return undefined;

  if (normalized.length > 1000) {
    throw new CycleCountError(400, "CYCLE_COUNT_INVALID", "field_too_long", "notes must be at most 1000 characters.");
  }

  return normalized;
}

/** Counted quantity is a non-negative number (a physical count is never negative). */
export function parseCountedQuantity(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    throw new CycleCountError(400, "CYCLE_COUNT_INVALID", "required_field", "countedQuantity is required.");
  }
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new CycleCountError(400, "CYCLE_COUNT_INVALID", "invalid_countedQuantity", "countedQuantity must be a number.");
  }
  if (parsed < 0) {
    throw new CycleCountError(
      400,
      "CYCLE_COUNT_INVALID",
      "invalid_countedQuantity",
      "countedQuantity must be greater than or equal to zero.",
    );
  }

  return parsed;
}

export function parseOptionalStatus(value: unknown): CycleCountStatus | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if ((CYCLE_COUNT_STATUSES as readonly string[]).includes(normalized)) {
    return normalized as CycleCountStatus;
  }

  throw new CycleCountError(
    400,
    "CYCLE_COUNT_INVALID",
    "invalid_status",
    `status must be one of: ${CYCLE_COUNT_STATUSES.join(", ")}.`,
  );
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw new CycleCountError(400, "CYCLE_COUNT_INVALID", "required_field", `${field} is required.`);
  }
  if (!uuidPattern.test(normalized)) {
    throw new CycleCountError(400, "CYCLE_COUNT_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }

  return normalized;
}

export function readOptionalBoolean(value: unknown, field = "isActive"): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;

  throw new CycleCountError(400, "CYCLE_COUNT_INVALID", "invalid_boolean", `${field} must be a boolean.`);
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new CycleCountError(400, "CYCLE_COUNT_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }

  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new CycleCountError(400, "CYCLE_COUNT_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }

  return parsed;
}
