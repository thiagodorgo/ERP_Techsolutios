import { randomUUID } from "node:crypto";

import type {
  IngestResult,
  IngestTelemetryEventInput,
  ListTelemetryByTenantInput,
  ListTelemetryInput,
  TelemetryEvent,
  TelemetryEventType,
} from "./telemetry.types.js";

export interface TelemetryRepository {
  // Idempotência persistente: UNIQUE (tenant, profissional, client_action_id) → 2ª vez = already_applied,
  // sem duplicar (D-Ω4C-TELE-IDEMP).
  insert(input: IngestTelemetryEventInput): Promise<IngestResult>;
  // Pontos GPS (heartbeat com lat/lng) do profissional no período, ORDENADOS por captured_at ASC — base do
  // km on-read e do rastreamento.
  listPoints(input: ListTelemetryInput): Promise<readonly TelemetryEvent[]>;
  // Eventos de um profissional filtrados por tipo (recusas / acessos), DESC por captured_at.
  listByTypes(input: ListTelemetryInput, eventTypes: readonly TelemetryEventType[]): Promise<readonly TelemetryEvent[]>;
  // app_connect de todo o tenant (o serviço deriva o último por profissional → dispositivos).
  listAppConnects(input: ListTelemetryByTenantInput): Promise<readonly TelemetryEvent[]>;
  reset?(): void;
}

export class InMemoryTelemetryRepository implements TelemetryRepository {
  private readonly events: TelemetryEvent[] = [];

  async insert(input: IngestTelemetryEventInput): Promise<IngestResult> {
    const existing = this.events.find(
      (event) =>
        event.tenantId === input.tenantId &&
        event.operatorProfileId === input.operatorProfileId &&
        event.clientActionId === input.clientActionId,
    );
    if (existing) {
      return { outcome: "already_applied", id: existing.id };
    }

    const now = new Date();
    const event: TelemetryEvent = {
      id: randomUUID(),
      tenantId: input.tenantId,
      operatorProfileId: input.operatorProfileId,
      eventType: input.eventType,
      capturedAt: input.capturedAt,
      receivedAt: now,
      lat: input.lat,
      lng: input.lng,
      accuracyM: input.accuracyM,
      speedKmh: input.speedKmh,
      batteryPct: input.batteryPct,
      signalType: input.signalType,
      appVersion: input.appVersion,
      deviceModel: input.deviceModel,
      sdkInt: input.sdkInt,
      clientActionId: input.clientActionId,
      refusalReason: input.refusalReason,
      workOrderId: input.workOrderId,
      createdAt: now,
    };
    this.events.push(event);
    return { outcome: "accepted", id: event.id };
  }

  async listPoints(input: ListTelemetryInput): Promise<readonly TelemetryEvent[]> {
    return this.events
      .filter((event) => event.tenantId === input.tenantId)
      .filter((event) => event.operatorProfileId === input.operatorProfileId)
      .filter((event) => event.eventType === "heartbeat")
      .filter((event) => event.lat !== undefined && event.lng !== undefined)
      .filter((event) => inWindow(event.capturedAt, input.from, input.to))
      .sort((left, right) => left.capturedAt.getTime() - right.capturedAt.getTime());
  }

  async listByTypes(
    input: ListTelemetryInput,
    eventTypes: readonly TelemetryEventType[],
  ): Promise<readonly TelemetryEvent[]> {
    return this.events
      .filter((event) => event.tenantId === input.tenantId)
      .filter((event) => event.operatorProfileId === input.operatorProfileId)
      .filter((event) => eventTypes.includes(event.eventType))
      .filter((event) => inWindow(event.capturedAt, input.from, input.to))
      .sort((left, right) => right.capturedAt.getTime() - left.capturedAt.getTime());
  }

  async listAppConnects(input: ListTelemetryByTenantInput): Promise<readonly TelemetryEvent[]> {
    return this.events
      .filter((event) => event.tenantId === input.tenantId)
      .filter((event) => event.eventType === "app_connect")
      .filter((event) => inWindow(event.capturedAt, input.from, input.to))
      .sort((left, right) => right.capturedAt.getTime() - left.capturedAt.getTime());
  }

  reset(): void {
    this.events.length = 0;
  }
}

function inWindow(capturedAt: Date, from?: Date, to?: Date): boolean {
  if (from && capturedAt.getTime() < from.getTime()) return false;
  if (to && capturedAt.getTime() > to.getTime()) return false;
  return true;
}
