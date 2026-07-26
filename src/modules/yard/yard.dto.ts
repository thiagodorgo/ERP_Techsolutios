import type {
  ListYardResult,
  SpotStatus,
  VehicleClass,
  Yard,
  YardArea,
  YardAreaKind,
  YardSpot,
} from "./yard.types.js";

// Labels PT-BR (neutralidade white-label: "pátio/área/vaga", nunca termo de público-alvo).
const KIND_LABELS: Record<YardAreaKind, string> = {
  BLOCK: "Quadra",
  CORRIDOR: "Corredor",
  ROW: "Fileira",
};

const VEHICLE_CLASS_LABELS: Record<VehicleClass, string> = {
  ANY: "Qualquer veículo",
  MOTORCYCLE: "Motocicleta",
  HEAVY: "Pesado",
};

const SPOT_STATUS_LABELS: Record<SpotStatus, string> = {
  FREE: "Livre",
  OCCUPIED: "Ocupada",
  BLOCKED: "Bloqueada",
};

// §allowlist: tenant_id NUNCA é exposto (resolvido pelo ator autenticado).
export function toYardDto(yard: Yard) {
  return {
    id: yard.id,
    branchId: yard.branchId ?? null,
    name: yard.name,
    address: yard.address,
    capacityHint: yard.capacityHint ?? null,
    timezone: yard.timezone,
    active: yard.active,
    createdBy: yard.createdBy ?? null,
    updatedBy: yard.updatedBy ?? null,
    createdAt: yard.createdAt.toISOString(),
    updatedAt: yard.updatedAt.toISOString(),
  };
}

export function toYardListDto(result: ListYardResult) {
  return {
    items: result.items.map((yard) => ({
      id: yard.id,
      branchId: yard.branchId ?? null,
      name: yard.name,
      address: yard.address,
      capacityHint: yard.capacityHint ?? null,
      timezone: yard.timezone,
      active: yard.active,
      createdAt: yard.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}

export function toYardAreaDto(area: YardArea) {
  return {
    id: area.id,
    yardId: area.yardId,
    parentId: area.parentId ?? null,
    kind: area.kind,
    kindLabel: KIND_LABELS[area.kind],
    name: area.name,
    covered: area.covered,
    vehicleClass: area.vehicleClass,
    vehicleClassLabel: VEHICLE_CLASS_LABELS[area.vehicleClass],
    createdBy: area.createdBy ?? null,
    updatedBy: area.updatedBy ?? null,
    createdAt: area.createdAt.toISOString(),
    updatedAt: area.updatedAt.toISOString(),
  };
}

export function toYardAreaListDto(areas: readonly YardArea[]) {
  return { items: areas.map(toYardAreaDto) };
}

export function toYardSpotDto(spot: YardSpot) {
  return {
    id: spot.id,
    areaId: spot.areaId,
    code: spot.code,
    covered: spot.covered,
    vehicleClass: spot.vehicleClass,
    vehicleClassLabel: VEHICLE_CLASS_LABELS[spot.vehicleClass],
    status: spot.status,
    statusLabel: SPOT_STATUS_LABELS[spot.status],
    currentProcessId: spot.currentProcessId ?? null,
    createdBy: spot.createdBy ?? null,
    updatedBy: spot.updatedBy ?? null,
    createdAt: spot.createdAt.toISOString(),
    updatedAt: spot.updatedAt.toISOString(),
  };
}

export function toYardSpotListDto(spots: readonly YardSpot[]) {
  return { items: spots.map(toYardSpotDto) };
}

// Mapa de ocupação por status (vagas livres/ocupadas/bloqueadas por pátio) — read-only.
export function toYardOccupancyDto(yardId: string, spots: readonly YardSpot[]) {
  const summary = { total: spots.length, free: 0, occupied: 0, blocked: 0 };
  for (const spot of spots) {
    if (spot.status === "FREE") summary.free += 1;
    else if (spot.status === "OCCUPIED") summary.occupied += 1;
    else summary.blocked += 1;
  }
  return {
    yardId,
    summary,
    items: spots.map(toYardSpotDto),
  };
}
