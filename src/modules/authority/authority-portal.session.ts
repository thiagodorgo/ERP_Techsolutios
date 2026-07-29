import { verifyAuthoritySession, type AuthoritySessionClaims } from "../portal-shared/index.js";

// Ω5P PR-18a — resolução da SESSÃO do authority-portal (consumida pela solicitar-remoção em 18b). Transporte SÓ o
// header Authorization (Bearer <jwe>), secret PRÓPRIO (PORTAL_AUTHORITY_SESSION_SECRET ≠ owner ≠ ERP), audience
// própria (erp-authority-portal). O credentialId vem SEMPRE da sessão VERIFICADA — nunca do corpo (anti-spoofing de
// órgão em 18b). Rejeição UNIFORME (ausente/expirada/forjada/audience-errada) → undefined; o chamador decide o 401.

// Extrai o token do header Authorization (só o esquema Bearer). Ausente/mal-formado → undefined (uniforme).
export function readBearerToken(authorization: string | undefined): string | undefined {
  if (typeof authorization !== "string") return undefined;
  const match = /^Bearer[ ]+(.+)$/i.exec(authorization.trim());
  if (!match) return undefined;
  const token = match[1].trim();
  return token.length > 0 ? token : undefined;
}

export async function resolveAuthoritySession(
  authorization: string | undefined,
  secret: string,
): Promise<AuthoritySessionClaims | undefined> {
  const token = readBearerToken(authorization);
  if (!token) return undefined;
  try {
    return await verifyAuthoritySession(token, { secret });
  } catch {
    return undefined;
  }
}
