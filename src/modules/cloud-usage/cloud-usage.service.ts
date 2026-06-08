import { env } from "../../config/env.js";
import {
  CLOUD_USAGE_METRIC_KEYS,
  CLOUD_USAGE_UNITS,
  CloudUsageError,
  type CloudUsageDailyAggregate,
  type CloudUsageFilters,
  type CloudUsageMetricKey,
  type CloudUsageSummary,
  type CloudUsageUnit,
  type RecordUsageEventInput,
} from "./cloud-usage.types.js";
import {
  InMemoryCloudUsageRepository,
  type CloudUsageRepository,
} from "./cloud-usage.repository.js";

const metricSet = new Set<string>(CLOUD_USAGE_METRIC_KEYS);
const unitSet = new Set<string>(CLOUD_USAGE_UNITS);

export class CloudUsageService {
  constructor(private readonly repository: CloudUsageRepository) {}

  async recordUsageEvent(input: RecordUsageEventInput) {
    const validated = validateInput(input);

    return this.repository.createEvent({
      ...validated,
      metadata: sanitizeCloudUsageMetadata(validated.metadata),
    });
  }

  async recordManyUsageEvents(inputs: readonly RecordUsageEventInput[]) {
    return this.repository.createManyEvents(
      inputs.map((input) => {
        const validated = validateInput(input);

        return {
          ...validated,
          metadata: sanitizeCloudUsageMetadata(validated.metadata),
        };
      }),
    );
  }

  async aggregateDailyUsage(date: Date): Promise<readonly CloudUsageDailyAggregate[]> {
    const dayStart = startOfUtcDay(date);
    const dayEnd = endOfUtcDay(date);
    const events = await this.repository.listEvents({
      periodStart: dayStart,
      periodEnd: dayEnd,
    });
    const groups = new Map<string, {
      tenantId: string;
      metricKey: CloudUsageMetricKey;
      quantity: number;
      unit: CloudUsageUnit;
      sourceType: string;
    }>();

    for (const event of events) {
      const key = [event.tenantId, event.metricKey, event.unit, event.sourceType].join("|");
      const existing = groups.get(key);

      groups.set(key, {
        tenantId: event.tenantId,
        metricKey: event.metricKey,
        quantity: (existing?.quantity ?? 0) + event.quantity,
        unit: event.unit,
        sourceType: event.sourceType,
      });
    }

    const aggregates: CloudUsageDailyAggregate[] = [];
    const dateKey = toDateKey(dayStart);

    for (const group of groups.values()) {
      aggregates.push(
        await this.repository.upsertDailyAggregate({
          ...group,
          date: dateKey,
          metadata: {
            generatedBy: "cloud-usage.aggregate-daily",
            eventWindowStart: dayStart.toISOString(),
            eventWindowEnd: dayEnd.toISOString(),
          },
        }),
      );
    }

    return aggregates;
  }

  async getTenantUsageSummary(tenantId: string, filters: CloudUsageFilters = {}): Promise<CloudUsageSummary> {
    return this.summarizeEvents({
      ...filters,
      tenantId,
    });
  }

  getTenantUsageDaily(tenantId: string, filters: CloudUsageFilters = {}) {
    return this.repository.listDailyAggregates({
      ...filters,
      tenantId,
    });
  }

  getPlatformUsageSummary(filters: CloudUsageFilters = {}) {
    return this.summarizeEvents(filters);
  }

  private async summarizeEvents(filters: CloudUsageFilters): Promise<CloudUsageSummary> {
    const normalized = normalizeFilters(filters);
    const events = await this.repository.listEvents(normalized);
    const groups = new Map<string, {
      metricKey: CloudUsageMetricKey;
      quantity: number;
      unit: CloudUsageUnit;
      sourceType: string;
    }>();

    for (const event of events) {
      const key = [event.metricKey, event.unit, event.sourceType].join("|");
      const existing = groups.get(key);

      groups.set(key, {
        metricKey: event.metricKey,
        quantity: (existing?.quantity ?? 0) + event.quantity,
        unit: event.unit,
        sourceType: event.sourceType,
      });
    }

    return {
      tenantId: normalized.tenantId,
      periodStart: normalized.periodStart.toISOString(),
      periodEnd: normalized.periodEnd.toISOString(),
      metrics: [...groups.values()].sort((a, b) => a.metricKey.localeCompare(b.metricKey)),
      generatedAt: new Date().toISOString(),
    };
  }
}

export function sanitizeCloudUsageMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!metadata) return {};
  return compactRecord(sanitizeRecord(metadata));
}

export function recordCloudUsageBestEffort(input: RecordUsageEventInput, logger: Pick<Console, "warn"> = console): void {
  createDefaultCloudUsageService()
    .then((service) => service.recordUsageEvent(input))
    .catch((error: unknown) => {
      logger.warn(
        {
          tenantId: input.tenantId,
          metricKey: input.metricKey,
          error: error instanceof Error ? error.message : "Unknown cloud usage metering error.",
        },
        "Cloud usage metering failed in best-effort mode.",
      );
    });
}

export function isCloudUsageMetricKey(value: string): value is CloudUsageMetricKey {
  return metricSet.has(value);
}

const memoryRepository = new InMemoryCloudUsageRepository();
let defaultServicePromise: Promise<CloudUsageService> | undefined;

export function createMemoryCloudUsageService(): CloudUsageService {
  return new CloudUsageService(memoryRepository);
}

export function getMemoryCloudUsageRepositoryForTests(): InMemoryCloudUsageRepository {
  return memoryRepository;
}

export async function createDefaultCloudUsageService(): Promise<CloudUsageService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryCloudUsageService();
  }

  defaultServicePromise ??= createPrismaCloudUsageService();

  return defaultServicePromise;
}

export function resetCloudUsageRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaCloudUsageService(): Promise<CloudUsageService> {
  const { createPrismaCloudUsageRepository } = await import("./cloud-usage-prisma.repository.js");

  return new CloudUsageService(await createPrismaCloudUsageRepository());
}

function validateInput(input: RecordUsageEventInput): RecordUsageEventInput {
  if (!input.tenantId.trim()) {
    throw new CloudUsageError(400, "CLOUD_USAGE_INVALID", "tenant_required", "Tenant id is required.");
  }

  if (!input.sourceType.trim()) {
    throw new CloudUsageError(400, "CLOUD_USAGE_INVALID", "source_type_required", "Source type is required.");
  }

  if (!metricSet.has(input.metricKey)) {
    throw new CloudUsageError(400, "CLOUD_USAGE_INVALID", "metric_key_invalid", `Invalid metric key: ${input.metricKey}.`);
  }

  if (!unitSet.has(input.unit)) {
    throw new CloudUsageError(400, "CLOUD_USAGE_INVALID", "unit_invalid", `Invalid cloud usage unit: ${input.unit}.`);
  }

  if (!Number.isFinite(input.quantity) || input.quantity < 0) {
    throw new CloudUsageError(400, "CLOUD_USAGE_INVALID", "quantity_invalid", "Cloud usage quantity must be >= 0.");
  }

  return input;
}

function normalizeFilters(filters: CloudUsageFilters): Required<Pick<CloudUsageFilters, "periodStart" | "periodEnd">> & CloudUsageFilters {
  const now = new Date();
  const periodEnd = filters.periodEnd ?? now;
  const periodStart = filters.periodStart ?? new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000);

  return {
    ...filters,
    periodStart,
    periodEnd,
  };
}

const sensitiveKeyPattern =
  /(authorization|access_?token|refresh_?token|password|passwd|pwd|secret|api_?key|token_hash|password_hash|refresh_token_hash|storage_key|storagekey|bucket|private_url|privateurl|path|body|payload|query)/i;

function sanitizeRecord(metadata: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

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
  if (typeof value === "object" && value !== null) return sanitizeRecord(value as Record<string, unknown>);
  return value;
}

function compactRecord(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
