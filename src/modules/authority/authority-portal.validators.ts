// Ω5P PR-18a — validador do corpo do LOGIN público. Erro de FORMATO é genérico (400 BAD_REQUEST) e INDEPENDE da
// existência do username → não é oráculo. Limites apertados (corpo minúsculo) reduzem superfície de abuso.

export class AuthorityPortalBadRequestError extends Error {
  constructor(message = "Invalid request.") {
    super(message);
    this.name = "AuthorityPortalBadRequestError";
  }
}

export type LoginRequest = {
  readonly username: string;
  readonly password: string;
  readonly challengeId: string;
  readonly solution: string;
};

function readString(record: Record<string, unknown>, key: string, max: number): string {
  const value = record[key];
  if (typeof value !== "string") throw new AuthorityPortalBadRequestError();
  const trimmed = key === "password" ? value : value.trim();
  if (trimmed.length === 0 || trimmed.length > max) throw new AuthorityPortalBadRequestError();
  return trimmed;
}

export function parseLoginRequest(body: Record<string, unknown>): LoginRequest {
  return {
    username: readString(body, "username", 64),
    password: readString(body, "password", 200),
    challengeId: readString(body, "challengeId", 128),
    solution: readString(body, "solution", 64),
  };
}
