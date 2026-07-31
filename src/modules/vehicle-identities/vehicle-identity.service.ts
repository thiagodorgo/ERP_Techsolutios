import { env } from "../../config/env.js";
import { normalizePlateKey, normalizeRenavamKey } from "../portal-shared/index.js";
import { InMemoryVehicleIdentityRepository, type VehicleIdentityRepository } from "./vehicle-identity.repository.js";
import type {
  ListVehicleIdentityResult,
  VehicleIdentity,
  VehicleIdentityActorContext,
} from "./vehicle-identity.types.js";
import { VehicleIdentityError } from "./vehicle-identity.types.js";
import {
  assertIdentityCoherence,
  optionalNullableString,
  optionalString,
  parseLimit,
  parseOffset,
  parseOptionalConfidence,
  parseOptionalSearch,
  parseOptionalYear,
  parseRequiredUuid,
  readAliasedField,
  readOptionalBoolean,
} from "./vehicle-identity.validators.js";

type RawRecord = Record<string, unknown>;

export class VehicleIdentityService {
  constructor(private readonly repository: VehicleIdentityRepository) {}

  async list(actor: VehicleIdentityActorContext, query: RawRecord): Promise<ListVehicleIdentityResult> {
    const plateRaw = optionalString(query.plate, 20, "plate");
    return this.repository.listIdentities({
      tenantId: actor.tenantId,
      confidence: parseOptionalConfidence(query.confidence),
      plateKey: plateRaw ? normalizePlateKey(plateRaw) : undefined,
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    });
  }

  // SEM merge/unmerge (PR-04) e SEM backfill (PR-03) — cria uma identidade NOVA e independente. confidence
  // aceita só PROVISIONAL/CONFIRMED (validators bloqueia MERGED); canonical_identity_id nunca é aceito no body.
  async create(actor: VehicleIdentityActorContext, body: RawRecord): Promise<VehicleIdentity> {
    const unidentified = readOptionalBoolean(body.unidentified, "unidentified") ?? false;
    const plateRaw = optionalString(body.plate ?? body.plateRaw, 20, "plate");
    const chassis = optionalString(body.chassis, 32, "chassis");
    const renavamRaw = optionalString(body.renavam ?? body.renavamKey, 32, "renavam");
    const unidentifiedReason = optionalString(body.unidentifiedReason, 500, "unidentifiedReason");
    const plateKey = plateRaw ? normalizePlateKey(plateRaw) : undefined;
    const renavamKey = renavamRaw ? normalizeRenavamKey(renavamRaw) : undefined;

    assertIdentityCoherence({ unidentified, unidentifiedReason, plateKey, chassis, renavamKey });

    return this.repository.createIdentity({
      tenantId: actor.tenantId,
      plateRaw,
      plateKey,
      chassis,
      renavamKey,
      brand: optionalString(body.brand, 80, "brand"),
      model: optionalString(body.model, 80, "model"),
      color: optionalString(body.color, 40, "color"),
      year: parseOptionalYear(body.year) ?? undefined,
      unidentified,
      unidentifiedReason,
      confidence: parseOptionalConfidence(body.confidence),
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
  }

  async get(actor: VehicleIdentityActorContext, identityId: string): Promise<VehicleIdentity> {
    const identity = await this.repository.findIdentityById(actor.tenantId, parseRequiredUuid(identityId, "identityId"));
    if (!identity) {
      throw new VehicleIdentityError(404, "VEHICLE_IDENTITY_NOT_FOUND", "not_found", "Vehicle identity was not found.");
    }
    return identity;
  }

  // Correção de placa/dados — SEM lógica de merge/colisão (PR-04). confidence continua restrito a
  // PROVISIONAL/CONFIRMED; canonical_identity_id permanece inacessível por este endpoint.
  async update(actor: VehicleIdentityActorContext, identityId: string, body: RawRecord): Promise<VehicleIdentity> {
    const current = await this.get(actor, identityId);

    const unidentified = readOptionalBoolean(body.unidentified, "unidentified") ?? current.unidentified;
    const plateRawInput = optionalNullableString(readAliasedField(body, "plate", "plateRaw"), 20, "plate");
    const chassisInput = optionalNullableString(body.chassis, 32, "chassis");
    const renavamRawInput = optionalNullableString(readAliasedField(body, "renavam", "renavamKey"), 32, "renavam");
    const unidentifiedReasonInput = optionalNullableString(body.unidentifiedReason, 500, "unidentifiedReason");

    const plateKeyInput = plateRawInput === undefined ? undefined : plateRawInput === null ? null : normalizePlateKey(plateRawInput);
    const renavamKeyInput = renavamRawInput === undefined ? undefined : renavamRawInput === null ? null : normalizeRenavamKey(renavamRawInput);

    // Resolve os valores efetivos pós-PATCH (undefined preserva o atual) para validar a coerência ANTES de gravar
    // — belt-and-suspenders sobre o CHECK identity_chk do banco, com mensagem de erro melhor para a UI.
    const effectivePlateKey = plateKeyInput === undefined ? current.plateKey : plateKeyInput ?? undefined;
    const effectiveChassis = chassisInput === undefined ? current.chassis : chassisInput ?? undefined;
    const effectiveRenavamKey = renavamKeyInput === undefined ? current.renavamKey : renavamKeyInput ?? undefined;
    const effectiveUnidentifiedReason = unidentifiedReasonInput === undefined ? current.unidentifiedReason : unidentifiedReasonInput ?? undefined;

    assertIdentityCoherence({
      unidentified,
      unidentifiedReason: effectiveUnidentifiedReason,
      plateKey: effectivePlateKey,
      chassis: effectiveChassis,
      renavamKey: effectiveRenavamKey,
    });

    const updated = await this.repository.updateIdentity({
      tenantId: actor.tenantId,
      identityId: current.id,
      plateRaw: plateRawInput,
      plateKey: plateKeyInput,
      chassis: chassisInput,
      renavamKey: renavamKeyInput,
      brand: optionalNullableString(body.brand, 80, "brand"),
      model: optionalNullableString(body.model, 80, "model"),
      color: optionalNullableString(body.color, 40, "color"),
      year: parseOptionalYear(body.year),
      unidentified: body.unidentified === undefined ? undefined : unidentified,
      unidentifiedReason: unidentifiedReasonInput,
      confidence: parseOptionalConfidence(body.confidence),
      updatedBy: actor.userId,
    });
    if (!updated) {
      throw new VehicleIdentityError(404, "VEHICLE_IDENTITY_NOT_FOUND", "not_found", "Vehicle identity was not found.");
    }
    return updated;
  }
}

const memoryRepository = new InMemoryVehicleIdentityRepository();
let defaultVehicleIdentityServicePromise: Promise<VehicleIdentityService> | undefined;

export function createMemoryVehicleIdentityService(): VehicleIdentityService {
  return new VehicleIdentityService(memoryRepository);
}

export function getMemoryVehicleIdentityRepositoryForTests(): InMemoryVehicleIdentityRepository {
  return memoryRepository;
}

export async function createDefaultVehicleIdentityService(): Promise<VehicleIdentityService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryVehicleIdentityService();
  }
  defaultVehicleIdentityServicePromise ??= createPrismaVehicleIdentityService();
  return defaultVehicleIdentityServicePromise;
}

export function resetVehicleIdentityRuntimeForTests(): void {
  memoryRepository.reset();
  defaultVehicleIdentityServicePromise = undefined;
}

async function createPrismaVehicleIdentityService(): Promise<VehicleIdentityService> {
  const { createPrismaVehicleIdentityRepository } = await import("./vehicle-identity-prisma.repository.js");
  return new VehicleIdentityService(await createPrismaVehicleIdentityRepository());
}
