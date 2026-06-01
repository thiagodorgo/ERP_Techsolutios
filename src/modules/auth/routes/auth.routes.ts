import { Router } from "express";

import { getLocalAuthLoginService } from "../auth-runtime.js";
import {
  getAccessTokenExpiresInSeconds,
  signAccessToken,
} from "../services/jwt.service.js";
import type { LocalAuthLoginService } from "../services/local-auth-login.service.js";

type AuthRouterOptions = {
  readonly getLoginService?: () => Promise<LocalAuthLoginService>;
  readonly signAccessToken?: typeof signAccessToken;
  readonly getAccessTokenExpiresInSeconds?: typeof getAccessTokenExpiresInSeconds;
};

type LoginRequestBody = {
  readonly tenantId?: unknown;
  readonly email?: unknown;
  readonly password?: unknown;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createAuthRouter(options: AuthRouterOptions = {}): Router {
  const router = Router();
  const resolveLoginService = options.getLoginService ?? getLocalAuthLoginService;
  const issueAccessToken = options.signAccessToken ?? signAccessToken;
  const resolveTokenExpiration =
    options.getAccessTokenExpiresInSeconds ?? getAccessTokenExpiresInSeconds;

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

      const loginService = await resolveLoginService();
      const loginResult = await loginService.authenticateLocalCredential({
        tenant_id: parsedBody.tenantId,
        email: parsedBody.email,
        password: parsedBody.password,
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

      response.status(200).json({
        data: {
          authenticated: true,
          access_token: accessToken,
          token_type: "Bearer",
          expires_in: resolveTokenExpiration(),
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

  return router;
}

type ParsedLoginRequestBody =
  | {
      readonly ok: true;
      readonly tenantId: string;
      readonly email: string;
      readonly password: string;
    }
  | {
      readonly ok: false;
      readonly message: string;
    };

function parseLoginRequestBody(body: unknown): ParsedLoginRequestBody {
  const input = isRecord(body) ? (body as LoginRequestBody) : {};
  const tenantId = readString(input.tenantId);
  const email = readString(input.email).trim().toLowerCase();
  const password = readString(input.password);

  if (!tenantId) {
    return {
      ok: false,
      message: "tenantId is required.",
    };
  }

  if (!uuidPattern.test(tenantId)) {
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

function isBasicEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
