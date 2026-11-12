import { randomUUID } from "node:crypto";

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

import { env } from "../../../config/env.js";
import type {
  AuthenticatedTokenPayload,
  SignAccessTokenInput,
  RefreshTokenPayload,
  SignRefreshTokenInput,
} from "../types/auth.types.js";

const accessTokenIssuer = "erp-techsolutions";
const accessTokenAudience = "erp-techsolutions-api";
const refreshTokenAudience = "erp-techsolutions-auth";
const textEncoder = new TextEncoder();

type JwtServiceOptions = {
  readonly secret?: string;
  readonly expiresIn?: string;
};

export async function signAccessToken(
  input: SignAccessTokenInput,
  options: JwtServiceOptions = {},
): Promise<string> {
  const secret = options.secret ?? env.JWT_SECRET;
  const expiresInSeconds = getAccessTokenExpiresInSeconds(options.expiresIn);
  const issuedAt = Math.floor(Date.now() / 1000);

  return new SignJWT({
    tenant_id: input.tenant_id,
    email: input.email,
    roles: [...input.roles],
    ...(input.scope ? { scope: input.scope } : {}),
    type: "access",
    // B-O6R-01 (§3.5) — claim opcional de identidade (dica; nunca fonte de GUC/autorização).
    ...(input.identity_id ? { identity_id: input.identity_id } : {}),
    // B-USERS-SEG-DESATIVADO (P-SESSAO-VIVA) — a sessão do token; o portão a confere a cada requisição.
    ...(input.session_id ? { sid: input.session_id } : {}),
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(input.user_id)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + expiresInSeconds)
    .setIssuer(accessTokenIssuer)
    .setAudience(accessTokenAudience)
    .sign(textEncoder.encode(secret));
}

export async function signRefreshToken(
  input: SignRefreshTokenInput,
  options: JwtServiceOptions = {},
): Promise<string> {
  const secret = options.secret ?? env.JWT_REFRESH_SECRET;
  const expiresInSeconds = getRefreshTokenExpiresInSeconds(options.expiresIn);
  const issuedAt = Math.floor(Date.now() / 1000);

  return new SignJWT({
    session_id: input.session_id,
    tenant_id: input.tenant_id,
    user_id: input.user_id,
    type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(input.session_id)
    .setJti(randomUUID())
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + expiresInSeconds)
    .setIssuer(accessTokenIssuer)
    .setAudience(refreshTokenAudience)
    .sign(textEncoder.encode(secret));
}

export async function verifyAccessToken(
  token: string,
  options: Pick<JwtServiceOptions, "secret"> = {},
): Promise<AuthenticatedTokenPayload> {
  const secret = options.secret ?? env.JWT_SECRET;
  const { payload } = await jwtVerify(token, textEncoder.encode(secret), {
    issuer: accessTokenIssuer,
    audience: accessTokenAudience,
  });

  return parseAccessTokenPayload(payload);
}

export async function verifyRefreshToken(
  token: string,
  options: Pick<JwtServiceOptions, "secret"> = {},
): Promise<RefreshTokenPayload> {
  const secret = options.secret ?? env.JWT_REFRESH_SECRET;
  const { payload } = await jwtVerify(token, textEncoder.encode(secret), {
    issuer: accessTokenIssuer,
    audience: refreshTokenAudience,
  });

  return parseRefreshTokenPayload(payload);
}

export function getAccessTokenExpiresInSeconds(expiresIn = env.JWT_EXPIRES_IN): number {
  return parseDurationInSeconds(expiresIn, "JWT_EXPIRES_IN");
}

export function getRefreshTokenExpiresInSeconds(expiresIn = env.JWT_REFRESH_EXPIRES_IN): number {
  return parseDurationInSeconds(expiresIn, "JWT_REFRESH_EXPIRES_IN");
}

function parseDurationInSeconds(expiresIn: string, name: string): number {
  const match = /^(\d+)(s|m|h|d)?$/.exec(expiresIn);

  if (!match) {
    throw new Error(`Invalid ${name} value.`);
  }

  const value = Number(match[1]);
  const unit = match[2] ?? "s";
  const multiplierByUnit: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };
  const seconds = value * multiplierByUnit[unit];

  if (!Number.isSafeInteger(seconds) || seconds <= 0) {
    throw new Error(`${name} must be a positive safe integer duration.`);
  }

  return seconds;
}

// B-USERS-SEG-DESATIVADO — o claim `sid`: ausente vale (token anterior ao deploy); UUID vale; qualquer outro valor
// torna o token inválido (falha fechada).
const SESSION_ID_CLAIM_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isSessionIdClaim(value: unknown): value is string {
  return typeof value === "string" && SESSION_ID_CLAIM_PATTERN.test(value);
}

function parseAccessTokenPayload(payload: JWTPayload): AuthenticatedTokenPayload {
  if (payload.scope !== undefined && payload.scope !== "password_change") {
    throw new Error("Invalid access token scope.");
  }

  if (payload.sid !== undefined && !isSessionIdClaim(payload.sid)) {
    throw new Error("Invalid access token session.");
  }

  if (
    typeof payload.sub !== "string" ||
    typeof payload.tenant_id !== "string" ||
    typeof payload.email !== "string" ||
    payload.type !== "access" ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number" ||
    !Array.isArray(payload.roles) ||
    !payload.roles.every((role): role is string => typeof role === "string")
  ) {
    throw new Error("Invalid access token payload.");
  }

  return {
    sub: payload.sub,
    tenant_id: payload.tenant_id,
    email: payload.email,
    roles: payload.roles,
    ...(payload.scope === "password_change" ? { scope: payload.scope } : {}),
    type: "access",
    iat: payload.iat,
    exp: payload.exp,
    iss: typeof payload.iss === "string" ? payload.iss : undefined,
    aud: typeof payload.aud === "string" ? payload.aud : undefined,
    identity_id: typeof payload.identity_id === "string" ? payload.identity_id : undefined,
    ...(isSessionIdClaim(payload.sid) ? { sid: payload.sid } : {}),
  };
}

function parseRefreshTokenPayload(payload: JWTPayload): RefreshTokenPayload {
  if (
    typeof payload.sub !== "string" ||
    typeof payload.session_id !== "string" ||
    typeof payload.tenant_id !== "string" ||
    typeof payload.user_id !== "string" ||
    typeof payload.jti !== "string" ||
    payload.type !== "refresh" ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number"
  ) {
    throw new Error("Invalid refresh token payload.");
  }

  return {
    sub: payload.sub,
    session_id: payload.session_id,
    tenant_id: payload.tenant_id,
    user_id: payload.user_id,
    jti: payload.jti,
    type: "refresh",
    iat: payload.iat,
    exp: payload.exp,
    iss: typeof payload.iss === "string" ? payload.iss : undefined,
    aud: typeof payload.aud === "string" ? payload.aud : undefined,
  };
}
