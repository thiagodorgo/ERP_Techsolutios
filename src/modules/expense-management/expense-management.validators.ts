import {
  EXPENSE_POLICY_STATUSES,
  EXPENSE_REPORT_STATUSES,
  ExpenseManagementError,
  type ExpenseJsonRecord,
  type ExpensePolicyStatus,
  type ExpenseReportStatus,
} from "./expense-management.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const sensitivePayloadKeys = new Set([
  "apikey",
  "authorization",
  "clientsecret",
  "cookie",
  "password",
  "privatekey",
  "receipt",
  "receiptbase64",
  "receiptimage",
  "refreshtoken",
  "secret",
  "token",
  "accesstoken",
]);

export function assertNonEmptyString(value: unknown, field: string, maxLength = 160): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new ExpenseManagementError(400, "EXPENSE_INVALID", "required_field", `${field} is required.`);
  }

  return normalized.slice(0, maxLength);
}

export function optionalString(value: unknown, maxLength = 160): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";

  return normalized ? normalized.slice(0, maxLength) : undefined;
}

export function parseOptionalUuid(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseRequiredUuid(value, field);
}

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = assertNonEmptyString(value, field, 80);
  if (!uuidPattern.test(normalized)) {
    throw new ExpenseManagementError(400, "EXPENSE_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }

  return normalized;
}

export function parseOptionalDate(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new ExpenseManagementError(400, "EXPENSE_INVALID", "invalid_date", `${field} must be a valid ISO date.`);
  }

  return date;
}

export function parseRequiredDate(value: unknown, field: string): Date {
  const date = parseOptionalDate(value, field);
  if (!date) {
    throw new ExpenseManagementError(400, "EXPENSE_INVALID", "required_field", `${field} is required.`);
  }

  return date;
}

export function parseNonNegativeNumber(value: unknown, field: string, fallback?: number): number {
  if ((value === undefined || value === null || value === "") && fallback !== undefined) return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ExpenseManagementError(400, "EXPENSE_INVALID", "invalid_number", `${field} must be a non-negative number.`);
  }

  return parsed;
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new ExpenseManagementError(400, "EXPENSE_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }

  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ExpenseManagementError(400, "EXPENSE_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }

  return parsed;
}

export function parseReportStatus(value: unknown): ExpenseReportStatus | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const normalized = typeof value === "string" ? value.trim() : "";
  if (EXPENSE_REPORT_STATUSES.includes(normalized as ExpenseReportStatus)) return normalized as ExpenseReportStatus;

  throw new ExpenseManagementError(400, "EXPENSE_FILTER_INVALID", "invalid_report_status", "report status is invalid.");
}

export function parsePolicyStatus(value: unknown, fallback: ExpensePolicyStatus = "draft"): ExpensePolicyStatus {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = typeof value === "string" ? value.trim() : "";
  if (EXPENSE_POLICY_STATUSES.includes(normalized as ExpensePolicyStatus)) return normalized as ExpensePolicyStatus;

  throw new ExpenseManagementError(400, "EXPENSE_INVALID", "invalid_policy_status", "policy status is invalid.");
}

export function sanitizeJsonRecord(value: unknown): ExpenseJsonRecord {
  const sanitized = sanitizeJsonValue(value, 0);

  return isPlainRecord(sanitized) ? sanitized : {};
}

function sanitizeJsonValue(value: unknown, depth: number): unknown {
  if (depth > 5) return undefined;
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeJsonValue(item, depth + 1)).filter((item) => item !== undefined);
  }
  if (!isPlainRecord(value)) return undefined;

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 50)
      .filter(([key]) => !isSensitivePayloadKey(key))
      .map(([key, nestedValue]) => [key, sanitizeJsonValue(nestedValue, depth + 1)])
      .filter(([, nestedValue]) => nestedValue !== undefined),
  );
}

function isSensitivePayloadKey(key: string): boolean {
  return sensitivePayloadKeys.has(key.toLowerCase().replace(/[^a-z0-9]/g, ""));
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
