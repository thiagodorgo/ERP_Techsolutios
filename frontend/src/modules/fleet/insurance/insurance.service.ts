import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptInsurancePoliciesResponse, adaptInsurancePolicyResponse } from "./insurance.adapter";
import type {
  InsuranceApiContext,
  InsuranceData,
  InsuranceFilters,
  InsurancePolicy,
  InsurancePolicyCreatePayload,
  InsurancePolicyUpdatePayload,
} from "./insurance.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

// D-007: nunca fabricar linhas. Modo mock → dataset vazio; erro real → fallback vazio.
export async function listInsurancePoliciesFromApi(context: InsuranceApiContext, params: Partial<InsuranceFilters> = {}): Promise<InsuranceData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/insurance-policies${buildQuery(params)}`, context);
    return adaptInsurancePoliciesResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar as apólices de seguro.",
    };
  }
}

export async function getInsurancePolicy(context: InsuranceApiContext, id: string): Promise<InsurancePolicy | null> {
  const response = await apiRequest<unknown>(`/insurance-policies/${id}`, context);
  return adaptInsurancePolicyResponse(response);
}

export async function createInsurancePolicy(context: InsuranceApiContext, payload: InsurancePolicyCreatePayload): Promise<InsurancePolicy | null> {
  const response = await apiRequest<unknown>("/insurance-policies", {
    ...context,
    method: "POST",
    body: payload,
  });
  return adaptInsurancePolicyResponse(response);
}

// Único PATCH do módulo: edição de campos, transição de situação (vigente↔cancelada) e desativação lógica.
export async function updateInsurancePolicy(context: InsuranceApiContext, id: string, patch: InsurancePolicyUpdatePayload): Promise<InsurancePolicy | null> {
  const response = await apiRequest<unknown>(`/insurance-policies/${id}`, {
    ...context,
    method: "PATCH",
    body: patch,
  });
  return adaptInsurancePolicyResponse(response);
}

function buildQuery(params: Partial<InsuranceFilters>): string {
  const query = new URLSearchParams();
  const search = params.search?.trim();
  if (search) query.set("search", search);
  if (params.vehicleId?.trim()) query.set("vehicle_id", params.vehicleId.trim());
  if (params.status) query.set("status", params.status);
  if (params.expiringWithinDays && Number.isFinite(params.expiringWithinDays)) query.set("expiring_within_days", String(params.expiringWithinDays));
  if (params.isActive === "active") query.set("is_active", "true");
  if (params.isActive === "inactive") query.set("is_active", "false");
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  if (params.offset && Number.isFinite(params.offset)) query.set("offset", String(params.offset));
  return query.size ? `?${query.toString()}` : "";
}
