import { randomUUID } from "node:crypto";

import type {
  Vehicle,
  CreateVehicleInput,
  ListVehiclesInput,
  ListVehiclesResult,
  UpdateVehicleInput,
} from "./vehicle.types.js";
import { VehicleError } from "./vehicle.types.js";

export interface VehicleRepository {
  create(input: CreateVehicleInput): Promise<Vehicle>;
  list(input: ListVehiclesInput): Promise<ListVehiclesResult>;
  findById(tenantId: string, vehicleId: string): Promise<Vehicle | undefined>;
  update(input: UpdateVehicleInput): Promise<Vehicle | undefined>;
  reset?(): void;
}

export class InMemoryVehicleRepository implements VehicleRepository {
  private readonly vehicles = new Map<string, Vehicle>();

  async create(input: CreateVehicleInput): Promise<Vehicle> {
    if (this.hasPlate(input.tenantId, input.plate)) {
      throw new VehicleError(409, "VEHICLE_CONFLICT", "duplicate_plate", "A vehicle with this plate already exists.");
    }

    const now = new Date();
    const vehicle: Vehicle = {
      ...input,
      id: randomUUID(),
      status: input.status || "active",
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.vehicles.set(vehicle.id, vehicle);

    return vehicle;
  }

  async list(input: ListVehiclesInput): Promise<ListVehiclesResult> {
    const filtered = this.sortedVehicles()
      .filter((vehicle) => vehicle.tenantId === input.tenantId)
      .filter((vehicle) => input.isActive === undefined || vehicle.isActive === input.isActive)
      .filter((vehicle) => matchesSearch(vehicle, input.search));

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, vehicleId: string): Promise<Vehicle | undefined> {
    const vehicle = this.vehicles.get(vehicleId);
    return vehicle?.tenantId === tenantId ? vehicle : undefined;
  }

  async update(input: UpdateVehicleInput): Promise<Vehicle | undefined> {
    const current = await this.findById(input.tenantId, input.vehicleId);
    if (!current) return undefined;

    const updated: Vehicle = {
      ...current,
      ...definedFields(input),
      updatedAt: new Date(),
    };
    this.vehicles.set(updated.id, updated);

    return updated;
  }

  reset(): void {
    this.vehicles.clear();
  }

  private hasPlate(tenantId: string, plate: string): boolean {
    return [...this.vehicles.values()].some(
      (vehicle) => vehicle.tenantId === tenantId && vehicle.plate === plate,
    );
  }

  private sortedVehicles(): Vehicle[] {
    return [...this.vehicles.values()].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }
}

function matchesSearch(vehicle: Vehicle, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();

  return [vehicle.plate, vehicle.model, vehicle.type]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
