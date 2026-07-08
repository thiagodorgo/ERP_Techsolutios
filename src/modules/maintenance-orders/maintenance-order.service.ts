import { env } from "../../config/env.js";
import { createDefaultFuelLogService } from "../fuel-logs/fuel-log.service.js";
import { createDefaultVehicleService } from "../vehicles/vehicle.service.js";
import {
  InMemoryMaintenanceOrderRepository,
  type MaintenanceOrderRepository,
} from "./maintenance-order.repository.js";
import type {
  ListMaintenanceOrdersInput,
  ListMaintenanceOrdersResult,
  MaintenanceOrder,
  MaintenanceOrderActorContext,
  UpdateMaintenanceOrderInput,
} from "./maintenance-order.types.js";
import { DEFAULT_MAINTENANCE_STATUS, MaintenanceOrderError } from "./maintenance-order.types.js";
import {
  assertMaintenanceStatusTransition,
  parseLimit,
  parseMaintenanceType,
  parseOffset,
  parseOptionalCost,
  parseOptionalDate,
  parseOptionalMaintenanceStatus,
  parseOptionalMaintenanceType,
  parseOptionalOdometer,
  parseOptionalDescription,
  parseOptionalSearch,
  parseOptionalSupplier,
  parseOptionalUuid,
  parseMaintenanceStatus,
  parseRequiredDescription,
  parseRequiredUuid,
  readOptionalBoolean,
} from "./maintenance-order.validators.js";

type RawRecord = Record<string, unknown>;

/**
 * Tenant-scoped reads used to enforce cross-entity rules. Each resolver receives
 * the acting tenant context so a cross-tenant / missing id resolves to "not
 * found" and is rejected as an invalid reference (400).
 * - `resolveVehicle` validates the required `vehicle_id`.
 * - `maxFuelLogOdometer` reuses the F1 read so R1.2 is monotonic across BOTH
 *   maintenance_orders AND fuel_logs (read-only reuse).
 */
export type MaintenanceOrderReferenceResolvers = {
  readonly resolveVehicle?: (actor: MaintenanceOrderActorContext, id: string) => Promise<boolean>;
  readonly maxFuelLogOdometer?: (
    actor: MaintenanceOrderActorContext,
    vehicleId: string,
  ) => Promise<number | undefined>;
};

export class MaintenanceOrderService {
  constructor(
    private readonly repository: MaintenanceOrderRepository,
    private readonly references: MaintenanceOrderReferenceResolvers = {},
  ) {}

  async list(actor: MaintenanceOrderActorContext, query: RawRecord): Promise<ListMaintenanceOrdersResult> {
    const input: ListMaintenanceOrdersInput = {
      tenantId: actor.tenantId,
      vehicleId: parseOptionalUuid(query.vehicle_id ?? query.vehicleId, "vehicleId"),
      type: parseOptionalMaintenanceType(query.type),
      status: parseOptionalMaintenanceStatus(query.status),
      isActive: readOptionalBoolean(query.is_active ?? query.isActive),
      scheduledFrom: parseOptionalDate(query.scheduled_from ?? query.scheduledFrom, "scheduledFrom"),
      scheduledTo: parseOptionalDate(query.scheduled_to ?? query.scheduledTo, "scheduledTo"),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };

    return this.repository.list(input);
  }

  async create(actor: MaintenanceOrderActorContext, body: RawRecord): Promise<MaintenanceOrder> {
    const vehicleId = parseRequiredUuid(body.vehicle_id ?? body.vehicleId, "vehicleId");
    await this.assertVehicleReference(actor, vehicleId);

    const odometer = parseOptionalOdometer(body.odometer);
    if (odometer !== undefined) {
      await this.assertOdometerMonotonic(actor, vehicleId, odometer);
    }

    // A maintenance order always starts on `agendada`; every later status change
    // goes through the PATCH state machine (R2.1).
    return this.repository.create({
      tenantId: actor.tenantId,
      vehicleId,
      type: parseMaintenanceType(body.type),
      status: DEFAULT_MAINTENANCE_STATUS,
      scheduledFor: parseOptionalDate(body.scheduled_for ?? body.scheduledFor, "scheduledFor"),
      completedAt: parseOptionalDate(body.completed_at ?? body.completedAt, "completedAt"),
      cost: parseOptionalCost(body.cost),
      supplier: parseOptionalSupplier(body.supplier),
      odometer,
      description: parseRequiredDescription(body.description),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive) ?? true,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
  }

  async get(actor: MaintenanceOrderActorContext, maintenanceOrderId: string): Promise<MaintenanceOrder> {
    return this.getEntity(actor, maintenanceOrderId);
  }

  async update(
    actor: MaintenanceOrderActorContext,
    maintenanceOrderId: string,
    body: RawRecord,
  ): Promise<MaintenanceOrder> {
    const current = await this.getEntity(actor, maintenanceOrderId);

    const odometer = parseOptionalOdometer(body.odometer);
    if (odometer !== undefined) {
      await this.assertOdometerMonotonic(actor, current.vehicleId, odometer);
    }

    const nextStatus =
      body.status === undefined || body.status === null || body.status === ""
        ? undefined
        : parseMaintenanceStatus(body.status);
    const scheduledFor = parseOptionalDate(body.scheduled_for ?? body.scheduledFor, "scheduledFor");
    const completedAt = parseOptionalDate(body.completed_at ?? body.completedAt, "completedAt");
    const cost = parseOptionalCost(body.cost);

    if (nextStatus !== undefined && nextStatus !== current.status) {
      // R2.1 — restricted state machine (422 on invalid transition).
      assertMaintenanceStatusTransition(current.status, nextStatus);
      // Completion requires a non-negative cost AND a completion date, taken from
      // the PATCH or already present on the order.
      if (nextStatus === "concluida") {
        this.assertCompletionRequirements(cost ?? current.cost, completedAt ?? current.completedAt);
      }
    }

    const input: UpdateMaintenanceOrderInput = {
      tenantId: actor.tenantId,
      maintenanceOrderId: parseRequiredUuid(maintenanceOrderId, "maintenanceOrderId"),
      type: parseOptionalMaintenanceType(body.type),
      status: nextStatus,
      scheduledFor,
      completedAt,
      cost,
      supplier: parseOptionalSupplier(body.supplier),
      odometer,
      description: parseOptionalDescription(body.description),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive),
      updatedBy: actor.userId,
    };
    const updated = await this.repository.update(input);

    if (!updated) {
      throw new MaintenanceOrderError(404, "MAINTENANCE_ORDER_NOT_FOUND", "not_found", "Maintenance order was not found.");
    }

    return updated;
  }

  /**
   * R2.3 — read-only availability seam consumed by work-order.service:resolveVehicle.
   * A vehicle with an ACTIVE maintenance order in `em_execucao` is unavailable.
   */
  async hasActiveMaintenance(actor: MaintenanceOrderActorContext, vehicleId: string): Promise<boolean> {
    return this.repository.hasActiveMaintenance(actor.tenantId, vehicleId);
  }

  private async getEntity(actor: MaintenanceOrderActorContext, maintenanceOrderId: string): Promise<MaintenanceOrder> {
    const order = await this.repository.findById(actor.tenantId, parseRequiredUuid(maintenanceOrderId, "maintenanceOrderId"));

    if (!order) {
      throw new MaintenanceOrderError(404, "MAINTENANCE_ORDER_NOT_FOUND", "not_found", "Maintenance order was not found.");
    }

    return order;
  }

  private async assertVehicleReference(actor: MaintenanceOrderActorContext, vehicleId: string): Promise<void> {
    const resolver = this.references.resolveVehicle;
    const exists = resolver ? await resolver(actor, vehicleId) : false;

    if (!exists) {
      throw new MaintenanceOrderError(
        400,
        "MAINTENANCE_INVALID",
        "invalid_vehicle_reference",
        "vehicleId does not reference a vehicle in this organization.",
      );
    }
  }

  // R1.2 — odometer is optional; when provided it must be >= the highest already
  // recorded for the vehicle across BOTH maintenance_orders AND fuel_logs.
  private async assertOdometerMonotonic(
    actor: MaintenanceOrderActorContext,
    vehicleId: string,
    odometer: number,
  ): Promise<void> {
    const [maxMaintenance, maxFuel] = await Promise.all([
      this.repository.maxOdometerForVehicle(actor.tenantId, vehicleId),
      this.references.maxFuelLogOdometer ? this.references.maxFuelLogOdometer(actor, vehicleId) : Promise.resolve(undefined),
    ]);

    const candidates = [maxMaintenance, maxFuel].filter((value): value is number => value !== undefined);
    if (candidates.length === 0) return;

    const maxOdometer = Math.max(...candidates);
    if (odometer < maxOdometer) {
      throw new MaintenanceOrderError(
        422,
        "MAINTENANCE_INVALID",
        "odometer_regressive",
        `Odômetro (${odometer}) deve ser ≥ ao último registrado (${maxOdometer}) para a viatura.`,
      );
    }
  }

  private assertCompletionRequirements(cost: number | undefined, completedAt: Date | undefined): void {
    if (cost === undefined || cost < 0 || completedAt === undefined) {
      throw new MaintenanceOrderError(
        422,
        "MAINTENANCE_INVALID",
        "completion_requires_cost_and_date",
        "Para concluir a manutenção é obrigatório informar o custo (≥ 0) e a data de conclusão.",
      );
    }
  }
}

const memoryRepository = new InMemoryMaintenanceOrderRepository();
let defaultServicePromise: Promise<MaintenanceOrderService> | undefined;

export function createMemoryMaintenanceOrderService(): MaintenanceOrderService {
  return new MaintenanceOrderService(memoryRepository, createDefaultReferenceResolvers());
}

export function getMemoryMaintenanceOrderRepositoryForTests(): InMemoryMaintenanceOrderRepository {
  return memoryRepository;
}

export async function createDefaultMaintenanceOrderService(): Promise<MaintenanceOrderService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryMaintenanceOrderService();
  }

  defaultServicePromise ??= createPrismaMaintenanceOrderService();

  return defaultServicePromise;
}

export function resetMaintenanceOrderRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaMaintenanceOrderService(): Promise<MaintenanceOrderService> {
  const { createPrismaMaintenanceOrderRepository } = await import("./maintenance-order-prisma.repository.js");
  const repository = await createPrismaMaintenanceOrderRepository();

  return new MaintenanceOrderService(repository, createDefaultReferenceResolvers());
}

/**
 * Builds tenant-scoped resolvers over the vehicles and fuel-logs default services.
 * In memory mode these share the same singletons the vehicle / fuel-log routes
 * use, so an API-created vehicle or fuel log is visible here.
 */
function createDefaultReferenceResolvers(): MaintenanceOrderReferenceResolvers {
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
    maxFuelLogOdometer: async (actor, vehicleId) => {
      try {
        const service = await createDefaultFuelLogService();

        return await service.getMaxOdometerForVehicle(actor, vehicleId);
      } catch {
        return undefined;
      }
    },
  };
}
