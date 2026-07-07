import { isMockMode } from "../../../config/env";
import { apiData, apiRequest } from "../../../services/api/client";
import { adaptTeamResponse, adaptTeamsResponse, adaptTenantUsersResponse } from "./teams.adapter";
import type {
  Team,
  TeamCreatePayload,
  TeamMemberPayload,
  TeamUpdatePayload,
  TeamsApiContext,
  TeamsData,
  TeamsFilters,
  TenantUser,
} from "./teams.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

// D-007: nunca fabricar linhas. Modo mock → dataset vazio; erro real → fallback vazio.
export async function listTeamsFromApi(context: TeamsApiContext, params: Partial<TeamsFilters> = {}): Promise<TeamsData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/teams${buildQuery(params)}`, context);
    return adaptTeamsResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar a API de Equipes.",
    };
  }
}

export async function getTeam(context: TeamsApiContext, id: string): Promise<Team | null> {
  const response = await apiRequest<unknown>(`/teams/${id}`, context);
  return adaptTeamResponse(response);
}

export async function createTeam(context: TeamsApiContext, payload: TeamCreatePayload): Promise<Team | null> {
  const response = await apiRequest<unknown>("/teams", {
    ...context,
    method: "POST",
    body: payload,
  });
  return adaptTeamResponse(response);
}

export async function updateTeam(context: TeamsApiContext, id: string, patch: TeamUpdatePayload): Promise<Team | null> {
  const response = await apiRequest<unknown>(`/teams/${id}`, {
    ...context,
    method: "PATCH",
    body: patch,
  });
  return adaptTeamResponse(response);
}

export async function addTeamMember(context: TeamsApiContext, teamId: string, payload: TeamMemberPayload): Promise<void> {
  await apiRequest<unknown>(`/teams/${teamId}/members`, {
    ...context,
    method: "POST",
    body: payload,
  });
}

export async function removeTeamMember(context: TeamsApiContext, teamId: string, userId: string): Promise<void> {
  await apiRequest<void>(`/teams/${teamId}/members/${userId}`, {
    ...context,
    method: "DELETE",
  });
}

// Popula os seletores de líder/membros com usuários reais da organização.
// D-007: nunca fabricar usuários. Modo mock → vazio; erro real → vazio (degrada com aviso na UI).
export async function listTenantUsers(context: TeamsApiContext): Promise<TenantUser[]> {
  if (isMockMode()) return [];

  try {
    const response = await apiData<unknown>("/users", context);
    return adaptTenantUsersResponse(response);
  } catch {
    return [];
  }
}

function buildQuery(params: Partial<TeamsFilters>): string {
  const query = new URLSearchParams();
  const search = params.search?.trim();
  if (search) query.set("search", search);
  if (params.isActive === "active") query.set("is_active", "true");
  if (params.isActive === "inactive") query.set("is_active", "false");
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  return query.size ? `?${query.toString()}` : "";
}
