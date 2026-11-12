import { Router, type Request } from "express";

import { getAuthSessionService, getLocalAuthLoginService } from "../auth-runtime.js";
import {
  getAccessTokenExpiresInSeconds,
  signAccessToken,
} from "../services/jwt.service.js";
import { AnonymousLoginService, loginIpBucketKey } from "../services/anonymous-login.service.js";
import { LOGIN_IP_BUCKET } from "../anonymous-login.constants.js";
import {
  InMemoryTokenBucketStore,
  TokenBucket,
  type TokenBucketConfig,
  type TokenBucketStore,
} from "../../portal-shared/token-bucket.js";
import { env } from "../../../config/env.js";
import {
  attachAuthenticatedActor,
  getAuthenticatedActor,
} from "../middleware/authenticated-actor.middleware.js";
import type { AuthSessionService } from "../services/auth-session.service.js";
import {
  getIdentityLinkService,
  resetUnavailableError,
  type IdentityLinkError,
  type IdentityLinkService,
} from "../services/identity-link.service.js";
import type { LocalAuthLoginService, AnonymousCandidateResult } from "../services/local-auth-login.service.js";
import type { LocalAuthLoginResult } from "../types/auth.types.js";
import type { verifyPassword } from "../services/password.service.js";
import type { ICoreSaasService } from "../../core-saas/services/core-saas-service.interface.js";
import { ROLE_PERMISSIONS, resolvePermissionsForRoles, type Role } from "../../core-saas/permissions/catalog.js";
import { CoreSaasError } from "../../core-saas/types/core-saas.types.js";
import {
  createPersistentRbacContextMiddleware,
  type PersistentAuthorizationResolver,
} from "../../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../../core-saas/middleware/tenant-context.middleware.js";
import { readRouteParam } from "../../core-saas/routes/http.js";
import { resolveAccessTokenScope } from "../services/access-token-scope.js";

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
  // B-O6R-07a (§3.5) — freio por IP das DUAS vias de POST /login. Tudo injetável para teste
  // (store, parâmetros, relógio e extrator de IP); em produção nada disto é passado e valem os
  // defaults: LOGIN_IP_BUCKET, Date.now e o IP do SOCKET.
  readonly loginIpRateLimit?: {
    readonly store?: TokenBucketStore;
    readonly config?: TokenBucketConfig;
    readonly clock?: () => number;
    readonly resolveClientIp?: (request: Request) => string;
  };
  // B-USERS-ACESSO-SEG (S1) — o serviço de identidade do reset por administrador; injetável para o
  // teste medir sob o papel efêmero. Resolvido só quando a rota do reset é chamada (o modo memória e os
  // testes sem banco não o tocam).
  readonly getIdentityLinkService?: () => Promise<IdentityLinkService>;
  // B-USERS-ACESSO-SEG (S1) — o resolvedor do RBAC persistente da rota do reset; injetável para o teste
  // ligá-lo ao papel efêmero (createPersistentAuthorizationResolver). Em produção nada é passado e vale o
  // padrão do middleware (o cliente global, com CORE_SAAS_PERSISTENCE=prisma).
  readonly resolvePersistentAuthorization?: PersistentAuthorizationResolver;
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
  const resolveIdentityLinkService = options.getIdentityLinkService ?? getIdentityLinkService;

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
          // B-O6R-07a CICLO 2 (C2·3) — cobrança única pós-veredicto da falha anônima.
          registerFailure: (tenantId, credentialId, email, auditContext) =>
            loginService.registerAnonymousFailure(tenantId, credentialId, email, auditContext),
        });
      }

      return defaultAnonymousLoginService;
    });

  // B-O6R-07a (§3.5) — balde por IP, cacheado por router (vive entre requisições, como o balde
  // por e-mail do B01). TokenBucket REUSADO de portal-shared: zero dependência nova.
  const loginIpRateLimit = options.loginIpRateLimit ?? {};
  const loginIpBucket = new TokenBucket(
    loginIpRateLimit.store ?? new InMemoryTokenBucketStore(),
    loginIpRateLimit.config ?? LOGIN_IP_BUCKET,
  );
  const loginIpClock = loginIpRateLimit.clock ?? Date.now;
  const resolveLoginClientIp = loginIpRateLimit.resolveClientIp ?? readSocketIp;

  router.post("/login", async (request, response) => {
    try {
      // O freio por IP vem ANTES de qualquer trabalho — parse de corpo incluso: corpo malformado
      // em volume não pode ser a via barata de contornar o freio. Sem oráculo de conta: o 429 fala
      // do volume da PRÓPRIA origem, não da existência de e-mail ou organização.
      const clientIp = resolveLoginClientIp(request);
      const ipBucketKey = loginIpBucketKey(env.JWT_SECRET, clientIp);
      const ipBucketNowMs = loginIpClock();

      if (!loginIpBucket.wouldAllow(ipBucketKey, ipBucketNowMs)) {
        response.status(429).json({
          error: {
            code: "RATE_LIMITED",
            message: "Too many attempts. Try again later.",
          },
        });
        return;
      }

      loginIpBucket.consume(ipBucketKey, ipBucketNowMs);

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

      const roleKeys = loginResult.roles.map((role) => role.key);
      const tokenScope = resolveAccessTokenScope(loginResult.mustChangePassword, roleKeys);
      // B-USERS-SEG-DESATIVADO (P-SESSAO-VIVA) — a sessão nasce ANTES do token, para o token carregá-la (`sid`).
      // Se a assinatura falhar depois, sobra uma sessão sem token entregue, que vence sozinha (R4 do plano).
      const loginSession = await (
        await resolveSessionService()
      ).createSession({
        tenant_id: loginResult.user.tenant_id,
        user_id: loginResult.user.id,
        user_agent: readHeader(request.headers["user-agent"]),
        ip_address: request.ip,
      });
      const accessToken = await issueAccessToken({
        user_id: loginResult.user.id,
        tenant_id: loginResult.user.tenant_id,
        email: loginResult.user.email,
        roles: tokenScope.roles,
        ...(tokenScope.scope ? { scope: tokenScope.scope } : {}),
        ...(identityId ? { identity_id: identityId } : {}),
        session_id: loginSession.sessionId,
      });
      const accessTokenExpiresIn = resolveTokenExpiration();
      // O corpo devolve a MESMA sessão que o token carrega (o `sid`).
      const { sessionId: loginSessionId } = loginSession;

      response.status(200).json({
        data: {
          authenticated: true,
          access_token: accessToken,
          accessToken,
          token_type: "Bearer",
          tokenType: "Bearer",
          expires_in: accessTokenExpiresIn,
          expiresIn: accessTokenExpiresIn,
          refresh_token: loginSession.refreshToken,
          refreshToken: loginSession.refreshToken,
          refresh_expires_at: loginSession.refreshTokenExpiresAt.toISOString(),
          refreshExpiresAt: loginSession.refreshTokenExpiresAt.toISOString(),
          refresh_expires_in: loginSession.refreshTokenExpiresIn,
          refreshExpiresIn: loginSession.refreshTokenExpiresIn,
          session_id: loginSessionId,
          sessionId: loginSessionId,
          user: loginResult.user,
          tenant: loginResult.tenant,
          // P-SESSAO-RESTRITA — o corpo segue o token (mesma decisão do helper, falha fechada).
          must_change_password: tokenScope.restricted,
          roles: tokenScope.restricted ? [] : loginResult.roles,
          permissions: tokenScope.restricted ? [] : resolveLoginPermissions(tokenScope.roles),
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

      // P-SESSAO-RESTRITA — a marca do par de DESTINO; ausente (adaptador que não a leu) = restrita.
      const tokenScope = resolveAccessTokenScope(match.mustChangePassword ?? true, match.user.roles);
      // B-USERS-SEG-DESATIVADO (P-SESSAO-VIVA) — mesma inversão do login: a sessão do par de destino nasce antes
      // do token, que a carrega (`sid`).
      const tenantSwitchSession = await (
        await resolveSessionService()
      ).createSession({
        tenant_id: match.tenant.id,
        user_id: match.user.id,
        user_agent: readHeader(request.headers["user-agent"]),
        ip_address: request.ip,
      });
      const accessToken = await issueAccessToken({
        user_id: match.user.id,
        tenant_id: match.tenant.id,
        email: match.user.email,
        roles: tokenScope.roles,
        ...(tokenScope.scope ? { scope: tokenScope.scope } : {}),
        ...(identityId ? { identity_id: identityId } : {}),
        session_id: tenantSwitchSession.sessionId,
      });
      const accessTokenExpiresIn = resolveTokenExpiration();
      // O corpo devolve a MESMA sessão que o token carrega (o `sid`).
      const { sessionId: tenantSwitchSessionId } = tenantSwitchSession;

      response.status(200).json({
        data: {
          access_token: accessToken,
          accessToken,
          token_type: "Bearer",
          tokenType: "Bearer",
          expires_in: accessTokenExpiresIn,
          expiresIn: accessTokenExpiresIn,
          refresh_token: tenantSwitchSession.refreshToken,
          refreshToken: tenantSwitchSession.refreshToken,
          refresh_expires_at: tenantSwitchSession.refreshTokenExpiresAt.toISOString(),
          refreshExpiresAt: tenantSwitchSession.refreshTokenExpiresAt.toISOString(),
          refresh_expires_in: tenantSwitchSession.refreshTokenExpiresIn,
          refreshExpiresIn: tenantSwitchSession.refreshTokenExpiresIn,
          session_id: tenantSwitchSessionId,
          sessionId: tenantSwitchSessionId,
          tenant: { id: match.tenant.id, name: match.tenant.name },
          user: { id: match.user.id, name: match.user.name, email: match.user.email },
          must_change_password: tokenScope.restricted,
          roles: [...tokenScope.roles],
          permissions: tokenScope.restricted ? [] : resolveLoginPermissions(tokenScope.roles),
        },
      });
    } catch (error) {
      // B-USERS-ACESSO-SEG (P-SEG-2) — a recusa da sessão da senha provisória sai com o código dela
      // (403 password_change_required, mensagem fixa do serviço). Qualquer outra falha segue no 500
      // genérico, sem a mensagem crua.
      if (error instanceof CoreSaasError && error.statusCode === 403) {
        response.status(403).json({
          error: { code: error.code, reason: error.reason, message: error.message },
        });
        return;
      }

      response.status(500).json({
        error: { code: "INTERNAL_SERVER_ERROR", message: "Unable to switch tenant." },
      });
    }
  });

  // B-USERS-ACESSO-SEG (S1, Emenda 1 — UEM-R2-01) — POST /auth/users/:userId/reset-password: o
  // administrador redefine a senha de um usuário da organização ATIVA dele. A rota monta ela mesma a
  // cadeia (P-SEG-3): ator do JWT (sem ele, 401: cabeçalho legado não chega aqui), contexto de
  // organização, RBAC persistente e users.manage. Corpo vazio; o id do alvo é UUID. A provisória sai SÓ
  // nesta resposta, uma vez (UEM-01), com Cache-Control: no-store. Os erros do serviço saem com o código
  // e a mensagem FIXOS dele; qualquer outra falha vira 503 reset_unavailable (nunca a mensagem crua do
  // tratador genérico — UEM-03).
  router.post(
    "/users/:userId/reset-password",
    attachAuthenticatedActor(),
    (request, response, next) => {
      if (!getAuthenticatedActor(request)) {
        response.status(401).json({
          error: { code: "UNAUTHORIZED", reason: "jwt_required", message: "Bearer token required." },
        });
        return;
      }

      next();
    },
    tenantContextMiddleware,
    createPersistentRbacContextMiddleware(
      options.resolvePersistentAuthorization
        ? { resolveAuthorization: options.resolvePersistentAuthorization }
        : {},
    ),
    requirePermission("users.manage"),
    async (request, response) => {
      response.setHeader("Cache-Control", "no-store");

      const actor = getAuthenticatedActor(request);

      if (!actor) {
        response.status(401).json({
          error: { code: "UNAUTHORIZED", reason: "jwt_required", message: "Bearer token required." },
        });
        return;
      }

      const targetUserId = readRouteParam(request.params.userId);
      const body: unknown = request.body ?? {};

      if (!uuidPattern.test(targetUserId)) {
        response.status(400).json({
          error: { code: "BAD_REQUEST", reason: "invalid_request", message: "userId must be a valid UUID." },
        });
        return;
      }

      if (!isRecord(body) || Object.keys(body).length > 0) {
        response.status(400).json({
          error: { code: "BAD_REQUEST", reason: "invalid_request", message: "The request body must be empty." },
        });
        return;
      }

      try {
        const service = await resolveIdentityLinkService();
        const result = await service.resetPasswordByAdmin(actor, targetUserId);

        response.status(200).json({
          data: {
            user_id: result.userId,
            temporary_password: result.temporaryPassword,
            must_change_password: true,
            revoked_sessions: result.revokedSessions,
          },
        });
      } catch (error) {
        const failure = isResetDomainError(error) ? error : resetUnavailableError();

        response.status(failure.statusCode).json({
          error: { code: failure.code, reason: failure.reason, message: failure.message },
        });
      }
    },
  );

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

// B-O6R-07a (§3.5) — IP do SOCKET. `trust proxy` fica DESLIGADO (default do Express), então
// `request.ip` é o peer real e não um X-Forwarded-For spoofável — mesmo raciocínio já escrito em
// `owner-portal.controller.ts:16` e `authority-portal.controller.ts:16`. Atrás de proxy confiável
// a configuração de `trust proxy` é decisão de INFRA, fora deste bloco
// (`P-O6R-B07-RATE-LIMIT-DISTRIBUIDO`). Origem indeterminável cai num balde único "unknown" —
// fail-closed: some com o freio, não sem ele.
function readSocketIp(request: Request): string {
  return request.ip ?? request.socket.remoteAddress ?? "unknown";
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

// B-USERS-ACESSO-SEG (S1, UEM-03) — só os erros FIXOS do reset passam com o próprio código; qualquer outro
// objeto (inclusive um com a forma certa e um motivo desconhecido) vira 503 reset_unavailable. Lista
// fechada: o motivo novo nasce aqui, de propósito.
const RESET_DOMAIN_REASONS: ReadonlySet<string> = new Set([
  "user_not_found",
  "user_inactive",
  "cannot_reset_self",
  "identity_linked_elsewhere",
  "target_not_manageable",
  "reset_unavailable",
]);

function isResetDomainError(error: unknown): error is IdentityLinkError {
  if (!isRecord(error)) {
    return false;
  }

  return (
    typeof error.statusCode === "number" &&
    typeof error.code === "string" &&
    typeof error.reason === "string" &&
    typeof error.message === "string" &&
    RESET_DOMAIN_REASONS.has(error.reason)
  );
}
