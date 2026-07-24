import {
  TELEMETRY_EVENT_TYPES,
  TELEMETRY_SIGNAL_TYPES,
  TelemetryError,
  type TelemetryEventType,
  type TelemetrySignalType,
} from "./telemetry.types.js";

export const TELEMETRY_MAX_BATCH_SIZE = 50;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TEXT_LENGTH = 120;

export type ParsedTelemetryEvent = {
  readonly clientActionId: string;
  readonly eventType: TelemetryEventType;
  readonly capturedAt: Date;
  readonly lat?: number;
  readonly lng?: number;
  readonly accuracyM?: number;
  readonly speedKmh?: number;
  readonly batteryPct?: number;
  readonly signalType?: TelemetrySignalType;
  readonly appVersion?: string;
  readonly deviceModel?: string;
  readonly sdkInt?: number;
  readonly refusalReason?: string;
  readonly workOrderId?: string;
};

export type ParsedTelemetryBatch = {
  readonly clientBatchId: string | null;
  readonly events: readonly ParsedTelemetryEvent[];
};

type RawRecord = Record<string, unknown>;

export function parseTelemetryBatch(body: unknown): ParsedTelemetryBatch {
  const record = asRecord(body, "body");
  const clientBatchId = optionalString(record.client_batch_id ?? record.clientBatchId);

  if (!Array.isArray(record.events)) {
    throw validation("invalid_envelope", "events must be an array.");
  }

  if (record.events.length === 0) {
    throw validation("empty_batch", "events must contain at least one item.");
  }

  if (record.events.length > TELEMETRY_MAX_BATCH_SIZE) {
    throw validation("batch_too_large", `events must contain at most ${TELEMETRY_MAX_BATCH_SIZE} items.`);
  }

  return {
    clientBatchId,
    events: record.events.map(parseTelemetryEvent),
  };
}

export function parseTelemetryEvent(value: unknown): ParsedTelemetryEvent {
  const record = asRecord(value, "event");

  const eventType = parseEventType(record.eventType ?? record.event_type);
  const coordinate = parseCoordinatePair(record.lat, record.lng);

  return {
    clientActionId: requiredString(record.client_action_id ?? record.clientActionId, "client_action_id"),
    eventType,
    capturedAt: requiredDate(record.capturedAt ?? record.captured_at, "capturedAt"),
    ...(coordinate.lat !== undefined ? { lat: coordinate.lat, lng: coordinate.lng } : {}),
    ...(optionalNonNegative(record.accuracyM ?? record.accuracy_m, "accuracyM") !== undefined
      ? { accuracyM: optionalNonNegative(record.accuracyM ?? record.accuracy_m, "accuracyM") }
      : {}),
    ...(optionalNonNegative(record.speedKmh ?? record.speed_kmh, "speedKmh") !== undefined
      ? { speedKmh: optionalNonNegative(record.speedKmh ?? record.speed_kmh, "speedKmh") }
      : {}),
    ...(parseBatteryPct(record.batteryPct ?? record.battery_pct) !== undefined
      ? { batteryPct: parseBatteryPct(record.batteryPct ?? record.battery_pct) }
      : {}),
    ...(parseSignalType(record.signalType ?? record.signal_type) !== undefined
      ? { signalType: parseSignalType(record.signalType ?? record.signal_type) }
      : {}),
    ...(optionalText(record.appVersion ?? record.app_version) !== undefined
      ? { appVersion: optionalText(record.appVersion ?? record.app_version) }
      : {}),
    ...(optionalText(record.deviceModel ?? record.device_model) !== undefined
      ? { deviceModel: optionalText(record.deviceModel ?? record.device_model) }
      : {}),
    ...(parseSdkInt(record.sdkInt ?? record.sdk_int) !== undefined
      ? { sdkInt: parseSdkInt(record.sdkInt ?? record.sdk_int) }
      : {}),
    ...(optionalText(record.refusalReason ?? record.refusal_reason) !== undefined
      ? { refusalReason: optionalText(record.refusalReason ?? record.refusal_reason) }
      : {}),
    ...(optionalUuid(record.workOrderId ?? record.work_order_id, "workOrderId") !== undefined
      ? { workOrderId: optionalUuid(record.workOrderId ?? record.work_order_id, "workOrderId") }
      : {}),
  };
}

export function parseProfessionalId(value: unknown): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw validation("professional_required", "professionalId is required.");
  }
  if (!UUID_PATTERN.test(normalized)) {
    throw validation("invalid_professional", "professionalId must be a valid UUID.");
  }
  return normalized;
}

export function parseDateFilter(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requiredDate(value, field);
}

function parseEventType(value: unknown): TelemetryEventType {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!TELEMETRY_EVENT_TYPES.includes(normalized as TelemetryEventType)) {
    throw validation("invalid_event_type", "eventType is not supported.");
  }
  return normalized as TelemetryEventType;
}

function parseCoordinatePair(latValue: unknown, lngValue: unknown): { lat?: number; lng?: number } {
  const latEmpty = isEmpty(latValue);
  const lngEmpty = isEmpty(lngValue);
  if (latEmpty && lngEmpty) return {};
  if (latEmpty !== lngEmpty) {
    throw validation("invalid_coordinate", "lat and lng must be provided together.");
  }
  const lat = assertCoordinate(latValue, "lat", -90, 90);
  const lng = assertCoordinate(lngValue, "lng", -180, 180);
  return { lat, lng };
}

function assertCoordinate(value: unknown, field: string, min: number, max: number): number {
  const parsed = parseNumber(value, field);
  if (parsed < min || parsed > max) {
    throw validation("invalid_coordinate", `${field} must be between ${min} and ${max}.`);
  }
  return parsed;
}

function parseBatteryPct(value: unknown): number | undefined {
  if (isEmpty(value)) return undefined;
  const parsed = parseNumber(value, "batteryPct");
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
    throw validation("invalid_battery", "batteryPct must be an integer between 0 and 100.");
  }
  return parsed;
}

function parseSignalType(value: unknown): TelemetrySignalType | undefined {
  if (isEmpty(value)) return undefined;
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!TELEMETRY_SIGNAL_TYPES.includes(normalized as TelemetrySignalType)) {
    throw validation("invalid_signal_type", "signalType is not supported.");
  }
  return normalized as TelemetrySignalType;
}

function parseSdkInt(value: unknown): number | undefined {
  if (isEmpty(value)) return undefined;
  const parsed = parseNumber(value, "sdkInt");
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw validation("invalid_sdk_int", "sdkInt must be a non-negative integer.");
  }
  return parsed;
}

function optionalNonNegative(value: unknown, field: string): number | undefined {
  if (isEmpty(value)) return undefined;
  const parsed = parseNumber(value, field);
  if (parsed < 0) {
    throw validation("invalid_number", `${field} must be greater than or equal to zero.`);
  }
  return parsed;
}

function optionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().slice(0, MAX_TEXT_LENGTH);
  return normalized || undefined;
}

function optionalUuid(value: unknown, field: string): string | undefined {
  if (isEmpty(value)) return undefined;
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!UUID_PATTERN.test(normalized)) {
    throw validation("invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

function requiredString(value: unknown, field: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw validation("required_field", `${field} is required.`);
  }
  return normalized.slice(0, MAX_TEXT_LENGTH);
}

function optionalString(value: unknown): string | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
}

function requiredDate(value: unknown, field: string): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(typeof value === "string" || typeof value === "number" ? value : "");
  if (Number.isNaN(parsed.getTime())) {
    throw validation("invalid_date", `${field} must be a valid ISO date.`);
  }
  return parsed;
}

function parseNumber(value: unknown, field: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw validation("invalid_number", `${field} must be a finite number.`);
  }
  return parsed;
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

function asRecord(value: unknown, field: string): RawRecord {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as RawRecord;
  }
  throw validation("invalid_envelope", `${field} must be an object.`);
}

function validation(reason: string, message: string): TelemetryError {
  return new TelemetryError(422, "TELEMETRY_VALIDATION", reason, message);
}
