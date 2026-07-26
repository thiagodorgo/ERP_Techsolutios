import { randomUUID } from "node:crypto";

import type {
  AllocateSpotInput,
  CreateYardAreaInput,
  CreateYardInput,
  CreateYardSpotInput,
  ListYardAreaInput,
  ListYardInput,
  ListYardResult,
  ListYardSpotByYardInput,
  ListYardSpotInput,
  MoveSpotInput,
  UpdateYardAreaInput,
  UpdateYardInput,
  UpdateYardSpotInput,
  VacateSpotInput,
  Yard,
  YardArea,
  YardSpot,
} from "./yard.types.js";
import { YardError } from "./yard.types.js";

export interface YardRepository {
  createYard(input: CreateYardInput): Promise<Yard>;
  listYards(input: ListYardInput): Promise<ListYardResult>;
  findYardById(tenantId: string, yardId: string): Promise<Yard | undefined>;
  updateYard(input: UpdateYardInput): Promise<Yard | undefined>;

  createArea(input: CreateYardAreaInput): Promise<YardArea>;
  listAreasByYard(input: ListYardAreaInput): Promise<readonly YardArea[]>;
  findAreaById(tenantId: string, areaId: string): Promise<YardArea | undefined>;
  updateArea(input: UpdateYardAreaInput): Promise<YardArea | undefined>;

  createSpot(input: CreateYardSpotInput): Promise<YardSpot>;
  listSpotsByArea(input: ListYardSpotInput): Promise<readonly YardSpot[]>;
  listSpotsByYard(input: ListYardSpotByYardInput): Promise<readonly YardSpot[]>;
  findSpotById(tenantId: string, spotId: string): Promise<YardSpot | undefined>;
  updateSpot(input: UpdateYardSpotInput): Promise<YardSpot | undefined>;

  // Ocupação (I1) — 1-para-1 vaga×processo.
  allocate(input: AllocateSpotInput): Promise<YardSpot>;
  vacate(input: VacateSpotInput): Promise<YardSpot>;
  move(input: MoveSpotInput): Promise<YardSpot>;

  reset?(): void;
}

export class InMemoryYardRepository implements YardRepository {
  private readonly yards = new Map<string, Yard>();
  private readonly areas = new Map<string, YardArea>();
  private readonly spots = new Map<string, YardSpot>();

  async createYard(input: CreateYardInput): Promise<Yard> {
    const now = new Date();
    const yard: Yard = {
      id: randomUUID(),
      tenantId: input.tenantId,
      branchId: input.branchId,
      name: input.name,
      address: input.address,
      capacityHint: input.capacityHint,
      timezone: input.timezone,
      active: input.active ?? true,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
      createdAt: now,
      updatedAt: now,
    };
    this.yards.set(yard.id, yard);
    return yard;
  }

  async listYards(input: ListYardInput): Promise<ListYardResult> {
    const filtered = [...this.yards.values()]
      .filter((yard) => yard.tenantId === input.tenantId)
      .filter((yard) => input.branchId === undefined || yard.branchId === input.branchId)
      .filter((yard) => input.active === undefined || yard.active === input.active)
      .filter((yard) => matchesYardSearch(yard, input.search))
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findYardById(tenantId: string, yardId: string): Promise<Yard | undefined> {
    const yard = this.yards.get(yardId);
    return yard?.tenantId === tenantId ? yard : undefined;
  }

  async updateYard(input: UpdateYardInput): Promise<Yard | undefined> {
    const current = await this.findYardById(input.tenantId, input.yardId);
    if (!current) return undefined;

    const updated: Yard = {
      ...current,
      branchId: input.branchId === undefined ? current.branchId : input.branchId ?? undefined,
      name: input.name ?? current.name,
      address: input.address ?? current.address,
      capacityHint: input.capacityHint === undefined ? current.capacityHint : input.capacityHint ?? undefined,
      timezone: input.timezone ?? current.timezone,
      active: input.active ?? current.active,
      updatedBy: input.updatedBy ?? current.updatedBy,
      updatedAt: new Date(),
    };
    this.yards.set(updated.id, updated);
    return updated;
  }

  async createArea(input: CreateYardAreaInput): Promise<YardArea> {
    const yard = await this.findYardById(input.tenantId, input.yardId);
    if (!yard) {
      throw new YardError(404, "YARD_NOT_FOUND", "not_found", "Yard was not found.");
    }
    if (input.parentId) {
      const parent = await this.findAreaById(input.tenantId, input.parentId);
      if (!parent || parent.yardId !== input.yardId) {
        throw new YardError(400, "YARD_INVALID", "invalid_parent", "parentId must reference an area of the same yard.");
      }
    }
    if (this.hasAreaNaturalKey(input.tenantId, input.yardId, input.parentId, input.name)) {
      throw new YardError(409, "YARD_AREA_CONFLICT", "duplicate_area", "An area with this name already exists under the same parent.");
    }

    const now = new Date();
    const area: YardArea = {
      id: randomUUID(),
      tenantId: input.tenantId,
      yardId: input.yardId,
      parentId: input.parentId,
      kind: input.kind,
      name: input.name,
      covered: input.covered ?? false,
      vehicleClass: input.vehicleClass ?? "ANY",
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
      createdAt: now,
      updatedAt: now,
    };
    this.areas.set(area.id, area);
    return area;
  }

  async listAreasByYard(input: ListYardAreaInput): Promise<readonly YardArea[]> {
    return [...this.areas.values()]
      .filter((area) => area.tenantId === input.tenantId && area.yardId === input.yardId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  async findAreaById(tenantId: string, areaId: string): Promise<YardArea | undefined> {
    const area = this.areas.get(areaId);
    return area?.tenantId === tenantId ? area : undefined;
  }

  async updateArea(input: UpdateYardAreaInput): Promise<YardArea | undefined> {
    const current = await this.findAreaById(input.tenantId, input.areaId);
    if (!current) return undefined;

    if (input.name !== undefined && input.name !== current.name) {
      if (this.hasAreaNaturalKey(current.tenantId, current.yardId, current.parentId, input.name)) {
        throw new YardError(409, "YARD_AREA_CONFLICT", "duplicate_area", "An area with this name already exists under the same parent.");
      }
    }

    const updated: YardArea = {
      ...current,
      name: input.name ?? current.name,
      covered: input.covered ?? current.covered,
      vehicleClass: input.vehicleClass ?? current.vehicleClass,
      updatedBy: input.updatedBy ?? current.updatedBy,
      updatedAt: new Date(),
    };
    this.areas.set(updated.id, updated);
    return updated;
  }

  async createSpot(input: CreateYardSpotInput): Promise<YardSpot> {
    const area = await this.findAreaById(input.tenantId, input.areaId);
    if (!area) {
      throw new YardError(404, "YARD_AREA_NOT_FOUND", "not_found", "Yard area was not found.");
    }
    if (this.hasSpotCode(input.tenantId, input.areaId, input.code)) {
      throw new YardError(409, "YARD_SPOT_CONFLICT", "duplicate_spot_code", "A spot with this code already exists in the area.");
    }

    const now = new Date();
    const spot: YardSpot = {
      id: randomUUID(),
      tenantId: input.tenantId,
      areaId: input.areaId,
      code: input.code,
      covered: input.covered ?? false,
      vehicleClass: input.vehicleClass ?? "ANY",
      status: "FREE",
      currentProcessId: undefined,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
      createdAt: now,
      updatedAt: now,
    };
    this.spots.set(spot.id, spot);
    return spot;
  }

  async listSpotsByArea(input: ListYardSpotInput): Promise<readonly YardSpot[]> {
    return [...this.spots.values()]
      .filter((spot) => spot.tenantId === input.tenantId && spot.areaId === input.areaId)
      .sort((left, right) => left.code.localeCompare(right.code));
  }

  async listSpotsByYard(input: ListYardSpotByYardInput): Promise<readonly YardSpot[]> {
    const areaIds = new Set(
      [...this.areas.values()]
        .filter((area) => area.tenantId === input.tenantId && area.yardId === input.yardId)
        .map((area) => area.id),
    );
    return [...this.spots.values()]
      .filter((spot) => spot.tenantId === input.tenantId && areaIds.has(spot.areaId))
      .sort((left, right) => left.code.localeCompare(right.code));
  }

  async findSpotById(tenantId: string, spotId: string): Promise<YardSpot | undefined> {
    const spot = this.spots.get(spotId);
    return spot?.tenantId === tenantId ? spot : undefined;
  }

  async updateSpot(input: UpdateYardSpotInput): Promise<YardSpot | undefined> {
    const current = await this.findSpotById(input.tenantId, input.spotId);
    if (!current) return undefined;

    // Bloqueio operacional só sai/entra de FREE⇄BLOCKED (nunca mexe em vaga OCUPADA — I1).
    if (input.status !== undefined && current.status === "OCCUPIED") {
      throw new YardError(409, "SPOT_OCCUPIED", "spot_occupied", "Cannot change the status of an occupied spot; vacate it first.");
    }
    if (input.code !== undefined && input.code !== current.code) {
      if (this.hasSpotCode(current.tenantId, current.areaId, input.code)) {
        throw new YardError(409, "YARD_SPOT_CONFLICT", "duplicate_spot_code", "A spot with this code already exists in the area.");
      }
    }

    const updated: YardSpot = {
      ...current,
      code: input.code ?? current.code,
      covered: input.covered ?? current.covered,
      vehicleClass: input.vehicleClass ?? current.vehicleClass,
      status: input.status ?? current.status,
      updatedBy: input.updatedBy ?? current.updatedBy,
      updatedAt: new Date(),
    };
    this.spots.set(updated.id, updated);
    return updated;
  }

  // I1a (uma vaga ≤ 1 processo) — guarda de status. I1b (um processo ≤ 1 vaga) — varredura do processId.
  // Node é single-thread: o InMemory prova a LÓGICA dos guards; a corrida REAL (FOR UPDATE + partial-unique)
  // roda no teste DB-gated.
  async allocate(input: AllocateSpotInput): Promise<YardSpot> {
    const spot = await this.findSpotById(input.tenantId, input.spotId);
    if (!spot) {
      throw new YardError(404, "YARD_SPOT_NOT_FOUND", "not_found", "Yard spot was not found.");
    }
    if (spot.status !== "FREE") {
      throw new YardError(409, "SPOT_NOT_FREE", "spot_not_free", "The spot is not free.");
    }
    const alreadyParked = [...this.spots.values()].some(
      (candidate) => candidate.tenantId === input.tenantId && candidate.currentProcessId === input.processId,
    );
    if (alreadyParked) {
      throw new YardError(409, "PROCESS_ALREADY_PARKED", "process_already_parked", "The process is already parked in another spot.");
    }

    const updated: YardSpot = {
      ...spot,
      status: "OCCUPIED",
      currentProcessId: input.processId,
      updatedBy: input.actorId ?? spot.updatedBy,
      updatedAt: new Date(),
    };
    this.spots.set(updated.id, updated);
    return updated;
  }

  async vacate(input: VacateSpotInput): Promise<YardSpot> {
    const spot = await this.findSpotById(input.tenantId, input.spotId);
    if (!spot) {
      throw new YardError(404, "YARD_SPOT_NOT_FOUND", "not_found", "Yard spot was not found.");
    }
    if (spot.status !== "OCCUPIED") {
      throw new YardError(409, "SPOT_NOT_OCCUPIED", "spot_not_occupied", "The spot is not occupied.");
    }

    const updated: YardSpot = {
      ...spot,
      status: "FREE",
      currentProcessId: undefined,
      updatedBy: input.actorId ?? spot.updatedBy,
      updatedAt: new Date(),
    };
    this.spots.set(updated.id, updated);
    return updated;
  }

  async move(input: MoveSpotInput): Promise<YardSpot> {
    if (input.fromSpotId === input.toSpotId) {
      throw new YardError(400, "YARD_INVALID", "invalid_move", "fromSpotId and toSpotId must differ.");
    }
    const from = await this.findSpotById(input.tenantId, input.fromSpotId);
    if (!from) {
      throw new YardError(404, "YARD_SPOT_NOT_FOUND", "not_found", "Source yard spot was not found.");
    }
    const to = await this.findSpotById(input.tenantId, input.toSpotId);
    if (!to) {
      throw new YardError(404, "YARD_SPOT_NOT_FOUND", "not_found", "Destination yard spot was not found.");
    }
    if (from.status !== "OCCUPIED" || from.currentProcessId === undefined) {
      throw new YardError(409, "SPOT_NOT_OCCUPIED", "spot_not_occupied", "The source spot is not occupied.");
    }
    if (to.status !== "FREE") {
      throw new YardError(409, "SPOT_NOT_FREE", "spot_not_free", "The destination spot is not free.");
    }

    const processId = from.currentProcessId;
    const now = new Date();
    // Limpa a origem ANTES de setar o destino (senão o partial-unique dispararia no meio, no Postgres).
    this.spots.set(from.id, {
      ...from,
      status: "FREE",
      currentProcessId: undefined,
      updatedBy: input.actorId ?? from.updatedBy,
      updatedAt: now,
    });
    const moved: YardSpot = {
      ...to,
      status: "OCCUPIED",
      currentProcessId: processId,
      updatedBy: input.actorId ?? to.updatedBy,
      updatedAt: now,
    };
    this.spots.set(moved.id, moved);
    return moved;
  }

  reset(): void {
    this.yards.clear();
    this.areas.clear();
    this.spots.clear();
  }

  // App-level natural key (espelha o índice Postgres, mas cobre TAMBÉM o topo parent=NULL — no Postgres NULLs
  // são distintos, então 2 BLOCKs de topo homônimos não colidiriam no índice; aqui o guard barra ambos).
  private hasAreaNaturalKey(tenantId: string, yardId: string, parentId: string | undefined, name: string): boolean {
    return [...this.areas.values()].some(
      (area) =>
        area.tenantId === tenantId &&
        area.yardId === yardId &&
        (area.parentId ?? null) === (parentId ?? null) &&
        area.name === name,
    );
  }

  private hasSpotCode(tenantId: string, areaId: string, code: string): boolean {
    return [...this.spots.values()].some(
      (spot) => spot.tenantId === tenantId && spot.areaId === areaId && spot.code === code,
    );
  }
}

function matchesYardSearch(yard: Yard, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();
  return [yard.name, yard.address].some((value) => value.toLowerCase().includes(normalized));
}
