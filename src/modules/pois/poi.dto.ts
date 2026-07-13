import type { Poi, ListPoiResult } from "./poi.types.js";

export function toPoiDto(poi: Poi) {
  return {
    id: poi.id,
    name: poi.name,
    category: poi.category ?? null,
    latitude: poi.latitude,
    longitude: poi.longitude,
    address: poi.address ?? null,
    isActive: poi.isActive,
    createdBy: poi.createdBy ?? null,
    updatedBy: poi.updatedBy ?? null,
    createdAt: poi.createdAt.toISOString(),
    updatedAt: poi.updatedAt.toISOString(),
  };
}

export function toPoiListDto(result: ListPoiResult) {
  return {
    items: result.items.map((poi) => ({
      id: poi.id,
      name: poi.name,
      category: poi.category ?? null,
      latitude: poi.latitude,
      longitude: poi.longitude,
      // Veto junta Ω2-d (lição B1): a coluna "Endereço" e a busca por endereço da tela consomem este campo —
      // sem ele a coluna ficava morta ("—") mesmo com endereço gravado.
      address: poi.address ?? null,
      isActive: poi.isActive,
      createdAt: poi.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}
