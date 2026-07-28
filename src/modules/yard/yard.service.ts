import { env } from "../../config/env.js";
import { InMemoryYardRepository, type YardRepository } from "./yard.repository.js";
import type {
  ListYardResult,
  Yard,
  YardActorContext,
  YardArea,
  YardSpot,
} from "./yard.types.js";
import { YardError } from "./yard.types.js";
import {
  parseAddress,
  parseCode,
  parseKind,
  parseLimit,
  parseName,
  parseNullableUuid,
  parseOffset,
  parseOperationalStatus,
  parseOptionalAddress,
  parseOptionalCapacityHint,
  parseOptionalCode,
  parseOptionalName,
  parseOptionalSearch,
  parseOptionalTimezone,
  parseOptionalUuid,
  parseOptionalVehicleClass,
  parseRequiredUuid,
  parseTimezone,
  parseVehicleClass,
  readOptionalBoolean,
} from "./yard.validators.js";

type RawRecord = Record<string, unknown>;

export class YardService {
  constructor(private readonly repository: YardRepository) {}

  async list(actor: YardActorContext, query: RawRecord): Promise<ListYardResult> {
    return this.repository.listYards({
      tenantId: actor.tenantId,
      branchId: parseOptionalUuid(query.branch_id ?? query.branchId, "branchId"),
      active: readOptionalBoolean(query.active),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    });
  }

  async create(actor: YardActorContext, body: RawRecord): Promise<Yard> {
    return this.repository.createYard({
      tenantId: actor.tenantId,
      branchId: parseOptionalUuid(body.branch_id ?? body.branchId, "branchId"),
      name: parseName(body.name),
      address: parseAddress(body.address),
      capacityHint: parseOptionalCapacityHint(body.capacity_hint ?? body.capacityHint) ?? undefined,
      timezone: parseTimezone(body.timezone),
      active: readOptionalBoolean(body.active) ?? true,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
  }

  async get(actor: YardActorContext, yardId: string): Promise<Yard> {
    const yard = await this.repository.findYardById(actor.tenantId, parseRequiredUuid(yardId, "yardId"));
    if (!yard) {
      throw new YardError(404, "YARD_NOT_FOUND", "not_found", "Yard was not found.");
    }
    return yard;
  }

  // Ω5P PR-16 — READ-PORT do owner-portal (BFF público, ator de SISTEMA no tenant vinculado; SEM RBAC HTTP).
  // Só o ENDEREÇO PÚBLICO do pátio (nome + endereço) — §2.8/RN-POR-02: NUNCA timezone/branch/capacidade/ids.
  async getPublicYard(tenantId: string, yardId: string): Promise<{ name: string; address: string } | undefined> {
    const yard = await this.repository.findYardById(tenantId, yardId);
    return yard ? { name: yard.name, address: yard.address } : undefined;
  }

  async update(actor: YardActorContext, yardId: string, body: RawRecord): Promise<Yard> {
    await this.get(actor, yardId);
    const updated = await this.repository.updateYard({
      tenantId: actor.tenantId,
      yardId: parseRequiredUuid(yardId, "yardId"),
      branchId: parseNullableUuid(body.branch_id ?? body.branchId, "branchId"),
      name: body.name === undefined ? undefined : parseOptionalName(body.name),
      address: body.address === undefined ? undefined : parseOptionalAddress(body.address),
      capacityHint: parseOptionalCapacityHint(body.capacity_hint ?? body.capacityHint),
      timezone: parseOptionalTimezone(body.timezone),
      active: readOptionalBoolean(body.active),
      updatedBy: actor.userId,
    });
    if (!updated) {
      throw new YardError(404, "YARD_NOT_FOUND", "not_found", "Yard was not found.");
    }
    return updated;
  }

  async listAreas(actor: YardActorContext, yardId: string): Promise<readonly YardArea[]> {
    await this.get(actor, yardId);
    return this.repository.listAreasByYard({ tenantId: actor.tenantId, yardId: parseRequiredUuid(yardId, "yardId") });
  }

  async createArea(actor: YardActorContext, yardId: string, body: RawRecord): Promise<YardArea> {
    await this.get(actor, yardId);
    const parentId = parseOptionalUuid(body.parent_id ?? body.parentId, "parentId");
    if (parentId) {
      const parent = await this.repository.findAreaById(actor.tenantId, parentId);
      if (!parent || parent.yardId !== parseRequiredUuid(yardId, "yardId")) {
        throw new YardError(400, "YARD_INVALID", "invalid_parent", "parentId must reference an area of the same yard.");
      }
    }
    const yardIdParsed = parseRequiredUuid(yardId, "yardId");
    const name = parseName(body.name);
    // D-Ω5P-YARD-04 — guard app-level de nome único sob o MESMO parent, COBRINDO o topo (parent=NULL): o índice
    // parcial não pega NULLs (distintos no Postgres), então a unicidade do topo vive aqui — igual em ambos os paths.
    await this.assertAreaNameAvailable(actor, yardIdParsed, parentId, name);
    return this.repository.createArea({
      tenantId: actor.tenantId,
      yardId: yardIdParsed,
      parentId,
      kind: parseKind(body.kind),
      name,
      covered: readOptionalBoolean(body.covered),
      vehicleClass: parseVehicleClass(body.vehicle_class ?? body.vehicleClass),
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
  }

  async getArea(actor: YardActorContext, areaId: string): Promise<YardArea> {
    const area = await this.repository.findAreaById(actor.tenantId, parseRequiredUuid(areaId, "areaId"));
    if (!area) {
      throw new YardError(404, "YARD_AREA_NOT_FOUND", "not_found", "Yard area was not found.");
    }
    return area;
  }

  async updateArea(actor: YardActorContext, areaId: string, body: RawRecord): Promise<YardArea> {
    const current = await this.getArea(actor, areaId);
    const name = body.name === undefined ? undefined : parseOptionalName(body.name);
    if (name !== undefined && name !== current.name) {
      await this.assertAreaNameAvailable(actor, current.yardId, current.parentId, name, current.id);
    }
    const updated = await this.repository.updateArea({
      tenantId: actor.tenantId,
      areaId: parseRequiredUuid(areaId, "areaId"),
      name,
      covered: readOptionalBoolean(body.covered),
      vehicleClass: parseOptionalVehicleClass(body.vehicle_class ?? body.vehicleClass),
      updatedBy: actor.userId,
    });
    if (!updated) {
      throw new YardError(404, "YARD_AREA_NOT_FOUND", "not_found", "Yard area was not found.");
    }
    return updated;
  }

  // Guard de unicidade de nome sob o mesmo parent (inclui o topo parent=NULL). Compartilhado InMemory×Prisma
  // para paridade — o índice do banco só cobre parent NÃO-nulo (NULLs distintos no Postgres).
  private async assertAreaNameAvailable(
    actor: YardActorContext,
    yardId: string,
    parentId: string | undefined,
    name: string,
    exceptAreaId?: string,
  ): Promise<void> {
    const siblings = await this.repository.listAreasByYard({ tenantId: actor.tenantId, yardId });
    const clash = siblings.some(
      (area) => area.id !== exceptAreaId && (area.parentId ?? undefined) === (parentId ?? undefined) && area.name === name,
    );
    if (clash) {
      throw new YardError(409, "YARD_AREA_CONFLICT", "duplicate_area", "An area with this name already exists under the same parent.");
    }
  }

  async listSpots(actor: YardActorContext, areaId: string): Promise<readonly YardSpot[]> {
    await this.getArea(actor, areaId);
    return this.repository.listSpotsByArea({ tenantId: actor.tenantId, areaId: parseRequiredUuid(areaId, "areaId") });
  }

  async createSpot(actor: YardActorContext, areaId: string, body: RawRecord): Promise<YardSpot> {
    await this.getArea(actor, areaId);
    return this.repository.createSpot({
      tenantId: actor.tenantId,
      areaId: parseRequiredUuid(areaId, "areaId"),
      code: parseCode(body.code),
      covered: readOptionalBoolean(body.covered),
      vehicleClass: parseVehicleClass(body.vehicle_class ?? body.vehicleClass),
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
  }

  async getSpot(actor: YardActorContext, spotId: string): Promise<YardSpot> {
    const spot = await this.repository.findSpotById(actor.tenantId, parseRequiredUuid(spotId, "spotId"));
    if (!spot) {
      throw new YardError(404, "YARD_SPOT_NOT_FOUND", "not_found", "Yard spot was not found.");
    }
    return spot;
  }

  async updateSpot(actor: YardActorContext, spotId: string, body: RawRecord): Promise<YardSpot> {
    await this.getSpot(actor, spotId);
    const updated = await this.repository.updateSpot({
      tenantId: actor.tenantId,
      spotId: parseRequiredUuid(spotId, "spotId"),
      code: body.code === undefined ? undefined : parseOptionalCode(body.code),
      covered: readOptionalBoolean(body.covered),
      vehicleClass: parseOptionalVehicleClass(body.vehicle_class ?? body.vehicleClass),
      status: parseOperationalStatus(body.status),
      updatedBy: actor.userId,
    });
    if (!updated) {
      throw new YardError(404, "YARD_SPOT_NOT_FOUND", "not_found", "Yard spot was not found.");
    }
    return updated;
  }

  async getOccupancy(actor: YardActorContext, yardId: string): Promise<readonly YardSpot[]> {
    await this.get(actor, yardId);
    return this.repository.listSpotsByYard({ tenantId: actor.tenantId, yardId: parseRequiredUuid(yardId, "yardId") });
  }
}

// I1 — ocupação transacional. SERVIÇO ÚNICO (sem rota HTTP em PR-01; wire ao processo real = PR-06). Os métodos
// são exercitados por teste com processIds sintéticos.
export class OccupancyService {
  constructor(private readonly repository: YardRepository) {}

  async allocate(actor: YardActorContext, input: { spotId: string; processId: string }): Promise<YardSpot> {
    return this.repository.allocate({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      spotId: parseRequiredUuid(input.spotId, "spotId"),
      processId: parseRequiredUuid(input.processId, "processId"),
    });
  }

  async vacate(actor: YardActorContext, input: { spotId: string }): Promise<YardSpot> {
    return this.repository.vacate({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      spotId: parseRequiredUuid(input.spotId, "spotId"),
    });
  }

  async move(actor: YardActorContext, input: { fromSpotId: string; toSpotId: string }): Promise<YardSpot> {
    return this.repository.move({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      fromSpotId: parseRequiredUuid(input.fromSpotId, "fromSpotId"),
      toSpotId: parseRequiredUuid(input.toSpotId, "toSpotId"),
    });
  }
}

const memoryRepository = new InMemoryYardRepository();
let defaultYardServicePromise: Promise<YardService> | undefined;
let defaultOccupancyServicePromise: Promise<OccupancyService> | undefined;

export function createMemoryYardService(): YardService {
  return new YardService(memoryRepository);
}

export function createMemoryOccupancyService(): OccupancyService {
  return new OccupancyService(memoryRepository);
}

export function getMemoryYardRepositoryForTests(): InMemoryYardRepository {
  return memoryRepository;
}

export async function createDefaultYardService(): Promise<YardService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryYardService();
  }
  defaultYardServicePromise ??= createPrismaYardService();
  return defaultYardServicePromise;
}

export async function createDefaultOccupancyService(): Promise<OccupancyService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryOccupancyService();
  }
  defaultOccupancyServicePromise ??= createPrismaOccupancyService();
  return defaultOccupancyServicePromise;
}

export function resetYardRuntimeForTests(): void {
  memoryRepository.reset();
  defaultYardServicePromise = undefined;
  defaultOccupancyServicePromise = undefined;
}

async function createPrismaYardService(): Promise<YardService> {
  const { createPrismaYardRepository } = await import("./yard-prisma.repository.js");
  return new YardService(await createPrismaYardRepository());
}

async function createPrismaOccupancyService(): Promise<OccupancyService> {
  const { createPrismaYardRepository } = await import("./yard-prisma.repository.js");
  return new OccupancyService(await createPrismaYardRepository());
}
