import type { Customer, ListCustomersResult } from "./customer.types.js";

export function toCustomerDto(customer: Customer) {
  return {
    id: customer.id,
    name: customer.name,
    document: customer.document ?? null,
    phone: customer.phone ?? null,
    email: customer.email ?? null,
    address: customer.address ?? null,
    city: customer.city ?? null,
    state: customer.state ?? null,
    zipCode: customer.zipCode ?? null,
    isActive: customer.isActive,
    notes: customer.notes ?? null,
    createdBy: customer.createdBy ?? null,
    updatedBy: customer.updatedBy ?? null,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}

export function toCustomerListDto(result: ListCustomersResult) {
  return {
    items: result.items.map((customer) => ({
      id: customer.id,
      name: customer.name,
      document: customer.document ?? null,
      phone: customer.phone ?? null,
      email: customer.email ?? null,
      city: customer.city ?? null,
      state: customer.state ?? null,
      isActive: customer.isActive,
      createdAt: customer.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}
