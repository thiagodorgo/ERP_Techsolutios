import { randomUUID } from "node:crypto";

import type {
  FieldOperatorLocation,
  ListFieldLocationHistoryInput,
  ListLatestFieldLocationsInput,
  RecordFieldLocationInput,
} from "./field-location.types.js";

export interface FieldLocationRepository {
  record(input: RecordFieldLocationInput): Promise<FieldOperatorLocation>;
  listLatest(input: ListLatestFieldLocationsInput): Promise<readonly FieldOperatorLocation[]>;
  listHistory(input: ListFieldLocationHistoryInput): Promise<readonly FieldOperatorLocation[]>;
}

export class InMemoryFieldLocationRepository implements FieldLocationRepository {
  private readonly locations = new Map<string, FieldOperatorLocation>();

  async record(input: RecordFieldLocationInput): Promise<FieldOperatorLocation> {
    const now = new Date();
    const location: FieldOperatorLocation = {
      id: randomUUID(),
      tenantId: input.tenantId,
      operatorUserId: input.operatorUserId,
      source: input.source ?? "mobile",
      latitude: input.latitude,
      longitude: input.longitude,
      accuracyMeters: input.accuracyMeters,
      headingDegrees: input.headingDegrees,
      speedMetersPerSecond: input.speedMetersPerSecond,
      batteryLevel: input.batteryLevel,
      recordedAt: input.recordedAt ?? now,
      receivedAt: now,
      metadata: input.metadata ?? {},
    };

    this.locations.set(location.id, location);

    return location;
  }

  async listLatest(input: ListLatestFieldLocationsInput): Promise<readonly FieldOperatorLocation[]> {
    const latestByOperator = new Map<string, FieldOperatorLocation>();

    for (const location of this.sortedByRecordedAtDesc()) {
      if (location.tenantId !== input.tenantId) continue;
      if (input.since && location.recordedAt < input.since) continue;
      if (latestByOperator.has(location.operatorUserId)) continue;

      latestByOperator.set(location.operatorUserId, location);
      if (latestByOperator.size >= (input.limit ?? 100)) break;
    }

    return [...latestByOperator.values()];
  }

  async listHistory(input: ListFieldLocationHistoryInput): Promise<readonly FieldOperatorLocation[]> {
    return this.sortedByRecordedAtDesc()
      .filter((location) => location.tenantId === input.tenantId)
      .filter((location) => location.operatorUserId === input.operatorUserId)
      .filter((location) => !input.from || location.recordedAt >= input.from)
      .filter((location) => !input.to || location.recordedAt <= input.to)
      .slice(0, input.limit ?? 100);
  }

  reset(): void {
    this.locations.clear();
  }

  private sortedByRecordedAtDesc(): FieldOperatorLocation[] {
    return [...this.locations.values()].sort((a, b) => {
      const recordedDiff = b.recordedAt.getTime() - a.recordedAt.getTime();
      if (recordedDiff !== 0) return recordedDiff;
      return b.receivedAt.getTime() - a.receivedAt.getTime();
    });
  }
}
