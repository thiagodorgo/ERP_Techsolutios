import type { Tariff, ListTariffResult } from "./tariff.types.js";

export function toTariffDto(tariff: Tariff) {
  return {
    id: tariff.id,
    priceTableId: tariff.priceTableId,
    serviceCatalogId: tariff.serviceCatalogId ?? null,
    customerId: tariff.customerId ?? null,
    name: tariff.name ?? null,
    unitPrice: tariff.unitPrice,
    currency: tariff.currency,
    origin: tariff.origin,
    rule: tariff.rule ?? null,
    validFrom: tariff.validFrom?.toISOString() ?? null,
    validTo: tariff.validTo?.toISOString() ?? null,
    status: tariff.status,
    isActive: tariff.isActive,
    createdBy: tariff.createdBy ?? null,
    updatedBy: tariff.updatedBy ?? null,
    createdAt: tariff.createdAt.toISOString(),
    updatedAt: tariff.updatedAt.toISOString(),
  };
}

export function toTariffListDto(result: ListTariffResult) {
  return {
    items: result.items.map((tariff) => ({
      id: tariff.id,
      name: tariff.name ?? null,
      priceTableId: tariff.priceTableId,
      serviceCatalogId: tariff.serviceCatalogId ?? null,
      customerId: tariff.customerId ?? null,
      unitPrice: tariff.unitPrice,
      currency: tariff.currency,
      origin: tariff.origin,
      status: tariff.status,
      isActive: tariff.isActive,
      createdAt: tariff.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}
