import type { PriceTable, ListPriceTableResult } from "./price-table.types.js";

export function toPriceTableDto(table: PriceTable) {
  return {
    id: table.id,
    name: table.name,
    description: table.description ?? null,
    currency: table.currency,
    version: table.version,
    validFrom: table.validFrom?.toISOString() ?? null,
    validTo: table.validTo?.toISOString() ?? null,
    status: table.status,
    isActive: table.isActive,
    createdBy: table.createdBy ?? null,
    updatedBy: table.updatedBy ?? null,
    createdAt: table.createdAt.toISOString(),
    updatedAt: table.updatedAt.toISOString(),
  };
}

export function toPriceTableListDto(result: ListPriceTableResult) {
  return {
    items: result.items.map((table) => ({
      id: table.id,
      name: table.name,
      currency: table.currency,
      version: table.version,
      validFrom: table.validFrom?.toISOString() ?? null,
      validTo: table.validTo?.toISOString() ?? null,
      status: table.status,
      isActive: table.isActive,
      createdAt: table.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}
