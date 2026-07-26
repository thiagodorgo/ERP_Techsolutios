import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type { YardRepository } from "./yard.repository.js";
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
  SpotStatus,
  UpdateYardAreaInput,
  UpdateYardInput,
  UpdateYardSpotInput,
  VacateSpotInput,
  VehicleClass,
  Yard,
  YardArea,
  YardAreaKind,
  YardSpot,
} from "./yard.types.js";
import { YardError } from "./yard.types.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

type LockedSpotRow = {
  readonly status: string;
  readonly current_process_id: string | null;
};

export class PrismaYardRepository implements YardRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async createYard(input: CreateYardInput): Promise<Yard> {
    try {
      const created = await this.client.yard.create({
        data: {
          tenant_id: input.tenantId,
          branch_id: input.branchId ?? null,
          name: input.name,
          address: input.address,
          capacity_hint: input.capacityHint ?? null,
          timezone: input.timezone,
          active: input.active ?? true,
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });
      return mapYard(created);
    } catch (error) {
      throw translateYardError(error);
    }
  }

  async listYards(input: ListYardInput): Promise<ListYardResult> {
    const where = buildYardWhere(input);
    const [items, total] = await Promise.all([
      this.client.yard.findMany({ where, orderBy: [{ created_at: "desc" }], take: input.limit, skip: input.offset }),
      this.client.yard.count({ where }),
    ]);
    return { items: items.map(mapYard), total, limit: input.limit, offset: input.offset };
  }

  async findYardById(tenantId: string, yardId: string): Promise<Yard | undefined> {
    const yard = await this.client.yard.findFirst({ where: { tenant_id: tenantId, id: yardId } });
    return yard ? mapYard(yard) : undefined;
  }

  async updateYard(input: UpdateYardInput): Promise<Yard | undefined> {
    try {
      const updated = await this.client.yard.updateManyAndReturn({
        where: { tenant_id: input.tenantId, id: input.yardId },
        data: compact({
          branch_id: input.branchId,
          name: input.name,
          address: input.address,
          capacity_hint: input.capacityHint,
          timezone: input.timezone,
          active: input.active,
          updated_by: input.updatedBy,
        }),
      });
      return updated[0] ? mapYard(updated[0]) : undefined;
    } catch (error) {
      throw translateYardError(error);
    }
  }

  async createArea(input: CreateYardAreaInput): Promise<YardArea> {
    try {
      const created = await this.client.yardArea.create({
        data: {
          tenant_id: input.tenantId,
          yard_id: input.yardId,
          parent_id: input.parentId ?? null,
          kind: input.kind,
          name: input.name,
          covered: input.covered ?? false,
          vehicle_class: input.vehicleClass ?? "ANY",
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });
      return mapArea(created);
    } catch (error) {
      throw translateYardError(error);
    }
  }

  async listAreasByYard(input: ListYardAreaInput): Promise<readonly YardArea[]> {
    const rows = await this.client.yardArea.findMany({
      where: { tenant_id: input.tenantId, yard_id: input.yardId },
      orderBy: [{ created_at: "asc" }],
    });
    return rows.map(mapArea);
  }

  async findAreaById(tenantId: string, areaId: string): Promise<YardArea | undefined> {
    const area = await this.client.yardArea.findFirst({ where: { tenant_id: tenantId, id: areaId } });
    return area ? mapArea(area) : undefined;
  }

  async updateArea(input: UpdateYardAreaInput): Promise<YardArea | undefined> {
    try {
      const updated = await this.client.yardArea.updateManyAndReturn({
        where: { tenant_id: input.tenantId, id: input.areaId },
        data: compact({
          name: input.name,
          covered: input.covered,
          vehicle_class: input.vehicleClass,
          updated_by: input.updatedBy,
        }),
      });
      return updated[0] ? mapArea(updated[0]) : undefined;
    } catch (error) {
      throw translateYardError(error);
    }
  }

  async createSpot(input: CreateYardSpotInput): Promise<YardSpot> {
    try {
      const created = await this.client.yardSpot.create({
        data: {
          tenant_id: input.tenantId,
          area_id: input.areaId,
          code: input.code,
          covered: input.covered ?? false,
          vehicle_class: input.vehicleClass ?? "ANY",
          status: "FREE",
          current_process_id: null,
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });
      return mapSpot(created);
    } catch (error) {
      throw translateYardError(error);
    }
  }

  async listSpotsByArea(input: ListYardSpotInput): Promise<readonly YardSpot[]> {
    const rows = await this.client.yardSpot.findMany({
      where: { tenant_id: input.tenantId, area_id: input.areaId },
      orderBy: [{ code: "asc" }],
    });
    return rows.map(mapSpot);
  }

  async listSpotsByYard(input: ListYardSpotByYardInput): Promise<readonly YardSpot[]> {
    const rows = await this.client.yardSpot.findMany({
      where: { tenant_id: input.tenantId, area: { yard_id: input.yardId } },
      orderBy: [{ code: "asc" }],
    });
    return rows.map(mapSpot);
  }

  async findSpotById(tenantId: string, spotId: string): Promise<YardSpot | undefined> {
    const spot = await this.client.yardSpot.findFirst({ where: { tenant_id: tenantId, id: spotId } });
    return spot ? mapSpot(spot) : undefined;
  }

  async updateSpot(input: UpdateYardSpotInput): Promise<YardSpot | undefined> {
    const current = await this.client.yardSpot.findFirst({ where: { tenant_id: input.tenantId, id: input.spotId } });
    if (!current) return undefined;
    if (input.status !== undefined && current.status === "OCCUPIED") {
      throw new YardError(409, "SPOT_OCCUPIED", "spot_occupied", "Cannot change the status of an occupied spot; vacate it first.");
    }
    try {
      const updated = await this.client.yardSpot.update({
        where: { id: input.spotId },
        data: compact({
          code: input.code,
          covered: input.covered,
          vehicle_class: input.vehicleClass,
          status: input.status,
          updated_by: input.updatedBy,
        }),
      });
      return mapSpot(updated);
    } catch (error) {
      throw translateYardError(error);
    }
  }

  // I1a — lock de linha (FOR UPDATE) + guarda de status='FREE' na MESMA transação. Concorrentes na MESMA vaga
  // serializam no lock; a 2ª tx re-lê OCCUPIED -> 409 SPOT_NOT_FREE.
  // I1b — o índice PARCIAL único (tenant_id, current_process_id) barra o MESMO processId em 2 vagas: o UPDATE
  // viola o índice (pg 23505 -> Prisma P2002) -> 409 PROCESS_ALREADY_PARKED.
  async allocate(input: AllocateSpotInput): Promise<YardSpot> {
    const locked = await this.lockSpot(input.tenantId, input.spotId);
    if (!locked) {
      throw new YardError(404, "YARD_SPOT_NOT_FOUND", "not_found", "Yard spot was not found.");
    }
    if (locked.status !== "FREE") {
      throw new YardError(409, "SPOT_NOT_FREE", "spot_not_free", "The spot is not free.");
    }
    try {
      const updated = await this.client.yardSpot.update({
        where: { id: input.spotId },
        data: { status: "OCCUPIED", current_process_id: input.processId, updated_by: input.actorId ?? null },
      });
      return mapSpot(updated);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new YardError(409, "PROCESS_ALREADY_PARKED", "process_already_parked", "The process is already parked in another spot.");
      }
      throw translateYardError(error);
    }
  }

  async vacate(input: VacateSpotInput): Promise<YardSpot> {
    const locked = await this.lockSpot(input.tenantId, input.spotId);
    if (!locked) {
      throw new YardError(404, "YARD_SPOT_NOT_FOUND", "not_found", "Yard spot was not found.");
    }
    if (locked.status !== "OCCUPIED") {
      throw new YardError(409, "SPOT_NOT_OCCUPIED", "spot_not_occupied", "The spot is not occupied.");
    }
    const updated = await this.client.yardSpot.update({
      where: { id: input.spotId },
      data: { status: "FREE", current_process_id: null, updated_by: input.actorId ?? null },
    });
    return mapSpot(updated);
  }

  async move(input: MoveSpotInput): Promise<YardSpot> {
    if (input.fromSpotId === input.toSpotId) {
      throw new YardError(400, "YARD_INVALID", "invalid_move", "fromSpotId and toSpotId must differ.");
    }
    // Trava as 2 vagas em ordem determinística (anti-deadlock entre moves concorrentes cruzados).
    const [firstId, secondId] = [input.fromSpotId, input.toSpotId].sort();
    await this.lockSpot(input.tenantId, firstId);
    await this.lockSpot(input.tenantId, secondId);

    const from = await this.client.yardSpot.findFirst({ where: { tenant_id: input.tenantId, id: input.fromSpotId } });
    if (!from) {
      throw new YardError(404, "YARD_SPOT_NOT_FOUND", "not_found", "Source yard spot was not found.");
    }
    const to = await this.client.yardSpot.findFirst({ where: { tenant_id: input.tenantId, id: input.toSpotId } });
    if (!to) {
      throw new YardError(404, "YARD_SPOT_NOT_FOUND", "not_found", "Destination yard spot was not found.");
    }
    if (from.status !== "OCCUPIED" || from.current_process_id === null) {
      throw new YardError(409, "SPOT_NOT_OCCUPIED", "spot_not_occupied", "The source spot is not occupied.");
    }
    if (to.status !== "FREE") {
      throw new YardError(409, "SPOT_NOT_FREE", "spot_not_free", "The destination spot is not free.");
    }

    const processId = from.current_process_id;
    // Limpa a origem ANTES de setar o destino, senão o partial-unique dispara no meio.
    await this.client.yardSpot.update({
      where: { id: input.fromSpotId },
      data: { status: "FREE", current_process_id: null, updated_by: input.actorId ?? null },
    });
    const moved = await this.client.yardSpot.update({
      where: { id: input.toSpotId },
      data: { status: "OCCUPIED", current_process_id: processId, updated_by: input.actorId ?? null },
    });
    return mapSpot(moved);
  }

  private async lockSpot(tenantId: string, spotId: string): Promise<LockedSpotRow | undefined> {
    const rows = await this.client.$queryRaw<LockedSpotRow[]>`
      SELECT status, current_process_id
      FROM yard_spots
      WHERE tenant_id = ${tenantId}::uuid AND id = ${spotId}::uuid
      FOR UPDATE
    `;
    return rows[0];
  }
}

// Wrapper RLS: cada método abre uma transação com o contexto app.current_tenant_id (setTenantRlsContext).
// A ocupação (allocate/vacate/move) roda TODO o fluxo transacional (FOR UPDATE + guarda + update) numa só tx.
export class RlsPrismaYardRepository implements YardRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  createYard(input: CreateYardInput): Promise<Yard> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaYardRepository(tx).createYard(input));
  }

  listYards(input: ListYardInput): Promise<ListYardResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaYardRepository(tx).listYards(input));
  }

  findYardById(tenantId: string, yardId: string): Promise<Yard | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaYardRepository(tx).findYardById(tenantId, yardId));
  }

  updateYard(input: UpdateYardInput): Promise<Yard | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaYardRepository(tx).updateYard(input));
  }

  createArea(input: CreateYardAreaInput): Promise<YardArea> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaYardRepository(tx).createArea(input));
  }

  listAreasByYard(input: ListYardAreaInput): Promise<readonly YardArea[]> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaYardRepository(tx).listAreasByYard(input));
  }

  findAreaById(tenantId: string, areaId: string): Promise<YardArea | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaYardRepository(tx).findAreaById(tenantId, areaId));
  }

  updateArea(input: UpdateYardAreaInput): Promise<YardArea | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaYardRepository(tx).updateArea(input));
  }

  createSpot(input: CreateYardSpotInput): Promise<YardSpot> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaYardRepository(tx).createSpot(input));
  }

  listSpotsByArea(input: ListYardSpotInput): Promise<readonly YardSpot[]> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaYardRepository(tx).listSpotsByArea(input));
  }

  listSpotsByYard(input: ListYardSpotByYardInput): Promise<readonly YardSpot[]> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaYardRepository(tx).listSpotsByYard(input));
  }

  findSpotById(tenantId: string, spotId: string): Promise<YardSpot | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaYardRepository(tx).findSpotById(tenantId, spotId));
  }

  updateSpot(input: UpdateYardSpotInput): Promise<YardSpot | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaYardRepository(tx).updateSpot(input));
  }

  allocate(input: AllocateSpotInput): Promise<YardSpot> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaYardRepository(tx).allocate(input));
  }

  vacate(input: VacateSpotInput): Promise<YardSpot> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaYardRepository(tx).vacate(input));
  }

  move(input: MoveSpotInput): Promise<YardSpot> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaYardRepository(tx).move(input));
  }
}

export async function createPrismaYardRepository(): Promise<RlsPrismaYardRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaYardRepository(prisma);
}

function buildYardWhere(input: ListYardInput): Prisma.YardWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.branchId !== undefined ? { branch_id: input.branchId } : {}),
    ...(input.active !== undefined ? { active: input.active } : {}),
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { address: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function mapYard(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly branch_id: string | null;
  readonly name: string;
  readonly address: string;
  readonly capacity_hint: number | null;
  readonly timezone: string;
  readonly active: boolean;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): Yard {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    branchId: record.branch_id ?? undefined,
    name: record.name,
    address: record.address,
    capacityHint: record.capacity_hint ?? undefined,
    timezone: record.timezone,
    active: record.active,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapArea(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly yard_id: string;
  readonly parent_id: string | null;
  readonly kind: string;
  readonly name: string;
  readonly covered: boolean;
  readonly vehicle_class: string;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): YardArea {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    yardId: record.yard_id,
    parentId: record.parent_id ?? undefined,
    kind: record.kind as YardAreaKind,
    name: record.name,
    covered: record.covered,
    vehicleClass: record.vehicle_class as VehicleClass,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapSpot(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly area_id: string;
  readonly code: string;
  readonly covered: boolean;
  readonly vehicle_class: string;
  readonly status: string;
  readonly current_process_id: string | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): YardSpot {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    areaId: record.area_id,
    code: record.code,
    covered: record.covered,
    vehicleClass: record.vehicle_class as VehicleClass,
    status: record.status as SpotStatus,
    currentProcessId: record.current_process_id ?? undefined,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

// P2002 (unique) → 409 conforme a chave; P2003 (FK) → 400 com a referência inválida.
function translateYardError(error: unknown): unknown {
  if (isPrismaError(error, "P2002")) {
    const target = errorTarget(error);
    if (target.includes("code")) {
      return new YardError(409, "YARD_SPOT_CONFLICT", "duplicate_spot_code", "A spot with this code already exists in the area.");
    }
    if (target.includes("name") || target.includes("parent")) {
      return new YardError(409, "YARD_AREA_CONFLICT", "duplicate_area", "An area with this name already exists under the same parent.");
    }
    if (target.includes("current_process")) {
      return new YardError(409, "PROCESS_ALREADY_PARKED", "process_already_parked", "The process is already parked in another spot.");
    }
    return new YardError(409, "YARD_CONFLICT", "duplicate", "A record with this natural key already exists.");
  }
  if (isPrismaError(error, "P2003")) {
    const target = errorTarget(error);
    if (target.includes("branch")) {
      return new YardError(400, "YARD_INVALID", "invalid_branch_reference", "The referenced branch does not exist for this tenant.");
    }
    if (target.includes("yard")) {
      return new YardError(400, "YARD_INVALID", "invalid_yard_reference", "The referenced yard does not exist for this tenant.");
    }
    if (target.includes("parent")) {
      return new YardError(400, "YARD_INVALID", "invalid_parent", "The referenced parent area does not exist for this tenant.");
    }
    if (target.includes("area")) {
      return new YardError(400, "YARD_INVALID", "invalid_area_reference", "The referenced area does not exist for this tenant.");
    }
    return new YardError(400, "YARD_INVALID", "invalid_reference", "A referenced record does not exist for this tenant.");
  }
  return error;
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { readonly code?: unknown }).code === code;
}

// Detecção ampla da violação de UNIQUE no UPDATE de ocupação: Prisma mapeia pg 23505 → P2002 nas operações de
// modelo; se o adapter surgir com o código pg cru, capturamos 23505 / o nome do índice parcial também.
function isUniqueViolation(error: unknown): boolean {
  if (isPrismaError(error, "P2002")) return true;
  if (typeof error !== "object" || error === null) return false;
  const record = error as { readonly code?: unknown; readonly meta?: Record<string, unknown>; readonly message?: unknown };
  const haystack = `${String(record.code ?? "")} ${String(record.meta?.code ?? "")} ${String(record.meta?.message ?? "")} ${String(record.message ?? "")}`.toLowerCase();
  return haystack.includes("23505") || haystack.includes("yard_spots_tenant_current_process_key");
}

function errorTarget(error: unknown): string {
  const meta = (error as { readonly meta?: Record<string, unknown> }).meta ?? {};
  return Object.values(meta).map((value) => String(value)).join(" ").toLowerCase();
}

function compact<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
