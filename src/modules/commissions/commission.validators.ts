import {
  COMMISSION_BASIS_EVENT_STATUSES,
  COMMISSION_BUCKETS,
  COMMISSION_CALCULATION_STATUSES,
  COMMISSION_POLICY_STATUSES,
  COMMISSION_STATEMENT_STATUSES,
  CommissionError,
  type CommissionBasisEventStatus,
  type CommissionBucket,
  type CommissionCalculationStatus,
  type CommissionJsonRecord,
  type CommissionPolicyStatus,
  type CommissionRateType,
  type CommissionStatementStatus,
} from "./commission.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sensitivePayloadKeys = new Set([
  "apikey",
  "authorization",
  "clientsecret",
  "cookie",
  "coordinates",
  "latitude",
  "lat",
  "lng",
  "longitude",
  "password",
  "passwordhash",
  "privatekey",
  "refreshtoken",
  "secret",
  "servicelatitude",
  "servicelongitude",
  "token",
  "accesstoken",
]);

export function assertNonEmptyString(value: unknown, field: string, maxLength = 160): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw new CommissionError(400, "COMMISSION_INVALID", "required_field", `${field} is required.`);
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
    throw new CommissionError(400, "COMMISSION_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }

  return normalized;
}

export function parseOptionalDate(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new CommissionError(400, "COMMISSION_INVALID", "invalid_date", `${field} must be a valid ISO date.`);
  }

  return date;
}

// Ω4C PR-10 — array NÃO-vazio de UUIDs (dedupe). 422 (validação) para forma inválida/vazia/excessiva.
export function parseCalculationIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new CommissionError(
      422,
      "COMMISSION_SETTLEMENT_INVALID",
      "invalid_calculation_ids",
      "calculationIds must be a non-empty array of UUIDs.",
    );
  }
  if (value.length > 500) {
    throw new CommissionError(
      422,
      "COMMISSION_SETTLEMENT_INVALID",
      "too_many_calculation_ids",
      "calculationIds must not exceed 500 entries per settlement.",
    );
  }
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const entry of value) {
    const normalized = typeof entry === "string" ? entry.trim() : "";
    if (!uuidPattern.test(normalized)) {
      throw new CommissionError(
        422,
        "COMMISSION_SETTLEMENT_INVALID",
        "invalid_calculation_id",
        "Each calculationId must be a valid UUID.",
      );
    }
    if (!seen.has(normalized)) {
      seen.add(normalized);
      ids.push(normalized);
    }
  }
  return ids;
}

// Data da liquidação (vencimento da 1ª parcela do crédito); default = hoje quando ausente.
export function parseSettlementDate(value: unknown): Date {
  return parseOptionalDate(value, "settlementDate") ?? new Date();
}

export function parseDateRange(fromValue: unknown, toValue: unknown): { from?: Date; to?: Date } {
  const from = parseOptionalDate(fromValue, "from");
  const to = parseOptionalDate(toValue, "to");

  if (from && to && from.getTime() > to.getTime()) {
    throw new CommissionError(400, "COMMISSION_FILTER_INVALID", "invalid_date_range", "from must be before or equal to to.");
  }

  return { from, to };
}

export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") return 20;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new CommissionError(400, "COMMISSION_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 100.");
  }

  return parsed;
}

export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new CommissionError(400, "COMMISSION_FILTER_INVALID", "invalid_offset", "offset must be greater than or equal to zero.");
  }

  return parsed;
}

export function parsePositiveInteger(value: unknown, field: string, fallback: number): number {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new CommissionError(400, "COMMISSION_INVALID", "invalid_number", `${field} must be a positive integer.`);
  }

  return parsed;
}

export function parseNonNegativeNumber(value: unknown, field: string): number {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new CommissionError(400, "COMMISSION_INVALID", "invalid_number", `${field} must be a non-negative number.`);
  }

  return parsed;
}

export function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;

  throw new CommissionError(400, "COMMISSION_INVALID", "invalid_boolean", "active must be a boolean.");
}

export function parsePolicyStatus(value: unknown, fallback: CommissionPolicyStatus = "draft"): CommissionPolicyStatus {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = typeof value === "string" ? value.trim() : "";

  if (COMMISSION_POLICY_STATUSES.includes(normalized as CommissionPolicyStatus)) {
    return normalized as CommissionPolicyStatus;
  }

  throw new CommissionError(400, "COMMISSION_INVALID", "invalid_policy_status", "policy status is invalid.");
}

export function parseBasisEventStatus(value: unknown, fallback: CommissionBasisEventStatus = "received"): CommissionBasisEventStatus {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = typeof value === "string" ? value.trim() : "";

  if (COMMISSION_BASIS_EVENT_STATUSES.includes(normalized as CommissionBasisEventStatus)) {
    return normalized as CommissionBasisEventStatus;
  }

  throw new CommissionError(400, "COMMISSION_INVALID", "invalid_basis_event_status", "basis event status is invalid.");
}

export function parseCalculationStatus(value: unknown): CommissionCalculationStatus | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const normalized = typeof value === "string" ? value.trim() : "";

  if (COMMISSION_CALCULATION_STATUSES.includes(normalized as CommissionCalculationStatus)) {
    return normalized as CommissionCalculationStatus;
  }

  throw new CommissionError(400, "COMMISSION_FILTER_INVALID", "invalid_calculation_status", "calculation status is invalid.");
}

export function parseStatementStatus(value: unknown): CommissionStatementStatus | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const normalized = typeof value === "string" ? value.trim() : "";

  if (COMMISSION_STATEMENT_STATUSES.includes(normalized as CommissionStatementStatus)) {
    return normalized as CommissionStatementStatus;
  }

  throw new CommissionError(400, "COMMISSION_FILTER_INVALID", "invalid_statement_status", "statement status is invalid.");
}

export function sanitizeJsonRecord(value: unknown): CommissionJsonRecord {
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

export function parseRateType(value: unknown): CommissionRateType {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (normalized === "percent" || normalized === "fixed") {
    return normalized;
  }
  throw new CommissionError(422, "COMMISSION_RATE_INVALID", "invalid_rate_type", "rateType must be 'percent' or 'fixed'.");
}

export function parseRateValueText(value: unknown, rateType: CommissionRateType): string {
  if (typeof value !== "string") {
    throw new CommissionError(422, "COMMISSION_RATE_INVALID", "invalid_rate_value", "rateValue must be a decimal string.");
  }
  const trimmed = value.trim();
  const maxDecimals = rateType === "percent" ? 4 : 2;
  const pattern = rateType === "percent" ? /^(\d+)(?:\.(\d{1,4}))?$/ : /^(\d+)(?:\.(\d{1,2}))?$/;
  const match = pattern.exec(trimmed);
  if (!match) {
    throw new CommissionError(
      422,
      "COMMISSION_RATE_INVALID",
      "invalid_rate_value",
      `rateValue must be a non-negative decimal string with up to ${maxDecimals} decimal places.`,
    );
  }
  const intPart = BigInt(match[1]!);
  const fracRaw = match[2] ?? "";
  const scaled = intPart * 10n ** BigInt(maxDecimals) + BigInt(fracRaw.padEnd(maxDecimals, "0") || "0");
  const maxScaled = rateType === "percent" ? 1_000_000n : 9_999_999n;
  if (scaled < 0n || scaled > maxScaled) {
    throw new CommissionError(
      422,
      "COMMISSION_RATE_INVALID",
      "invalid_rate_value",
      rateType === "percent" ? "rateValue must be between 0 and 100." : "rateValue must be between 0.00 and 99999.99.",
    );
  }
  if (rateType === "fixed") {
    return `${intPart.toString()}.${fracRaw.padEnd(2, "0")}`;
  }
  const cleanFrac = fracRaw.replace(/0+$/, "");
  return cleanFrac.length > 0 ? `${intPart.toString()}.${cleanFrac}` : intPart.toString();
}

export function parseRateReason(value: unknown): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (normalized.length < 5 || normalized.length > 300) {
    throw new CommissionError(
      422,
      "COMMISSION_RATE_INVALID",
      "reason_required",
      "reason is required and must be between 5 and 300 characters.",
    );
  }
  return normalized;
}

export function parseExpectedRuleId(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string" || !uuidPattern.test(value.trim())) {
    throw new CommissionError(422, "COMMISSION_RATE_INVALID", "invalid_expected_rule_id", "expectedRuleId must be a valid UUID or null.");
  }
  return value.trim();
}

export function parseOptionalBucket(value: unknown): CommissionBucket | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const normalized = typeof value === "string" ? value.trim() : "";
  if (COMMISSION_BUCKETS.includes(normalized as CommissionBucket)) {
    return normalized as CommissionBucket;
  }
  throw new CommissionError(
    400,
    "COMMISSION_FILTER_INVALID",
    "invalid_bucket",
    "bucket must be one of: to_receive, forecast, paid, no_rule, review.",
  );
}

export function parseOptionalMonth(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const normalized = typeof value === "string" ? value.trim() : "";
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(normalized);
  if (!match) {
    throw new CommissionError(
      400,
      "COMMISSION_FILTER_INVALID",
      "invalid_month",
      "month must be in YYYY-MM format.",
    );
  }
  return normalized;
}

export function parseOverviewMonths(value: unknown): 3 | 6 | 12 {
  if (value === undefined || value === null || value === "") return 6;
  const parsed = Number.parseInt(String(value), 10);
  if (parsed === 3 || parsed === 6 || parsed === 12) {
    return parsed;
  }
  throw new CommissionError(
    400,
    "COMMISSION_FILTER_INVALID",
    "invalid_months",
    "months must be 3, 6, or 12.",
  );
}
