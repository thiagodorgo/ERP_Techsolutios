import type { Permission, Role } from "../core-saas/permissions/catalog.js";

// As fontes que o cadastro aceita além do Traccar (espelho do CHECK `field_operator_locations_source_check`). O CLIENTE
// não declara origem: a rota móvel grava sempre `mobile` e responde `400 invalid_source` a qualquer outro valor
// (B-SAN3-17, Emenda 1 da abertura 2.1; antes, B-TRC-01 P-07, já recusava `traccar`). `web` e `system` só existem
// em ponto antigo, gravado antes desta regra.
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
  // B-SAN3-17 (Emenda 1 da abertura 2.2): só para os leitores ao vivo do serviço; a rota de histórico não passa.
  readonly sources?: readonly FieldLocationStoredSource[];
};

// B-SAN3-17 — o resultado da decisão de consentimento do próprio técnico (contrato
// `mobile_location_consent@2026-11.b-san3-17`, plano v2 §2.3).
export type OwnTrackingConsentResult = {
  readonly granted: boolean;
  readonly grantedAt: Date | null;
  readonly clientActionId: string;
  readonly status: "applied" | "superseded";
  readonly profileId: string;
  readonly profileUpdatedAt: Date;
  readonly textVersion: string;
  readonly decidedAt: Date;
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

// B-SAN3-17 (item 52): as duas recusas da posição do app. O serviço as usa como resposta rápida, e a escrita (Emenda
// 1.5, CX3-568-01) como autoridade, no mesmo passo da gravação.
export function operatorProfileRequiredError(): FieldLocationError {
  return new FieldLocationError(
    422,
    "FIELD_LOCATION_PROFILE_REQUIRED",
    "operator_profile_required",
    "The authenticated user has no operator profile in this organization.",
  );
}

export function trackingConsentRequiredError(): FieldLocationError {
  return new FieldLocationError(
    422,
    "FIELD_LOCATION_CONSENT_REQUIRED",
    "tracking_consent_required",
    "The operator has not consented to location tracking.",
  );
}

// B-SAN3-17 (Emenda 1.8, E17-02 e E17-07): a escrita do titular não entrou a tempo (a fila dele no processo passou do
// prazo, ou o banco não deu a conexão, a trava ou o comando dentro do orçamento). Nada foi gravado, e o app repete
// depois. É 503, como o `reset_unavailable` da identidade.
export function fieldLocationBusyError(): FieldLocationError {
  return new FieldLocationError(
    503,
    "FIELD_LOCATION_BUSY",
    "field_location_busy",
    "Too many concurrent writes for this operator; nothing was saved, try again.",
  );
}

// Falha que o TEMPO resolve, pelo CÓDIGO (o critério de `checklist-prisma.repository.ts`): pool esgotado (P2024),
// transação interativa expirada (P2028), trava não obtida (55P03), `statement_timeout` (57014) e deadlock (40P01).
const BUSY_DATABASE_CODES = new Set(["P2024", "P2028", "55P03", "57014", "40P01"]);

export function isBusyDatabaseFailure(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const e = error as { code?: unknown; meta?: { code?: unknown; driverAdapterError?: { cause?: { originalCode?: unknown } } } };
  return [e.code, e.meta?.code, e.meta?.driverAdapterError?.cause?.originalCode].some(
    (code) => typeof code === "string" && BUSY_DATABASE_CODES.has(code),
  );
}
