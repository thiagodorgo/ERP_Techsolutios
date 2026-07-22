import { MaintenanceOrderError } from "./maintenance-order.types.js";
import { MAINTENANCE_ITEM_TYPES, type MaintenanceItemType } from "./maintenance-order-item.types.js";

// Decimal(12,2) → máx. 9_999_999_999.99; Decimal(10,3) → máx. 9_999_999.999. Guardas contra overflow de coluna.
const MAX_UNIT_VALUE = 9_999_999_999.99;
const MAX_QUANTITY = 9_999_999.999;

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function parseItemType(value: unknown, fallback?: MaintenanceItemType): MaintenanceItemType {
  if (value === undefined || value === null || value === "") {
    if (fallback === undefined) {
      throw new MaintenanceOrderError(400, "MAINTENANCE_ITEM_INVALID", "required_field", "item_type is required.");
    }
    return fallback;
  }

  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (MAINTENANCE_ITEM_TYPES.includes(normalized as MaintenanceItemType)) {
    return normalized as MaintenanceItemType;
  }

  throw new MaintenanceOrderError(
    400,
    "MAINTENANCE_ITEM_INVALID",
    "invalid_item_type",
    `item_type must be one of: ${MAINTENANCE_ITEM_TYPES.join(", ")}.`,
  );
}

export function parseOptionalItemType(value: unknown): MaintenanceItemType | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseItemType(value);
}

export function parseItemDescription(value: unknown): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new MaintenanceOrderError(400, "MAINTENANCE_ITEM_INVALID", "required_field", "description is required.");
  }
  if (normalized.length > 2000) {
    throw new MaintenanceOrderError(400, "MAINTENANCE_ITEM_INVALID", "field_too_long", "description must be at most 2000 characters.");
  }
  return normalized;
}

export function parseOptionalItemDescription(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseItemDescription(value);
}

export function parseOptionalItemNotes(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return undefined;
  if (normalized.length > 2000) {
    throw new MaintenanceOrderError(400, "MAINTENANCE_ITEM_INVALID", "field_too_long", "notes must be at most 2000 characters.");
  }
  return normalized;
}

// unit_value > 0 (RN-MANUT-02 → 422). Ausente → 400 required_field; não-numérico → 400. Arredondado a 2 casas
// (Decimal(12,2)); acima do teto da coluna → 400.
export function parseUnitValue(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    throw new MaintenanceOrderError(400, "MAINTENANCE_ITEM_INVALID", "required_field", "unit_value is required.");
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new MaintenanceOrderError(400, "MAINTENANCE_ITEM_INVALID", "invalid_unit_value", "unit_value must be a number.");
  }
  if (parsed <= 0) {
    throw new MaintenanceOrderError(422, "MAINTENANCE_ITEM_INVALID", "invalid_unit_value", "unit_value must be greater than zero.");
  }
  if (parsed > MAX_UNIT_VALUE) {
    throw new MaintenanceOrderError(400, "MAINTENANCE_ITEM_INVALID", "invalid_unit_value", "unit_value is too large.");
  }
  return roundTo(parsed, 2);
}

export function parseOptionalUnitValue(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseUnitValue(value);
}

// quantity > 0 (RN-MANUT-02 → 422). Ausente → 400 required_field; não-numérico → 400. Arredondada a 3 casas
// (Decimal(10,3)); acima do teto da coluna → 400.
export function parseQuantity(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    throw new MaintenanceOrderError(400, "MAINTENANCE_ITEM_INVALID", "required_field", "quantity is required.");
  }
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new MaintenanceOrderError(400, "MAINTENANCE_ITEM_INVALID", "invalid_quantity", "quantity must be a number.");
  }
  if (parsed <= 0) {
    throw new MaintenanceOrderError(422, "MAINTENANCE_ITEM_INVALID", "invalid_quantity", "quantity must be greater than zero.");
  }
  if (parsed > MAX_QUANTITY) {
    throw new MaintenanceOrderError(400, "MAINTENANCE_ITEM_INVALID", "invalid_quantity", "quantity is too large.");
  }
  return roundTo(parsed, 3);
}

export function parseOptionalQuantity(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseQuantity(value);
}

// Total da LINHA = unit_value × quantity, arredondado a 2 casas (DERIVADO — jamais persistido, cliente nunca envia).
export function computeLineTotal(unitValue: number, quantity: number): number {
  return roundTo(unitValue * quantity, 2);
}

export function roundMoney(value: number): number {
  return roundTo(value, 2);
}
