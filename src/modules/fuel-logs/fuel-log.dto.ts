import type {
  FuelLogWithEfficiency,
  ListFuelLogsWithEfficiencyResult,
} from "./fuel-log.types.js";

export function toFuelLogDto(entry: FuelLogWithEfficiency) {
  const { fuelLog, kmPerLiter, distanceKm, supplierName } = entry;

  return {
    id: fuelLog.id,
    vehicleId: fuelLog.vehicleId,
    operatorId: fuelLog.operatorId ?? null,
    workOrderId: fuelLog.workOrderId ?? null,
    fueledAt: fuelLog.fueledAt.toISOString(),
    fuelType: fuelLog.fuelType,
    liters: fuelLog.liters,
    totalValue: fuelLog.totalValue,
    odometer: fuelLog.odometer,
    station: fuelLog.station ?? null,
    // Ω4C PR-05 — posto interno/externo + fornecedor (§2.8: nunca tenant_id; supplierName = label).
    stationType: fuelLog.stationType,
    supplierId: fuelLog.supplierId ?? null,
    supplierName: supplierName ?? null,
    notes: fuelLog.notes ?? null,
    // R1.1 — derived, never persisted; null for the vehicle's baseline log.
    kmPerLiter,
    distanceKm,
    isActive: fuelLog.isActive,
    createdBy: fuelLog.createdBy ?? null,
    updatedBy: fuelLog.updatedBy ?? null,
    createdAt: fuelLog.createdAt.toISOString(),
    updatedAt: fuelLog.updatedAt.toISOString(),
  };
}

export function toFuelLogListDto(result: ListFuelLogsWithEfficiencyResult) {
  return {
    items: result.items.map((entry) => ({
      id: entry.fuelLog.id,
      vehicleId: entry.fuelLog.vehicleId,
      fueledAt: entry.fuelLog.fueledAt.toISOString(),
      fuelType: entry.fuelLog.fuelType,
      liters: entry.fuelLog.liters,
      totalValue: entry.fuelLog.totalValue,
      odometer: entry.fuelLog.odometer,
      station: entry.fuelLog.station ?? null,
      stationType: entry.fuelLog.stationType,
      supplierId: entry.fuelLog.supplierId ?? null,
      supplierName: entry.supplierName ?? null,
      kmPerLiter: entry.kmPerLiter,
      distanceKm: entry.distanceKm,
      isActive: entry.fuelLog.isActive,
      createdAt: entry.fuelLog.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}
