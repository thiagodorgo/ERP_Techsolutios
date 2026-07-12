import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptBranchResponse, adaptBranchesResponse } from "./branches.adapter";
import type {
  BranchCreatePayload,
  BranchItem,
  BranchUpdatePayload,
  BranchesApiContext,
  BranchesData,
  BranchesFilters,
} from "./branches.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

// D-007: nunca fabricar linhas. Modo mock → dataset vazio (mock honesto); erro real → fallback vazio.
export async function listBranchesFromApi(context: BranchesApiContext, params: Partial<BranchesFilters> = {}): Promise<BranchesData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/branches${buildQuery(params)}`, context);
    return adaptBranchesResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar as Filiais.",
    };
  }
}

export async function getBranch(context: BranchesApiContext, id: string): Promise<BranchItem | null> {
  const response = await apiRequest<unknown>(`/branches/${id}`, context);
  return adaptBranchResponse(response);
}

export async function createBranch(context: BranchesApiContext, payload: BranchCreatePayload): Promise<BranchItem | null> {
  const response = await apiRequest<unknown>("/branches", {
    ...context,
    method: "POST",
    body: payload,
  });
  return adaptBranchResponse(response);
}

export async function updateBranch(context: BranchesApiContext, id: string, patch: BranchUpdatePayload): Promise<BranchItem | null> {
  const response = await apiRequest<unknown>(`/branches/${id}`, {
    ...context,
    method: "PATCH",
    body: patch,
  });
  return adaptBranchResponse(response);
}

// Filiais NÃO têm `is_active` — o filtro server-side é o query param `status` (enum).
function buildQuery(params: Partial<BranchesFilters>): string {
  const query = new URLSearchParams();
  const search = params.search?.trim();
  if (search) query.set("search", search);
  if (params.isActive === "active") query.set("status", "active");
  if (params.isActive === "inactive") query.set("status", "inactive");
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  return query.size ? `?${query.toString()}` : "";
}
