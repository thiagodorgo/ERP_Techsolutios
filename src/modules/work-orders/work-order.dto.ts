import type { ListWorkOrdersResult, WorkOrder, WorkOrderEvent, WorkOrderLinks } from "./work-order.types.js";

/**
 * Serializes a work order. On the single-detail path (`GET /:id`) the caller
 * passes the resolved cadastro summaries, which are exposed under `links`. Every
 * other path (list, create, update, status, assign, mobile sync) omits the
 * argument, so the response keeps its pre-C2 shape with no `links` key.
 */
export function toWorkOrderDto(workOrder: WorkOrder, links?: WorkOrderLinks) {
  return {
    id: workOrder.id,
    code: workOrder.code,
    title: workOrder.title,
    description: workOrder.description,
    customerName: workOrder.customerName,
    customerDocument: workOrder.customerDocument,
    customerPhone: workOrder.customerPhone,
    serviceAddress: workOrder.serviceAddress,
    serviceCity: workOrder.serviceCity,
    serviceState: workOrder.serviceState,
    serviceZipCode: workOrder.serviceZipCode,
    serviceLatitude: workOrder.serviceLatitude,
    serviceLongitude: workOrder.serviceLongitude,
    priority: workOrder.priority,
    status: workOrder.status,
    assignedOperatorId: workOrder.assignedOperatorId,
    assignedUserId: workOrder.assignedUserId,
    checklistId: workOrder.checklistId,
    customerId: workOrder.customerId ?? null,
    vehicleId: workOrder.vehicleId ?? null,
    teamId: workOrder.teamId ?? null,
    serviceCatalogId: workOrder.serviceCatalogId ?? null,
    scheduledFor: workOrder.scheduledFor?.toISOString() ?? null,
    startedAt: workOrder.startedAt?.toISOString() ?? null,
    arrivedAt: workOrder.arrivedAt?.toISOString() ?? null,
    completedAt: workOrder.completedAt?.toISOString() ?? null,
    cancelledAt: workOrder.cancelledAt?.toISOString() ?? null,
    cancellationReason: workOrder.cancellationReason,
    createdBy: workOrder.createdBy,
    updatedBy: workOrder.updatedBy,
    createdAt: workOrder.createdAt.toISOString(),
    updatedAt: workOrder.updatedAt.toISOString(),
    ...(links === undefined ? {} : { links }),
  };
}

export function toWorkOrderListDto(result: ListWorkOrdersResult) {
  return {
    items: result.items.map((workOrder) => ({
      id: workOrder.id,
      code: workOrder.code,
      title: workOrder.title,
      status: workOrder.status,
      priority: workOrder.priority,
      customerName: workOrder.customerName,
      serviceAddress: workOrder.serviceAddress,
      assignedOperatorId: workOrder.assignedOperatorId ?? null,
      assignedUserId: workOrder.assignedUserId ?? null,
      // F6 (Mapa real): badges de manutencao/seguro no pin precisam da viatura da OS
      vehicleId: workOrder.vehicleId ?? null,
      scheduledFor: workOrder.scheduledFor?.toISOString() ?? null,
      createdAt: workOrder.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}

export function toWorkOrderEventDto(event: WorkOrderEvent) {
  return {
    id: event.id,
    workOrderId: event.workOrderId,
    eventType: event.eventType,
    fromStatus: event.fromStatus,
    toStatus: event.toStatus,
    actorUserId: event.actorUserId,
    message: event.message,
    metadata: event.metadata,
    createdAt: event.createdAt.toISOString(),
  };
}
