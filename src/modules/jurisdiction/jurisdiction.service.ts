import { env } from "../../config/env.js";
import { resolveDefaults, type ResolvedDefaults } from "./jurisdiction.defaults.js";
import { InMemoryJurisdictionRepository, type JurisdictionRepository } from "./jurisdiction.repository.js";
import type {
  JurisdictionActorContext,
  JurisdictionProfile,
  ListJurisdictionProfileResult,
  ProfileScope,
} from "./jurisdiction.types.js";
import { JurisdictionError } from "./jurisdiction.types.js";
import {
  parseLimit,
  parseName,
  parseOffset,
  parseOptionalDailyCap,
  parseOptionalDailyModel,
  parseOptionalName,
  parseOptionalNotes,
  parseOptionalPositiveDeadline,
  parseOptionalReleaseRequirements,
  parseOptionalScope,
  parseOptionalSearch,
  parseReleaseRequirements,
  parseRequiredUuid,
  parseScope,
  readOptionalBoolean,
} from "./jurisdiction.validators.js";

type RawRecord = Record<string, unknown>;

export class JurisdictionService {
  constructor(private readonly repository: JurisdictionRepository) {}

  async list(actor: JurisdictionActorContext, query: RawRecord): Promise<ListJurisdictionProfileResult> {
    return this.repository.listProfiles({
      tenantId: actor.tenantId,
      scope: parseOptionalScope(query.scope),
      active: readOptionalBoolean(query.active),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    });
  }

  async create(actor: JurisdictionActorContext, body: RawRecord): Promise<JurisdictionProfile> {
    // Scope resolve os defaults federais que preenchem os campos omitidos (resolveDefaults, foundation I4/I6).
    const scope = parseScope(body.scope);
    const defaults = resolveDefaults(scope);
    return this.repository.createProfile({
      tenantId: actor.tenantId,
      name: parseName(body.name),
      scope,
      ownerNotifDays: parseOptionalPositiveDeadline(body.owner_notif_days ?? body.ownerNotifDays, "ownerNotifDays") ?? defaults.ownerNotifDays,
      noticeEdictDay: parseOptionalPositiveDeadline(body.notice_edict_day ?? body.noticeEdictDay, "noticeEdictDay") ?? defaults.noticeEdictDay,
      auctionEligibleDay: parseOptionalPositiveDeadline(body.auction_eligible_day ?? body.auctionEligibleDay, "auctionEligibleDay") ?? defaults.auctionEligibleDay,
      auctionEdictBusinessDays:
        parseOptionalPositiveDeadline(body.auction_edict_business_days ?? body.auctionEdictBusinessDays, "auctionEdictBusinessDays") ?? defaults.auctionEdictBusinessDays,
      dailyModel: parseOptionalDailyModel(body.daily_model ?? body.dailyModel) ?? defaults.dailyModel,
      dailyCap: parseOptionalDailyCap(body.daily_cap ?? body.dailyCap) ?? defaults.dailyCap,
      releaseRequirements: parseReleaseRequirements(body.release_requirements ?? body.releaseRequirements),
      notes: parseOptionalNotes(body.notes) ?? undefined,
      active: readOptionalBoolean(body.active) ?? true,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
  }

  async get(actor: JurisdictionActorContext, profileId: string): Promise<JurisdictionProfile> {
    const profile = await this.repository.findProfileById(actor.tenantId, parseRequiredUuid(profileId, "profileId"));
    if (!profile) {
      throw new JurisdictionError(404, "JURISDICTION_NOT_FOUND", "not_found", "Jurisdiction profile was not found.");
    }
    return profile;
  }

  async update(actor: JurisdictionActorContext, profileId: string, body: RawRecord): Promise<JurisdictionProfile> {
    await this.get(actor, profileId);
    const updated = await this.repository.updateProfile({
      tenantId: actor.tenantId,
      profileId: parseRequiredUuid(profileId, "profileId"),
      name: body.name === undefined ? undefined : parseOptionalName(body.name),
      scope: parseOptionalScope(body.scope),
      ownerNotifDays: parseOptionalPositiveDeadline(body.owner_notif_days ?? body.ownerNotifDays, "ownerNotifDays"),
      noticeEdictDay: parseOptionalPositiveDeadline(body.notice_edict_day ?? body.noticeEdictDay, "noticeEdictDay"),
      auctionEligibleDay: parseOptionalPositiveDeadline(body.auction_eligible_day ?? body.auctionEligibleDay, "auctionEligibleDay"),
      auctionEdictBusinessDays: parseOptionalPositiveDeadline(body.auction_edict_business_days ?? body.auctionEdictBusinessDays, "auctionEdictBusinessDays"),
      dailyModel: parseOptionalDailyModel(body.daily_model ?? body.dailyModel),
      dailyCap: parseOptionalDailyCap(body.daily_cap ?? body.dailyCap),
      releaseRequirements: parseOptionalReleaseRequirements(body.release_requirements ?? body.releaseRequirements),
      notes: parseOptionalNotes(body.notes),
      active: readOptionalBoolean(body.active),
      updatedBy: actor.userId,
    });
    if (!updated) {
      throw new JurisdictionError(404, "JURISDICTION_NOT_FOUND", "not_found", "Jurisdiction profile was not found.");
    }
    return updated;
  }

  // Ω5P PR-17 — READ-PORT do owner-portal (dossiê): os prazos legais (offsets em dias a partir do t0) + o checklist
  // de exigências para liberação. §2.8/RN-POR-02: expõe SÓ ownerNotifDays/noticeEdictDay/auctionEligibleDay (para
  // o portal derivar as DATAS a partir do enteredAt) e os requisitos {label, required} — NUNCA o `code` interno, o
  // `satisfied` (estado interno do checklist) nem qualquer id/scope/tarifa. undefined = perfil inexistente no tenant.
  async getPortalProfile(
    tenantId: string,
    profileId: string,
  ): Promise<
    | {
        readonly ownerNotifDays: number;
        readonly noticeEdictDay: number;
        readonly auctionEligibleDay: number;
        readonly requirements: ReadonlyArray<{ readonly label: string; readonly required: boolean }>;
      }
    | undefined
  > {
    const profile = await this.repository.findProfileById(tenantId, profileId);
    if (!profile) return undefined;
    return {
      ownerNotifDays: profile.ownerNotifDays,
      noticeEdictDay: profile.noticeEdictDay,
      auctionEligibleDay: profile.auctionEligibleDay,
      requirements: profile.releaseRequirements.map((requirement) => ({
        label: requirement.label,
        required: requirement.required,
      })),
    };
  }

  // GET /jurisdiction-defaults?scope= — exercita resolveDefaults por HTTP (foundation do form da UI/PR-04). Não
  // toca o repositório; valida o scope e devolve os defaults federais daquela natureza.
  defaults(query: RawRecord): { readonly scope: ProfileScope; readonly defaults: ResolvedDefaults } {
    const scope = parseScope(query.scope);
    return { scope, defaults: resolveDefaults(scope) };
  }
}

const memoryRepository = new InMemoryJurisdictionRepository();
let defaultJurisdictionServicePromise: Promise<JurisdictionService> | undefined;

export function createMemoryJurisdictionService(): JurisdictionService {
  return new JurisdictionService(memoryRepository);
}

export function getMemoryJurisdictionRepositoryForTests(): InMemoryJurisdictionRepository {
  return memoryRepository;
}

export async function createDefaultJurisdictionService(): Promise<JurisdictionService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryJurisdictionService();
  }
  defaultJurisdictionServicePromise ??= createPrismaJurisdictionService();
  return defaultJurisdictionServicePromise;
}

export function resetJurisdictionRuntimeForTests(): void {
  memoryRepository.reset();
  defaultJurisdictionServicePromise = undefined;
}

async function createPrismaJurisdictionService(): Promise<JurisdictionService> {
  const { createPrismaJurisdictionRepository } = await import("./jurisdiction-prisma.repository.js");
  return new JurisdictionService(await createPrismaJurisdictionRepository());
}
