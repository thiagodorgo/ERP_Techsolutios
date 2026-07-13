import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptOperatorProfileResponse, adaptOperatorProfilesResponse } from "./operator-profiles.adapter";
import type {
  OperatorProfileCreatePayload,
  OperatorProfileItem,
  OperatorProfileUpdatePayload,
  OperatorProfilesApiContext,
  OperatorProfilesData,
  OperatorProfilesFilters,
} from "./operator-profiles.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

// D-007: nunca fabricar linhas. Modo mock → dataset vazio (mock honesto); erro real → fallback vazio.
export async function listOperatorProfilesFromApi(
  context: OperatorProfilesApiContext,
  params: Partial<OperatorProfilesFilters> = {},
): Promise<OperatorProfilesData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/operator-profiles${buildQuery(params)}`, context);
    return adaptOperatorProfilesResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar os Profissionais.",
    };
  }
}

export async function getOperatorProfile(context: OperatorProfilesApiContext, profileId: string): Promise<OperatorProfileItem | null> {
  const response = await apiRequest<unknown>(`/operator-profiles/${profileId}`, context);
  return adaptOperatorProfileResponse(response);
}

export async function createOperatorProfile(
  context: OperatorProfilesApiContext,
  payload: OperatorProfileCreatePayload,
): Promise<OperatorProfileItem | null> {
  const response = await apiRequest<unknown>("/operator-profiles", {
    ...context,
    method: "POST",
    body: payload,
  });
  return adaptOperatorProfileResponse(response);
}

export async function updateOperatorProfile(
  context: OperatorProfilesApiContext,
  profileId: string,
  patch: OperatorProfileUpdatePayload,
): Promise<OperatorProfileItem | null> {
  const response = await apiRequest<unknown>(`/operator-profiles/${profileId}`, {
    ...context,
    method: "PATCH",
    body: patch,
  });
  return adaptOperatorProfileResponse(response);
}

function buildQuery(params: Partial<OperatorProfilesFilters>): string {
  const query = new URLSearchParams();
  const search = params.search?.trim();
  if (search) query.set("search", search);
  if (params.isActive === "active") query.set("is_active", "true");
  if (params.isActive === "inactive") query.set("is_active", "false");
  if (params.hasConsent === "with") query.set("has_consent", "true");
  if (params.hasConsent === "without") query.set("has_consent", "false");
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  return query.size ? `?${query.toString()}` : "";
}
