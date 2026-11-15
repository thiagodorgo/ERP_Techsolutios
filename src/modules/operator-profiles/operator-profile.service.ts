import { env } from "../../config/env.js";
import {
  InMemoryOperatorProfileRepository,
  type OperatorProfileRepository,
} from "./operator-profile.repository.js";
import type { HolderConsentGrantResult, HolderConsentLock } from "./operator-profile.repository.js";
import type {
  OperatorProfile,
  OperatorProfileActorContext,
  ListOperatorProfileInput,
  ListOperatorProfileResult,
  UpdateOperatorProfileInput,
} from "./operator-profile.types.js";
import { OperatorProfileError } from "./operator-profile.types.js";
import {
  parseLimit,
  parseOffset,
  parseOptionalCnhCategory,
  parseOptionalCnhNumber,
  parseOptionalDate,
  parseOptionalFullName,
  parseOptionalNotes,
  parseOptionalPhone,
  parseOptionalSearch,
  parseRequiredUuid,
  readOptionalBoolean,
} from "./operator-profile.validators.js";

type RawRecord = Record<string, unknown>;

export class OperatorProfileService {
  constructor(private readonly repository: OperatorProfileRepository) {}

  async list(actor: OperatorProfileActorContext, query: RawRecord): Promise<ListOperatorProfileResult> {
    const input: ListOperatorProfileInput = {
      tenantId: actor.tenantId,
      isActive: readOptionalBoolean(query.is_active ?? query.isActive, "is_active"),
      hasConsent: readOptionalBoolean(query.has_consent ?? query.hasConsent, "has_consent"),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };
    return this.repository.list(input);
  }

  async create(actor: OperatorProfileActorContext, body: RawRecord): Promise<OperatorProfile> {
    // Tenant vem SEMPRE do ator autenticado; tenant_id no body é ignorado.
    const trackingConsent = readOptionalBoolean(body.tracking_consent ?? body.trackingConsent, "tracking_consent") ?? false;
    return this.repository.create({
      tenantId: actor.tenantId,
      userId: parseRequiredUuid(body.user_id ?? body.userId, "user_id"),
      fullName: parseOptionalFullName(body.full_name ?? body.fullName),
      cnhNumber: parseOptionalCnhNumber(body.cnh_number ?? body.cnhNumber),
      cnhCategory: parseOptionalCnhCategory(body.cnh_category ?? body.cnhCategory),
      cnhExpiresAt: parseOptionalDate(body.cnh_expires_at ?? body.cnhExpiresAt, "cnhExpiresAt"),
      trackingConsent,
      // LGPD — consentimento datado: carimba o instante quando concedido; null (undefined) quando não há.
      trackingConsentAt: trackingConsent ? new Date() : undefined,
      phone: parseOptionalPhone(body.phone),
      notes: parseOptionalNotes(body.notes),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive, "is_active") ?? true,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
  }

  async get(actor: OperatorProfileActorContext, profileId: string): Promise<OperatorProfile> {
    const profile = await this.repository.findById(actor.tenantId, parseRequiredUuid(profileId, "profileId"));
    if (!profile) {
      throw new OperatorProfileError(404, "OPERATOR_PROFILE_NOT_FOUND", "not_found", "Operator profile was not found.");
    }
    return profile;
  }

  // Ω4C PR-10 — ponte payee(User) → operator_profile tenant-scoped (1:1). Leitura pura: undefined quando o
  // usuário não tem perfil profissional (o chamador — a liquidação de Remunerações — traduz p/ 422).
  async findByUserId(tenantId: string, userId: string): Promise<OperatorProfile | undefined> {
    return this.repository.findByUserId(tenantId, parseRequiredUuid(userId, "userId"));
  }

  // `options.lockTimeoutMs` só vem de quem chama por código (a revogação do titular pelo app, J-568 C2-01), nunca do corpo.
  async update(
    actor: OperatorProfileActorContext,
    profileId: string,
    body: RawRecord,
    options: HolderConsentLock = {},
  ): Promise<OperatorProfile> {
    // Carrega o atual (isolamento cross-tenant → 404) para resolver a transição de consentimento LGPD.
    const current = await this.get(actor, profileId);

    const nextConsent = readOptionalBoolean(body.tracking_consent ?? body.trackingConsent, "tracking_consent");
    // B-SAN3-17 (Emenda 1.8, E17-01; D-ORQ-568-CONSENTIMENTO-SO-PELO-APP): o cadastro DESLIGA o consentimento e nunca o
    // liga, nem quando quem edita é o próprio titular. Ligar é só pelo aceite do titular no app
    // (`POST /mobile/location-consent`, com a regra de ordem decidida na escrita). Com o perfil já ligado, `true` não
    // escreve o campo (no-op), para não desfazer uma revogação que chegue entre a leitura e a escrita (Emenda 1.1).
    if (nextConsent === true && current.trackingConsent !== true) {
      throw current.userId !== actor.userId
        ? new OperatorProfileError(
            422,
            "OPERATOR_PROFILE_CONSENT_HOLDER_ONLY",
            "tracking_consent_holder_only",
            "Only the profile holder can grant tracking consent.",
          )
        : new OperatorProfileError(
            422,
            "OPERATOR_PROFILE_CONSENT_APP_ONLY",
            "tracking_consent_app_only",
            "Tracking consent is granted only by the holder, in the field app.",
          );
    }
    const consent = resolveConsentTransition(current, nextConsent === true ? undefined : nextConsent);

    const input: UpdateOperatorProfileInput = {
      tenantId: actor.tenantId,
      profileId: parseRequiredUuid(profileId, "profileId"),
      // user_id é imutável: não aceita no update (referência estável 1-1).
      fullName: parseOptionalFullName(body.full_name ?? body.fullName),
      cnhNumber: parseOptionalCnhNumber(body.cnh_number ?? body.cnhNumber),
      cnhCategory: parseOptionalCnhCategory(body.cnh_category ?? body.cnhCategory),
      cnhExpiresAt: parseOptionalDate(body.cnh_expires_at ?? body.cnhExpiresAt, "cnhExpiresAt"),
      trackingConsent: consent.trackingConsent,
      trackingConsentAt: consent.trackingConsentAt,
      phone: parseOptionalPhone(body.phone),
      notes: parseOptionalNotes(body.notes),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive, "is_active"),
      updatedBy: actor.userId,
    };
    const updated = await this.repository.update(options.lockTimeoutMs === undefined ? input : { ...input, lockTimeoutMs: options.lockTimeoutMs });
    if (!updated) {
      throw new OperatorProfileError(404, "OPERATOR_PROFILE_NOT_FOUND", "not_found", "Operator profile was not found.");
    }
    return updated;
  }

  // B-SAN3-17 (Emenda 1.7, C16-01): o ACEITE do PRÓPRIO consentimento. A regra de ordem é decidida pelo repositório NA
  // escrita, sobre a linha travada (Postgres) ou sem `await` (memória). Só o titular chega aqui.
  async applyOwnTrackingConsentGrant(
    actor: OperatorProfileActorContext,
    profileId: string,
    decidedAt: Date,
    options: HolderConsentLock = {},
  ): Promise<HolderConsentGrantResult> {
    const current = await this.get(actor, profileId);
    if (current.userId !== actor.userId) {
      throw new OperatorProfileError(
        422,
        "OPERATOR_PROFILE_CONSENT_HOLDER_ONLY",
        "tracking_consent_holder_only",
        "Only the profile holder can grant tracking consent.",
      );
    }
    const result = await this.repository.applyHolderConsentGrant({
      tenantId: actor.tenantId,
      profileId: parseRequiredUuid(profileId, "profileId"),
      decidedAt,
      updatedBy: actor.userId,
      ...(options.lockTimeoutMs === undefined ? {} : { lockTimeoutMs: options.lockTimeoutMs }),
    });
    if (!result) {
      throw new OperatorProfileError(404, "OPERATOR_PROFILE_NOT_FOUND", "not_found", "Operator profile was not found.");
    }
    return result;
  }
}

// LGPD — máquina de consentimento de rastreamento:
//  - body sem tracking_consent            → não toca no flag nem no carimbo.
//  - concede (false→true)                 → grava tracking_consent_at = agora.
//  - reafirma (true→true)                 → mantém o carimbo existente (não re-carimba).
//  - revoga (→false)                      → limpa tracking_consent_at (null).
function resolveConsentTransition(
  current: OperatorProfile,
  nextConsent: boolean | undefined,
): { trackingConsent: boolean | undefined; trackingConsentAt: Date | null | undefined } {
  if (nextConsent === undefined) {
    return { trackingConsent: undefined, trackingConsentAt: undefined };
  }
  if (nextConsent === false) {
    return { trackingConsent: false, trackingConsentAt: null };
  }
  // nextConsent === true
  if (current.trackingConsent) {
    return { trackingConsent: true, trackingConsentAt: undefined };
  }
  return { trackingConsent: true, trackingConsentAt: new Date() };
}

const memoryRepository = new InMemoryOperatorProfileRepository();
let defaultServicePromise: Promise<OperatorProfileService> | undefined;

export function createMemoryOperatorProfileService(): OperatorProfileService {
  return new OperatorProfileService(memoryRepository);
}

export function getMemoryOperatorProfileRepositoryForTests(): InMemoryOperatorProfileRepository {
  return memoryRepository;
}

export async function createDefaultOperatorProfileService(): Promise<OperatorProfileService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryOperatorProfileService();
  }
  defaultServicePromise ??= createPrismaOperatorProfileService();
  return defaultServicePromise;
}

export function resetOperatorProfileRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaOperatorProfileService(): Promise<OperatorProfileService> {
  const { createPrismaOperatorProfileRepository } = await import("./operator-profile-prisma.repository.js");
  const repository = await createPrismaOperatorProfileRepository();
  return new OperatorProfileService(repository);
}
