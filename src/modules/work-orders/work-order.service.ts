import { env } from "../../config/env.js";
import { publishDomainEvent } from "../../infra/events/domain-event.publisher.js";
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

export class WorkOrderService {
  constructor(private readonly repository: WorkOrderRepository) {}

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
    const code = await this.repository.nextCode(actor.tenantId);
    const workOrder = await this.repository.create({
      tenantId: actor.tenantId,
      code,
      title: assertNonEmptyString(body.title, "title"),
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
      priority: parseWorkOrderPriority(body.priority),
      checklistId: parseOptionalUuid(body.checklistId, "checklistId"),
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
  return new WorkOrderService(memoryRepository);
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

  return new WorkOrderService(repository);
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
