import { env } from "../../config/env.js";
import {
  InMemoryPoiRepository,
  type PoiRepository,
} from "./poi.repository.js";
import type {
  Poi,
  PoiActorContext,
  ListPoiInput,
  ListPoiResult,
  UpdatePoiInput,
} from "./poi.types.js";
import { PoiError } from "./poi.types.js";
import {
  assertValidCoordinate,
  parseLimit,
  parseName,
  parseOffset,
  parseOptionalAddress,
  parseOptionalCategory,
  parseOptionalLatitude,
  parseOptionalLongitude,
  parseOptionalSearch,
  parseRequiredLatitude,
  parseRequiredLongitude,
  parseRequiredUuid,
  readOptionalBoolean,
} from "./poi.validators.js";

type RawRecord = Record<string, unknown>;

export class PoiService {
  constructor(private readonly repository: PoiRepository) {}

  async list(actor: PoiActorContext, query: RawRecord): Promise<ListPoiResult> {
    const input: ListPoiInput = {
      tenantId: actor.tenantId,
      isActive: readOptionalBoolean(query.is_active ?? query.isActive),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };
    return this.repository.list(input);
  }

  async create(actor: PoiActorContext, body: RawRecord): Promise<Poi> {
    const latitude = parseRequiredLatitude(body.latitude);
    const longitude = parseRequiredLongitude(body.longitude);
    // Ω1 — nunca persiste sentinela/fora de faixa (guarda dupla na borda, mesmo predicado do mapa).
    assertValidCoordinate(latitude, longitude);
    // Tenant vem SEMPRE do ator autenticado; tenant_id no body é ignorado.
    return this.repository.create({
      tenantId: actor.tenantId,
      name: parseName(body.name),
      category: parseOptionalCategory(body.category),
      latitude,
      longitude,
      address: parseOptionalAddress(body.address),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive) ?? true,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
  }

  async get(actor: PoiActorContext, poiId: string): Promise<Poi> {
    const poi = await this.repository.findById(actor.tenantId, parseRequiredUuid(poiId, "poiId"));
    if (!poi) {
      throw new PoiError(404, "POI_NOT_FOUND", "not_found", "Point of interest was not found.");
    }
    return poi;
  }

  async update(actor: PoiActorContext, poiId: string, body: RawRecord): Promise<Poi> {
    const latitude = parseOptionalLatitude(body.latitude);
    const longitude = parseOptionalLongitude(body.longitude);
    // Coordenada move-se aos pares: ambos ou nenhum, e o par precisa ser válido (não-sentinela).
    if ((latitude === undefined) !== (longitude === undefined)) {
      throw new PoiError(400, "POI_INVALID", "invalid_coordinate", "latitude and longitude must be updated together.");
    }
    if (latitude !== undefined && longitude !== undefined) {
      assertValidCoordinate(latitude, longitude);
    }

    const input: UpdatePoiInput = {
      tenantId: actor.tenantId,
      poiId: parseRequiredUuid(poiId, "poiId"),
      name: body.name === undefined ? undefined : parseName(body.name),
      category: parseOptionalCategory(body.category),
      latitude,
      longitude,
      address: parseOptionalAddress(body.address),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive),
      updatedBy: actor.userId,
    };
    const updated = await this.repository.update(input);
    if (!updated) {
      throw new PoiError(404, "POI_NOT_FOUND", "not_found", "Point of interest was not found.");
    }
    return updated;
  }
}

const memoryRepository = new InMemoryPoiRepository();
let defaultServicePromise: Promise<PoiService> | undefined;

export function createMemoryPoiService(): PoiService {
  return new PoiService(memoryRepository);
}

export function getMemoryPoiRepositoryForTests(): InMemoryPoiRepository {
  return memoryRepository;
}

export async function createDefaultPoiService(): Promise<PoiService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryPoiService();
  }
  defaultServicePromise ??= createPrismaPoiService();
  return defaultServicePromise;
}

export function resetPoiRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaPoiService(): Promise<PoiService> {
  const { createPrismaPoiRepository } = await import("./poi-prisma.repository.js");
  const repository = await createPrismaPoiRepository();
  return new PoiService(repository);
}
