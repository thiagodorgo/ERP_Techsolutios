import type { ServiceCatalog, ListServiceCatalogResult } from "./service-catalog.types.js";

export function toServiceCatalogDto(service: ServiceCatalog) {
  return {
    id: service.id,
    name: service.name,
    description: service.description ?? null,
    category: service.category ?? null,
    estimatedDurationMinutes: service.estimatedDurationMinutes ?? null,
    basePrice: service.basePrice ?? null,
    status: service.status,
    isActive: service.isActive,
    createdBy: service.createdBy ?? null,
    updatedBy: service.updatedBy ?? null,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  };
}

export function toServiceCatalogListDto(result: ListServiceCatalogResult) {
  return {
    items: result.items.map((service) => ({
      id: service.id,
      name: service.name,
      category: service.category ?? null,
      estimatedDurationMinutes: service.estimatedDurationMinutes ?? null,
      basePrice: service.basePrice ?? null,
      status: service.status,
      isActive: service.isActive,
      createdAt: service.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}
