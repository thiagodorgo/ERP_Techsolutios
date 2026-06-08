import { randomUUID } from "node:crypto";

import type {
  CloudUsageDailyAggregate,
  CloudUsageEvent,
  CloudUsageFilters,
  CloudUsageMetricKey,
  CloudUsageUnit,
  RecordUsageEventInput,
} from "./cloud-usage.types.js";

export interface CloudUsageRepository {
  createEvent(input: RecordUsageEventInput): Promise<CloudUsageEvent>;
  createManyEvents(inputs: readonly RecordUsageEventInput[]): Promise<readonly CloudUsageEvent[]>;
  listEvents(filters: CloudUsageFilters): Promise<readonly CloudUsageEvent[]>;
  upsertDailyAggregate(input: {
    readonly tenantId: string;
    readonly date: string;
    readonly metricKey: CloudUsageMetricKey;
    readonly quantity: number;
    readonly unit: CloudUsageUnit;
    readonly sourceType: string;
    readonly metadata: Record<string, unknown>;
  }): Promise<CloudUsageDailyAggregate>;
  listDailyAggregates(filters: CloudUsageFilters): Promise<readonly CloudUsageDailyAggregate[]>;
}

export class InMemoryCloudUsageRepository implements CloudUsageRepository {
  private readonly events = new Map<string, CloudUsageEvent>();
  private readonly dailyAggregates = new Map<string, CloudUsageDailyAggregate>();

  async createEvent(input: RecordUsageEventInput): Promise<CloudUsageEvent> {
    if (input.idempotencyKey) {
      const existing = [...this.events.values()].find(
        (event) => event.tenantId === input.tenantId && event.idempotencyKey === input.idempotencyKey,
      );

      if (existing) return existing;
    }

    const now = new Date();
    const event: CloudUsageEvent = {
      id: randomUUID(),
      tenantId: input.tenantId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      metricKey: input.metricKey,
      quantity: input.quantity,
      unit: input.unit,
      occurredAt: input.occurredAt ?? now,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata ?? {},
      createdAt: now,
    };

    this.events.set(event.id, event);

    return event;
  }

  async createManyEvents(inputs: readonly RecordUsageEventInput[]): Promise<readonly CloudUsageEvent[]> {
    const events: CloudUsageEvent[] = [];

    for (const input of inputs) {
      events.push(await this.createEvent(input));
    }

    return events;
  }

  async listEvents(filters: CloudUsageFilters): Promise<readonly CloudUsageEvent[]> {
    return [...this.events.values()]
      .filter((event) => matchesFilters(event, filters))
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
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
    const key = dailyKey(input);
    const existing = this.dailyAggregates.get(key);
    const now = new Date();
    const aggregate: CloudUsageDailyAggregate = {
      id: existing?.id ?? randomUUID(),
      tenantId: input.tenantId,
      date: input.date,
      metricKey: input.metricKey,
      quantity: input.quantity,
      unit: input.unit,
      sourceType: input.sourceType,
      metadata: input.metadata,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.dailyAggregates.set(key, aggregate);

    return aggregate;
  }

  async listDailyAggregates(filters: CloudUsageFilters): Promise<readonly CloudUsageDailyAggregate[]> {
    return [...this.dailyAggregates.values()]
      .filter((aggregate) => matchesAggregateFilters(aggregate, filters))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  reset(): void {
    this.events.clear();
    this.dailyAggregates.clear();
  }
}

function matchesFilters(event: CloudUsageEvent, filters: CloudUsageFilters): boolean {
  if (filters.tenantId && event.tenantId !== filters.tenantId) return false;
  if (filters.metricKey && event.metricKey !== filters.metricKey) return false;
  if (filters.periodStart && event.occurredAt < filters.periodStart) return false;
  if (filters.periodEnd && event.occurredAt > filters.periodEnd) return false;
  return true;
}

function matchesAggregateFilters(aggregate: CloudUsageDailyAggregate, filters: CloudUsageFilters): boolean {
  if (filters.tenantId && aggregate.tenantId !== filters.tenantId) return false;
  if (filters.metricKey && aggregate.metricKey !== filters.metricKey) return false;
  if (filters.periodStart && aggregate.date < toDateKey(filters.periodStart)) return false;
  if (filters.periodEnd && aggregate.date > toDateKey(filters.periodEnd)) return false;
  return true;
}

function dailyKey(input: { readonly tenantId: string; readonly date: string; readonly metricKey: string; readonly unit: string; readonly sourceType: string }): string {
  return [input.tenantId, input.date, input.metricKey, input.unit, input.sourceType].join("|");
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
