import type { Permission, Role } from "../core-saas/permissions/catalog.js";

// Ω4C PR-12 (D-Ω4C-TELE-MODEL) — Enums em INGLÊS (labels PT-BR só na fronteira do DTO). heartbeat carrega
// GPS (consent-gated); app_connect/app_disconnect = acessos; service_refusal = recusa (só RECEBIDA aqui,
// o emissor é o app/fluxo de OS — D-Ω4C-TELE-REFUSAL-RECEIVER).
export const TELEMETRY_EVENT_TYPES = [
  "heartbeat",
  "app_connect",
  "app_disconnect",
  "service_refusal",
] as const;

export type TelemetryEventType = (typeof TELEMETRY_EVENT_TYPES)[number];

export const TELEMETRY_SIGNAL_TYPES = ["wifi", "mobile", "none"] as const;

export type TelemetrySignalType = (typeof TELEMETRY_SIGNAL_TYPES)[number];

// Só o heartbeat carrega GPS; os demais eventos NÃO têm coordenada.
export const TELEMETRY_GPS_EVENT_TYPES: readonly TelemetryEventType[] = ["heartbeat"];

export type TelemetryActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Evento de telemetria já persistido (fonte de verdade). lat/lng só existem no heartbeat consentido.
export type TelemetryEvent = {
  readonly id: string;
  readonly tenantId: string;
  readonly operatorProfileId: string;
  readonly eventType: TelemetryEventType;
  readonly capturedAt: Date;
  readonly receivedAt: Date;
  readonly lat?: number;
  readonly lng?: number;
  readonly accuracyM?: number;
  readonly speedKmh?: number;
  readonly batteryPct?: number;
  readonly signalType?: TelemetrySignalType;
  readonly appVersion?: string;
  readonly deviceModel?: string;
  readonly sdkInt?: number;
  readonly clientActionId: string;
  readonly refusalReason?: string;
  readonly workOrderId?: string;
  readonly createdAt: Date;
};

// Um evento validado, pronto para persistir (tenant + profissional resolvidos do ATOR, nunca do corpo).
export type IngestTelemetryEventInput = {
  readonly tenantId: string;
  readonly operatorProfileId: string;
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
  readonly clientActionId: string;
  readonly refusalReason?: string;
  readonly workOrderId?: string;
};

export type IngestOutcome = "accepted" | "already_applied";

export type IngestResult = {
  readonly outcome: IngestOutcome;
  readonly id: string;
};

export type ListTelemetryInput = {
  readonly tenantId: string;
  readonly operatorProfileId: string;
  readonly from?: Date;
  readonly to?: Date;
};

export type ListTelemetryByTenantInput = {
  readonly tenantId: string;
  readonly from?: Date;
  readonly to?: Date;
};

export class TelemetryError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "TelemetryError";
  }
}
