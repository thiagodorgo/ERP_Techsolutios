import { env } from "../../config/env.js";
import { createDefaultFuelLogService } from "../fuel-logs/fuel-log.service.js";
import { createDefaultScheduledNotificationService } from "../notifications/scheduled-notification.service.js";
import { createDefaultVehicleService } from "../vehicles/vehicle.service.js";
import {
  InMemoryMaintenanceOrderItemRepository,
  type MaintenanceOrderItemRepository,
} from "./maintenance-order-item.repository.js";
import type {
  MaintenanceItemType,
  MaintenanceOrderItem,
  MaintenanceOrderTotals,
} from "./maintenance-order-item.types.js";
import {
  computeLineTotal,
  parseItemDescription,
  parseItemType,
  parseOptionalItemDescription,
  parseOptionalItemNotes,
  parseOptionalItemType,
  parseOptionalQuantity,
  parseOptionalUnitValue,
  parseQuantity,
  parseUnitValue,
  roundMoney,
} from "./maintenance-order-item.validators.js";
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
 * Effect payload for the "next maintenance due" notification (D-Ω4C-MANUT-NEXTDUE-NOTIF). The service builds the
 * DETERMINISTIC client_action_id here so the dedupe lives in this module; the resolver only forwards it to the
 * notifications engine (source_type=maintenance_item). Reprocessing the SAME order reuses the same key → the
 * engine returns the existing definition (no duplication).
 *
 * SECURITY (R-Ω4C-PR06): this reminder is INTRINSICALLY PRIVATE (creator/responsible only). The payload carries
 * NO visibility choice — the domain effect fixes `visibility: 'private'` at the engine boundary, so a holder of
 * `maintenance_orders:create` WITHOUT `notifications:create` can never trigger a tenant-wide broadcast. Deliberate
 * public/custom broadcast stays gated behind POST /notifications/scheduled (`notifications:create`).
 */
export type MaintenanceNextDueNotificationInput = {
  readonly maintenanceOrderId: string;
  readonly notifyAt: Date;
  readonly clientActionId: string;
  readonly title: string;
  readonly message: string;
};

/**
 * Tenant-scoped reads/effects used to enforce cross-entity rules. Each resolver receives the acting tenant
 * context so a cross-tenant / missing id resolves to "not found".
 * - `resolveVehicle` validates the required `vehicle_id`.
 * - `maxFuelLogOdometer` reuses the F1 read (odometer suggestion + monotonic guard).
 * - `scheduleNextDueNotification` is the DOMAIN EFFECT that creates the ScheduledNotification via the engine
 *   (service→service; NÃO exige `notifications:create` do usuário).
 */
export type MaintenanceOrderReferenceResolvers = {
  readonly resolveVehicle?: (actor: MaintenanceOrderActorContext, id: string) => Promise<boolean>;
  readonly maxFuelLogOdometer?: (
    actor: MaintenanceOrderActorContext,
    vehicleId: string,
  ) => Promise<number | undefined>;
  readonly scheduleNextDueNotification?: (
    actor: MaintenanceOrderActorContext,
    input: MaintenanceNextDueNotificationInput,
  ) => Promise<void>;
};

export type MaintenanceOrderDetailResult = {
  readonly order: MaintenanceOrder;
  readonly items: readonly MaintenanceOrderItem[];
  readonly totals: MaintenanceOrderTotals;
};

export type MaintenanceOdometerSuggestion = {
  readonly suggestedOdometer: number;
  readonly source: "fuel_log" | "maintenance_order";
} | null;

const EMPTY_TOTALS: MaintenanceOrderTotals = { totalServices: 0, totalProducts: 0, total: 0, itemCount: 0 };

export class MaintenanceOrderService {
  constructor(
    private readonly repository: MaintenanceOrderRepository,
    private readonly references: MaintenanceOrderReferenceResolvers = {},
    private readonly itemRepository: MaintenanceOrderItemRepository = new InMemoryMaintenanceOrderItemRepository(),
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

  // Totais (Σ itens) DERIVADOS por ordem, para a lista de cabeçalhos. Batch dos itens ATIVOS das ordens da página.
  async totalsForOrders(
    actor: MaintenanceOrderActorContext,
    orderIds: readonly string[],
  ): Promise<Map<string, MaintenanceOrderTotals>> {
    const result = new Map<string, MaintenanceOrderTotals>();
    if (orderIds.length === 0) return result;

    const items = await this.itemRepository.listByOrderIds(actor.tenantId, orderIds);
    const grouped = new Map<string, MaintenanceOrderItem[]>();
    for (const item of items) {
      const bucket = grouped.get(item.maintenanceOrderId);
      if (bucket) bucket.push(item);
      else grouped.set(item.maintenanceOrderId, [item]);
    }
    for (const [orderId, orderItems] of grouped) {
      result.set(orderId, computeTotals(orderItems));
    }
    return result;
  }

  async create(actor: MaintenanceOrderActorContext, body: RawRecord): Promise<MaintenanceOrder> {
    const vehicleId = parseRequiredUuid(body.vehicle_id ?? body.vehicleId, "vehicleId");
    await this.assertVehicleReference(actor, vehicleId);

    const odometer = parseOptionalOdometer(body.odometer);
    if (odometer !== undefined) {
      await this.assertOdometerMonotonic(actor, vehicleId, odometer);
    }

    const nextDueAt = parseOptionalDate(body.next_due_at ?? body.nextDueAt, "nextDueAt");

    // A maintenance order always starts on `agendada`; every later status change goes through the PATCH state
    // machine (R2.1).
    const created = await this.repository.create({
      tenantId: actor.tenantId,
      vehicleId,
      type: parseMaintenanceType(body.type),
      status: DEFAULT_MAINTENANCE_STATUS,
      scheduledFor: parseOptionalDate(body.scheduled_for ?? body.scheduledFor, "scheduledFor"),
      completedAt: parseOptionalDate(body.completed_at ?? body.completedAt, "completedAt"),
      cost: parseOptionalCost(body.cost),
      supplier: parseOptionalSupplier(body.supplier),
      odometer,
      nextDueAt,
      description: parseRequiredDescription(body.description),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive) ?? true,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });

    if (nextDueAt !== undefined) {
      await this.emitNextDueNotification(actor, created);
    }

    return created;
  }

  async get(actor: MaintenanceOrderActorContext, maintenanceOrderId: string): Promise<MaintenanceOrder> {
    return this.getEntity(actor, maintenanceOrderId);
  }

  // GET detalhe — cabeçalho + itens + totais DERIVADOS.
  async getWithDetail(
    actor: MaintenanceOrderActorContext,
    maintenanceOrderId: string,
  ): Promise<MaintenanceOrderDetailResult> {
    const order = await this.getEntity(actor, maintenanceOrderId);
    const items = await this.itemRepository.listByOrder(actor.tenantId, order.id);
    return { order, items, totals: computeTotals(items) };
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

    const nextDueProvided = body.next_due_at !== undefined || body.nextDueAt !== undefined;
    const nextDueAt = parseOptionalDate(body.next_due_at ?? body.nextDueAt, "nextDueAt");

    if (nextStatus !== undefined && nextStatus !== current.status) {
      // R2.1 — restricted state machine (422 on invalid transition).
      assertMaintenanceStatusTransition(current.status, nextStatus);
      // Completion requires a non-negative cost AND a completion date, taken from the PATCH or already present.
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
      nextDueAt: nextDueProvided ? nextDueAt : undefined,
      description: parseOptionalDescription(body.description),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive),
      updatedBy: actor.userId,
    };
    const updated = await this.repository.update(input);

    if (!updated) {
      throw new MaintenanceOrderError(404, "MAINTENANCE_ORDER_NOT_FOUND", "not_found", "Maintenance order was not found.");
    }

    // Efeito de domínio: só quando o corpo informa next_due_at (evita re-disparo em PATCH não relacionado). O
    // dedupe por client_action_id determinístico garante que reprocessar a MESMA ordem não duplica.
    if (nextDueProvided && updated.nextDueAt !== undefined) {
      await this.emitNextDueNotification(actor, updated);
    }

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Itens (D-Ω4C-MANUT-ITEMS) — sub-recurso do agregado. Cada operação valida a POSSE DO PAI via getEntity
  // (404 cross-tenant nativo) antes de tocar a linha. item_type=stock só MARCA (zero movimento de estoque —
  // D-Ω4C-MANUT-STOCK-ITEM-DEFER → PR-10/11).
  // ---------------------------------------------------------------------------

  async listItems(actor: MaintenanceOrderActorContext, maintenanceOrderId: string): Promise<MaintenanceOrderItem[]> {
    const order = await this.getEntity(actor, maintenanceOrderId);
    return this.itemRepository.listByOrder(actor.tenantId, order.id);
  }

  async addItem(
    actor: MaintenanceOrderActorContext,
    maintenanceOrderId: string,
    body: RawRecord,
  ): Promise<MaintenanceOrderItem> {
    const order = await this.getEntity(actor, maintenanceOrderId);

    const itemType: MaintenanceItemType = parseItemType(body.item_type ?? body.itemType);
    const description = parseItemDescription(body.description);
    const unitValue = parseUnitValue(body.unit_value ?? body.unitValue);
    const quantity = parseQuantity(body.quantity);
    const notes = parseOptionalItemNotes(body.notes);

    return this.itemRepository.create({
      tenantId: actor.tenantId,
      maintenanceOrderId: order.id,
      itemType,
      description,
      unitValue,
      quantity,
      notes,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
  }

  async updateItem(
    actor: MaintenanceOrderActorContext,
    maintenanceOrderId: string,
    itemId: string,
    body: RawRecord,
  ): Promise<MaintenanceOrderItem> {
    await this.getEntity(actor, maintenanceOrderId);
    const normalizedItemId = parseRequiredUuid(itemId, "itemId");
    await this.assertItemBelongsToOrder(actor, maintenanceOrderId, normalizedItemId);

    const updated = await this.itemRepository.update({
      tenantId: actor.tenantId,
      itemId: normalizedItemId,
      itemType: parseOptionalItemType(body.item_type ?? body.itemType),
      description: parseOptionalItemDescription(body.description),
      unitValue: parseOptionalUnitValue(body.unit_value ?? body.unitValue),
      quantity: parseOptionalQuantity(body.quantity),
      notes: body.notes === undefined ? undefined : (parseOptionalItemNotes(body.notes) ?? ""),
      updatedBy: actor.userId,
    });

    if (!updated) {
      throw itemNotFoundError();
    }
    return updated;
  }

  async removeItem(
    actor: MaintenanceOrderActorContext,
    maintenanceOrderId: string,
    itemId: string,
  ): Promise<MaintenanceOrderItem> {
    await this.getEntity(actor, maintenanceOrderId);
    const normalizedItemId = parseRequiredUuid(itemId, "itemId");
    await this.assertItemBelongsToOrder(actor, maintenanceOrderId, normalizedItemId);

    const deleted = await this.itemRepository.softDelete(actor.tenantId, normalizedItemId);
    if (!deleted) {
      throw itemNotFoundError();
    }
    return deleted;
  }

  // GET /maintenance-orders/odometer-suggestion — maior odômetro conhecido da viatura (max fuel/maintenance),
  // reusando os resolvers existentes. Sem histórico → null (não inventa). O guard monotônico (422) permanece.
  async odometerSuggestion(
    actor: MaintenanceOrderActorContext,
    vehicleId: string,
  ): Promise<MaintenanceOdometerSuggestion> {
    const normalizedVehicleId = parseRequiredUuid(vehicleId, "vehicleId");
    await this.assertVehicleReference(actor, normalizedVehicleId);

    const [maxMaintenance, maxFuel] = await Promise.all([
      this.repository.maxOdometerForVehicle(actor.tenantId, normalizedVehicleId),
      this.references.maxFuelLogOdometer
        ? this.references.maxFuelLogOdometer(actor, normalizedVehicleId)
        : Promise.resolve(undefined),
    ]);

    if (maxMaintenance === undefined && maxFuel === undefined) {
      return null;
    }

    const maintenanceValue = maxMaintenance ?? -Infinity;
    const fuelValue = maxFuel ?? -Infinity;
    // Empate ou fuel maior → fonte fuel_log (o toast do AutEM cita o abastecimento).
    if (fuelValue >= maintenanceValue) {
      return { suggestedOdometer: fuelValue, source: "fuel_log" };
    }
    return { suggestedOdometer: maintenanceValue, source: "maintenance_order" };
  }

  /**
   * R2.3 — read-only availability seam consumed by work-order.service:resolveVehicle.
   * A vehicle with an ACTIVE maintenance order in `em_execucao` is unavailable.
   */
  async hasActiveMaintenance(actor: MaintenanceOrderActorContext, vehicleId: string): Promise<boolean> {
    return this.repository.hasActiveMaintenance(actor.tenantId, vehicleId);
  }

  private async emitNextDueNotification(
    actor: MaintenanceOrderActorContext,
    order: MaintenanceOrder,
  ): Promise<void> {
    const resolver = this.references.scheduleNextDueNotification;
    if (!resolver || order.nextDueAt === undefined) return;

    // Sem escolha de visibilidade: o lembrete é sempre PRIVADO (o resolver fixa `visibility: 'private'` na
    // fronteira do motor). O efeito de domínio NUNCA faz broadcast tenant-wide (R-Ω4C-PR06).
    await resolver(actor, {
      maintenanceOrderId: order.id,
      notifyAt: order.nextDueAt,
      // DETERMINÍSTICO: a chave de dedupe é a MANUTENÇÃO (adicionar itens/editar não duplica).
      clientActionId: `maintenance-next-due:${order.id}`,
      title: "Próxima manutenção",
      message: `Próxima manutenção da viatura prevista para ${order.nextDueAt.toISOString()}.`,
    });
  }

  private async getEntity(actor: MaintenanceOrderActorContext, maintenanceOrderId: string): Promise<MaintenanceOrder> {
    const order = await this.repository.findById(actor.tenantId, parseRequiredUuid(maintenanceOrderId, "maintenanceOrderId"));

    if (!order) {
      throw new MaintenanceOrderError(404, "MAINTENANCE_ORDER_NOT_FOUND", "not_found", "Maintenance order was not found.");
    }

    return order;
  }

  private async assertItemBelongsToOrder(
    actor: MaintenanceOrderActorContext,
    maintenanceOrderId: string,
    itemId: string,
  ): Promise<MaintenanceOrderItem> {
    const item = await this.itemRepository.findById(actor.tenantId, itemId);
    if (!item || item.maintenanceOrderId !== maintenanceOrderId) {
      throw itemNotFoundError();
    }
    return item;
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

  // R1.2 — odometer is optional; when provided it must be >= the highest already recorded for the vehicle across
  // BOTH maintenance_orders AND fuel_logs.
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

function itemNotFoundError(): MaintenanceOrderError {
  return new MaintenanceOrderError(404, "MAINTENANCE_ITEM_NOT_FOUND", "not_found", "Maintenance order item was not found.");
}

// Totais DERIVADOS server-side (D-Ω4C-MANUT-TOTALS-DERIVED): SERVIÇO→totalServices, PRODUTO+ESTOQUE→totalProducts
// (ESTOQUE é peça física), total=soma. lineTotal por item = unit_value × quantity (arredondado 2 casas). Nunca
// persistidos; o cliente nunca envia total.
export function computeTotals(items: readonly MaintenanceOrderItem[]): MaintenanceOrderTotals {
  if (items.length === 0) return EMPTY_TOTALS;

  let totalServices = 0;
  let totalProducts = 0;
  for (const item of items) {
    const lineTotal = computeLineTotal(item.unitValue, item.quantity);
    if (item.itemType === "service") {
      totalServices += lineTotal;
    } else {
      totalProducts += lineTotal;
    }
  }
  totalServices = roundMoney(totalServices);
  totalProducts = roundMoney(totalProducts);
  return {
    totalServices,
    totalProducts,
    total: roundMoney(totalServices + totalProducts),
    itemCount: items.length,
  };
}

const memoryRepository = new InMemoryMaintenanceOrderRepository();
const memoryItemRepository = new InMemoryMaintenanceOrderItemRepository();
let defaultServicePromise: Promise<MaintenanceOrderService> | undefined;

export function createMemoryMaintenanceOrderService(): MaintenanceOrderService {
  return new MaintenanceOrderService(memoryRepository, createDefaultReferenceResolvers(), memoryItemRepository);
}

export function getMemoryMaintenanceOrderRepositoryForTests(): InMemoryMaintenanceOrderRepository {
  return memoryRepository;
}

export function getMemoryMaintenanceOrderItemRepositoryForTests(): InMemoryMaintenanceOrderItemRepository {
  return memoryItemRepository;
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
  memoryItemRepository.reset();
  defaultServicePromise = undefined;
}

/**
 * Returns the SAME repository the default service reads/writes: the shared in-memory singleton in memory mode
 * (so API-created orders are visible), or the Prisma-backed repository in `prisma` mode. Used by the fleet-alerts
 * orchestrator to run the R2.2 "maintenance due" producer without hand-rolling a repository.
 */
export async function createDefaultMaintenanceOrderRepository(): Promise<MaintenanceOrderRepository> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return memoryRepository;
  }

  const { createPrismaMaintenanceOrderRepository } = await import("./maintenance-order-prisma.repository.js");

  return createPrismaMaintenanceOrderRepository();
}

async function createPrismaMaintenanceOrderService(): Promise<MaintenanceOrderService> {
  const { createPrismaMaintenanceOrderRepository } = await import("./maintenance-order-prisma.repository.js");
  const { createPrismaMaintenanceOrderItemRepository } = await import("./maintenance-order-item-prisma.repository.js");
  const [repository, itemRepository] = await Promise.all([
    createPrismaMaintenanceOrderRepository(),
    createPrismaMaintenanceOrderItemRepository(),
  ]);

  return new MaintenanceOrderService(repository, createDefaultReferenceResolvers(), itemRepository);
}

/**
 * Builds tenant-scoped resolvers over the vehicles / fuel-logs / scheduled-notifications default services. In
 * memory mode these share the same singletons the corresponding routes use, so an API-created vehicle, fuel log
 * or notification is visible here.
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
    // Efeito de domínio (service→service): cria a ScheduledNotification via o motor PR-04. O ator de manutenção
    // casa com ScheduledNotificationActorContext e é repassado direto — NÃO exige `notifications:create` do usuário.
    // Justamente por isso o lembrete é FIXADO como `visibility: 'private'` aqui: um portador de
    // `maintenance_orders:create` SEM `notifications:create` jamais dispara broadcast tenant-wide (R-Ω4C-PR06). O
    // broadcast deliberado (public/custom) continua exigindo `notifications:create` via POST /notifications/scheduled.
    scheduleNextDueNotification: async (actor, input) => {
      const service = await createDefaultScheduledNotificationService();
      await service.create(actor, {
        title: input.title,
        message: input.message,
        notify_at: input.notifyAt,
        visibility: "private",
        source_type: "maintenance_item",
        source_id: input.maintenanceOrderId,
        client_action_id: input.clientActionId,
      });
    },
  };
}
