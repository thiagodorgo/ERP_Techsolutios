import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type { TelemetryRepository } from "./telemetry.repository.js";
import type {
  IngestResult,
  IngestTelemetryEventInput,
  ListTelemetryByTenantInput,
  ListTelemetryInput,
  TelemetryEvent,
  TelemetryEventType,
  TelemetrySignalType,
} from "./telemetry.types.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaTelemetryRepository implements TelemetryRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async insert(input: IngestTelemetryEventInput): Promise<IngestResult> {
    try {
      const created = await this.client.telemetryEvent.create({
        data: {
          tenant_id: input.tenantId,
          operator_profile_id: input.operatorProfileId,
          event_type: input.eventType,
          captured_at: input.capturedAt,
          lat: input.lat ?? null,
          lng: input.lng ?? null,
          accuracy_m: input.accuracyM ?? null,
          speed_kmh: input.speedKmh ?? null,
          battery_pct: input.batteryPct ?? null,
          signal_type: input.signalType ?? null,
          app_version: input.appVersion ?? null,
          device_model: input.deviceModel ?? null,
          sdk_int: input.sdkInt ?? null,
          client_action_id: input.clientActionId,
          refusal_reason: input.refusalReason ?? null,
          work_order_id: input.workOrderId ?? null,
        },
        select: { id: true },
      });
      return { outcome: "accepted", id: created.id };
    } catch (error) {
      // Idempotência: reprocessar o lote colide na UNIQUE (tenant, profissional, client_action_id) → P2002.
      // Semântica de lote do mobile-sync: already_applied (NÃO duplica, NÃO 409). Recupera o id existente.
      if (isPrismaError(error, "P2002")) {
        const existing = await this.client.telemetryEvent.findFirst({
          where: {
            tenant_id: input.tenantId,
            operator_profile_id: input.operatorProfileId,
            client_action_id: input.clientActionId,
          },
          select: { id: true },
        });
        return { outcome: "already_applied", id: existing?.id ?? "" };
      }
      throw error;
    }
  }

  async listPoints(input: ListTelemetryInput): Promise<readonly TelemetryEvent[]> {
    const rows = await this.client.telemetryEvent.findMany({
      where: {
        tenant_id: input.tenantId,
        operator_profile_id: input.operatorProfileId,
        event_type: "heartbeat",
        lat: { not: null },
        lng: { not: null },
        ...capturedAtRange(input.from, input.to),
      },
      orderBy: [{ captured_at: "asc" }],
    });
    return rows.map(mapTelemetryRecord);
  }

  async listByTypes(
    input: ListTelemetryInput,
    eventTypes: readonly TelemetryEventType[],
  ): Promise<readonly TelemetryEvent[]> {
    const rows = await this.client.telemetryEvent.findMany({
      where: {
        tenant_id: input.tenantId,
        operator_profile_id: input.operatorProfileId,
        event_type: { in: [...eventTypes] },
        ...capturedAtRange(input.from, input.to),
      },
      orderBy: [{ captured_at: "desc" }],
    });
    return rows.map(mapTelemetryRecord);
  }

  async listAppConnects(input: ListTelemetryByTenantInput): Promise<readonly TelemetryEvent[]> {
    const rows = await this.client.telemetryEvent.findMany({
      where: {
        tenant_id: input.tenantId,
        event_type: "app_connect",
        ...capturedAtRange(input.from, input.to),
      },
      orderBy: [{ captured_at: "desc" }],
    });
    return rows.map(mapTelemetryRecord);
  }
}

export class RlsPrismaTelemetryRepository implements TelemetryRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  insert(input: IngestTelemetryEventInput): Promise<IngestResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaTelemetryRepository(tx).insert(input));
  }

  listPoints(input: ListTelemetryInput): Promise<readonly TelemetryEvent[]> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaTelemetryRepository(tx).listPoints(input));
  }

  listByTypes(input: ListTelemetryInput, eventTypes: readonly TelemetryEventType[]): Promise<readonly TelemetryEvent[]> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaTelemetryRepository(tx).listByTypes(input, eventTypes),
    );
  }

  listAppConnects(input: ListTelemetryByTenantInput): Promise<readonly TelemetryEvent[]> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaTelemetryRepository(tx).listAppConnects(input),
    );
  }
}

export async function createPrismaTelemetryRepository(): Promise<RlsPrismaTelemetryRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaTelemetryRepository(prisma);
}

function capturedAtRange(from?: Date, to?: Date): Prisma.TelemetryEventWhereInput {
  if (!from && !to) return {};
  return {
    captured_at: {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    },
  };
}

function mapTelemetryRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly operator_profile_id: string;
  readonly event_type: string;
  readonly captured_at: Date;
  readonly received_at: Date;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly accuracy_m: number | null;
  readonly speed_kmh: number | null;
  readonly battery_pct: number | null;
  readonly signal_type: string | null;
  readonly app_version: string | null;
  readonly device_model: string | null;
  readonly sdk_int: number | null;
  readonly client_action_id: string;
  readonly refusal_reason: string | null;
  readonly work_order_id: string | null;
  readonly created_at: Date;
}): TelemetryEvent {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    operatorProfileId: record.operator_profile_id,
    eventType: record.event_type as TelemetryEventType,
    capturedAt: record.captured_at,
    receivedAt: record.received_at,
    lat: record.lat ?? undefined,
    lng: record.lng ?? undefined,
    accuracyM: record.accuracy_m ?? undefined,
    speedKmh: record.speed_kmh ?? undefined,
    batteryPct: record.battery_pct ?? undefined,
    signalType: (record.signal_type as TelemetrySignalType | null) ?? undefined,
    appVersion: record.app_version ?? undefined,
    deviceModel: record.device_model ?? undefined,
    sdkInt: record.sdk_int ?? undefined,
    clientActionId: record.client_action_id,
    refusalReason: record.refusal_reason ?? undefined,
    workOrderId: record.work_order_id ?? undefined,
    createdAt: record.created_at,
  };
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { readonly code?: unknown }).code === code;
}
