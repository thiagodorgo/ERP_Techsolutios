import { env } from "../../config/env.js";
import { createDefaultVehicleService } from "../vehicles/vehicle.service.js";
import { computeEfficiency } from "./fuel-log.efficiency.js";
import {
  InMemoryFuelLogRepository,
  type FuelLogRepository,
} from "./fuel-log.repository.js";
import type {
  FuelLog,
  FuelLogActorContext,
  FuelLogWithEfficiency,
  ListFuelLogsInput,
  ListFuelLogsWithEfficiencyResult,
  UpdateFuelLogInput,
} from "./fuel-log.types.js";
import { DEFAULT_FUEL_TYPE, FuelLogError } from "./fuel-log.types.js";
import {
  parseFuelType,
  parseFueledAt,
  parseLimit,
  parseLiters,
  parseOdometer,
  parseOffset,
  parseOptionalDate,
  parseOptionalFuelType,
  parseOptionalLiters,
  parseOptionalNotes,
  parseOptionalOdometer,
  parseOptionalSearch,
  parseOptionalStation,
  parseOptionalTotalValue,
  parseOptionalUuid,
  parseRequiredUuid,
  parseTotalValue,
  readOptionalBoolean,
} from "./fuel-log.validators.js";

type RawRecord = Record<string, unknown>;

/**
 * Tenant-scoped lookup used to validate the required `vehicle_id` reference.
 * Mirrors the work-order reference resolver: the resolver receives the acting
 * tenant context, so a cross-tenant / missing id resolves to "not found" and is
 * rejected as an invalid reference (400).
 */
export type FuelLogReferenceResolvers = {
  readonly resolveVehicle?: (actor: FuelLogActorContext, id: string) => Promise<boolean>;
};

export class FuelLogService {
  constructor(
    private readonly repository: FuelLogRepository,
    private readonly references: FuelLogReferenceResolvers = {},
  ) {}

  async list(actor: FuelLogActorContext, query: RawRecord): Promise<ListFuelLogsWithEfficiencyResult> {
    const input: ListFuelLogsInput = {
      tenantId: actor.tenantId,
      vehicleId: parseOptionalUuid(query.vehicle_id ?? query.vehicleId, "vehicleId"),
      from: parseOptionalDate(query.from, "from"),
      to: parseOptionalDate(query.to, "to"),
      isActive: readOptionalBoolean(query.is_active ?? query.isActive),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };

    const result = await this.repository.list(input);
    const items = await this.attachEfficiencyToPage(actor.tenantId, result.items);

    return {
      items,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }

  async create(actor: FuelLogActorContext, body: RawRecord): Promise<FuelLogWithEfficiency> {
    const vehicleId = parseRequiredUuid(body.vehicle_id ?? body.vehicleId, "vehicleId");
    await this.assertVehicleReference(actor, vehicleId);

    const odometer = parseOdometer(body.odometer);
    await this.assertOdometerMonotonic(actor.tenantId, vehicleId, odometer);

    const fuelLog = await this.repository.create({
      tenantId: actor.tenantId,
      vehicleId,
      operatorId: parseOptionalUuid(body.operator_id ?? body.operatorId, "operatorId"),
      workOrderId: parseOptionalUuid(body.work_order_id ?? body.workOrderId, "workOrderId"),
      fueledAt: parseFueledAt(body.fueled_at ?? body.fueledAt),
      fuelType: parseFuelType(body.fuel_type ?? body.fuelType, DEFAULT_FUEL_TYPE),
      liters: parseLiters(body.liters),
      totalValue: parseTotalValue(body.total_value ?? body.totalValue),
      odometer,
      station: parseOptionalStation(body.station),
      notes: parseOptionalNotes(body.notes),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive) ?? true,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });

    return this.withEfficiency(actor.tenantId, fuelLog);
  }

  async get(actor: FuelLogActorContext, fuelLogId: string): Promise<FuelLogWithEfficiency> {
    const fuelLog = await this.getEntity(actor, fuelLogId);

    return this.withEfficiency(actor.tenantId, fuelLog);
  }

  /**
   * Tenant-scoped, read-only max odometer for a vehicle across fuel logs. Reused
   * by the maintenance module (F2 R1.2) so the odometer stays monotonic across
   * BOTH fuel_logs and maintenance_orders.
   */
  async getMaxOdometerForVehicle(actor: FuelLogActorContext, vehicleId: string): Promise<number | undefined> {
    return this.repository.maxOdometerForVehicle(actor.tenantId, vehicleId);
  }

  async update(actor: FuelLogActorContext, fuelLogId: string, body: RawRecord): Promise<FuelLogWithEfficiency> {
    await this.getEntity(actor, fuelLogId);
    const input: UpdateFuelLogInput = {
      tenantId: actor.tenantId,
      fuelLogId: parseRequiredUuid(fuelLogId, "fuelLogId"),
      operatorId: parseOptionalUuid(body.operator_id ?? body.operatorId, "operatorId"),
      workOrderId: parseOptionalUuid(body.work_order_id ?? body.workOrderId, "workOrderId"),
      fuelType: parseOptionalFuelType(body.fuel_type ?? body.fuelType),
      liters: parseOptionalLiters(body.liters),
      totalValue: parseOptionalTotalValue(body.total_value ?? body.totalValue),
      odometer: parseOptionalOdometer(body.odometer),
      station: parseOptionalStation(body.station),
      notes: parseOptionalNotes(body.notes),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive),
      updatedBy: actor.userId,
    };
    const updated = await this.repository.update(input);

    if (!updated) {
      throw new FuelLogError(404, "FUEL_LOG_NOT_FOUND", "not_found", "Fuel log was not found.");
    }

    return this.withEfficiency(actor.tenantId, updated);
  }

  private async getEntity(actor: FuelLogActorContext, fuelLogId: string): Promise<FuelLog> {
    const fuelLog = await this.repository.findById(actor.tenantId, parseRequiredUuid(fuelLogId, "fuelLogId"));

    if (!fuelLog) {
      throw new FuelLogError(404, "FUEL_LOG_NOT_FOUND", "not_found", "Fuel log was not found.");
    }

    return fuelLog;
  }

  private async assertVehicleReference(actor: FuelLogActorContext, vehicleId: string): Promise<void> {
    const resolver = this.references.resolveVehicle;
    const exists = resolver ? await resolver(actor, vehicleId) : false;

    if (!exists) {
      throw new FuelLogError(
        400,
        "FUEL_LOG_INVALID",
        "invalid_vehicle_reference",
        "vehicleId does not reference a vehicle in this organization.",
      );
    }
  }

  // R1.2 — odometer is monotonic non-decreasing per vehicle. On create the new
  // reading must be >= the highest already recorded for the vehicle (F1 scope:
  // checked against fuel_logs only).
  private async assertOdometerMonotonic(tenantId: string, vehicleId: string, odometer: number): Promise<void> {
    const maxOdometer = await this.repository.maxOdometerForVehicle(tenantId, vehicleId);

    if (maxOdometer !== undefined && odometer < maxOdometer) {
      throw new FuelLogError(
        422,
        "FUEL_LOG_INVALID",
        "odometer_regressive",
        `Odômetro (${odometer}) deve ser ≥ ao último registrado (${maxOdometer}) para a viatura.`,
      );
    }
  }

  private async withEfficiency(tenantId: string, fuelLog: FuelLog): Promise<FuelLogWithEfficiency> {
    const history = await this.repository.listByVehicleAscending(tenantId, fuelLog.vehicleId);

    return { fuelLog, ...computeEfficiency(fuelLog, history) };
  }

  // Computes km/L per page item from each vehicle's full ordered history, fetched
  // once per distinct vehicle so a page mixing several viaturas stays cheap.
  private async attachEfficiencyToPage(
    tenantId: string,
    items: readonly FuelLog[],
  ): Promise<FuelLogWithEfficiency[]> {
    const vehicleIds = [...new Set(items.map((item) => item.vehicleId))];
    const histories = new Map<string, FuelLog[]>();

    await Promise.all(
      vehicleIds.map(async (vehicleId) => {
        histories.set(vehicleId, await this.repository.listByVehicleAscending(tenantId, vehicleId));
      }),
    );

    return items.map((fuelLog) => ({
      fuelLog,
      ...computeEfficiency(fuelLog, histories.get(fuelLog.vehicleId) ?? []),
    }));
  }
}

const memoryRepository = new InMemoryFuelLogRepository();
let defaultServicePromise: Promise<FuelLogService> | undefined;

export function createMemoryFuelLogService(): FuelLogService {
  return new FuelLogService(memoryRepository, createDefaultReferenceResolvers());
}

export function getMemoryFuelLogRepositoryForTests(): InMemoryFuelLogRepository {
  return memoryRepository;
}

export async function createDefaultFuelLogService(): Promise<FuelLogService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryFuelLogService();
  }

  defaultServicePromise ??= createPrismaFuelLogService();

  return defaultServicePromise;
}

export function resetFuelLogRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaFuelLogService(): Promise<FuelLogService> {
  const { createPrismaFuelLogRepository } = await import("./fuel-log-prisma.repository.js");
  const repository = await createPrismaFuelLogRepository();

  return new FuelLogService(repository, createDefaultReferenceResolvers());
}

/**
 * Builds the tenant-scoped vehicle resolver over the vehicles module's default
 * service. In memory mode this shares the same singleton the vehicle routes use,
 * so a vehicle created via POST /vehicles is visible here.
 */
function createDefaultReferenceResolvers(): FuelLogReferenceResolvers {
  return {
    resolveVehicle: async (actor, id) => {
      try {
        const service = await createDefaultVehicleService();
        await service.get(actor, id);

        return true;
      } catch {
        return false;
      }
    },
  };
}
