import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  FieldLocationSource,
  FieldOperatorLocation,
  ListFieldLocationHistoryInput,
  ListLatestFieldLocationsInput,
  RecordFieldLocationInput,
} from "./field-location.types.js";
import type { FieldLocationRepository } from "./field-location.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaFieldLocationRepository implements FieldLocationRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async record(input: RecordFieldLocationInput): Promise<FieldOperatorLocation> {
    const location = await this.client.fieldOperatorLocation.create({
      data: {
        tenant_id: input.tenantId,
        operator_user_id: input.operatorUserId,
        source: input.source ?? "mobile",
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy_meters: input.accuracyMeters ?? null,
        heading_degrees: input.headingDegrees ?? null,
        speed_meters_per_second: input.speedMetersPerSecond ?? null,
        battery_level: input.batteryLevel ?? null,
        recorded_at: input.recordedAt ?? new Date(),
        metadata: toJsonObject(input.metadata ?? {}),
      },
      include: {
        operator_user: true,
      },
    });

    return mapFieldLocationRecord(location);
  }

  async listLatest(input: ListLatestFieldLocationsInput): Promise<readonly FieldOperatorLocation[]> {
    const candidates = await this.client.fieldOperatorLocation.findMany({
      where: {
        tenant_id: input.tenantId,
        ...(input.since ? { recorded_at: { gte: input.since } } : {}),
      },
      orderBy: [
        { recorded_at: "desc" },
        { received_at: "desc" },
      ],
      include: {
        operator_user: true,
      },
      take: Math.min((input.limit ?? 100) * 5, 1000),
    });
    const latestByOperator = new Map<string, FieldOperatorLocation>();

    for (const candidate of candidates) {
      if (latestByOperator.has(candidate.operator_user_id)) continue;

      latestByOperator.set(candidate.operator_user_id, mapFieldLocationRecord(candidate));
      if (latestByOperator.size >= (input.limit ?? 100)) break;
    }

    return [...latestByOperator.values()];
  }

  async listHistory(input: ListFieldLocationHistoryInput): Promise<readonly FieldOperatorLocation[]> {
    const locations = await this.client.fieldOperatorLocation.findMany({
      where: {
        tenant_id: input.tenantId,
        operator_user_id: input.operatorUserId,
        ...(input.from || input.to
          ? {
              recorded_at: {
                ...(input.from ? { gte: input.from } : {}),
                ...(input.to ? { lte: input.to } : {}),
              },
            }
          : {}),
      },
      orderBy: [
        { recorded_at: "desc" },
        { received_at: "desc" },
      ],
      include: {
        operator_user: true,
      },
      take: input.limit ?? 100,
    });

    return locations.map(mapFieldLocationRecord);
  }
}

export class RlsPrismaFieldLocationRepository implements FieldLocationRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  record(input: RecordFieldLocationInput): Promise<FieldOperatorLocation> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaFieldLocationRepository(tx).record(input),
    );
  }

  listLatest(input: ListLatestFieldLocationsInput): Promise<readonly FieldOperatorLocation[]> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaFieldLocationRepository(tx).listLatest(input),
    );
  }

  listHistory(input: ListFieldLocationHistoryInput): Promise<readonly FieldOperatorLocation[]> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaFieldLocationRepository(tx).listHistory(input),
    );
  }
}

export async function createPrismaFieldLocationRepository(): Promise<RlsPrismaFieldLocationRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaFieldLocationRepository(prisma);
}

function mapFieldLocationRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly operator_user_id: string;
  readonly source: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracy_meters: number | null;
  readonly heading_degrees: number | null;
  readonly speed_meters_per_second: number | null;
  readonly battery_level: number | null;
  readonly recorded_at: Date;
  readonly received_at: Date;
  readonly metadata: unknown;
  readonly operator_user?: {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly status: string;
  };
}): FieldOperatorLocation {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    operatorUserId: record.operator_user_id,
    source: record.source as FieldLocationSource,
    latitude: record.latitude,
    longitude: record.longitude,
    accuracyMeters: record.accuracy_meters ?? undefined,
    headingDegrees: record.heading_degrees ?? undefined,
    speedMetersPerSecond: record.speed_meters_per_second ?? undefined,
    batteryLevel: record.battery_level ?? undefined,
    recordedAt: record.recorded_at,
    receivedAt: record.received_at,
    metadata: isRecord(record.metadata) ? record.metadata : {},
    operator: record.operator_user
      ? {
          userId: record.operator_user.id,
          name: record.operator_user.name,
          email: record.operator_user.email,
          status: record.operator_user.status,
        }
      : undefined,
  };
}

function toJsonObject(input: Record<string, unknown>): Prisma.InputJsonObject {
  return input as Prisma.InputJsonObject;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
