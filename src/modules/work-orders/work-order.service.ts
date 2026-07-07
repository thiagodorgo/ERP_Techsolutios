import { env } from "../../config/env.js";
import { publishDomainEvent } from "../../infra/events/domain-event.publisher.js";
import { createDefaultCustomerService } from "../customers/customer.service.js";
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
  WorkOrderEvent,
  WorkOrderStatus,
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
    const input: AssignWorkOrderInput = {
      tenantId: actor.tenantId,
      workOrderId: current.id,
      operatorId: parseRequiredUuid(body.operatorId ?? body.userId, "operatorId"),
      userId: parseOptionalUuid(body.userId, "userId"),
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
  };
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
