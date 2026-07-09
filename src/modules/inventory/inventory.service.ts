import { env } from "../../config/env.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { createDefaultVehicleService } from "../vehicles/vehicle.service.js";
import { createDefaultWorkOrderService } from "../work-orders/work-order.service.js";
import { signQuantity } from "./inventory.calculations.js";
import { InMemoryInventoryRepository, type InventoryRepository } from "./inventory.repository.js";
import {
  InventoryError,
  type InventoryActorContext,
  type InventoryItem,
  type InventoryItemWithSaldo,
  type ListInventoryItemsInput,
  type ListInventoryItemsResult,
  type ListStockMovementsInput,
  type ListStockMovementsResult,
  type StockMovement,
  type UpdateInventoryItemInput,
} from "./inventory.types.js";
import {
  parseLimit,
  parseMovementType,
  parseName,
  parseNonNegativeNumber,
  parseOffset,
  parseOptionalDate,
  parseOptionalLeadTimeDays,
  parseOptionalMovementType,
  parseOptionalName,
  parseOptionalReason,
  parseOptionalSearch,
  parseOptionalSku,
  parseOptionalUnit,
  parseOptionalUnitCost,
  parseOptionalUuid,
  parseQuantidade,
  parseRequiredUuid,
  parseSku,
  parseUnit,
  readOptionalBoolean,
} from "./inventory.validators.js";

type RawRecord = Record<string, unknown>;

/**
 * Tenant-scoped reads used to enforce cross-entity rules (mirror damages): a
 * cross-tenant / missing id resolves to "not found" and is rejected as an
 * invalid reference (400). There is no hard FK for either column.
 * - `resolveWorkOrder` validates `work_order_id` (REQUIRED for consumo, R7.2).
 * - `resolveVehicle` validates the OPTIONAL `vehicle_id`.
 */
export type InventoryReferenceResolvers = {
  readonly resolveWorkOrder?: (actor: InventoryActorContext, id: string) => Promise<boolean>;
  readonly resolveVehicle?: (actor: InventoryActorContext, id: string) => Promise<boolean>;
};

export class InventoryService {
  constructor(
    private readonly repository: InventoryRepository,
    private readonly references: InventoryReferenceResolvers = {},
  ) {}

  async listItems(actor: InventoryActorContext, query: RawRecord): Promise<ListInventoryItemsResult> {
    const input: ListInventoryItemsInput = {
      tenantId: actor.tenantId,
      search: parseOptionalSearch(query.search),
      isActive: readOptionalBoolean(query.is_active ?? query.isActive),
      belowMin: readOptionalBoolean(query.below_min ?? query.belowMin, "belowMin"),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };

    return this.repository.listItems(input);
  }

  async createItem(actor: InventoryActorContext, body: RawRecord): Promise<InventoryItemWithSaldo> {
    // `abc_class` and `avg_cost` are NEVER writable through the API: the class
    // comes from the F7b job and the average from the entrada flow (R7.3).
    const item = await this.repository.createItem({
      tenantId: actor.tenantId,
      sku: parseSku(body.sku),
      name: parseName(body.name),
      unit: parseUnit(body.unit),
      minQuantity: parseNonNegativeNumber(body.min_quantity ?? body.minQuantity, "minQuantity") ?? 0,
      maxQuantity: parseNonNegativeNumber(body.max_quantity ?? body.maxQuantity, "maxQuantity"),
      leadTimeDays: parseOptionalLeadTimeDays(body.lead_time_days ?? body.leadTimeDays),
      safetyStock: parseNonNegativeNumber(body.safety_stock ?? body.safetyStock, "safetyStock"),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive) ?? true,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });

    // A fresh item has no ledger yet — its derived saldo is 0 by definition.
    return { ...item, saldo: 0 };
  }

  async getItem(actor: InventoryActorContext, itemId: string): Promise<InventoryItemWithSaldo> {
    const item = await this.repository.findItemWithSaldo(actor.tenantId, parseRequiredUuid(itemId, "itemId"));

    if (!item) {
      throw itemNotFound();
    }

    return item;
  }

  async updateItem(actor: InventoryActorContext, itemId: string, body: RawRecord): Promise<InventoryItemWithSaldo> {
    await this.getItemEntity(actor, itemId);

    const input: UpdateInventoryItemInput = {
      tenantId: actor.tenantId,
      itemId: parseRequiredUuid(itemId, "itemId"),
      // sku change is allowed but re-checked against the composite unique
      // (mirror fines numero_auto): duplicate in the same tenant is a 409.
      sku: parseOptionalSku(body.sku),
      name: parseOptionalName(body.name),
      unit: parseOptionalUnit(body.unit),
      minQuantity: parseNonNegativeNumber(body.min_quantity ?? body.minQuantity, "minQuantity"),
      maxQuantity: parseNonNegativeNumber(body.max_quantity ?? body.maxQuantity, "maxQuantity"),
      leadTimeDays: parseOptionalLeadTimeDays(body.lead_time_days ?? body.leadTimeDays),
      safetyStock: parseNonNegativeNumber(body.safety_stock ?? body.safetyStock, "safetyStock"),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive),
      updatedBy: actor.userId,
    };
    const updated = await this.repository.updateItem(input);

    if (!updated) {
      throw itemNotFound();
    }

    return this.getItem(actor, updated.id);
  }

  async listMovements(actor: InventoryActorContext, query: RawRecord): Promise<ListStockMovementsResult> {
    const input: ListStockMovementsInput = {
      tenantId: actor.tenantId,
      itemId: parseOptionalUuid(query.item_id ?? query.itemId, "itemId"),
      type: parseOptionalMovementType(query.type),
      workOrderId: parseOptionalUuid(query.work_order_id ?? query.workOrderId, "workOrderId"),
      from: parseOptionalDate(query.from, "from"),
      to: parseOptionalDate(query.to, "to"),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };

    return this.repository.listMovements(input);
  }

  /**
   * The movement flow. Domain rules validated here (R7.2), then the repository
   * runs the TRANSACTIONAL part (R7.1 saldo check + R7.3 moving average) so the
   * ledger insert and the avg_cost update commit or fail together.
   */
  async createMovement(actor: InventoryActorContext, body: RawRecord): Promise<StockMovement> {
    const itemId = parseRequiredUuid(body.item_id ?? body.itemId, "itemId");
    const type = parseMovementType(body.type);
    const quantidade = parseQuantidade(body.quantidade ?? body.quantidade_sinalizada ?? body.quantidadeSinalizada, type);
    const unitCost = parseOptionalUnitCost(body.unit_cost ?? body.unitCost);
    const workOrderId = parseOptionalUuid(body.work_order_id ?? body.workOrderId, "workOrderId");
    const vehicleId = parseOptionalUuid(body.vehicle_id ?? body.vehicleId, "vehicleId");
    const reason = parseOptionalReason(body.reason);

    // R7.3 — an entrada without its cost would corrupt the moving average.
    if (type === "entrada" && unitCost === undefined) {
      throw new InventoryError(
        400,
        "STOCK_INVALID",
        "entrada_requires_unit_cost",
        "Movimento de entrada exige unitCost para recalcular o custo médio.",
      );
    }

    // R7.2 — consumo is always tied to a work order.
    if (type === "consumo" && workOrderId === undefined) {
      throw new InventoryError(
        400,
        "STOCK_INVALID",
        "consumo_requires_work_order",
        "Movimento de consumo exige workOrderId (consumo por OS).",
      );
    }

    // An ajuste must always explain itself (feeds the F7b variance report).
    if (type === "ajuste" && reason === undefined) {
      throw new InventoryError(
        400,
        "STOCK_INVALID",
        "ajuste_requires_reason",
        "Movimento de ajuste exige reason (justificativa).",
      );
    }

    if (workOrderId !== undefined) {
      await this.assertWorkOrderReference(actor, workOrderId);
    }

    if (vehicleId !== undefined) {
      await this.assertVehicleReference(actor, vehicleId);
    }

    const movement = await this.repository.createMovement({
      tenantId: actor.tenantId,
      itemId,
      type,
      quantidadeSinalizada: signQuantity(type, quantidade),
      unitCost,
      workOrderId,
      vehicleId,
      reason,
      createdBy: actor.userId,
    });

    if (!movement) {
      throw new InventoryError(
        400,
        "STOCK_INVALID",
        "invalid_item_reference",
        "itemId does not reference an inventory item in this organization.",
      );
    }

    return movement;
  }

  async getMovement(actor: InventoryActorContext, movementId: string): Promise<StockMovement> {
    const movement = await this.repository.findMovementById(
      actor.tenantId,
      parseRequiredUuid(movementId, "movementId"),
    );

    if (!movement) {
      throw new InventoryError(404, "STOCK_MOVEMENT_NOT_FOUND", "not_found", "Stock movement was not found.");
    }

    return movement;
  }

  private async getItemEntity(actor: InventoryActorContext, itemId: string): Promise<InventoryItem> {
    const item = await this.repository.findItemById(actor.tenantId, parseRequiredUuid(itemId, "itemId"));

    if (!item) {
      throw itemNotFound();
    }

    return item;
  }

  private async assertWorkOrderReference(actor: InventoryActorContext, workOrderId: string): Promise<void> {
    const resolver = this.references.resolveWorkOrder;
    const exists = resolver ? await resolver(actor, workOrderId) : false;

    if (!exists) {
      throw new InventoryError(
        400,
        "STOCK_INVALID",
        "invalid_work_order_reference",
        "workOrderId does not reference a work order in this organization.",
      );
    }
  }

  private async assertVehicleReference(actor: InventoryActorContext, vehicleId: string): Promise<void> {
    const resolver = this.references.resolveVehicle;
    const exists = resolver ? await resolver(actor, vehicleId) : false;

    if (!exists) {
      throw new InventoryError(
        400,
        "STOCK_INVALID",
        "invalid_vehicle_reference",
        "vehicleId does not reference a vehicle in this organization.",
      );
    }
  }
}

function itemNotFound(): InventoryError {
  return new InventoryError(404, "INVENTORY_ITEM_NOT_FOUND", "not_found", "Inventory item was not found.");
}

const memoryRepository = new InMemoryInventoryRepository();
let defaultServicePromise: Promise<InventoryService> | undefined;

export function createMemoryInventoryService(_coreService: ICoreSaasService): InventoryService {
  return new InventoryService(memoryRepository, createDefaultReferenceResolvers());
}

export function getMemoryInventoryRepositoryForTests(): InMemoryInventoryRepository {
  return memoryRepository;
}

export async function createDefaultInventoryService(coreService: ICoreSaasService): Promise<InventoryService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryInventoryService(coreService);
  }

  defaultServicePromise ??= createPrismaInventoryService();

  return defaultServicePromise;
}

export function resetInventoryRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaInventoryService(): Promise<InventoryService> {
  const { createPrismaInventoryRepository } = await import("./inventory-prisma.repository.js");
  const repository = await createPrismaInventoryRepository();

  return new InventoryService(repository, createDefaultReferenceResolvers());
}

/**
 * Builds tenant-scoped resolvers over the work-orders and vehicles default
 * services (shared singletons in memory mode). A cross-tenant or missing
 * reference resolves to `false`, surfacing as a 400 invalid reference.
 */
function createDefaultReferenceResolvers(): InventoryReferenceResolvers {
  return {
    resolveWorkOrder: async (actor, id) => {
      try {
        const service = await createDefaultWorkOrderService();
        await service.get(actor, id);

        return true;
      } catch {
        return false;
      }
    },
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
