import {
  InventoryError,
  STOCK_MOVEMENT_TYPES,
  type StockMovementType,
} from "./inventory.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertNonEmptyString(value: unknown, field: string, maxLength = 5000): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw new InventoryError(400, "INVENTORY_INVALID", "required_field", `${field} is required.`);
  }

  if (normalized.length > maxLength) {
    throw new InventoryError(400, "INVENTORY_INVALID", "field_too_long", `${field} must be at most ${maxLength} characters.`);
  }

  return normalized;
}

export function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";

  return normalized || undefined;
}

export function parseSku(value: unknown): string {
  return assertNonEmptyString(value, "sku", 120);
}

export function parseOptionalSku(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseSku(value);
}

export function parseName(value: unknown): string {
  return assertNonEmptyString(value, "name", 200);
}

export function parseOptionalName(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseName(value);
}

export function parseUnit(value: unknown): string {
  return assertNonEmptyString(value, "unit", 40);
}

export function parseOptionalUnit(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseUnit(value);
}

export function parseOptionalReason(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return assertNonEmptyString(value, "reason", 500);
}

export function parseNonNegativeNumber(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new InventoryError(400, "INVENTORY_INVALID", `invalid_${field}`, `${field} must be a number.`);
  }
  if (parsed < 0) {
    throw new InventoryError(400, "INVENTORY_INVALID", `invalid_${field}`, `${field} must be greater than or equal to zero.`);
  }

  return parsed;
}

export function parseOptionalLeadTimeDays(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new InventoryError(
      400,
      "INVENTORY_INVALID",
      "invalid_leadTimeDays",
      "leadTimeDays must be an integer greater than or equal to zero.",
    );
  }

  return parsed;
}

export function parseMovementType(value: unknown): StockMovementType {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if ((STOCK_MOVEMENT_TYPES as readonly string[]).includes(normalized)) {
    return normalized as StockMovementType;
  }

  throw new InventoryError(
    400,
    "STOCK_INVALID",
    normalized ? "invalid_type" : "required_field",
    `type must be one of: ${STOCK_MOVEMENT_TYPES.join(", ")}.`,
  );
}

export function parseOptionalMovementType(value: unknown): StockMovementType | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseMovementType(value);
}

/**
 * Movement quantity as sent by the caller (UNSIGNED intent):
 * - entrada/saida/consumo: must be a number > 0 (the service applies the sign);
 * - ajuste: any non-zero number — the sign IS the direction of the adjustment.
 */
export function parseQuantidade(value: unknown, type: StockMovementType): number {
  if (value === undefined || value === null || value === "") {
    throw new InventoryError(400, "STOCK_INVALID", "required_field", "quantidade is required.");
  }
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new InventoryError(400, "STOCK_INVALID", "invalid_quantidade", "quantidade must be a number.");
  }

  if (type === "ajuste") {
    if (parsed === 0) {
      throw new InventoryError(400, "STOCK_INVALID", "invalid_quantidade", "quantidade must not be zero for an ajuste.");
    }

    return parsed;
  }

  if (parsed <= 0) {
    throw new InventoryError(
      400,
      "STOCK_INVALID",
      "invalid_quantidade",
      "quantidade must be greater than zero for entrada, saida and consumo.",
    );
  }

  return parsed;
}

export function parseOptionalUnitCost(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new InventoryError(400, "STOCK_INVALID", "invalid_unitCost", "unitCost must be a number.");
  }
  if (parsed < 0) {
    throw new InventoryError(400, "STOCK_INVALID", "invalid_unitCost", "unitCost must be greater than or equal to zero.");
  }

  return parsed;
}

export function parseRequiredDate(value: unknown, field: string): Date {
  if (value === undefined || value === null || value === "") {
    throw new InventoryError(400, "INVENTORY_INVALID", "required_field", `${field} is required.`);
  }
  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new InventoryError(400, "INVENTORY_INVALID", "invalid_date", `${field} must be a valid ISO date.`);
  }

  return date;
}

export function parseOptionalDate(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseRequiredDate(value, field);
}

export function readOptionalBoolean(value: unknown, field = "isActive"): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;

  throw new InventoryError(400, "INVENTORY_INVALID", "invalid_boolean", `${field} must be a boolean.`);
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = assertNonEmptyString(value, field, 160);

  if (!uuidPattern.test(normalized)) {
    throw new InventoryError(400, "INVENTORY_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
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
    throw new InventoryError(400, "INVENTORY_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }

  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new InventoryError(400, "INVENTORY_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }

  return parsed;
}

export function parseOptionalSearch(value: unknown): string | undefined {
  const search = optionalString(value);
  if (!search) return undefined;

  return search.slice(0, 120);
}
