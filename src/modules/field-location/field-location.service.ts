import { env } from "../../config/env.js";
import { publishDomainEvent } from "../../infra/events/domain-event.publisher.js";
import {
  createDefaultOperatorProfileService,
  type OperatorProfileService,
} from "../operator-profiles/operator-profile.service.js";
import type { OperatorProfile } from "../operator-profiles/operator-profile.types.js";
import {
  InMemoryFieldLocationRepository,
  type FieldLocationRepository,
} from "./field-location.repository.js";
import {
  FieldLocationError,
  type FieldLocationActorContext,
  type FieldLocationStoredSource,
  type FieldOperatorLocation,
  type JsonRecord,
  type ListFieldLocationHistoryInput,
  type ListLatestFieldLocationsInput,
  type OwnTrackingConsentResult,
  type RecordFieldLocationInput,
} from "./field-location.types.js";

export type FieldLocationEventPublisher = typeof publishDomainEvent;

// B-TRC-01 (plano do Traccar v2.1 §3.2, §4.8) — a publicação de `field_location.updated`, reutilizável pela rota
// móvel e pela ingestão do Traccar. O payload é o de sempre (`entity_type`, `entity_id`, `operator_user_id`,
// `source`): nenhuma coordenada viaja no aviso; o mapa relê a posição por `/field-locations/latest`. Quem grava
// dentro de uma transação chama isto SÓ DEPOIS do commit. `actorId` é o usuário quando há um (rota móvel); a
// ingestão do Traccar não tem usuário e não passa nenhum.
export async function publishFieldLocationUpdated(
  location: Pick<FieldOperatorLocation, "id" | "tenantId" | "operatorUserId" | "source">,
  context: { readonly actorId?: string } = {},
  publish: FieldLocationEventPublisher = publishDomainEvent,
): Promise<void> {
  await publish(
    "field_location.updated",
    {
      entity_type: "field_operator_location",
      entity_id: location.id,
      operator_user_id: location.operatorUserId,
      source: location.source,
    },
    { tenantId: location.tenantId, actorId: context.actorId },
  );
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TEXT_VERSION_PATTERN = /^[a-z0-9][a-z0-9._@-]{0,63}$/;
const DECISION_MAX_FUTURE_MS = 5 * 60_000;
// B-SAN3-17 (Emenda 1 da abertura 2.1 e 2.2, decisão 6.1 (a) do dono): a viatura segue a D6 do Traccar e não depende do
// consentimento do celular. Tudo o mais que está gravado (o que o app enviou, inclusive ponto antigo `web`/`system`)
// só aparece nos leitores ao vivo enquanto o dono dele consente.
const CONSENT_EXEMPT_SOURCES: readonly FieldLocationStoredSource[] = ["traccar"];

type ConsentDecisionInput = {
  readonly clientActionId: string;
  readonly decidedAt: Date;
  readonly textVersion: string;
};

export class FieldLocationService {
  constructor(
    private readonly repository: FieldLocationRepository,
    private readonly resolveOperatorProfileService: () => Promise<OperatorProfileService> = createDefaultOperatorProfileService,
  ) {}

  // B-SAN3-17 (item 52, P5 do plano v2): primeiro a validação (400), depois o perfil do ATOR (422
  // `operator_profile_required`, também para ator sem UUID) e depois o consentimento (422 `tracking_consent_required`).
  // Na recusa, nada é gravado e nada é publicado. A origem nunca vem do cliente: a rota móvel grava `mobile`.
  async recordMobileLocation(
    actor: FieldLocationActorContext,
    input: Omit<RecordFieldLocationInput, "tenantId" | "operatorUserId" | "source"> & {
      readonly source?: unknown;
    },
  ): Promise<FieldOperatorLocation> {
    const record: RecordFieldLocationInput = {
      tenantId: actor.tenantId,
      operatorUserId: actor.userId,
      source: assertMobileSource(input.source),
      latitude: assertCoordinate(input.latitude, "latitude", -90, 90),
      longitude: assertCoordinate(input.longitude, "longitude", -180, 180),
      accuracyMeters: parseNonNegative(input.accuracyMeters, "accuracyMeters"),
      headingDegrees: parseHeading(input.headingDegrees),
      speedMetersPerSecond: parseNonNegative(input.speedMetersPerSecond, "speedMetersPerSecond"),
      batteryLevel: parseBatteryLevel(input.batteryLevel),
      recordedAt: input.recordedAt ? parseDate(input.recordedAt, "recordedAt") : new Date(),
      metadata: sanitizeLocationMetadata(input.metadata),
    };
    const profile = await this.requireOwnOperatorProfile(actor);
    if (profile.trackingConsent !== true) {
      throw new FieldLocationError(
        422,
        "FIELD_LOCATION_CONSENT_REQUIRED",
        "tracking_consent_required",
        "The operator has not consented to location tracking.",
      );
    }
    const location = await this.repository.record(record);

    await publishFieldLocationUpdated(location, { actorId: actor.userId });

    return location;
  }

  // B-SAN3-17 (P6/P7/P11 do plano v2; CR17R2-03 e 04): o técnico registra (aceite) ou revoga o PRÓPRIO consentimento.
  // Só alcança o perfil do ator, pela máquina de transição do cadastro. A revogação sempre se aplica e nunca é recusada
  // por `decided_at`; um aceite que não é posterior à última alteração de um perfil sem consentimento não é aplicado
  // (`superseded`), para que uma decisão velha não desfaça uma revogação mais nova.
  async setOwnTrackingConsent(
    actor: FieldLocationActorContext,
    granted: boolean,
    body: unknown,
  ): Promise<OwnTrackingConsentResult> {
    const input = parseConsentDecision(body, granted);
    const ownProfile = await this.requireOwnOperatorProfile(actor);

    if (granted && ownProfile.trackingConsent !== true && input.decidedAt.getTime() <= ownProfile.updatedAt.getTime()) {
      return {
        granted: false,
        grantedAt: null,
        clientActionId: input.clientActionId,
        status: "superseded",
        profileId: ownProfile.id,
        profileUpdatedAt: ownProfile.updatedAt,
        textVersion: input.textVersion,
        decidedAt: input.decidedAt,
      };
    }

    const profileService = await this.resolveOperatorProfileService();
    const updated = await profileService.update(actor, ownProfile.id, { tracking_consent: granted });

    return {
      granted: updated.trackingConsent,
      grantedAt: updated.trackingConsentAt ?? null,
      clientActionId: input.clientActionId,
      status: "applied",
      profileId: updated.id,
      profileUpdatedAt: updated.updatedAt,
      textVersion: input.textVersion,
      decidedAt: input.decidedAt,
    };
  }

  // B-SAN3-17 (Emenda 1 da abertura 2.7): o sync de evidências pergunta se o PRÓPRIO ator consente, pela mesma
  // leitura do filtro ao vivo. Sem perfil, ou com id que não é UUID, devolve false e não lança.
  async hasOwnTrackingConsent(actor: FieldLocationActorContext): Promise<boolean> {
    return (await this.consentedOperators(actor, [actor.userId])).has(actor.userId);
  }

  // B-SAN3-17 (abertura E2.3, Emenda 1 da abertura 2.2): a última posição AO VIVO de um operador, para o detalhe da OS.
  // Sem consentimento, só a viatura conta, e o repositório já filtra a fonte (sem lookback).
  async latestLiveForOperator(
    actor: FieldLocationActorContext,
    operatorUserId: string,
  ): Promise<FieldOperatorLocation | undefined> {
    const consented = await this.consentedOperators(actor, [operatorUserId]);
    const points = await this.repository.listHistory({
      tenantId: actor.tenantId,
      operatorUserId,
      sources: consented.has(operatorUserId) ? undefined : CONSENT_EXEMPT_SOURCES,
      limit: 1,
    });
    return this.keepLive(points, consented)[0];
  }

  // B-SAN3-17 (P7 (a) do dono; CR17R2-02; Emenda 1 da abertura 2.1 e 2.2): o mapa ao vivo do despacho para na hora de
  // mostrar a posição enviada pelo app de quem não consente. O ponto mais novo de quem não consente dá lugar ao último
  // ponto da viatura dele (respeitando o `since`); se não há, o operador sai da página. Custo: 1 leitura de perfil por
  // operador da lista, mais 1 de histórico por operador sem consentimento cujo ponto mais novo é do app.
  async listLatest(
    actor: FieldLocationActorContext,
    input: Omit<ListLatestFieldLocationsInput, "tenantId">,
  ): Promise<readonly FieldOperatorLocation[]> {
    const latest = await this.repository.listLatest({
      tenantId: actor.tenantId,
      since: input.since,
      limit: normalizeLimit(input.limit),
    });
    const consented = await this.consentedOperators(actor, latest.map((point) => point.operatorUserId));
    const candidates: FieldOperatorLocation[] = [];
    for (const point of latest) {
      if (this.keepLive([point], consented).length === 1) {
        candidates.push(point);
        continue;
      }
      const exempt = await this.repository.listHistory({
        tenantId: actor.tenantId,
        operatorUserId: point.operatorUserId,
        sources: CONSENT_EXEMPT_SOURCES,
        from: input.since,
        limit: 1,
      });
      candidates.push(...exempt);
    }
    return this.keepLive(candidates, consented).sort(byRecordedAtDesc);
  }

  listHistory(
    actor: FieldLocationActorContext,
    input: Omit<ListFieldLocationHistoryInput, "tenantId">,
  ): Promise<readonly FieldOperatorLocation[]> {
    if (!input.operatorUserId.trim()) {
      throw new FieldLocationError(400, "FIELD_LOCATION_FILTER_INVALID", "operator_required", "operatorUserId is required.");
    }

    return this.repository.listHistory({
      tenantId: actor.tenantId,
      operatorUserId: input.operatorUserId.trim(),
      from: input.from,
      to: input.to,
      limit: normalizeLimit(input.limit),
    });
  }

  private keepLive(points: readonly FieldOperatorLocation[], consented: ReadonlySet<string>): FieldOperatorLocation[] {
    return points
      .filter((point) => point.source === "traccar" || consented.has(point.operatorUserId));
  }

  // Operadores, entre os pedidos, cujo perfil PRÓPRIO nesta organização tem consentimento. Sem perfil, id que não é
  // UUID ou erro de leitura: fica de fora (falha fechada).
  private async consentedOperators(
    actor: FieldLocationActorContext,
    operatorUserIds: Iterable<string>,
  ): Promise<ReadonlySet<string>> {
    const consented = new Set<string>();
    const ids = [...new Set(operatorUserIds)].filter((id) => UUID_PATTERN.test(id));
    if (ids.length === 0) return consented;
    const profileService = await this.resolveOperatorProfileService();
    for (const id of ids) {
      try {
        const profile = await profileService.findByUserId(actor.tenantId, id);
        if (profile?.trackingConsent === true) consented.add(id);
      } catch {
        // falha fechada: quem não pôde ser lido não entra
      }
    }
    return consented;
  }

  private async requireOwnOperatorProfile(actor: FieldLocationActorContext): Promise<OperatorProfile> {
    if (!UUID_PATTERN.test(actor.userId)) {
      throw operatorProfileRequired();
    }
    const profileService = await this.resolveOperatorProfileService();
    const profile = await profileService.findByUserId(actor.tenantId, actor.userId);
    if (profile === undefined) {
      throw operatorProfileRequired();
    }
    return profile;
  }
}

function operatorProfileRequired(): FieldLocationError {
  return new FieldLocationError(
    422,
    "FIELD_LOCATION_PROFILE_REQUIRED",
    "operator_profile_required",
    "The authenticated user has no operator profile in this organization.",
  );
}

// Corpo da decisão: `{ decided_at, client_action_id, text_version }` (contrato `mobile_location_consent@2026-11.b-san3-17`).
// O aceite recusa `decided_at` inválido ou mais de 5 min no futuro (400 `invalid_date`). A revogação nunca é recusada por
// `decided_at` (CR17R2-03): o que vai à auditoria é min(decided_at, agora do servidor), e agora quando não há data válida.
function parseConsentDecision(body: unknown, granted: boolean): ConsentDecisionInput {
  const record = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const clientActionId = typeof record.client_action_id === "string" ? record.client_action_id.trim() : "";
  if (!UUID_PATTERN.test(clientActionId)) {
    throw new FieldLocationError(400, "FIELD_LOCATION_INVALID", "invalid_client_action_id", "client_action_id must be a UUID.");
  }

  const textVersion = typeof record.text_version === "string" ? record.text_version : "";
  if (!TEXT_VERSION_PATTERN.test(textVersion)) {
    throw new FieldLocationError(400, "FIELD_LOCATION_INVALID", "invalid_text_version", "text_version is invalid.");
  }

  const now = Date.now();
  const parsed = typeof record.decided_at === "string" ? new Date(record.decided_at) : new Date(Number.NaN);
  const valid = !Number.isNaN(parsed.getTime());
  if (!granted) {
    return { clientActionId, textVersion, decidedAt: new Date(valid ? Math.min(parsed.getTime(), now) : now) };
  }
  if (!valid || parsed.getTime() > now + DECISION_MAX_FUTURE_MS) {
    throw new FieldLocationError(
      400,
      "FIELD_LOCATION_INVALID",
      "invalid_date",
      "decided_at must be a valid ISO date, at most 5 minutes in the future.",
    );
  }

  return { clientActionId, textVersion, decidedAt: parsed };
}

function byRecordedAtDesc(a: FieldOperatorLocation, b: FieldOperatorLocation): number {
  const recordedDiff = b.recordedAt.getTime() - a.recordedAt.getTime();
  if (recordedDiff !== 0) return recordedDiff;
  return b.receivedAt.getTime() - a.receivedAt.getTime();
}

const sensitiveKeyPattern =
  /(authorization|access_?token|refresh_?token|password|passwd|pwd|secret|api_?key|token_hash|password_hash|refresh_token_hash|private_url|privateurl|path)/i;

function assertCoordinate(value: unknown, field: string, min: number, max: number): number {
  const parsed = parseNumber(value, field);

  if (parsed < min || parsed > max) {
    throw new FieldLocationError(400, "FIELD_LOCATION_INVALID", "invalid_coordinate", `${field} must be between ${min} and ${max}.`);
  }

  return parsed;
}

function parseNonNegative(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = parseNumber(value, field);

  if (parsed < 0) {
    throw new FieldLocationError(400, "FIELD_LOCATION_INVALID", "invalid_number", `${field} must be greater than or equal to zero.`);
  }

  return parsed;
}

function parseHeading(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = parseNumber(value, "headingDegrees");

  if (parsed < 0 || parsed > 360) {
    throw new FieldLocationError(400, "FIELD_LOCATION_INVALID", "invalid_heading", "headingDegrees must be between 0 and 360.");
  }

  return parsed;
}

function parseBatteryLevel(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = parseNumber(value, "batteryLevel");

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
    throw new FieldLocationError(400, "FIELD_LOCATION_INVALID", "invalid_battery", "batteryLevel must be an integer between 0 and 100.");
  }

  return parsed;
}

function parseNumber(value: unknown, field: string): number {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new FieldLocationError(400, "FIELD_LOCATION_INVALID", "invalid_number", `${field} must be a finite number.`);
  }

  return parsed;
}

function parseDate(value: unknown, field: string): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(typeof value === "string" ? value : "");

  if (Number.isNaN(parsed.getTime())) {
    throw new FieldLocationError(400, "FIELD_LOCATION_INVALID", "invalid_date", `${field} must be a valid ISO date.`);
  }

  return parsed;
}

function normalizeLimit(value: number | undefined): number {
  if (value === undefined) return 100;
  if (!Number.isInteger(value) || value < 1 || value > 500) {
    throw new FieldLocationError(400, "FIELD_LOCATION_FILTER_INVALID", "invalid_limit", "limit must be between 1 and 500.");
  }

  return value;
}

// B-SAN3-17 (Emenda 1 da abertura 2.1): o cliente não escolhe a origem. Ausente ou `mobile` grava `mobile`; qualquer outro
// valor é o mesmo 400 de antes, e nada é gravado nem publicado.
function assertMobileSource(value: unknown): "mobile" {
  if (value === undefined || value === null || value === "" || value === "mobile") return "mobile";

  throw new FieldLocationError(400, "FIELD_LOCATION_INVALID", "invalid_source", "source is invalid.");
}

export function parseFieldLocationDateFilter(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  return parseDate(value, field);
}

export function parseFieldLocationLimit(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number.parseInt(String(value), 10);

  return normalizeLimit(parsed);
}

function sanitizeLocationMetadata(metadata: JsonRecord | undefined): JsonRecord {
  if (!metadata) return {};

  return compactRecord(sanitizeRecord(metadata));
}

function sanitizeRecord(metadata: JsonRecord): JsonRecord {
  const sanitized: JsonRecord = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (sensitiveKeyPattern.test(key)) {
      sanitized[key] = "[REDACTED]";
      continue;
    }

    sanitized[key] = sanitizeValue(value);
  }

  return sanitized;
}

function sanitizeValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(sanitizeValue).filter((item) => item !== undefined);
  if (typeof value === "object" && value !== null) return sanitizeRecord(value as JsonRecord);
  return value;
}

function compactRecord(input: JsonRecord): JsonRecord {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

const memoryRepository = new InMemoryFieldLocationRepository();
let defaultServicePromise: Promise<FieldLocationService> | undefined;

export function createMemoryFieldLocationService(): FieldLocationService {
  return new FieldLocationService(memoryRepository);
}

export function getMemoryFieldLocationRepositoryForTests(): InMemoryFieldLocationRepository {
  return memoryRepository;
}

export async function createDefaultFieldLocationService(): Promise<FieldLocationService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryFieldLocationService();
  }

  defaultServicePromise ??= createPrismaFieldLocationService();

  return defaultServicePromise;
}

export function resetFieldLocationRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaFieldLocationService(): Promise<FieldLocationService> {
  const { createPrismaFieldLocationRepository } = await import("./field-location-prisma.repository.js");
  const repository = await createPrismaFieldLocationRepository();

  return new FieldLocationService(repository);
}
