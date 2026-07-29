import { createHash } from "node:crypto";

import { EncryptJWT, jwtDecrypt } from "jose";

// Ω5P PR-16 — SESSÃO de portal por POSSE (owner = placa+Renavam ⇒ token de sessão). REGRA DE OURO (RN-POR-05 /
// D-Ω5P-05): jamais a sessão/cookie/JWT do ERP — secret PRÓPRIO (PORTAL_SESSION_SECRET), issuer/audience
// próprios, curtíssima. Usamos JWE (JWT CRIPTOGRAFADO, dir + A256GCM), não JWS: o `processId` interno fica
// OPACO (nem base64-decodável) na resposta pública — defesa-em-profundidade §2.8. Zero dep nova (jose já existe).

const PORTAL_ISSUER = "erp-portal";
const OWNER_AUDIENCE = "erp-owner-portal";
// Ω5P PR-18a — audience PRÓPRIA do authority-portal (≠ owner ≠ ERP). Um token owner/ERP NUNCA verifica como
// authority e vice-versa: a audience + o secret PRÓPRIO (PORTAL_AUTHORITY_SESSION_SECRET) formam a fronteira dupla.
const AUTHORITY_AUDIENCE = "erp-authority-portal";
export const OWNER_SESSION_TTL_SECONDS = 15 * 60; // 15 min — curta
export const AUTHORITY_SESSION_TTL_SECONDS = 30 * 60; // 30 min — sessão da autoridade credenciada (D-Ω5P-AUTH-01)

export type OwnerSessionClaims = {
  readonly processId: string;
};

// Ω5P PR-18a — claims da sessão do authority-portal: SÓ o credentialId (opaco na JWE — nem base64-decodável).
// A credencial NÃO recebe roles/permissions do ERP; a sessão NÃO alcança /api/v1 (defesa-em-profundidade §2.8).
export type AuthoritySessionClaims = {
  readonly credentialId: string;
};

// Chave A256GCM (32 bytes) derivada do segredo por SHA-256 — aceita segredo de qualquer comprimento.
function deriveKey(secret: string): Uint8Array {
  return createHash("sha256").update(secret, "utf8").digest();
}

export async function signOwnerSession(
  claims: OwnerSessionClaims,
  options: { secret: string; ttlSeconds?: number },
): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const ttl = options.ttlSeconds ?? OWNER_SESSION_TTL_SECONDS;
  return new EncryptJWT({ process_id: claims.processId })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + ttl)
    .setIssuer(PORTAL_ISSUER)
    .setAudience(OWNER_AUDIENCE)
    .encrypt(deriveKey(options.secret));
}

export async function verifyOwnerSession(
  token: string,
  options: { secret: string },
): Promise<OwnerSessionClaims> {
  const { payload } = await jwtDecrypt(token, deriveKey(options.secret), {
    issuer: PORTAL_ISSUER,
    audience: OWNER_AUDIENCE,
  });
  if (typeof payload.process_id !== "string") {
    throw new Error("Invalid owner portal session payload.");
  }
  return { processId: payload.process_id };
}

// Ω5P PR-18a — SESSÃO do authority-portal. MESMO mecanismo JWE (dir + A256GCM) do owner, mas com AUDIENCE PRÓPRIA
// (erp-authority-portal) e SECRET PRÓPRIO (PORTAL_AUTHORITY_SESSION_SECRET, injetado pelo chamador). Isolamento por
// CONTRATO: `verifyAuthoritySession` só aceita a audience authority — um token owner (audience erp-owner-portal) ou
// do ERP falha; e o inverso também (`verifyOwnerSession` recusa a audience authority). TTL 30min (D-Ω5P-AUTH-01).
export async function signAuthoritySession(
  claims: AuthoritySessionClaims,
  options: { secret: string; ttlSeconds?: number },
): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const ttl = options.ttlSeconds ?? AUTHORITY_SESSION_TTL_SECONDS;
  return new EncryptJWT({ credential_id: claims.credentialId })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + ttl)
    .setIssuer(PORTAL_ISSUER)
    .setAudience(AUTHORITY_AUDIENCE)
    .encrypt(deriveKey(options.secret));
}

export async function verifyAuthoritySession(
  token: string,
  options: { secret: string },
): Promise<AuthoritySessionClaims> {
  const { payload } = await jwtDecrypt(token, deriveKey(options.secret), {
    issuer: PORTAL_ISSUER,
    audience: AUTHORITY_AUDIENCE,
  });
  if (typeof payload.credential_id !== "string") {
    throw new Error("Invalid authority portal session payload.");
  }
  return { credentialId: payload.credential_id };
}
