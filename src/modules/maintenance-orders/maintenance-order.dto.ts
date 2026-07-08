import type { ListMaintenanceOrdersResult, MaintenanceOrder } from "./maintenance-order.types.js";

export function toMaintenanceOrderDto(order: MaintenanceOrder) {
  return {
    id: order.id,
    vehicleId: order.vehicleId,
    type: order.type,
    status: order.status,
    scheduledFor: order.scheduledFor ? order.scheduledFor.toISOString() : null,
    completedAt: order.completedAt ? order.completedAt.toISOString() : null,
    cost: order.cost ?? null,
    supplier: order.supplier ?? null,
    odometer: order.odometer ?? null,
    description: order.description,
    isActive: order.isActive,
    createdBy: order.createdBy ?? null,
    updatedBy: order.updatedBy ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function toMaintenanceOrderListDto(result: ListMaintenanceOrdersResult) {
  return {
    items: result.items.map((order) => ({
      id: order.id,
      vehicleId: order.vehicleId,
      type: order.type,
      status: order.status,
      scheduledFor: order.scheduledFor ? order.scheduledFor.toISOString() : null,
      completedAt: order.completedAt ? order.completedAt.toISOString() : null,
      cost: order.cost ?? null,
      supplier: order.supplier ?? null,
      odometer: order.odometer ?? null,
      description: order.description,
      isActive: order.isActive,
      createdAt: order.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}
