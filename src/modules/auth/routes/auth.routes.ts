import { Router, type Request } from "express";

import { getAuthSessionService, getLocalAuthLoginService } from "../auth-runtime.js";
import {
  getAccessTokenExpiresInSeconds,
  signAccessToken,
} from "../services/jwt.service.js";
import { AnonymousLoginService } from "../services/anonymous-login.service.js";
import {
  attachAuthenticatedActor,
  getAuthenticatedActor,
} from "../middleware/authenticated-actor.middleware.js";
import type { AuthSessionService } from "../services/auth-session.service.js";
import type { LocalAuthLoginService, AnonymousCandidateResult } from "../services/local-auth-login.service.js";
import type { LocalAuthLoginResult } from "../types/auth.types.js";
import type { verifyPassword } from "../services/password.service.js";
import type { ICoreSaasService } from "../../core-saas/services/core-saas-service.interface.js";
import { ROLE_PERMISSIONS, resolvePermissionsForRoles, type Role } from "../../core-saas/permissions/catalog.js";

// Permissões efetivas dos papéis do usuário — a MESMA resolução que o backend usa
// no RBAC (tenant-context). Vai no corpo do login para o frontend derivar os guards
// da fonte de verdade (catálogo), em vez de um mapa hardcoded que sai de sincronia.
function resolveLoginPermissions(roleKeys: readonly string[]): string[] {
  const known = roleKeys.filter((key): key is Role => key in ROLE_PERMISSIONS);
  return resolvePermissionsForRoles(known);
}

type AuthRouterOptions = {
  readonly getLoginService?: () => Promise<LocalAuthLoginService>;
  readonly getSessionService?: () => Promise<AuthSessionService>;
  readonly signAccessToken?: typeof signAccessToken;
  readonly getAccessTokenExpiresInSeconds?: typeof getAccessTokenExpiresInSeconds;
  readonly getCoreSaasService?: () => Promise<ICoreSaasService>;
  // B-O6R-01 (§6) — serviço do login sem organização; injetável nos testes (espião do contador
  // de scrypt, relógio, sleep). O default compõe o core-saas + o serviço de login reais.
  readonly getAnonymousLoginService?: () => Promise<AnonymousLoginService>;
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

  // B-O6R-01 (§6) — o serviço anônimo é cacheado por router: o balde por e-mail vive entre
  // requisições. Sem core-saas configurado não há fonte de candidatos → o login sem tenantId
  // responde 400 (abaixo).
  let defaultAnonymousLoginService: AnonymousLoginService | undefined;
  const resolveAnonymousLoginService =
    options.getAnonymousLoginService ??
    (async (): Promise<AnonymousLoginService> => {
      if (!defaultAnonymousLoginService) {
        const coreSaasService = await resolveCoreSaasService!();
        const loginService = await resolveLoginService();

        defaultAnonymousLoginService = new AnonymousLoginService({
          listCandidates: (email) => coreSaasService.listLoginCandidates(email),
          verifyCandidate: (
            tenantId: string,
            email: string,
            password: string,
            verifyPasswordFn: typeof verifyPassword,
          ): Promise<AnonymousCandidateResult> =>
            loginService.verifyAnonymousCandidate(
              { tenant_id: tenantId, email, password },
              verifyPasswordFn,
            ),
          finalizeSuccess: (tenantId, credentialId, user, roleCount, auditContext) =>
            loginService.finalizeAnonymousLogin(tenantId, credentialId, user, roleCount, auditContext),
        });
      }

      return defaultAnonymousLoginService;
    });

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
      let loginResult: LocalAuthLoginResult;

      if (!resolvedTenantId) {
        // B-O6R-01 (§6.2) — login SEM organização (Forma B): o e-mail nunca decide (I1); a
        // credencial decide, sob balde por e-mail, teto de candidatos e piso de latência. O
        // antigo fallback por listTenantsForUserEmail (Ω6R-TEN-001) foi removido.
        if (!resolveCoreSaasService) {
          response.status(400).json({ error: { code: "BAD_REQUEST", message: "tenantId is required." } });
          return;
        }

        const anonymousLoginService = await resolveAnonymousLoginService();
        const outcome = await anonymousLoginService.attempt({
          email: parsedBody.email,
          password: parsedBody.password,
          ipAddress: request.ip,
          userAgent: readHeader(request.headers["user-agent"]),
        });

        if (outcome.kind === "rate_limited") {
          response.status(429).json({
            error: {
              code: "RATE_LIMITED",
              message: "Too many attempts. Try again later.",
            },
          });
          return;
        }

        if (outcome.kind === "tenant_id_required") {
          response.status(400).json({
            error: {
              code: "TENANT_ID_REQUIRED",
              message: "tenantId is required for this email.",
            },
          });
          return;
        }

        if (outcome.kind === "invalid") {
          // 401 UNIFORME — o mesmo corpo do login direcionado, inclusive com candidato em lock
          // (o 423 não existe no caminho anônimo).
          response.status(401).json({
            error: {
              code: "INVALID_CREDENTIALS",
              message: "Invalid credentials.",
            },
          });
          return;
        }

        if (outcome.kind === "selection_required") {
          // SOMENTE as organizações PROVADAS pela credencial.
          response.status(409).json({
            error: {
              code: "TENANT_SELECTION_REQUIRED",
              message: "Credential matches more than one organization. Choose one.",
              tenants: outcome.tenants,
            },
          });
          return;
        }

        resolvedTenantId = outcome.tenantId;
        loginResult = outcome.login;
      } else {
        const loginService = await resolveLoginService();

        loginResult = await loginService.authenticateLocalCredential({
          tenant_id: resolvedTenantId,
          email: parsedBody.email,
          password: parsedBody.password,
          request_id: readRequestId(request),
          correlation_id: readHeader(request.headers["x-correlation-id"]) ?? readRequestId(request),
          ip_address: request.ip,
          user_agent: readHeader(request.headers["user-agent"]),
        });
      }

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

      // B-O6R-01 (§3.5) — claim identity_id (dica de roteamento; nunca fonte de GUC/
      // autorização). Falha na resolução = claim omitido: o token sem claim resolve por par.
      let identityId: string | null = null;

      if (resolveCoreSaasService) {
        try {
          identityId = await (
            await resolveCoreSaasService()
          ).resolveIdentityForUser({
            tenantId: loginResult.user.tenant_id,
            userId: loginResult.user.id,
          });
        } catch {
          identityId = null;
        }
      }

      const accessToken = await issueAccessToken({
        user_id: loginResult.user.id,
        tenant_id: loginResult.user.tenant_id,
        email: loginResult.user.email,
        roles: loginResult.roles.map((role) => role.key),
        ...(identityId ? { identity_id: identityId } : {}),
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
          permissions: resolveLoginPermissions(loginResult.roles.map((role) => role.key)),
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

  // B-O6R-01 (Ω6R-TEN-001, §6.5) — a troca de organização passa a decidir pelo VÍNCULO
  // explícito, nunca pelo e-mail. O ator vem do middleware JWT (o único lugar que constrói
  // AuthenticatedActor); header legado não alcança este fluxo.
  router.post("/active-tenant", attachAuthenticatedActor(), async (request, response) => {
    if (!resolveCoreSaasService) {
      response.status(501).json({
        error: { code: "NOT_IMPLEMENTED", message: "active-tenant not configured." },
      });
      return;
    }

    const actor = getAuthenticatedActor(request);

    if (!actor) {
      response.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Bearer token required." },
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
      // Fail-closed (§3.4): ausência de vínculo na organização pedida = 403 — jamais fallback
      // por e-mail. Usuário inativo e organização suspensa também resolvem para null.
      const match = await service.findMembershipForIdentity(actor, requestedTenantId);

      if (!match) {
        response.status(403).json({
          error: { code: "FORBIDDEN", message: "User does not belong to the requested tenant." },
        });
        return;
      }

      let identityId: string | null = null;

      try {
        identityId = await service.resolveIdentityForUser({
          tenantId: match.tenant.id,
          userId: match.user.id,
        });
      } catch {
        identityId = null;
      }

      const accessToken = await issueAccessToken({
        user_id: match.user.id,
        tenant_id: match.tenant.id,
        email: match.user.email,
        roles: [...match.user.roles],
        ...(identityId ? { identity_id: identityId } : {}),
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
