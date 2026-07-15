import { createFinancialItemParsers, roundMoney } from "../tariffs/financial-item.shape.js";
import { WorkOrderFinancialError } from "./work-order-financial.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

// C3 (Ω3F-3a, junta J-Ω3F-0) — shape monetário COMPARTILHADO com o orçamento (mesma máquina de
// parse/arredondamento/teto Decimal(12,2) — A1/A3/A4), com a error-factory DESTE módulo.
// Overflow acima do Decimal(12,2) → 422 financial_total_overflow (equivalente do
// quote_total_overflow). qty≤0 → 400 invalid_quantity (precedente do orçamento, NÃO 422).
const moneyParsers = createFinancialItemParsers(
  {
    invalid: (reason, message) => new WorkOrderFinancialError(400, "WORK_ORDER_FINANCIAL_INVALID", reason, message),
    unprocessable: (reason, message) => new WorkOrderFinancialError(422, "WORK_ORDER_FINANCIAL_UNPROCESSABLE", reason, message),
  },
  { overflowReason: "financial_total_overflow" },
);

export { roundMoney };
export const assertMoneyInRange = moneyParsers.assertMoneyInRange;
export const parseUnitPrice = moneyParsers.parseUnitPrice;
export const parseQuantity = moneyParsers.parseQuantity;
export const parsePriceSource = moneyParsers.parsePriceSource;
export const parseCurrency = moneyParsers.parseCurrency;

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = optionalString(value);
  if (normalized === undefined) {
    throw new WorkOrderFinancialError(400, "WORK_ORDER_FINANCIAL_INVALID", "required_field", `${field} is required.`);
  }
  if (!uuidPattern.test(normalized)) {
    throw new WorkOrderFinancialError(400, "WORK_ORDER_FINANCIAL_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export function parseRequiredDescription(value: unknown): string {
  const normalized = parseOptionalDescription(value);
  if (normalized === undefined) {
    throw new WorkOrderFinancialError(400, "WORK_ORDER_FINANCIAL_INVALID", "required_description", "description is required.");
  }
  return normalized;
}

export function parseOptionalDescription(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (normalized.length > 500) {
    throw new WorkOrderFinancialError(400, "WORK_ORDER_FINANCIAL_INVALID", "invalid_description", "description must be at most 500 characters.");
  }
  return normalized;
}

export function parseOptionalNotes(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (normalized.length > 2000) {
    throw new WorkOrderFinancialError(400, "WORK_ORDER_FINANCIAL_INVALID", "invalid_notes", "notes must be at most 2000 characters.");
  }
  return normalized;
}

// Idempotência §6 — token OPACO do cliente (fila offline). Só sanidade de tamanho; o formato é
// livre (espelho do client_action_id dos anexos de OS).
export function parseOptionalClientActionId(value: unknown): string | undefined {
  const normalized = optionalString(value);
  if (normalized === undefined) return undefined;
  if (normalized.length > 120) {
    throw new WorkOrderFinancialError(400, "WORK_ORDER_FINANCIAL_INVALID", "invalid_client_action_id", "clientActionId must be at most 120 characters.");
  }
  return normalized;
}
