import type { PriceTable, ListPriceTableResult, TariffScope } from "./price-table.types.js";

// Ω5P PR-03 — labels PT-BR na fronteira do DTO (enum inglês no código; rótulo PT-BR na UI). §allowlist:
// NUNCA expõe tenant_id.
const SCOPE_LABELS: Record<TariffScope, string> = {
  PUBLIC_AGREEMENT: "Convênio público",
  PRIVATE_CONTRACT: "Contrato privado",
};

export function scopeLabel(scope: TariffScope | undefined): string | null {
  return scope ? SCOPE_LABELS[scope] : null;
}

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
    scope: table.scope ?? null,
    scopeLabel: scopeLabel(table.scope),
    vehicleCategory: table.vehicleCategory ?? null,
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
      scope: table.scope ?? null,
      scopeLabel: scopeLabel(table.scope),
      vehicleCategory: table.vehicleCategory ?? null,
      createdAt: table.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}
