import type { Permission, Role } from "../core-saas/permissions/catalog.js";

// O que o CLIENTE (rota móvel) pode declarar como fonte (`parseSource`). NÃO inclui `traccar`: o app nunca se diz
// Traccar (B-TRC-01, P-07; a rota móvel responde `400 invalid_source` a `source: "traccar"`).
export const FIELD_LOCATION_SOURCES = ["mobile", "web", "system"] as const;

export type FieldLocationSource = (typeof FIELD_LOCATION_SOURCES)[number];

// B-TRC-01 (plano do Traccar v2.1 §3.1) — o que pode estar GRAVADO: as fontes do cliente + `traccar`, que só o
// comando interno da ingestão grava (espelho do CHECK `field_operator_locations_source_check`).
export const FIELD_LOCATION_STORED_SOURCES = [...FIELD_LOCATION_SOURCES, "traccar"] as const;

export type FieldLocationStoredSource = (typeof FIELD_LOCATION_STORED_SOURCES)[number];
export type JsonRecord = Record<string, unknown>;

export type FieldLocationActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

export type FieldOperatorSummary = {
  readonly userId: string;
  readonly name: string;
  readonly email?: string;
  readonly status?: string;
};

export type FieldOperatorLocation = {
  readonly id: string;
  readonly tenantId: string;
  readonly operatorUserId: string;
  readonly source: FieldLocationStoredSource;
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyMeters?: number;
  readonly headingDegrees?: number;
  readonly speedMetersPerSecond?: number;
  readonly batteryLevel?: number;
  readonly recordedAt: Date;
  readonly receivedAt: Date;
  readonly metadata: JsonRecord;
  readonly operator?: FieldOperatorSummary;
};

export type RecordFieldLocationInput = {
  readonly tenantId: string;
  readonly operatorUserId: string;
  readonly source?: FieldLocationStoredSource;
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyMeters?: number;
  readonly headingDegrees?: number;
  readonly speedMetersPerSecond?: number;
  readonly batteryLevel?: number;
  readonly recordedAt?: Date;
  readonly metadata?: JsonRecord;
};

export type ListLatestFieldLocationsInput = {
  readonly tenantId: string;
  readonly since?: Date;
  readonly limit?: number;
};

export type ListFieldLocationHistoryInput = {
  readonly tenantId: string;
  readonly operatorUserId: string;
  readonly from?: Date;
  readonly to?: Date;
  readonly limit?: number;
};

export class FieldLocationError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "FieldLocationError";
  }
}
