import { SignJWT, jwtVerify, type JWTPayload } from "jose";

import { env } from "../../../config/env.js";
import type {
  AuthenticatedTokenPayload,
  SignAccessTokenInput,
} from "../types/auth.types.js";

const accessTokenIssuer = "erp-techsolutions";
const accessTokenAudience = "erp-techsolutions-api";
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

export function getAccessTokenExpiresInSeconds(expiresIn = env.JWT_EXPIRES_IN): number {
  const match = /^(\d+)(s|m|h|d)?$/.exec(expiresIn);

  if (!match) {
    throw new Error("Invalid JWT_EXPIRES_IN value.");
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
    throw new Error("JWT_EXPIRES_IN must be a positive safe integer duration.");
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
