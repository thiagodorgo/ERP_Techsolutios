import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptCustomerResponse, adaptCustomersResponse } from "./customers.adapter";
import type {
  Customer,
  CustomerCreatePayload,
  CustomerUpdatePayload,
  CustomersApiContext,
  CustomersData,
  CustomersFilters,
} from "./customers.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

// D-007: nunca fabricar linhas. Modo mock → dataset vazio; erro real → fallback vazio.
export async function listCustomersFromApi(context: CustomersApiContext, params: Partial<CustomersFilters> = {}): Promise<CustomersData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/customers${buildQuery(params)}`, context);
    return adaptCustomersResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar a API de Clientes.",
    };
  }
}

export async function getCustomer(context: CustomersApiContext, id: string): Promise<Customer | null> {
  const response = await apiRequest<unknown>(`/customers/${id}`, context);
  return adaptCustomerResponse(response);
}

export async function createCustomer(context: CustomersApiContext, payload: CustomerCreatePayload): Promise<Customer | null> {
  const response = await apiRequest<unknown>("/customers", {
    ...context,
    method: "POST",
    body: payload,
  });
  return adaptCustomerResponse(response);
}

export async function updateCustomer(context: CustomersApiContext, id: string, patch: CustomerUpdatePayload): Promise<Customer | null> {
  const response = await apiRequest<unknown>(`/customers/${id}`, {
    ...context,
    method: "PATCH",
    body: patch,
  });
  return adaptCustomerResponse(response);
}

function buildQuery(params: Partial<CustomersFilters>): string {
  const query = new URLSearchParams();
  const search = params.search?.trim();
  if (search) query.set("search", search);
  if (params.isActive === "active") query.set("is_active", "true");
  if (params.isActive === "inactive") query.set("is_active", "false");
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  return query.size ? `?${query.toString()}` : "";
}
