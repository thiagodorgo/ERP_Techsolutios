import { Router, type Request } from "express";

import { getAuthSessionService, getLocalAuthLoginService } from "../auth-runtime.js";
import {
  getAccessTokenExpiresInSeconds,
  signAccessToken,
  verifyAccessToken,
} from "../services/jwt.service.js";
import type { AuthSessionService } from "../services/auth-session.service.js";
import type { LocalAuthLoginService } from "../services/local-auth-login.service.js";
import type { ICoreSaasService } from "../../core-saas/services/core-saas-service.interface.js";

type AuthRouterOptions = {
  readonly getLoginService?: () => Promise<LocalAuthLoginService>;
  readonly getSessionService?: () => Promise<AuthSessionService>;
  readonly signAccessToken?: typeof signAccessToken;
  readonly getAccessTokenExpiresInSeconds?: typeof getAccessTokenExpiresInSeconds;
  readonly getCoreSaasService?: () => Promise<ICoreSaasService>;
};

type LoginRequestBody = {
  readonly tenantId?: unknown;
  readonly email?: unknown;
  readonly password?: unknown;
};

type RefreshRequestBody = {
  readonly refreshToken?: unknown;
  readonly refresh_token?: unknown;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createAuthRouter(options: AuthRouterOptions = {}): Router {
  const router = Router();
  const resolveLoginService = options.getLoginService ?? getLocalAuthLoginService;
  const resolveSessionService = options.getSessionService ?? getAuthSessionService;
  const issueAccessToken = options.signAccessToken ?? signAccessToken;
  const resolveTokenExpiration =
    options.getAccessTokenExpiresInSeconds ?? getAccessTokenExpiresInSeconds;
  const resolveCoreSaasService = options.getCoreSaasService;

  router.post("/login", async (request, response) => {
    try {
      const parsedBody = parseLoginRequestBody(request.body);

      if (!parsedBody.ok) {
        response.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: parsedBody.message,
          },
        });
        return;
      }

      let resolvedTenantId = parsedBody.tenantId;
      if (!resolvedTenantId && resolveCoreSaasService) {
        const svc = await resolveCoreSaasService();
        const memberships = await svc.listTenantsForUserEmail(parsedBody.email);
        if (memberships.length === 0) {
          response.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials." } });
          return;
        }
        resolvedTenantId = memberships[0].tenant.id;
      }
      if (!resolvedTenantId) {
        response.status(400).json({ error: { code: "BAD_REQUEST", message: "tenantId is required." } });
        return;
      }

      const loginService = await resolveLoginService();
      const loginResult = await loginService.authenticateLocalCredential({
        tenant_id: resolvedTenantId,
        email: parsedBody.email,
        password: parsedBody.password,
        request_id: readRequestId(request),
        correlation_id: readHeader(request.headers["x-correlation-id"]) ?? readRequestId(request),
        ip_address: request.ip,
        user_agent: readHeader(request.headers["user-agent"]),
      });

      if (!loginResult.ok) {
        if (loginResult.reason === "locked") {
          response.status(423).json({
            error: {
              code: "ACCOUNT_LOCKED",
              message: "Account is locked.",
            },
          });
          return;
        }

        response.status(401).json({
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid credentials.",
          },
        });
        return;
      }

      const accessToken = await issueAccessToken({
        user_id: loginResult.user.id,
        tenant_id: loginResult.user.tenant_id,
        email: loginResult.user.email,
        roles: loginResult.roles.map((role) => role.key),
      });
      const session = await (
        await resolveSessionService()
      ).createSession({
        tenant_id: loginResult.user.tenant_id,
        user_id: loginResult.user.id,
        user_agent: readHeader(request.headers["user-agent"]),
        ip_address: request.ip,
      });
      const accessTokenExpiresIn = resolveTokenExpiration();

      response.status(200).json({
        data: {
          authenticated: true,
          access_token: accessToken,
          accessToken,
          token_type: "Bearer",
          tokenType: "Bearer",
          expires_in: accessTokenExpiresIn,
          expiresIn: accessTokenExpiresIn,
          refresh_token: session.refreshToken,
          refreshToken: session.refreshToken,
          refresh_expires_at: session.refreshTokenExpiresAt.toISOString(),
          refreshExpiresAt: session.refreshTokenExpiresAt.toISOString(),
          refresh_expires_in: session.refreshTokenExpiresIn,
          refreshExpiresIn: session.refreshTokenExpiresIn,
          session_id: session.sessionId,
          sessionId: session.sessionId,
          user: loginResult.user,
          tenant: loginResult.tenant,
          roles: loginResult.roles,
        },
      });
    } catch {
      response.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to process login.",
        },
      });
    }
  });

  router.post("/refresh", async (request, response) => {
    try {
      const refreshToken = parseRefreshTokenRequestBody(request.body);

      if (!refreshToken) {
        response.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: "refreshToken is required.",
          },
        });
        return;
      }

      const refreshResult = await (await resolveSessionService()).refreshSession(refreshToken);

      if (!refreshResult.ok) {
        response.status(401).json({
          error: {
            code: "INVALID_REFRESH_TOKEN",
            message: "Invalid or expired refresh token.",
          },
        });
        return;
      }

      response.status(200).json({
        data: {
          access_token: refreshResult.accessToken,
          accessToken: refreshResult.accessToken,
          token_type: "Bearer",
          tokenType: "Bearer",
          expires_in: refreshResult.accessTokenExpiresIn,
          expiresIn: refreshResult.accessTokenExpiresIn,
          refresh_token: refreshResult.refreshToken,
          refreshToken: refreshResult.refreshToken,
          refresh_expires_at: refreshResult.refreshTokenExpiresAt.toISOString(),
          refreshExpiresAt: refreshResult.refreshTokenExpiresAt.toISOString(),
          refresh_expires_in: refreshResult.refreshTokenExpiresIn,
          refreshExpiresIn: refreshResult.refreshTokenExpiresIn,
          session_id: refreshResult.sessionId,
          sessionId: refreshResult.sessionId,
        },
      });
    } catch {
      response.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to refresh session.",
        },
      });
    }
  });

  router.post("/active-tenant", async (request, response) => {
    if (!resolveCoreSaasService) {
      response.status(501).json({
        error: { code: "NOT_IMPLEMENTED", message: "active-tenant not configured." },
      });
      return;
    }

    const authHeader = readHeader(request.headers["authorization"]);
    const token = authHeader ? parseBearerToken(authHeader) : null;

    if (!token) {
      response.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Bearer token required." },
      });
      return;
    }

    let payload: Awaited<ReturnType<typeof verifyAccessToken>>;

    try {
      payload = await verifyAccessToken(token);
    } catch {
      response.status(401).json({
        error: { code: "INVALID_TOKEN", message: "Invalid or expired access token." },
      });
      return;
    }

    const body = isRecord(request.body) ? (request.body as Record<string, unknown>) : {};
    const requestedTenantId = readString(body.tenantId ?? body.tenant_id);

    if (!requestedTenantId) {
      response.status(400).json({
        error: { code: "BAD_REQUEST", message: "tenantId is required." },
      });
      return;
    }

    try {
      const service = await resolveCoreSaasService();
      const memberships = await service.listTenantsForUserEmail(payload.email);
      const match = memberships.find((m) => m.tenant.id === requestedTenantId);

      if (!match) {
        response.status(403).json({
          error: { code: "FORBIDDEN", message: "User does not belong to the requested tenant." },
        });
        return;
      }

      const accessToken = await issueAccessToken({
        user_id: match.user.id,
        tenant_id: match.tenant.id,
        email: match.user.email,
        roles: [...match.user.roles],
      });
      const session = await (
        await resolveSessionService()
      ).createSession({
        tenant_id: match.tenant.id,
        user_id: match.user.id,
        user_agent: readHeader(request.headers["user-agent"]),
        ip_address: request.ip,
      });
      const accessTokenExpiresIn = resolveTokenExpiration();

      response.status(200).json({
        data: {
          access_token: accessToken,
          accessToken,
          token_type: "Bearer",
          tokenType: "Bearer",
          expires_in: accessTokenExpiresIn,
          expiresIn: accessTokenExpiresIn,
          refresh_token: session.refreshToken,
          refreshToken: session.refreshToken,
          refresh_expires_at: session.refreshTokenExpiresAt.toISOString(),
          refreshExpiresAt: session.refreshTokenExpiresAt.toISOString(),
          refresh_expires_in: session.refreshTokenExpiresIn,
          refreshExpiresIn: session.refreshTokenExpiresIn,
          session_id: session.sessionId,
          sessionId: session.sessionId,
          tenant: { id: match.tenant.id, name: match.tenant.name },
          user: { id: match.user.id, name: match.user.name, email: match.user.email },
          roles: [...match.user.roles],
        },
      });
    } catch {
      response.status(500).json({
        error: { code: "INTERNAL_SERVER_ERROR", message: "Unable to switch tenant." },
      });
    }
  });

  router.post("/logout", async (request, response) => {
    try {
      const refreshToken = parseRefreshTokenRequestBody(request.body);

      if (refreshToken) {
        await (await resolveSessionService()).logout(refreshToken);
      }

      response.status(200).json({
        data: {
          revoked: true,
        },
      });
    } catch {
      response.status(200).json({
        data: {
          revoked: true,
        },
      });
    }
  });

  return router;
}

type ParsedLoginRequestBody =
  | {
      readonly ok: true;
      readonly tenantId: string | null;
      readonly email: string;
      readonly password: string;
    }
  | {
      readonly ok: false;
      readonly message: string;
    };

function parseLoginRequestBody(body: unknown): ParsedLoginRequestBody {
  const input = isRecord(body) ? (body as LoginRequestBody) : {};
  const tenantIdRaw = readString(input.tenantId);
  const tenantId = tenantIdRaw || null;
  const email = readString(input.email).trim().toLowerCase();
  const password = readString(input.password);

  // If tenantId is provided, validate it is a UUID
  if (tenantId && !uuidPattern.test(tenantId)) {
    return {
      ok: false,
      message: "tenantId must be a valid UUID.",
    };
  }

  if (!email || !isBasicEmail(email)) {
    return {
      ok: false,
      message: "email must be valid.",
    };
  }

  if (!password) {
    return {
      ok: false,
      message: "password is required.",
    };
  }

  return {
    ok: true,
    tenantId,
    email,
    password,
  };
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return value;
}

function readRequestId(request: Request): string | undefined {
  const candidate = (request as typeof request & { id?: unknown }).id;

  return typeof candidate === "string" ? candidate : readHeader(request.headers["x-request-id"]);
}

function parseRefreshTokenRequestBody(body: unknown): string {
  const input = isRecord(body) ? (body as RefreshRequestBody) : {};

  return readString(input.refreshToken || input.refresh_token).trim();
}

function isBasicEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseBearerToken(authorizationHeader: string): string | null {
  const [scheme, token, ...extraParts] = authorizationHeader.split(/\s+/);

  if (scheme?.toLowerCase() !== "bearer" || !token || extraParts.length > 0) {
    return null;
  }

  return token;
}
