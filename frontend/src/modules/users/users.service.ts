import { isMockMode } from "../../config/env";
import { apiRequest } from "../../services/api/client";
import { adaptUserResponse, adaptUsersResponse } from "./users.adapter";
import type { User, UserCreatePayload, UserUpdatePayload, UsersApiContext, UsersData, UsersFilters } from "./users.types";

const EMPTY_PAGINATION = { limit: 20, offset: 0, total: 0 } as const;

// D-007: nunca fabricar linhas. Modo mock → dataset vazio; erro real → fallback vazio.
export async function listUsersFromApi(context: UsersApiContext, params: Partial<UsersFilters> = {}): Promise<UsersData> {
  if (isMockMode()) {
    return { items: [], pagination: { ...EMPTY_PAGINATION }, source: "mock" };
  }

  try {
    const response = await apiRequest<unknown>(`/users${buildQuery(params)}`, context);
    return adaptUsersResponse(response, "api");
  } catch {
    return {
      items: [],
      pagination: { ...EMPTY_PAGINATION },
      source: "fallback",
      fallbackReason: "Não foi possível consultar os usuários.",
    };
  }
}

// POST /users (perm users.manage) → 201.
export async function createUser(context: UsersApiContext, payload: UserCreatePayload): Promise<User | null> {
  const response = await apiRequest<unknown>("/users", {
    ...context,
    method: "POST",
    body: payload,
  });
  return adaptUserResponse(response);
}

// PATCH /users/:id (perm users.manage) → edição de nome/papéis e ativação/desativação lógica.
export async function updateUser(context: UsersApiContext, id: string, patch: UserUpdatePayload): Promise<User | null> {
  const response = await apiRequest<unknown>(`/users/${id}`, {
    ...context,
    method: "PATCH",
    body: patch,
  });
  return adaptUserResponse(response);
}

function buildQuery(params: Partial<UsersFilters>): string {
  const query = new URLSearchParams();
  const search = params.search?.trim();
  if (search) query.set("search", search);
  if (params.limit && Number.isFinite(params.limit)) query.set("limit", String(params.limit));
  return query.size ? `?${query.toString()}` : "";
}
