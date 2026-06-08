import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  CloudUsageDailyAggregate,
  CloudUsageEvent,
  CloudUsageFilters,
  CloudUsageMetricKey,
  CloudUsageUnit,
  RecordUsageEventInput,
} from "./cloud-usage.types.js";
import type { CloudUsageRepository } from "./cloud-usage.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaCloudUsageRepository implements CloudUsageRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async createEvent(input: RecordUsageEventInput): Promise<CloudUsageEvent> {
    if (input.idempotencyKey) {
      const existing = await this.client.cloudUsageEvent.findUnique({
        where: {
          tenant_id_idempotency_key: {
            tenant_id: input.tenantId,
            idempotency_key: input.idempotencyKey,
          },
        },
      });

      if (existing) return mapEvent(existing);
    }

    const event = await this.client.cloudUsageEvent.create({
      data: {
        tenant_id: input.tenantId,
        source_type: input.sourceType,
        source_id: input.sourceId ?? null,
        metric_key: input.metricKey,
        quantity: input.quantity,
        unit: input.unit,
        occurred_at: input.occurredAt ?? new Date(),
        idempotency_key: input.idempotencyKey ?? null,
        metadata: toJsonObject(input.metadata ?? {}),
      },
    });

    return mapEvent(event);
  }

  async createManyEvents(inputs: readonly RecordUsageEventInput[]): Promise<readonly CloudUsageEvent[]> {
    const events: CloudUsageEvent[] = [];

    for (const input of inputs) {
      events.push(await this.createEvent(input));
    }

    return events;
  }

  async listEvents(filters: CloudUsageFilters): Promise<readonly CloudUsageEvent[]> {
    const events = await this.client.cloudUsageEvent.findMany({
      where: {
        ...(filters.tenantId ? { tenant_id: filters.tenantId } : {}),
        ...(filters.metricKey ? { metric_key: filters.metricKey } : {}),
        ...(filters.periodStart || filters.periodEnd
          ? {
              occurred_at: {
                ...(filters.periodStart ? { gte: filters.periodStart } : {}),
                ...(filters.periodEnd ? { lte: filters.periodEnd } : {}),
              },
            }
          : {}),
      },
      orderBy: {
        occurred_at: "asc",
      },
    });

    return events.map(mapEvent);
  }

  async upsertDailyAggregate(input: {
    readonly tenantId: string;
    readonly date: string;
    readonly metricKey: CloudUsageMetricKey;
    readonly quantity: number;
    readonly unit: CloudUsageUnit;
    readonly sourceType: string;
    readonly metadata: Record<string, unknown>;
  }): Promise<CloudUsageDailyAggregate> {
    const aggregate = await this.client.cloudUsageDailyAggregate.upsert({
      where: {
        tenant_id_date_metric_key_unit_source_type: {
          tenant_id: input.tenantId,
          date: new Date(`${input.date}T00:00:00.000Z`),
          metric_key: input.metricKey,
          unit: input.unit,
          source_type: input.sourceType,
        },
      },
      create: {
        tenant_id: input.tenantId,
        date: new Date(`${input.date}T00:00:00.000Z`),
        metric_key: input.metricKey,
        quantity: input.quantity,
        unit: input.unit,
        source_type: input.sourceType,
        metadata: toJsonObject(input.metadata),
      },
      update: {
        quantity: input.quantity,
        metadata: toJsonObject(input.metadata),
      },
    });

    return mapDailyAggregate(aggregate);
  }

  async listDailyAggregates(filters: CloudUsageFilters): Promise<readonly CloudUsageDailyAggregate[]> {
    const aggregates = await this.client.cloudUsageDailyAggregate.findMany({
      where: {
        ...(filters.tenantId ? { tenant_id: filters.tenantId } : {}),
        ...(filters.metricKey ? { metric_key: filters.metricKey } : {}),
        ...(filters.periodStart || filters.periodEnd
          ? {
              date: {
                ...(filters.periodStart ? { gte: dateOnly(filters.periodStart) } : {}),
                ...(filters.periodEnd ? { lte: dateOnly(filters.periodEnd) } : {}),
              },
            }
          : {}),
      },
      orderBy: {
        date: "asc",
      },
    });

    return aggregates.map(mapDailyAggregate);
  }
}

export class RlsPrismaCloudUsageRepository implements CloudUsageRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  createEvent(input: RecordUsageEventInput): Promise<CloudUsageEvent> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaCloudUsageRepository(tx).createEvent(input),
    );
  }

  createManyEvents(inputs: readonly RecordUsageEventInput[]): Promise<readonly CloudUsageEvent[]> {
    if (inputs.length === 0) return Promise.resolve([]);
    const tenantIds = new Set(inputs.map((input) => input.tenantId));

    if (tenantIds.size !== 1) {
      return Promise.reject(new Error("recordManyUsageEvents requires a single tenant."));
    }

    const [tenantId] = tenantIds;

    return withTenantRls(this.prismaClient, tenantId ?? "", (tx) =>
      new PrismaCloudUsageRepository(tx).createManyEvents(inputs),
    );
  }

  listEvents(filters: CloudUsageFilters): Promise<readonly CloudUsageEvent[]> {
    if (filters.tenantId) {
      return withTenantRls(this.prismaClient, filters.tenantId, (tx) =>
        new PrismaCloudUsageRepository(tx).listEvents(filters),
      );
    }

    return new PrismaCloudUsageRepository(this.prismaClient).listEvents(filters);
  }

  upsertDailyAggregate(input: {
    readonly tenantId: string;
    readonly date: string;
    readonly metricKey: CloudUsageMetricKey;
    readonly quantity: number;
    readonly unit: CloudUsageUnit;
    readonly sourceType: string;
    readonly metadata: Record<string, unknown>;
  }): Promise<CloudUsageDailyAggregate> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaCloudUsageRepository(tx).upsertDailyAggregate(input),
    );
  }

  listDailyAggregates(filters: CloudUsageFilters): Promise<readonly CloudUsageDailyAggregate[]> {
    if (filters.tenantId) {
      return withTenantRls(this.prismaClient, filters.tenantId, (tx) =>
        new PrismaCloudUsageRepository(tx).listDailyAggregates(filters),
      );
    }

    return new PrismaCloudUsageRepository(this.prismaClient).listDailyAggregates(filters);
  }
}

export async function createPrismaCloudUsageRepository(): Promise<RlsPrismaCloudUsageRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaCloudUsageRepository(prisma);
}

function mapEvent(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly source_type: string;
  readonly source_id: string | null;
  readonly metric_key: string;
  readonly quantity: unknown;
  readonly unit: string;
  readonly occurred_at: Date;
  readonly idempotency_key: string | null;
  readonly metadata: unknown;
  readonly created_at: Date;
}): CloudUsageEvent {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    sourceType: record.source_type,
    sourceId: record.source_id ?? undefined,
    metricKey: record.metric_key as CloudUsageMetricKey,
    quantity: Number(record.quantity),
    unit: record.unit as CloudUsageUnit,
    occurredAt: record.occurred_at,
    idempotencyKey: record.idempotency_key ?? undefined,
    metadata: isRecord(record.metadata) ? record.metadata : {},
    createdAt: record.created_at,
  };
}

function mapDailyAggregate(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly date: Date;
  readonly metric_key: string;
  readonly quantity: unknown;
  readonly unit: string;
  readonly source_type: string;
  readonly metadata: unknown;
  readonly created_at: Date;
  readonly updated_at: Date;
}): CloudUsageDailyAggregate {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    date: record.date.toISOString().slice(0, 10),
    metricKey: record.metric_key as CloudUsageMetricKey,
    quantity: Number(record.quantity),
    unit: record.unit as CloudUsageUnit,
    sourceType: record.source_type,
    metadata: isRecord(record.metadata) ? record.metadata : {},
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function toJsonObject(input: Record<string, unknown>): Prisma.InputJsonObject {
  return input as Prisma.InputJsonObject;
}

function dateOnly(date: Date): Date {
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
