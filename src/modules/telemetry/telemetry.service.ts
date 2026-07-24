import { env } from "../../config/env.js";
import {
  createDefaultOperatorProfileService,
  type OperatorProfileService,
} from "../operator-profiles/operator-profile.service.js";
import {
  toAccessView,
  toDeviceView,
  toRefusalView,
  toSaoPauloDay,
  toTrackView,
  type AccessView,
  type DeviceView,
  type RefusalView,
  type TelemetryKmView,
  type TrackView,
} from "./telemetry.dto.js";
import {
  sumDailyKm,
  TELEMETRY_WINDOW_DEFAULT_HOURS,
  TELEMETRY_WINDOW_MAX_HOURS,
  type KmPoint,
} from "./telemetry.km.js";
import {
  InMemoryTelemetryRepository,
  type TelemetryRepository,
} from "./telemetry.repository.js";
import {
  parseDateFilter,
  parseProfessionalId,
  parseTelemetryBatch,
  type ParsedTelemetryEvent,
} from "./telemetry.validators.js";
import {
  TelemetryError,
  type TelemetryActorContext,
  type TelemetryEvent,
} from "./telemetry.types.js";

type RawRecord = Record<string, unknown>;

export type TelemetryIngestResult = {
  readonly client_action_id: string;
  readonly status: "accepted" | "rejected" | "already_applied";
  readonly reason?: string;
};

export type TelemetryIngestSummary = {
  readonly contract: { readonly name: "mobile_telemetry_ingest"; readonly version: "2026-07-24.pr12"; readonly status: "implemented" };
  readonly client_batch_id: string | null;
  readonly server_time: string;
  readonly summary: {
    readonly received: number;
    readonly accepted: number;
    readonly rejected: number;
    readonly already_applied: number;
  };
  readonly results: readonly TelemetryIngestResult[];
};

type ResolvedWindow = { readonly from: Date; readonly to: Date };

export class TelemetryService {
  constructor(
    private readonly repository: TelemetryRepository,
    private readonly resolveOperatorProfileService: () => Promise<OperatorProfileService> = createDefaultOperatorProfileService,
  ) {}

  // Ingestão em lote (D-Ω4C-TELE-CONSENT + D-Ω4C-TELE-IDEMP). O operator_profile é derivado do ATOR
  // autenticado (findByUserId) — tenant_id do corpo é IGNORADO. Consent-gate ANTES de gravar coordenada.
  async ingestBatch(actor: TelemetryActorContext, body: unknown): Promise<TelemetryIngestSummary> {
    const profileService = await this.resolveOperatorProfileService();
    const profile = await profileService.findByUserId(actor.tenantId, actor.userId);
    if (!profile) {
      throw new TelemetryError(422, "TELEMETRY_VALIDATION", "operator_profile_required", "The authenticated user has no operator profile.");
    }

    const batch = parseTelemetryBatch(body);
    const results: TelemetryIngestResult[] = [];

    for (const event of batch.events) {
      const result = await this.ingestOne(actor.tenantId, profile.id, profile.trackingConsent, event);
      results.push(result);
    }

    return {
      contract: { name: "mobile_telemetry_ingest", version: "2026-07-24.pr12", status: "implemented" },
      client_batch_id: batch.clientBatchId,
      server_time: new Date().toISOString(),
      summary: {
        received: batch.events.length,
        accepted: results.filter((result) => result.status === "accepted").length,
        rejected: results.filter((result) => result.status === "rejected").length,
        already_applied: results.filter((result) => result.status === "already_applied").length,
      },
      results,
    };
  }

  private async ingestOne(
    tenantId: string,
    operatorProfileId: string,
    trackingConsent: boolean,
    event: ParsedTelemetryEvent,
  ): Promise<TelemetryIngestResult> {
    const hasGps = event.lat !== undefined && event.lng !== undefined;

    // RN-TELE-01 (consent-gate LGPD): evento com GPS e SEM consentimento → rejeitado honesto, NADA de lat/lng
    // gravado. Eventos SEM GPS (acessos/recusas) prosseguem (base legítima, não são rastreamento de posição).
    if (hasGps && trackingConsent !== true) {
      return { client_action_id: event.clientActionId, status: "rejected", reason: "tracking_consent_required" };
    }

    const insertResult = await this.repository.insert({
      tenantId,
      operatorProfileId,
      eventType: event.eventType,
      capturedAt: event.capturedAt,
      lat: event.lat,
      lng: event.lng,
      accuracyM: event.accuracyM,
      speedKmh: event.speedKmh,
      batteryPct: event.batteryPct,
      signalType: event.signalType,
      appVersion: event.appVersion,
      deviceModel: event.deviceModel,
      sdkInt: event.sdkInt,
      clientActionId: event.clientActionId,
      refusalReason: event.refusalReason,
      workOrderId: event.workOrderId,
    });

    return { client_action_id: event.clientActionId, status: insertResult.outcome };
  }

  // Quilometragem diária on-read (RN-TELE-03): Σ haversine dos pontos consecutivos consentidos por dia
  // (America/Sao_Paulo), com filtro de precisão/velocidade. Sem pontos → sem linhas (0 honesto, nunca fabricado).
  async getKm(actor: TelemetryActorContext, query: RawRecord): Promise<readonly TelemetryKmView[]> {
    const professionalId = parseProfessionalId(query.professionalId ?? query.professional_id);
    const window = this.resolveWindow(query);
    const professionalLabel = await this.resolveLabel(actor, professionalId);

    const points = await this.repository.listPoints({
      tenantId: actor.tenantId,
      operatorProfileId: professionalId,
      from: window.from,
      to: window.to,
    });

    const byDay = new Map<string, KmPoint[]>();
    for (const point of points) {
      if (point.lat === undefined || point.lng === undefined) continue;
      const day = toSaoPauloDay(point.capturedAt);
      const bucket = byDay.get(day) ?? [];
      bucket.push({ lat: point.lat, lng: point.lng, capturedAt: point.capturedAt, accuracyM: point.accuracyM });
      byDay.set(day, bucket);
    }

    return [...byDay.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([day, dayPoints]) => {
        const summary = sumDailyKm(dayPoints);
        return { professionalLabel, day, kmTotal: summary.kmTotal, pointsUsed: summary.pointsUsed };
      });
  }

  // Rastreamento — ÚNICO endpoint com coordenada crua (gated forte por telemetry:read). Janela default 24h
  // + teto configurável (D-Ω4C-RECON-06 / RN-TELE-07).
  async getTrack(actor: TelemetryActorContext, query: RawRecord): Promise<readonly TrackView[]> {
    const professionalId = parseProfessionalId(query.professionalId ?? query.professional_id);
    const window = this.resolveWindow(query);
    await this.resolveLabel(actor, professionalId);

    const points = await this.repository.listPoints({
      tenantId: actor.tenantId,
      operatorProfileId: professionalId,
      from: window.from,
      to: window.to,
    });
    return points.map(toTrackView);
  }

  async getRefusals(actor: TelemetryActorContext, query: RawRecord): Promise<readonly RefusalView[]> {
    const professionalId = parseProfessionalId(query.professionalId ?? query.professional_id);
    const window = this.resolveWindow(query);
    const professionalLabel = await this.resolveLabel(actor, professionalId);

    const events = await this.repository.listByTypes(
      { tenantId: actor.tenantId, operatorProfileId: professionalId, from: window.from, to: window.to },
      ["service_refusal"],
    );
    return events.map((event) => toRefusalView(event, professionalLabel));
  }

  async getAccess(actor: TelemetryActorContext, query: RawRecord): Promise<readonly AccessView[]> {
    const professionalId = parseProfessionalId(query.professionalId ?? query.professional_id);
    const window = this.resolveWindow(query);
    const professionalLabel = await this.resolveLabel(actor, professionalId);

    const events = await this.repository.listByTypes(
      { tenantId: actor.tenantId, operatorProfileId: professionalId, from: window.from, to: window.to },
      ["app_connect", "app_disconnect"],
    );
    return events.map((event) => toAccessView(event, professionalLabel));
  }

  // Dispositivos — derivado do ÚLTIMO app_connect por profissional (sem materialização). Rótulo grosseiro
  // (anti-fingerprint): sem sdk_int cru, IP nem tenant_id.
  async getDevices(actor: TelemetryActorContext, query: RawRecord): Promise<readonly DeviceView[]> {
    const window = this.resolveWindow(query);
    const events = await this.repository.listAppConnects({ tenantId: actor.tenantId, from: window.from, to: window.to });

    const latestByProfile = new Map<string, TelemetryEvent>();
    for (const event of events) {
      // events já vêm DESC por captured_at → o primeiro visto por profissional é o mais recente.
      if (!latestByProfile.has(event.operatorProfileId)) {
        latestByProfile.set(event.operatorProfileId, event);
      }
    }

    const views: DeviceView[] = [];
    for (const [profileId, event] of latestByProfile.entries()) {
      const label = await this.resolveLabel(actor, profileId);
      views.push(toDeviceView(event, label));
    }
    return views;
  }

  // Resolve o rótulo do profissional (full_name → fallback neutro) e impõe isolamento cross-tenant: um
  // profissional de outro tenant não existe sob o contexto RLS do ator → 404 (RN-TELE-04). NUNCA vaza o
  // UUID/e-mail cru como rótulo.
  private async resolveLabel(actor: TelemetryActorContext, professionalId: string): Promise<string> {
    const profileService = await this.resolveOperatorProfileService();
    try {
      const profile = await profileService.get(actor, professionalId);
      return profile.fullName?.trim() || "Profissional";
    } catch {
      throw new TelemetryError(404, "TELEMETRY_NOT_FOUND", "professional_not_found", "Professional was not found.");
    }
  }

  private resolveWindow(query: RawRecord): ResolvedWindow {
    const from = parseDateFilter(query.from, "from");
    const to = parseDateFilter(query.to ?? query.until, "to");

    const resolvedTo = to ?? new Date();
    const resolvedFrom = from ?? new Date(resolvedTo.getTime() - TELEMETRY_WINDOW_DEFAULT_HOURS * 3_600_000);

    if (resolvedFrom.getTime() > resolvedTo.getTime()) {
      throw new TelemetryError(422, "TELEMETRY_VALIDATION", "invalid_window", "from must be before to.");
    }

    const spanHours = (resolvedTo.getTime() - resolvedFrom.getTime()) / 3_600_000;
    if (spanHours > TELEMETRY_WINDOW_MAX_HOURS) {
      throw new TelemetryError(422, "TELEMETRY_VALIDATION", "window_too_large", `The window must not exceed ${TELEMETRY_WINDOW_MAX_HOURS} hours.`);
    }

    return { from: resolvedFrom, to: resolvedTo };
  }
}

const memoryRepository = new InMemoryTelemetryRepository();
let defaultServicePromise: Promise<TelemetryService> | undefined;

export function createMemoryTelemetryService(): TelemetryService {
  return new TelemetryService(memoryRepository);
}

export function getMemoryTelemetryRepositoryForTests(): InMemoryTelemetryRepository {
  return memoryRepository;
}

export async function createDefaultTelemetryService(): Promise<TelemetryService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryTelemetryService();
  }
  defaultServicePromise ??= createPrismaTelemetryService();
  return defaultServicePromise;
}

export function resetTelemetryRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaTelemetryService(): Promise<TelemetryService> {
  const { createPrismaTelemetryRepository } = await import("./telemetry-prisma.repository.js");
  const repository = await createPrismaTelemetryRepository();
  return new TelemetryService(repository);
}
