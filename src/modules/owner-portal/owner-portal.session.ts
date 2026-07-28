import { verifyOwnerSession, type OwnerSessionClaims } from "../portal-shared/index.js";

// Ω5P PR-17 — SESSÃO como AUTORIZAÇÃO do owner-portal (D-Ω5P-PR17). Consome a JWE emitida no lookup FOUND (PR-16):
// transporte `Authorization: Bearer <jwe>`, secret PRÓPRIO (PORTAL_SESSION_SECRET ≠ JWT do ERP). REGRA CENTRAL:
// o `processId` vem SEMPRE da sessão VERIFICADA — NUNCA do corpo/query. Trocar o id no corpo não lê processo
// alheio (o backend ignora qualquer processId do body). Rejeição UNIFORME (ausente/expirada/forjada/audience-
// errada) → o serviço responde 401 SESSION_INVALID e loga SESSION_INVALID, sem oráculo (nenhuma razão vaza).

// Extrai o token do header Authorization (só o esquema Bearer). Header ausente/mal-formado → undefined (uniforme).
export function readBearerToken(authorization: string | undefined): string | undefined {
  if (typeof authorization !== "string") return undefined;
  const match = /^Bearer[ ]+(.+)$/i.exec(authorization.trim());
  if (!match) return undefined;
  const token = match[1].trim();
  return token.length > 0 ? token : undefined;
}

// Resolve a sessão do proprietário. Sucesso → claims ({processId}); QUALQUER falha (token ausente/expirado/forjado/
// audience-errada/payload inválido) → undefined. Nunca lança — a rejeição é uniforme (o chamador loga SESSION_INVALID).
export async function resolveOwnerSession(
  authorization: string | undefined,
  secret: string,
): Promise<OwnerSessionClaims | undefined> {
  const token = readBearerToken(authorization);
  if (!token) return undefined;
  try {
    return await verifyOwnerSession(token, { secret });
  } catch {
    return undefined;
  }
}
