import type { Vehicle, ListVehiclesResult } from "./vehicle.types.js";

export function toVehicleDto(vehicle: Vehicle) {
  return {
    id: vehicle.id,
    plate: vehicle.plate,
    model: vehicle.model,
    type: vehicle.type ?? null,
    year: vehicle.year ?? null,
    status: vehicle.status,
    notes: vehicle.notes ?? null,
    isActive: vehicle.isActive,
    createdBy: vehicle.createdBy ?? null,
    updatedBy: vehicle.updatedBy ?? null,
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
  };
}

export function toVehicleListDto(result: ListVehiclesResult) {
  return {
    items: result.items.map((vehicle) => ({
      id: vehicle.id,
      plate: vehicle.plate,
      model: vehicle.model,
      type: vehicle.type ?? null,
      year: vehicle.year ?? null,
      status: vehicle.status,
      isActive: vehicle.isActive,
      createdAt: vehicle.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}
