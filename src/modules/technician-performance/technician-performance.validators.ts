import { TechnicianPerformanceError } from "./technician-performance.types.js";

function invalidFilter(reason: string, message: string): TechnicianPerformanceError {
  return new TechnicianPerformanceError(400, "TECHNICIAN_PERFORMANCE_FILTER_INVALID", reason, message);
}

export function parseOptionalUuid(value: unknown, reason: string, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw invalidFilter(reason, `${field} is invalid.`);
  }

  return normalized;
}

export function parseOptionalDate(value: unknown, reason: string, field: string): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    throw invalidFilter(reason, `${field} must be a valid date.`);
  }

  return parsed;
}
