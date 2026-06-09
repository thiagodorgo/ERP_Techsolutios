import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export const FIELD_LOCATION_SOURCES = ["mobile", "web", "system"] as const;

export type FieldLocationSource = (typeof FIELD_LOCATION_SOURCES)[number];
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
  readonly source: FieldLocationSource;
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
  readonly source?: FieldLocationSource;
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
