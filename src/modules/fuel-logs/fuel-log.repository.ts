import { randomUUID } from "node:crypto";

import { sortChronologically } from "./fuel-log.efficiency.js";
import type {
  CreateFuelLogInput,
  FuelLog,
  ListFuelLogsInput,
  ListFuelLogsResult,
  UpdateFuelLogInput,
} from "./fuel-log.types.js";

export interface FuelLogRepository {
  create(input: CreateFuelLogInput): Promise<FuelLog>;
  list(input: ListFuelLogsInput): Promise<ListFuelLogsResult>;
  findById(tenantId: string, fuelLogId: string): Promise<FuelLog | undefined>;
  update(input: UpdateFuelLogInput): Promise<FuelLog | undefined>;
  /** R1.2 — highest odometer already recorded for a vehicle (all logs, active or not). */
  maxOdometerForVehicle(tenantId: string, vehicleId: string): Promise<number | undefined>;
  /** R1.1 — the vehicle's full history (active or not), ordered chronologically ascending. */
  listByVehicleAscending(tenantId: string, vehicleId: string): Promise<FuelLog[]>;
  reset?(): void;
}

export class InMemoryFuelLogRepository implements FuelLogRepository {
  private readonly fuelLogs = new Map<string, FuelLog>();

  async create(input: CreateFuelLogInput): Promise<FuelLog> {
    const now = new Date();
    const fuelLog: FuelLog = {
      ...input,
      id: randomUUID(),
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.fuelLogs.set(fuelLog.id, fuelLog);

    return fuelLog;
  }

  async list(input: ListFuelLogsInput): Promise<ListFuelLogsResult> {
    const filtered = this.sortedFuelLogs()
      .filter((fuelLog) => fuelLog.tenantId === input.tenantId)
      .filter((fuelLog) => input.vehicleId === undefined || fuelLog.vehicleId === input.vehicleId)
      .filter((fuelLog) => input.isActive === undefined || fuelLog.isActive === input.isActive)
      .filter((fuelLog) => input.from === undefined || fuelLog.fueledAt.getTime() >= input.from.getTime())
      .filter((fuelLog) => input.to === undefined || fuelLog.fueledAt.getTime() <= input.to.getTime())
      .filter((fuelLog) => matchesSearch(fuelLog, input.search));

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, fuelLogId: string): Promise<FuelLog | undefined> {
    const fuelLog = this.fuelLogs.get(fuelLogId);
    return fuelLog?.tenantId === tenantId ? fuelLog : undefined;
  }

  async update(input: UpdateFuelLogInput): Promise<FuelLog | undefined> {
    const current = await this.findById(input.tenantId, input.fuelLogId);
    if (!current) return undefined;

    const updated: FuelLog = {
      ...current,
      ...definedFields(input),
      updatedAt: new Date(),
    };
    this.fuelLogs.set(updated.id, updated);

    return updated;
  }

  async maxOdometerForVehicle(tenantId: string, vehicleId: string): Promise<number | undefined> {
    const odometers = this.vehicleLogs(tenantId, vehicleId).map((fuelLog) => fuelLog.odometer);

    return odometers.length > 0 ? Math.max(...odometers) : undefined;
  }

  async listByVehicleAscending(tenantId: string, vehicleId: string): Promise<FuelLog[]> {
    return sortChronologically(this.vehicleLogs(tenantId, vehicleId));
  }

  reset(): void {
    this.fuelLogs.clear();
  }

  private vehicleLogs(tenantId: string, vehicleId: string): FuelLog[] {
    return [...this.fuelLogs.values()].filter(
      (fuelLog) => fuelLog.tenantId === tenantId && fuelLog.vehicleId === vehicleId,
    );
  }

  private sortedFuelLogs(): FuelLog[] {
    return [...this.fuelLogs.values()].sort((left, right) => {
      const byFueledAt = right.fueledAt.getTime() - left.fueledAt.getTime();
      if (byFueledAt !== 0) return byFueledAt;

      return right.createdAt.getTime() - left.createdAt.getTime();
    });
  }
}

function matchesSearch(fuelLog: FuelLog, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();

  return [fuelLog.station, fuelLog.notes]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
