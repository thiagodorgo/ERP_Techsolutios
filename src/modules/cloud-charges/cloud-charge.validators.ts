import {
  CloudChargeError,
  type CloudChargeCalculationRunFilters,
  type CloudChargeRuleFilters,
  type CreateCloudChargeCalculationRunInput,
  type CreateCloudChargeRuleInput,
  type TenantCloudChargeFilters,
  type UpdateCloudChargeRuleInput,
} from "./cloud-charge.types.js";
import {
  isCloudChargeCalculationStrategy,
  isCloudChargeMarkupType,
  isCloudChargeRoundingMode,
} from "./cloud-charge.service.js";

export function parseCreateCloudChargeRuleBody(body: Record<string, unknown>): CreateCloudChargeRuleInput {
  return {
    tenantId: readOptionalString(body.tenantId),
    planCode: readOptionalString(body.planCode),
    name: readRequiredString(body.name, "name"),
    description: readOptionalString(body.description),
    isActive: readOptionalBoolean(body.isActive),
    priority: readOptionalNumber(body.priority),
    effectiveFrom: readRequiredDate(body.effectiveFrom, "effectiveFrom"),
    effectiveUntil: readOptionalDate(body.effectiveUntil, "effectiveUntil"),
    currency: readRequiredString(body.currency, "currency"),
    markupType: readMarkupType(body.markupType),
    markupValue: readRequiredNumber(body.markupValue, "markupValue"),
    minimumMonthlyCharge: readOptionalNumber(body.minimumMonthlyCharge),
    includedCloudCost: readOptionalNumber(body.includedCloudCost),
    includedUsageAmount: readOptionalNumber(body.includedUsageAmount),
    includedUsageMetricKey: readOptionalString(body.includedUsageMetricKey),
    overageMarkupType: readOptionalMarkupType(body.overageMarkupType),
    overageMarkupValue: readOptionalNumber(body.overageMarkupValue),
    roundingMode: readOptionalRoundingMode(body.roundingMode),
    metadata: readMetadata(body.metadata),
  };
}

export function parseUpdateCloudChargeRuleBody(body: Record<string, unknown>): UpdateCloudChargeRuleInput {
  return {
    tenantId: body.tenantId === null ? undefined : readOptionalString(body.tenantId),
    planCode: body.planCode === null ? undefined : readOptionalString(body.planCode),
    name: readOptionalString(body.name),
    description: body.description === null ? undefined : readOptionalString(body.description),
    isActive: readOptionalBoolean(body.isActive),
    priority: readOptionalNumber(body.priority),
    effectiveFrom: readOptionalDate(body.effectiveFrom, "effectiveFrom"),
    effectiveUntil: body.effectiveUntil === null ? undefined : readOptionalDate(body.effectiveUntil, "effectiveUntil"),
    currency: readOptionalString(body.currency),
    markupType: readOptionalMarkupType(body.markupType),
    markupValue: readOptionalNumber(body.markupValue),
    minimumMonthlyCharge: readOptionalNumber(body.minimumMonthlyCharge),
    includedCloudCost: readOptionalNumber(body.includedCloudCost),
    includedUsageAmount: body.includedUsageAmount === null ? undefined : readOptionalNumber(body.includedUsageAmount),
    includedUsageMetricKey: body.includedUsageMetricKey === null ? undefined : readOptionalString(body.includedUsageMetricKey),
    overageMarkupType: body.overageMarkupType === null ? undefined : readOptionalMarkupType(body.overageMarkupType),
    overageMarkupValue: body.overageMarkupValue === null ? undefined : readOptionalNumber(body.overageMarkupValue),
    roundingMode: readOptionalRoundingMode(body.roundingMode),
    metadata: readMetadata(body.metadata),
  };
}

export function parseCreateCalculationRunBody(body: Record<string, unknown>): CreateCloudChargeCalculationRunInput {
  return {
    periodStart: readRequiredDate(body.periodStart, "periodStart"),
    periodEnd: readRequiredDate(body.periodEnd, "periodEnd"),
    sourceAllocationRunId: readRequiredString(body.sourceAllocationRunId, "sourceAllocationRunId"),
    strategy: readOptionalStrategy(body.strategy),
    metadata: readMetadata(body.metadata),
  };
}

export function parseRuleFilters(query: Record<string, unknown>): CloudChargeRuleFilters {
  return {
    tenantId: readOptionalString(query.tenantId),
    planCode: readOptionalString(query.planCode),
    isActive: readOptionalBoolean(query.isActive),
  };
}

export function parseCalculationRunFilters(query: Record<string, unknown>): CloudChargeCalculationRunFilters {
  return {
    periodStart: readOptionalDate(query.periodStart, "periodStart"),
    periodEnd: readOptionalDate(query.periodEnd, "periodEnd"),
    status: readOptionalString(query.status) as CloudChargeCalculationRunFilters["status"],
    sourceAllocationRunId: readOptionalString(query.sourceAllocationRunId),
  };
}

export function parseTenantChargeFilters(query: Record<string, unknown>): TenantCloudChargeFilters {
  return {
    tenantId: readOptionalString(query.tenantId),
    status: readOptionalString(query.status) as TenantCloudChargeFilters["status"],
  };
}

function readMarkupType(value: unknown): CreateCloudChargeRuleInput["markupType"] {
  const raw = readRequiredString(value, "markupType");
  if (!isCloudChargeMarkupType(raw)) throw invalid("markup_type_invalid", `Invalid markup type: ${raw}.`);
  return raw;
}

function readOptionalMarkupType(value: unknown): CreateCloudChargeRuleInput["markupType"] | undefined {
  const raw = readOptionalString(value);
  if (!raw) return undefined;
  if (!isCloudChargeMarkupType(raw)) throw invalid("markup_type_invalid", `Invalid markup type: ${raw}.`);
  return raw;
}

function readOptionalRoundingMode(value: unknown): CreateCloudChargeRuleInput["roundingMode"] | undefined {
  const raw = readOptionalString(value);
  if (!raw) return undefined;
  if (!isCloudChargeRoundingMode(raw)) throw invalid("rounding_mode_invalid", `Invalid rounding mode: ${raw}.`);
  return raw;
}

function readOptionalStrategy(value: unknown): CreateCloudChargeCalculationRunInput["strategy"] | undefined {
  const raw = readOptionalString(value);
  if (!raw) return undefined;
  if (!isCloudChargeCalculationStrategy(raw)) throw invalid("strategy_invalid", `Invalid charge calculation strategy: ${raw}.`);
  return raw;
}

function readRequiredString(value: unknown, field: string): string {
  const normalized = readOptionalString(value);
  if (!normalized) throw invalid(`${field}_required`, `${field} is required.`);
  return normalized;
}

function readOptionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

function readRequiredNumber(value: unknown, field: string): number {
  const number = readOptionalNumber(value);
  if (number === undefined) throw invalid(`${field}_required`, `${field} is required.`);
  return number;
}

function readOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) throw invalid("number_invalid", "Numeric field is invalid.");
  return number;
}

function readOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw invalid("boolean_invalid", "Boolean field is invalid.");
}

function readRequiredDate(value: unknown, field: string): Date {
  const date = readOptionalDate(value, field);
  if (!date) throw invalid(`${field}_required`, `${field} is required.`);
  return date;
}

function readOptionalDate(value: unknown, field: string): Date | undefined {
  const raw = readOptionalString(value);
  if (!raw) return undefined;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw invalid(`${field}_invalid`, `${field} is invalid.`);
  return date;
}

function readMetadata(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw invalid("metadata_invalid", "metadata must be an object.");
}

function invalid(reason: string, message: string): CloudChargeError {
  return new CloudChargeError(400, "CLOUD_CHARGE_INVALID", reason, message);
}
