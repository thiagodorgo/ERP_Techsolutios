import { env } from "../../config/env.js";
import {
  InMemoryVehicleRepository,
  type VehicleRepository,
} from "./vehicle.repository.js";
import type {
  Vehicle,
  VehicleActorContext,
  ListVehiclesInput,
  ListVehiclesResult,
  UpdateVehicleInput,
} from "./vehicle.types.js";
import { VehicleError } from "./vehicle.types.js";
import {
  assertNonEmptyString,
  parseLimit,
  parseOffset,
  parseOptionalNotes,
  parseOptionalSearch,
  parseOptionalStatus,
  parseOptionalType,
  parseOptionalYear,
  parsePlate,
  parseRequiredUuid,
  readOptionalBoolean,
} from "./vehicle.validators.js";

type RawRecord = Record<string, unknown>;

export class VehicleService {
  constructor(private readonly repository: VehicleRepository) {}

  async list(actor: VehicleActorContext, query: RawRecord): Promise<ListVehiclesResult> {
    const input: ListVehiclesInput = {
      tenantId: actor.tenantId,
      isActive: readOptionalBoolean(query.is_active ?? query.isActive),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };

    return this.repository.list(input);
  }

  async create(actor: VehicleActorContext, body: RawRecord): Promise<Vehicle> {
    const vehicle = await this.repository.create({
      tenantId: actor.tenantId,
      plate: parsePlate(body.plate),
      model: assertNonEmptyString(body.model, "model"),
      type: parseOptionalType(body.type),
      year: parseOptionalYear(body.year),
      status: parseOptionalStatus(body.status) ?? "active",
      notes: parseOptionalNotes(body.notes),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive) ?? true,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });

    return vehicle;
  }

  async get(actor: VehicleActorContext, vehicleId: string): Promise<Vehicle> {
    const vehicle = await this.repository.findById(actor.tenantId, parseRequiredUuid(vehicleId, "vehicleId"));

    if (!vehicle) {
      throw new VehicleError(404, "VEHICLE_NOT_FOUND", "not_found", "Vehicle was not found.");
    }

    return vehicle;
  }

  async update(actor: VehicleActorContext, vehicleId: string, body: RawRecord): Promise<Vehicle> {
    await this.get(actor, vehicleId);
    const input: UpdateVehicleInput = {
      tenantId: actor.tenantId,
      vehicleId: parseRequiredUuid(vehicleId, "vehicleId"),
      plate: body.plate === undefined ? undefined : parsePlate(body.plate),
      model: body.model === undefined ? undefined : assertNonEmptyString(body.model, "model"),
      type: parseOptionalType(body.type),
      year: parseOptionalYear(body.year),
      status: parseOptionalStatus(body.status),
      notes: parseOptionalNotes(body.notes),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive),
      updatedBy: actor.userId,
    };
    const updated = await this.repository.update(input);

    if (!updated) {
      throw new VehicleError(404, "VEHICLE_NOT_FOUND", "not_found", "Vehicle was not found.");
    }

    return updated;
  }
}

const memoryRepository = new InMemoryVehicleRepository();
let defaultServicePromise: Promise<VehicleService> | undefined;

export function createMemoryVehicleService(): VehicleService {
  return new VehicleService(memoryRepository);
}

export function getMemoryVehicleRepositoryForTests(): InMemoryVehicleRepository {
  return memoryRepository;
}

export async function createDefaultVehicleService(): Promise<VehicleService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryVehicleService();
  }

  defaultServicePromise ??= createPrismaVehicleService();

  return defaultServicePromise;
}

export function resetVehicleRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaVehicleService(): Promise<VehicleService> {
  const { createPrismaVehicleRepository } = await import("./vehicle-prisma.repository.js");
  const repository = await createPrismaVehicleRepository();

  return new VehicleService(repository);
}
