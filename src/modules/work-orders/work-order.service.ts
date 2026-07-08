import { env } from "../../config/env.js";
import { publishDomainEvent } from "../../infra/events/domain-event.publisher.js";
import { createDefaultCustomerService } from "../customers/customer.service.js";
import { createDefaultMaintenanceOrderService } from "../maintenance-orders/maintenance-order.service.js";
import { createDefaultServiceCatalogService } from "../service-catalog/service-catalog.service.js";
import { createDefaultTeamService } from "../teams/team.service.js";
import { createDefaultVehicleService } from "../vehicles/vehicle.service.js";
import {
  InMemoryWorkOrderRepository,
  type WorkOrderRepository,
} from "./work-order.repository.js";
import type {
  AssignWorkOrderInput,
  ListWorkOrdersInput,
  ListWorkOrdersResult,
  UpdateWorkOrderInput,
  WorkOrder,
  WorkOrderActorContext,
  WorkOrderCustomerLink,
  WorkOrderEvent,
  WorkOrderLinks,
  WorkOrderServiceCatalogLink,
  WorkOrderStatus,
  WorkOrderTeamLink,
  WorkOrderVehicleLink,
} from "./work-order.types.js";
import { WorkOrderError } from "./work-order.types.js";
import {
  assertNonEmptyString,
  assertStatusTransition,
  optionalString,
  parseLimit,
  parseOffset,
  parseOptionalCoordinate,
  parseOptionalDate,
  parseOptionalSearch,
  parseOptionalUuid,
  parseRequiredUuid,
  parseWorkOrderPriority,
  parseWorkOrderStatus,
} from "./work-order.validators.js";

type RawRecord = Record<string, unknown>;

/**
 * Point-in-time customer data copied onto a work order at create time.
 * Kept even if the source customer is later renamed (snapshot semantics).
 */
export type WorkOrderCustomerSnapshot = {
  readonly name: string;
  readonly document: string | null;
  readonly phone: string | null;
};

/**
 * Tenant-scoped lookups used to validate the optional cadastro references
 * (customer/vehicle/team/service catalog) and to derive the customer snapshot.
 * Each resolver receives the acting tenant context, so a cross-tenant id
 * resolves to "not found" and is rejected as an invalid reference.
 */
export type WorkOrderReferenceResolvers = {
  readonly resolveCustomer?: (actor: WorkOrderActorContext, id: string) => Promise<WorkOrderCustomerSnapshot | null>;
  readonly resolveVehicle?: (actor: WorkOrderActorContext, id: string) => Promise<boolean>;
  readonly resolveTeam?: (actor: WorkOrderActorContext, id: string) => Promise<boolean>;
  readonly resolveServiceCatalog?: (actor: WorkOrderActorContext, id: string) => Promise<boolean>;
  // F2 R2.3 — read-only availability seam. True when the vehicle has an ACTIVE
  // maintenance order in `em_execucao`; such a vehicle cannot be bound to a NEW
  // work order (409 vehicle_in_maintenance). Additive; field-dispatch untouched.
  readonly hasActiveMaintenance?: (actor: WorkOrderActorContext, id: string) => Promise<boolean>;
  // C2 — detail-only summaries for the linked cadastros. Each returns a small,
  // tenant-scoped projection or null (missing/cross-tenant/unresolvable id).
  readonly resolveCustomerSummary?: (actor: WorkOrderActorContext, id: string) => Promise<WorkOrderCustomerLink | null>;
  readonly resolveVehicleSummary?: (actor: WorkOrderActorContext, id: string) => Promise<WorkOrderVehicleLink | null>;
  readonly resolveTeamSummary?: (actor: WorkOrderActorContext, id: string) => Promise<WorkOrderTeamLink | null>;
  readonly resolveServiceCatalogSummary?: (
    actor: WorkOrderActorContext,
    id: string,
  ) => Promise<WorkOrderServiceCatalogLink | null>;
};

export class WorkOrderService {
  constructor(
    private readonly repository: WorkOrderRepository,
    private readonly references: WorkOrderReferenceResolvers = {},
  ) {}

  async list(actor: WorkOrderActorContext, query: RawRecord): Promise<ListWorkOrdersResult> {
    const input: ListWorkOrdersInput = {
      tenantId: actor.tenantId,
      status: query.status ? parseWorkOrderStatus(query.status) : undefined,
      priority: query.priority ? parseWorkOrderPriority(query.priority) : undefined,
      assignedOperatorId: parseOptionalUuid(query.assignedOperatorId, "assignedOperatorId"),
      assignedUserId: parseOptionalUuid(query.assignedUserId, "assignedUserId"),
      from: parseOptionalDate(query.from, "from"),
      to: parseOptionalDate(query.to, "to"),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };

    return this.repository.list(input);
  }

  async create(actor: WorkOrderActorContext, body: RawRecord): Promise<WorkOrder> {
    const customerId = parseOptionalUuid(body.customer_id ?? body.customerId, "customerId");
    const vehicleId = parseOptionalUuid(body.vehicle_id ?? body.vehicleId, "vehicleId");
    const teamId = parseOptionalUuid(body.team_id ?? body.teamId, "teamId");
    const serviceCatalogId = parseOptionalUuid(body.service_catalog_id ?? body.serviceCatalogId, "serviceCatalogId");

    // Validate every provided reference against the acting tenant. A missing or
    // cross-tenant id resolves to "not found" and is rejected with a 400.
    const customerSnapshot = await this.resolveCustomerSnapshot(actor, customerId);
    await this.assertReferenceExists("vehicle", this.references.resolveVehicle, actor, vehicleId);
    // F2 R2.3 — a vehicle under active maintenance cannot be bound to a NEW OS.
    await this.assertVehicleAvailable(actor, vehicleId);
    await this.assertReferenceExists("team", this.references.resolveTeam, actor, teamId);
    await this.assertReferenceExists("service_catalog", this.references.resolveServiceCatalog, actor, serviceCatalogId);

    const code = await this.repository.nextCode(actor.tenantId);
    const workOrder = await this.repository.create({
      tenantId: actor.tenantId,
      code,
      title: assertNonEmptyString(body.title, "title"),
      description: optionalString(body.description),
      // With a resolved customer the snapshot is server-derived and overrides
      // any client-sent customer fields; without one the legacy path stands.
      customerName: customerSnapshot ? customerSnapshot.name : optionalString(body.customerName),
      customerDocument: customerSnapshot ? customerSnapshot.document ?? undefined : optionalString(body.customerDocument),
      customerPhone: customerSnapshot ? customerSnapshot.phone ?? undefined : optionalString(body.customerPhone),
      serviceAddress: optionalString(body.serviceAddress),
      serviceCity: optionalString(body.serviceCity),
      serviceState: optionalString(body.serviceState),
      serviceZipCode: optionalString(body.serviceZipCode),
      serviceLatitude: parseOptionalCoordinate(body.serviceLatitude, "serviceLatitude", -90, 90),
      serviceLongitude: parseOptionalCoordinate(body.serviceLongitude, "serviceLongitude", -180, 180),
      priority: parseWorkOrderPriority(body.priority),
      checklistId: parseOptionalUuid(body.checklistId, "checklistId"),
      customerId,
      vehicleId,
      teamId,
      serviceCatalogId,
      scheduledFor: parseOptionalDate(body.scheduledFor, "scheduledFor"),
      createdBy: actor.userId,
      updatedBy: actor.userId,
      status: "open",
    });

    await this.repository.createEvent({
      tenantId: actor.tenantId,
      workOrderId: workOrder.id,
      eventType: "work_order_created",
      toStatus: workOrder.status,
      actorUserId: actor.userId,
      message: "Ordem de servico criada.",
      metadata: {
        code: workOrder.code,
        priority: workOrder.priority,
      },
    });

    return workOrder;
  }

  private async resolveCustomerSnapshot(
    actor: WorkOrderActorContext,
    customerId: string | undefined,
  ): Promise<WorkOrderCustomerSnapshot | null> {
    if (!customerId) return null;

    const resolver = this.references.resolveCustomer;
    const snapshot = resolver ? await resolver(actor, customerId) : null;
    if (!snapshot) {
      throw new WorkOrderError(
        400,
        "WORK_ORDER_INVALID",
        "invalid_customer_reference",
        "customerId does not reference a customer in this organization.",
      );
    }

    return snapshot;
  }

  // F2 R2.3 — read-only guard: reject binding a vehicle that has an active
  // maintenance order in `em_execucao` to a new work order (409). No-op when the
  // OS carries no vehicle or the resolver is not wired.
  private async assertVehicleAvailable(actor: WorkOrderActorContext, vehicleId: string | undefined): Promise<void> {
    if (!vehicleId) return;

    const resolver = this.references.hasActiveMaintenance;
    const inMaintenance = resolver ? await resolver(actor, vehicleId) : false;
    if (inMaintenance) {
      throw new WorkOrderError(
        409,
        "WORK_ORDER_CONFLICT",
        "vehicle_in_maintenance",
        "The vehicle is under active maintenance and cannot be assigned to a new work order.",
      );
    }
  }

  private async assertReferenceExists(
    entity: "vehicle" | "team" | "service_catalog",
    resolver: ((actor: WorkOrderActorContext, id: string) => Promise<boolean>) | undefined,
    actor: WorkOrderActorContext,
    id: string | undefined,
  ): Promise<void> {
    if (!id) return;

    const exists = resolver ? await resolver(actor, id) : false;
    if (!exists) {
      throw new WorkOrderError(
        400,
        "WORK_ORDER_INVALID",
        `invalid_${entity}_reference`,
        `The provided ${entity} reference does not exist in this organization.`,
      );
    }
  }

  async get(actor: WorkOrderActorContext, workOrderId: string): Promise<WorkOrder> {
    const workOrder = await this.repository.findById(actor.tenantId, parseRequiredUuid(workOrderId, "workOrderId"));

    if (!workOrder) {
      throw new WorkOrderError(404, "WORK_ORDER_NOT_FOUND", "not_found", "Work order was not found.");
    }

    return workOrder;
  }

  /**
   * Detail path (`GET /:id`): fetches the OS and resolves each linked cadastro to
   * its small summary. Kept separate from get() so the list and the internal
   * get() callers (update/status/assign/timeline) stay cheap and unchanged.
   */
  async getWithLinks(
    actor: WorkOrderActorContext,
    workOrderId: string,
  ): Promise<{ readonly workOrder: WorkOrder; readonly links: WorkOrderLinks }> {
    const workOrder = await this.get(actor, workOrderId);
    const links = await this.resolveLinks(actor, workOrder);

    return { workOrder, links };
  }

  private async resolveLinks(actor: WorkOrderActorContext, workOrder: WorkOrder): Promise<WorkOrderLinks> {
    const [customer, vehicle, team, serviceCatalog] = await Promise.all([
      resolveSummary(this.references.resolveCustomerSummary, actor, workOrder.customerId),
      resolveSummary(this.references.resolveVehicleSummary, actor, workOrder.vehicleId),
      resolveSummary(this.references.resolveTeamSummary, actor, workOrder.teamId),
      resolveSummary(this.references.resolveServiceCatalogSummary, actor, workOrder.serviceCatalogId),
    ]);

    return { customer, vehicle, team, serviceCatalog };
  }

  async update(actor: WorkOrderActorContext, workOrderId: string, body: RawRecord): Promise<WorkOrder> {
    if ("status" in body) {
      throw new WorkOrderError(400, "WORK_ORDER_INVALID", "status_endpoint_required", "Use the status endpoint to change work order status.");
    }

    await this.get(actor, workOrderId);
    const input: UpdateWorkOrderInput = {
      tenantId: actor.tenantId,
      workOrderId: parseRequiredUuid(workOrderId, "workOrderId"),
      title: body.title === undefined ? undefined : assertNonEmptyString(body.title, "title"),
      description: optionalString(body.description),
      customerName: optionalString(body.customerName),
      customerDocument: optionalString(body.customerDocument),
      customerPhone: optionalString(body.customerPhone),
      serviceAddress: optionalString(body.serviceAddress),
      serviceCity: optionalString(body.serviceCity),
      serviceState: optionalString(body.serviceState),
      serviceZipCode: optionalString(body.serviceZipCode),
      serviceLatitude: parseOptionalCoordinate(body.serviceLatitude, "serviceLatitude", -90, 90),
      serviceLongitude: parseOptionalCoordinate(body.serviceLongitude, "serviceLongitude", -180, 180),
      priority: body.priority === undefined ? undefined : parseWorkOrderPriority(body.priority),
      checklistId: parseOptionalUuid(body.checklistId, "checklistId"),
      scheduledFor: parseOptionalDate(body.scheduledFor, "scheduledFor"),
      updatedBy: actor.userId,
    };
    const updated = await this.repository.update(input);

    if (!updated) {
      throw new WorkOrderError(404, "WORK_ORDER_NOT_FOUND", "not_found", "Work order was not found.");
    }

    await this.repository.createEvent({
      tenantId: actor.tenantId,
      workOrderId: updated.id,
      eventType: "work_order_updated",
      actorUserId: actor.userId,
      message: "Ordem de servico atualizada.",
      metadata: {
        code: updated.code,
        changedFields: Object.keys(body).filter((key) => body[key] !== undefined),
      },
    });

    return updated;
  }

  async changeStatus(actor: WorkOrderActorContext, workOrderId: string, body: RawRecord): Promise<WorkOrder> {
    const current = await this.get(actor, workOrderId);
    const nextStatus = parseWorkOrderStatus(body.status);
    const message = optionalString(body.message) ?? defaultStatusMessage(nextStatus);
    const cancellationReason = optionalString(body.cancellationReason) ?? optionalString(body.reason);

    assertStatusTransition(current.status, nextStatus);
    if (nextStatus === "cancelled" && !cancellationReason) {
      throw new WorkOrderError(400, "WORK_ORDER_INVALID", "cancellation_reason_required", "cancellationReason is required.");
    }

    const updated = await this.repository.changeStatus({
      tenantId: actor.tenantId,
      workOrderId: current.id,
      status: nextStatus,
      message,
      cancellationReason,
      actorUserId: actor.userId,
    });

    if (!updated) {
      throw new WorkOrderError(404, "WORK_ORDER_NOT_FOUND", "not_found", "Work order was not found.");
    }

    await this.repository.createEvent({
      tenantId: actor.tenantId,
      workOrderId: updated.id,
      eventType: statusEventType(nextStatus),
      fromStatus: current.status,
      toStatus: nextStatus,
      actorUserId: actor.userId,
      message,
      metadata: {
        cancellationReason,
      },
    });

    await publishDomainEvent(
      "work_order.status_changed",
      {
        entity_type: "work_order",
        entity_id: updated.id,
        code: updated.code,
        from_status: current.status,
        to_status: nextStatus,
      },
      { tenantId: actor.tenantId, actorId: actor.userId },
    );

    return updated;
  }

  async assign(actor: WorkOrderActorContext, workOrderId: string, body: RawRecord) {
    const current = await this.get(actor, workOrderId);
    // D1 — the assign action gains optional viatura/equipe selection, carried by the
    // mobile `work_order.assign` sync action and accepted on the REST body. Each
    // provided reference is validated tenant-scoped via the same B1 resolvers used on
    // create; a missing/cross-tenant id resolves to "not found" and is rejected with a
    // 400. When both are absent the legacy assign path is unchanged.
    const vehicleId = parseOptionalUuid(body.vehicleId ?? body.vehicle_id, "vehicleId");
    const teamId = parseOptionalUuid(body.teamId ?? body.team_id, "teamId");
    await this.assertReferenceExists("vehicle", this.references.resolveVehicle, actor, vehicleId);
    await this.assertReferenceExists("team", this.references.resolveTeam, actor, teamId);

    const input: AssignWorkOrderInput = {
      tenantId: actor.tenantId,
      workOrderId: current.id,
      operatorId: parseRequiredUuid(body.operatorId ?? body.userId, "operatorId"),
      userId: parseOptionalUuid(body.userId, "userId"),
      vehicleId,
      teamId,
      message: optionalString(body.message) ?? "Ordem de servico atribuida.",
      assignedBy: actor.userId,
    };

    assertStatusTransition(current.status, "assigned");
    const result = await this.repository.assign(input);

    if (!result) {
      throw new WorkOrderError(404, "WORK_ORDER_NOT_FOUND", "not_found", "Work order was not found.");
    }

    await this.repository.createEvent({
      tenantId: actor.tenantId,
      workOrderId: current.id,
      eventType: "work_order_assigned",
      fromStatus: current.status,
      toStatus: "assigned",
      actorUserId: actor.userId,
      message: input.message,
      metadata: {
        operatorId: input.operatorId,
        userId: input.userId,
        vehicleId: input.vehicleId,
        teamId: input.teamId,
        assignmentId: result.assignment.id,
      },
    });

    return result.workOrder;
  }

  async timeline(actor: WorkOrderActorContext, workOrderId: string): Promise<readonly WorkOrderEvent[]> {
    const workOrder = await this.get(actor, workOrderId);

    return this.repository.listTimeline(actor.tenantId, workOrder.id);
  }
}

const memoryRepository = new InMemoryWorkOrderRepository();
let defaultServicePromise: Promise<WorkOrderService> | undefined;

export function createMemoryWorkOrderService(): WorkOrderService {
  return new WorkOrderService(memoryRepository, createDefaultReferenceResolvers());
}

/**
 * Builds tenant-scoped reference resolvers over the cadastro modules' default
 * services. In memory mode these share the same singletons the cadastro routes
 * use, so API-created customers/vehicles/teams/services are visible here.
 */
function createDefaultReferenceResolvers(): WorkOrderReferenceResolvers {
  return {
    resolveCustomer: async (actor, id) => {
      try {
        const service = await createDefaultCustomerService();
        const customer = await service.get(actor, id);

        return {
          name: customer.name,
          document: customer.document ?? null,
          phone: customer.phone ?? null,
        };
      } catch {
        return null;
      }
    },
    resolveVehicle: (actor, id) => referenceExists(createDefaultVehicleService, actor, id),
    resolveTeam: (actor, id) => referenceExists(createDefaultTeamService, actor, id),
    resolveServiceCatalog: (actor, id) => referenceExists(createDefaultServiceCatalogService, actor, id),
    // F2 R2.3 — reuses the maintenance default service singleton so an OS-facing
    // availability check sees maintenance orders created via the API. Fails open
    // (available) on any error so maintenance never blocks OS creation spuriously.
    hasActiveMaintenance: async (actor, id) => {
      try {
        const service = await createDefaultMaintenanceOrderService();

        return await service.hasActiveMaintenance(actor, id);
      } catch {
        return false;
      }
    },
    resolveCustomerSummary: (actor, id) =>
      resolveEntitySummary(createDefaultCustomerService, actor, id, (customer) => ({
        id: customer.id,
        name: customer.name,
        isActive: customer.isActive,
      })),
    resolveVehicleSummary: (actor, id) =>
      resolveEntitySummary(createDefaultVehicleService, actor, id, (vehicle) => ({
        id: vehicle.id,
        plate: vehicle.plate,
        model: vehicle.model,
      })),
    resolveTeamSummary: (actor, id) =>
      resolveEntitySummary(createDefaultTeamService, actor, id, (team) => ({
        id: team.id,
        name: team.name,
      })),
    resolveServiceCatalogSummary: (actor, id) =>
      resolveEntitySummary(createDefaultServiceCatalogService, actor, id, (service) => ({
        id: service.id,
        name: service.name,
        basePrice: service.basePrice ?? null,
      })),
  };
}

/**
 * Runs a resolver only when the OS actually carries the FK, so a work order with
 * no link short-circuits to null without a lookup.
 */
async function resolveSummary<T>(
  resolver: ((actor: WorkOrderActorContext, id: string) => Promise<T | null>) | undefined,
  actor: WorkOrderActorContext,
  id: string | undefined,
): Promise<T | null> {
  if (!id || !resolver) return null;

  return resolver(actor, id);
}

/**
 * Loads an entity via its tenant-scoped default service and projects it to a
 * small summary. A missing/cross-tenant id (get() throws not_found) yields null,
 * so unresolvable links never leak data and never fail the detail request.
 */
async function resolveEntitySummary<Entity, Summary>(
  createService: () => Promise<{ get(actor: WorkOrderActorContext, id: string): Promise<Entity> }>,
  actor: WorkOrderActorContext,
  id: string,
  project: (entity: Entity) => Summary,
): Promise<Summary | null> {
  try {
    const service = await createService();
    const entity = await service.get(actor, id);

    return project(entity);
  } catch {
    return null;
  }
}

type ReferenceLookupService = {
  get(actor: WorkOrderActorContext, id: string): Promise<unknown>;
};

async function referenceExists(
  createService: () => Promise<ReferenceLookupService>,
  actor: WorkOrderActorContext,
  id: string,
): Promise<boolean> {
  try {
    const service = await createService();
    await service.get(actor, id);

    return true;
  } catch {
    return false;
  }
}

export function getMemoryWorkOrderRepositoryForTests(): InMemoryWorkOrderRepository {
  return memoryRepository;
}

export async function createDefaultWorkOrderService(): Promise<WorkOrderService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryWorkOrderService();
  }

  defaultServicePromise ??= createPrismaWorkOrderService();

  return defaultServicePromise;
}

export function resetWorkOrderRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaWorkOrderService(): Promise<WorkOrderService> {
  const { createPrismaWorkOrderRepository } = await import("./work-order-prisma.repository.js");
  const repository = await createPrismaWorkOrderRepository();

  return new WorkOrderService(repository, createDefaultReferenceResolvers());
}

function defaultStatusMessage(status: WorkOrderStatus): string {
  const labels: Record<WorkOrderStatus, string> = {
    open: "Ordem de servico aberta.",
    assigned: "Ordem de servico atribuida.",
    accepted: "Ordem de servico aceita.",
    on_route: "Operador em deslocamento.",
    on_site: "Operador chegou ao local.",
    in_progress: "Atendimento iniciado.",
    paused: "Atendimento pausado.",
    completed: "Ordem de servico concluida.",
    cancelled: "Ordem de servico cancelada.",
    rejected: "Ordem de servico recusada.",
  };

  return labels[status];
}

function statusEventType(status: WorkOrderStatus) {
  if (status === "cancelled") return "work_order_cancelled" as const;
  if (status === "completed") return "work_order_completed" as const;
  return "work_order_status_changed" as const;
}
