import type { Supplier, ListSupplierResult } from "./supplier.types.js";

export function toSupplierDto(supplier: Supplier) {
  return {
    id: supplier.id,
    name: supplier.name,
    document: supplier.document ?? null,
    email: supplier.email ?? null,
    phone: supplier.phone ?? null,
    address: supplier.address ?? null,
    category: supplier.category ?? null,
    notes: supplier.notes ?? null,
    status: supplier.status,
    isActive: supplier.isActive,
    createdBy: supplier.createdBy ?? null,
    updatedBy: supplier.updatedBy ?? null,
    createdAt: supplier.createdAt.toISOString(),
    updatedAt: supplier.updatedAt.toISOString(),
  };
}

export function toSupplierListDto(result: ListSupplierResult) {
  return {
    items: result.items.map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      document: supplier.document ?? null,
      email: supplier.email ?? null,
      phone: supplier.phone ?? null,
      category: supplier.category ?? null,
      status: supplier.status,
      isActive: supplier.isActive,
      createdAt: supplier.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}
