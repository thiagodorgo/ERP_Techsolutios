import { env } from "../../config/env.js";
import { publishDomainEvent } from "../../infra/events/domain-event.publisher.js";
import {
  InMemoryFieldLocationRepository,
  type FieldLocationRepository,
} from "./field-location.repository.js";
import {
  FieldLocationError,
  FIELD_LOCATION_SOURCES,
  type FieldLocationActorContext,
  type FieldOperatorLocation,
  type JsonRecord,
  type ListFieldLocationHistoryInput,
  type ListLatestFieldLocationsInput,
  type RecordFieldLocationInput,
} from "./field-location.types.js";

export class FieldLocationService {
  constructor(private readonly repository: FieldLocationRepository) {}

  async recordMobileLocation(
    actor: FieldLocationActorContext,
    input: Omit<RecordFieldLocationInput, "tenantId" | "operatorUserId" | "source"> & {
      readonly source?: unknown;
    },
  ): Promise<FieldOperatorLocation> {
    const location = await this.repository.record({
      tenantId: actor.tenantId,
      operatorUserId: actor.userId,
      source: parseSource(input.source, "mobile"),
      latitude: assertCoordinate(input.latitude, "latitude", -90, 90),
      longitude: assertCoordinate(input.longitude, "longitude", -180, 180),
      accuracyMeters: parseNonNegative(input.accuracyMeters, "accuracyMeters"),
      headingDegrees: parseHeading(input.headingDegrees),
      speedMetersPerSecond: parseNonNegative(input.speedMetersPerSecond, "speedMetersPerSecond"),
      batteryLevel: parseBatteryLevel(input.batteryLevel),
      recordedAt: input.recordedAt ? parseDate(input.recordedAt, "recordedAt") : new Date(),
      metadata: sanitizeLocationMetadata(input.metadata),
    });

    await publishDomainEvent(
      "field_location.updated",
      {
        entity_type: "field_operator_location",
        entity_id: location.id,
        operator_user_id: actor.userId,
        source: location.source,
      },
      { tenantId: actor.tenantId, actorId: actor.userId },
    );

    return location;
  }

  listLatest(
    actor: FieldLocationActorContext,
    input: Omit<ListLatestFieldLocationsInput, "tenantId">,
  ): Promise<readonly FieldOperatorLocation[]> {
    return this.repository.listLatest({
      tenantId: actor.tenantId,
      since: input.since,
      limit: normalizeLimit(input.limit),
    });
  }

  listHistory(
    actor: FieldLocationActorContext,
    input: Omit<ListFieldLocationHistoryInput, "tenantId">,
  ): Promise<readonly FieldOperatorLocation[]> {
    if (!input.operatorUserId.trim()) {
      throw new FieldLocationError(400, "FIELD_LOCATION_FILTER_INVALID", "operator_required", "operatorUserId is required.");
    }

    return this.repository.listHistory({
      tenantId: actor.tenantId,
      operatorUserId: input.operatorUserId.trim(),
      from: input.from,
      to: input.to,
      limit: normalizeLimit(input.limit),
    });
  }
}

const sensitiveKeyPattern =
  /(authorization|access_?token|refresh_?token|password|passwd|pwd|secret|api_?key|token_hash|password_hash|refresh_token_hash|private_url|privateurl|path)/i;

function assertCoordinate(value: unknown, field: string, min: number, max: number): number {
  const parsed = parseNumber(value, field);

  if (parsed < min || parsed > max) {
    throw new FieldLocationError(400, "FIELD_LOCATION_INVALID", "invalid_coordinate", `${field} must be between ${min} and ${max}.`);
  }

  return parsed;
}

function parseNonNegative(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = parseNumber(value, field);

  if (parsed < 0) {
    throw new FieldLocationError(400, "FIELD_LOCATION_INVALID", "invalid_number", `${field} must be greater than or equal to zero.`);
  }

  return parsed;
}

function parseHeading(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = parseNumber(value, "headingDegrees");

  if (parsed < 0 || parsed > 360) {
    throw new FieldLocationError(400, "FIELD_LOCATION_INVALID", "invalid_heading", "headingDegrees must be between 0 and 360.");
  }

  return parsed;
}

function parseBatteryLevel(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = parseNumber(value, "batteryLevel");

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
    throw new FieldLocationError(400, "FIELD_LOCATION_INVALID", "invalid_battery", "batteryLevel must be an integer between 0 and 100.");
  }

  return parsed;
}

function parseNumber(value: unknown, field: string): number {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new FieldLocationError(400, "FIELD_LOCATION_INVALID", "invalid_number", `${field} must be a finite number.`);
  }

  return parsed;
}

function parseDate(value: unknown, field: string): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(typeof value === "string" ? value : "");

  if (Number.isNaN(parsed.getTime())) {
    throw new FieldLocationError(400, "FIELD_LOCATION_INVALID", "invalid_date", `${field} must be a valid ISO date.`);
  }

  return parsed;
}

function normalizeLimit(value: number | undefined): number {
  if (value === undefined) return 100;
  if (!Number.isInteger(value) || value < 1 || value > 500) {
    throw new FieldLocationError(400, "FIELD_LOCATION_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 500.");
  }

  return value;
}

function parseSource(value: unknown, fallback: "mobile") {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = typeof value === "string" ? value.trim() : "";

  if (FIELD_LOCATION_SOURCES.includes(normalized as never)) {
    return normalized as "mobile" | "web" | "system";
  }

  throw new FieldLocationError(400, "FIELD_LOCATION_INVALID", "invalid_source", "source is invalid.");
}

export function parseFieldLocationDateFilter(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseDate(value, field);
}

export function parseFieldLocationLimit(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number.parseInt(String(value), 10);

  return normalizeLimit(parsed);
}

function sanitizeLocationMetadata(metadata: JsonRecord | undefined): JsonRecord {
  if (!metadata) return {};

  return compactRecord(sanitizeRecord(metadata));
}

function sanitizeRecord(metadata: JsonRecord): JsonRecord {
  const sanitized: JsonRecord = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (sensitiveKeyPattern.test(key)) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    sanitized[key] = sanitizeValue(value);
  }

  return sanitized;
}

function sanitizeValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(sanitizeValue).filter((item) => item !== undefined);
  if (typeof value === "object" && value !== null) return sanitizeRecord(value as JsonRecord);
  return value;
}

function compactRecord(input: JsonRecord): JsonRecord {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

const memoryRepository = new InMemoryFieldLocationRepository();
let defaultServicePromise: Promise<FieldLocationService> | undefined;

export function createMemoryFieldLocationService(): FieldLocationService {
  return new FieldLocationService(memoryRepository);
}

export function getMemoryFieldLocationRepositoryForTests(): InMemoryFieldLocationRepository {
  return memoryRepository;
}

export async function createDefaultFieldLocationService(): Promise<FieldLocationService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryFieldLocationService();
  }

  defaultServicePromise ??= createPrismaFieldLocationService();

  return defaultServicePromise;
}

export function resetFieldLocationRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaFieldLocationService(): Promise<FieldLocationService> {
  const { createPrismaFieldLocationRepository } = await import("./field-location-prisma.repository.js");
  const repository = await createPrismaFieldLocationRepository();

  return new FieldLocationService(repository);
}
