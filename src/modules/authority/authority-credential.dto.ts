import type { AuthorityCredential } from "./authority-credential.types.js";

// Ω5P PR-18a — DTO do PROVISIONAMENTO (console autenticado do ERP). O admin PRECISA ver o estado de lockout para
// gerir (por isso failedLoginCount/lockedUntil ENTRAM aqui — é o console, não a resposta pública do login). O que
// NUNCA sai: `passwordHash` (§2.8) e `tenantId` (resolvido pelo ator/claim; nunca ecoado). O ID é o da credencial
// (recurso do console autenticado), não um oráculo público.

export type AuthorityCredentialDto = {
  readonly id: string;
  readonly authorityName: string;
  readonly username: string;
  readonly status: string;
  readonly failedLoginCount: number;
  readonly lockedUntil: string | null;
  readonly lastLoginAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export function toAuthorityCredentialDto(credential: AuthorityCredential): AuthorityCredentialDto {
  return {
    id: credential.id,
    authorityName: credential.authorityName,
    username: credential.username,
    status: credential.status,
    failedLoginCount: credential.failedLoginCount,
    lockedUntil: credential.lockedUntil ? credential.lockedUntil.toISOString() : null,
    lastLoginAt: credential.lastLoginAt ? credential.lastLoginAt.toISOString() : null,
    createdAt: credential.createdAt.toISOString(),
    updatedAt: credential.updatedAt.toISOString(),
  };
}

export function toAuthorityCredentialListDto(credentials: readonly AuthorityCredential[]): {
  readonly data: readonly AuthorityCredentialDto[];
} {
  return { data: credentials.map(toAuthorityCredentialDto) };
}
