// Ω5P PR-18a — AuthorityCredential: a 1ª ENTIDADE de identidade da AUTORIDADE SOLICITANTE (persona credenciada
// recorrente do authority-portal). É PRÓPRIA e ISOLADA: ≠ User/AuthSession/Cognito do ERP (D-Ω5P-AUTH-01) e ≠ posse
// do owner (placa+Renavam). NÃO recebe roles/permissions do ERP e NÃO alcança /api/v1 — a única coisa que ela
// autentica é a sessão JWE do authority-portal (audience própria). Tabela MUTÁVEL (rotação de senha + lockout);
// as ESCRITAS de provisionamento passam pela auditoria global do ERP (Ω4C). §2.8: o password_hash NUNCA sai em
// resposta/log/auditoria; contadores/locked_until NUNCA vão para a resposta pública do login.

export const AUTHORITY_CREDENTIAL_STATUSES = ["ACTIVE", "SUSPENDED", "REVOKED"] as const;
export type AuthorityCredentialStatus = (typeof AUTHORITY_CREDENTIAL_STATUSES)[number];

export type AuthorityCredential = {
  readonly id: string;
  readonly tenantId: string;
  readonly authorityName: string; // nome do ÓRGÃO (não pessoal) — white-label; é o único campo que a resposta do login expõe
  readonly username: string; // normalizado (minúsculas/trim) — chave natural (tenant_id, username)
  readonly passwordHash: string; // scrypt self-describing (scrypt$N$r$p$salt$hash) — NUNCA a senha em claro
  readonly status: AuthorityCredentialStatus;
  readonly failedLoginCount: number; // lockout persistente (sobrevive a restart — vive na linha sob RLS)
  readonly lockedUntil: Date | null;
  readonly lastLoginAt: Date | null;
  readonly createdBy: string | null; // userId do admin do ERP que provisionou (metadata; sem FK dura)
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

// Ator do PROVISIONAMENTO (console autenticado do ERP). Só o que o serviço usa: tenant + userId do admin.
export type AuthorityActorContext = {
  readonly tenantId: string;
  readonly userId: string;
};

// statusCode/code/reason/message espelham o duck-type de `sendRouteError` (core-saas/routes/http.ts) → o
// handleAsyncRoute traduz para o HTTP correto sem mapa extra.
export class AuthorityCredentialError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    public readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "AuthorityCredentialError";
  }
}
