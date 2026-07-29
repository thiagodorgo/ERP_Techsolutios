// Ω5P PR-18a — DTO da resposta PÚBLICA do login do authority-portal. §2.8 INQUEBRÁVEL: a resposta traz SÓ
// `{ session, authorityName }` — a sessão JWE (opaca) + o nome do ÓRGÃO (não pessoal). NUNCA credentialId,
// tenant_id, hash, locked_until, failed_login_count nem qualquer contador. O desfecho interno
// (CREDENTIAL_INVALID/LOCKED/…) fica SÓ no PortalAccessLog — a resposta ao cliente é uniforme.

export type AuthorityLoginResponse = {
  readonly session: string;
  readonly authorityName: string;
};

export function toAuthorityLoginResponse(session: string, authorityName: string): AuthorityLoginResponse {
  return { session, authorityName };
}
