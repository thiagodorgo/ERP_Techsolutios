import type { FieldDispatch, FieldDispatchEvent, ListFieldDispatchesResult } from "./field-dispatch.types.js";

export function toFieldDispatchDto(dispatch: FieldDispatch) {
  return {
    id: dispatch.id,
    workOrderId: dispatch.workOrderId,
    operatorUserId: dispatch.operatorUserId,
    status: dispatch.status,
    observation: dispatch.observation,
    reason: dispatch.reason,
    acceptedAt: dispatch.acceptedAt?.toISOString() ?? null,
    onRouteAt: dispatch.onRouteAt?.toISOString() ?? null,
    arrivedAt: dispatch.arrivedAt?.toISOString() ?? null,
    inServiceAt: dispatch.inServiceAt?.toISOString() ?? null,
    completedAt: dispatch.completedAt?.toISOString() ?? null,
    cancelledAt: dispatch.cancelledAt?.toISOString() ?? null,
    failedAt: dispatch.failedAt?.toISOString() ?? null,
    createdBy: dispatch.createdBy,
    updatedBy: dispatch.updatedBy,
    createdAt: dispatch.createdAt.toISOString(),
    updatedAt: dispatch.updatedAt.toISOString(),
  };
}

export function toFieldDispatchListDto(result: ListFieldDispatchesResult) {
  return {
    items: result.items.map((dispatch) => ({
      id: dispatch.id,
      workOrderId: dispatch.workOrderId,
      operatorUserId: dispatch.operatorUserId,
      status: dispatch.status,
      observation: dispatch.observation ?? null,
      reason: dispatch.reason ?? null,
      createdAt: dispatch.createdAt.toISOString(),
      updatedAt: dispatch.updatedAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}

export function toFieldDispatchEventDto(event: FieldDispatchEvent) {
  return {
    id: event.id,
    dispatchId: event.dispatchId,
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

export function toFieldDispatchDetailDto(dispatch: FieldDispatch, timeline: readonly FieldDispatchEvent[]) {
  return {
    ...toFieldDispatchDto(dispatch),
    timeline: timeline.map(toFieldDispatchEventDto),
  };
}
