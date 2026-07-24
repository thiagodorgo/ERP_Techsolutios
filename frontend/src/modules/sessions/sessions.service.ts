import { isMockMode } from "../../config/env";
import { ApiError, apiRequest } from "../../services/api/client";
import { adaptAccesses, adaptSessions } from "./sessions.adapter";
import type { AccessData, SessionsApiContext, SessionsData } from "./sessions.types";
import { emptyAccesses, emptySessions } from "./sessions.types";

// Ω4C PR-11 — services frontend do admin de sessões. Gates backend: GET /sessions (sessions:read),
// GET /sessions/access-history (audit.read), POST /sessions/:id/revoke (sessions:revoke). D-007: modo mock
// → lista VAZIA honesta; 403 → estado "acesso não permitido"; erro real (5xx/rede) → fallback vazio. O front
// nunca inventa sessão nem acesso.

// Sessões ativas (revoked_at IS NULL AND expires_at > now, tenant-scoped no backend).
export async function getActiveSessions(context: SessionsApiContext): Promise<SessionsData> {
  if (isMockMode()) return emptySessions("mock");

  try {
    const payload = await apiRequest<{ data: unknown }>("/sessions", context);
    return { sessions: adaptSessions(payload.data), source: "api" };
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return emptySessions("forbidden");
    }
    return emptySessions("fallback");
  }
}

// Acessos: último login por usuário derivado de auth_sessions.created_at (D-Ω4C-ACESSO-SOURCE).
export async function getAccessHistory(context: SessionsApiContext): Promise<AccessData> {
  if (isMockMode()) return emptyAccesses("mock");

  try {
    const payload = await apiRequest<{ data: unknown }>("/sessions/access-history", context);
    return { accesses: adaptAccesses(payload.data), source: "api" };
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return emptyAccesses("forbidden");
    }
    return emptyAccesses("fallback");
  }
}

// Revogação administrativa por id (sem o token da vítima). Idempotente no backend (200 revoked:true; id
// inexistente / de outro tenant → 404). Marca revoked_at REALMENTE — o próximo refresh da vítima FALHA.
export async function revokeSession(context: SessionsApiContext, sessionId: string): Promise<{ readonly revoked: boolean }> {
  const payload = await apiRequest<{ data: { revoked: boolean } }>(`/sessions/${sessionId}/revoke`, {
    ...context,
    method: "POST",
  });
  return payload.data;
}
