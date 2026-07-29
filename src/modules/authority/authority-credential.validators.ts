import { AuthorityCredentialError } from "./authority-credential.types.js";

// Ω5P PR-18a — validadores do PROVISIONAMENTO (console /api/v1). Erros são AuthorityCredentialError 400 genéricos
// (o provisionamento é superfície autenticada; a uniformidade anti-oráculo é do LOGIN, não daqui).

function badRequest(reason: string, message: string): never {
  throw new AuthorityCredentialError(400, "AUTHORITY_INVALID", reason, message);
}

// Nome do ÓRGÃO (white-label). Obrigatório, 2..200 chars após trim.
export function parseAuthorityName(value: unknown): string {
  if (typeof value !== "string") badRequest("authority_name_required", "authority_name is required.");
  const trimmed = (value as string).trim();
  if (trimmed.length < 2 || trimmed.length > 200) {
    badRequest("authority_name_invalid", "authority_name must be between 2 and 200 characters.");
  }
  return trimmed;
}

// Username de login. Obrigatório; após normalizar (minúsculas/trim), 3..64 chars do alfabeto [a-z0-9._-].
// Rejeita espaços e caracteres fora do conjunto (evita ambiguidade de normalização / injeção visual).
export function parseUsername(value: unknown): string {
  if (typeof value !== "string") badRequest("username_required", "username is required.");
  const normalized = (value as string).trim().toLowerCase();
  if (normalized.length < 3 || normalized.length > 64) {
    badRequest("username_invalid", "username must be between 3 and 64 characters.");
  }
  if (!/^[a-z0-9._-]+$/.test(normalized)) {
    badRequest("username_invalid", "username may contain only letters, digits and . _ - characters.");
  }
  return normalized;
}

// Senha OPCIONAL no provisionamento/rotação: se ausente, o serviço GERA uma aleatória e a devolve UMA vez. Se
// presente, exige 10..200 chars (mínimo defensável; a força real vem do scrypt + rate-limit + lockout).
export function parseOptionalPassword(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") badRequest("password_invalid", "password must be a string.");
  const password = value as string;
  if (password.length < 10 || password.length > 200) {
    badRequest("password_invalid", "password must be between 10 and 200 characters.");
  }
  return password;
}
