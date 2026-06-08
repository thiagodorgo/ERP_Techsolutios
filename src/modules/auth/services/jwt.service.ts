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
    type: "access",
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

function parseAccessTokenPayload(payload: JWTPayload): AuthenticatedTokenPayload {
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
    type: "access",
    iat: payload.iat,
    exp: payload.exp,
    iss: typeof payload.iss === "string" ? payload.iss : undefined,
    aud: typeof payload.aud === "string" ? payload.aud : undefined,
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
