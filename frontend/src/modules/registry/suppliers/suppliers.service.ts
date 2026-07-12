import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptSupplierResponse, adaptSuppliersResponse } from "./suppliers.adapter";
import type {
  SupplierCreatePayload,
  SupplierItem,
  SupplierUpdatePayload,
  SuppliersApiContext,
  SuppliersData,
  SuppliersFilters,
} from "./suppliers.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

// D-007: nunca fabricar linhas. Modo mock → dataset vazio (mock honesto); erro real → fallback vazio.
export async function listSuppliersFromApi(context: SuppliersApiContext, params: Partial<SuppliersFilters> = {}): Promise<SuppliersData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/suppliers${buildQuery(params)}`, context);
    return adaptSuppliersResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar os Fornecedores.",
    };
  }
}

export async function getSupplier(context: SuppliersApiContext, id: string): Promise<SupplierItem | null> {
  const response = await apiRequest<unknown>(`/suppliers/${id}`, context);
  return adaptSupplierResponse(response);
}

export async function createSupplier(context: SuppliersApiContext, payload: SupplierCreatePayload): Promise<SupplierItem | null> {
  const response = await apiRequest<unknown>("/suppliers", {
    ...context,
    method: "POST",
    body: payload,
  });
  return adaptSupplierResponse(response);
}

export async function updateSupplier(context: SuppliersApiContext, id: string, patch: SupplierUpdatePayload): Promise<SupplierItem | null> {
  const response = await apiRequest<unknown>(`/suppliers/${id}`, {
    ...context,
    method: "PATCH",
    body: patch,
  });
  return adaptSupplierResponse(response);
}

function buildQuery(params: Partial<SuppliersFilters>): string {
  const query = new URLSearchParams();
  const search = params.search?.trim();
  if (search) query.set("search", search);
  if (params.isActive === "active") query.set("is_active", "true");
  if (params.isActive === "inactive") query.set("is_active", "false");
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  return query.size ? `?${query.toString()}` : "";
}
