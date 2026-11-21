import { isMockMode } from "../../config/env";
import { apiRequest } from "../../services/api/client";
import { adaptCreatedUserResponse, adaptPasswordResetResponse, adaptUserResponse, adaptUsersResponse } from "./users.adapter";
import type {
  CreatedUserResult,
  PasswordResetResult,
  User,
  UserAccessGrantPayload,
  UserCreatePayload,
  UserUpdatePayload,
  UsersApiContext,
  UsersData,
  UsersFilters,
} from "./users.types";

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

// POST /users (perm users.manage) → 201 com a senha provisória UMA vez (`temporaryPassword`). O 409 `email_in_group`
// (B-APP-ORG-2S) sobe como ApiError com o `reason`; a tela oferece dar acesso ao login que já existe.
export async function createUser(context: UsersApiContext, payload: UserCreatePayload): Promise<CreatedUserResult> {
  const response = await apiRequest<unknown>("/users", {
    ...context,
    method: "POST",
    body: payload,
  });
  return adaptCreatedUserResponse(response);
}

// B-APP-ORG-2S (S3) — POST /users/access-grants (perm users.manage, plano 1.8 §3.1): liga a ESTE pátio o login que já
// existe em outro pátio do grupo. Corpo só `{ email, name }`: o perfil é fixo no servidor e a organização vem do ator.
export async function grantUserAccess(context: UsersApiContext, payload: UserAccessGrantPayload): Promise<User | null> {
  const response = await apiRequest<unknown>("/users/access-grants", {
    ...context,
    method: "POST",
    body: { email: payload.email, name: payload.name },
  });
  return adaptUserResponse(response);
}

// B-APP-ORG-2S (S3) — POST /auth/users/:userId/reset-password (perm users.manage, plano 1.8.3 §2.3). Corpo VAZIO: a
// provisória é gerada pelo servidor e vem só nesta resposta. Resposta sem provisória → erro (falha fechada).
export async function resetUserPassword(context: UsersApiContext, userId: string): Promise<PasswordResetResult> {
  const response = await apiRequest<unknown>(`/auth/users/${encodeURIComponent(userId)}/reset-password`, {
    ...context,
    method: "POST",
  });
  const result = adaptPasswordResetResponse(response);
  if (!result) throw new Error("reset_without_temporary_password");
  return result;
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
