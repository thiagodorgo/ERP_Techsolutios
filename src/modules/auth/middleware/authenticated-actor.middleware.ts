import type { NextFunction, Request, Response } from "express";

import { verifyAccessToken } from "../services/jwt.service.js";
import { sessionLiveness, type SessionLivenessVerdict } from "../services/session-liveness.service.js";
import type {
  AuthenticatedActor,
  AuthenticatedTokenPayload,
  RequestActor,
} from "../types/auth.types.js";

declare module "express-serve-static-core" {
  interface Request {
    actor?: AuthenticatedActor;
  }
}

export type AttachAuthenticatedActorOptions = {
  readonly acceptPasswordChangeSession?: boolean;
};

// B-USERS-SEG-DESATIVADO (P-SESSAO-VIVA) — o portão é o ÚNICO verificador do access token e está em todas as
// montagens; aqui ele também confere, a cada requisição, se a sessão do token está viva e o usuário ativo
// (`session-liveness.service.ts`). A conferência roda UMA vez por requisição (memo): uma requisição atravessa até 60
// montagens do portão, e a primeira consulta enquanto as outras reaproveitam o mesmo veredito (T14). WeakMap: o
// veredito some com a requisição.
const livenessByRequest = new WeakMap<Request, Promise<SessionLivenessVerdict>>();

function checkSessionLivenessOnce(
  request: Request,
  payload: AuthenticatedTokenPayload,
): Promise<SessionLivenessVerdict> {
  const cached = livenessByRequest.get(request);

  if (cached) {
    return cached;
  }

  const pending = sessionLiveness.check({
    userId: payload.sub,
    tenantId: payload.tenant_id,
    ...(payload.sid ? { sessionId: payload.sid } : {}),
  });

  livenessByRequest.set(request, pending);

  return pending;
}

export function attachAuthenticatedActor(options: AttachAuthenticatedActorOptions = {}) {
  return async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    const authorizationHeader = readHeader(request, "authorization");

    if (!authorizationHeader) {
      next();
      return;
    }

    const token = parseBearerToken(authorizationHeader);

    if (!token) {
      sendInvalidToken(response);
      return;
    }

    try {
      const payload = await verifyAccessToken(token);
      let verdict: SessionLivenessVerdict;

      // A sessão é conferida ANTES do escopo restrito: a provisória com sessão viva segue no 403 dela (R8 do plano).
      // Falha da conferência (banco fora, tempo esgotado) é 503 e NUNCA 401: 401 desloga os clientes, e banco
      // instável não pode derrubar a sessão de todo mundo.
      try {
        verdict = await checkSessionLivenessOnce(request, payload);
      } catch {
        sendSessionCheckUnavailable(response);
        return;
      }

      if (verdict === "inactive") {
        sendSessionInactive(response);
        return;
      }

      if (payload.scope === "password_change" && options.acceptPasswordChangeSession !== true) {
        sendPasswordChangeRequired(response);
        return;
      }

      request.actor = {
        userId: payload.sub,
        tenantId: payload.tenant_id,
        email: payload.email,
        roles: [...payload.roles],
        ...(payload.scope ? { sessionScope: payload.scope } : {}),
        ...(payload.sid ? { sessionId: payload.sid } : {}),
        authType: "jwt",
      };

      next();
    } catch {
      sendInvalidToken(response);
    }
  };
}

export function getAuthenticatedActor(request: Request): AuthenticatedActor | undefined {
  return request.actor;
}

export function hasAuthenticatedActor(request: Request): boolean {
  return request.actor !== undefined;
}

export function resolveRequestActor(request: Request): RequestActor | null {
  if (request.actor) {
    return request.actor;
  }

  const tenantId = readHeader(request, "x-tenant-id");
  const userId =
    readHeader(request, "x-user-id") ?? readHeader(request, "x-actor-user-id");
  const roles = parseHeaderList(
    readHeader(request, "x-role") ?? readHeader(request, "x-roles"),
  );
  const permissions = parseHeaderList(readHeader(request, "x-permissions"));

  if (!tenantId && !userId && roles.length === 0 && permissions.length === 0) {
    return null;
  }

  return {
    ...(userId ? { userId } : {}),
    ...(tenantId ? { tenantId } : {}),
    roles,
    permissions,
    authType: "legacy_headers",
  };
}

function parseBearerToken(authorizationHeader: string): string | null {
  const [scheme, token, ...extraParts] = authorizationHeader.split(/\s+/);

  if (scheme?.toLowerCase() !== "bearer" || !token || extraParts.length > 0) {
    return null;
  }

  return token;
}

function parseHeaderList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readHeader(request: Request, headerName: string): string | undefined {
  const value = request.header(headerName);

  return value?.trim() || undefined;
}

function sendInvalidToken(response: Response): void {
  response.status(401).json({
    error: {
      code: "INVALID_TOKEN",
      message: "Invalid or expired access token.",
    },
  });
}

// Sessão revogada, vencida ou alheia, ou usuário desativado: o MESMO 401 do token inválido (código e mensagem
// fixos), com o `reason` que diz qual recusa foi.
function sendSessionInactive(response: Response): void {
  response.status(401).json({
    error: {
      code: "INVALID_TOKEN",
      reason: "session_inactive",
      message: "Invalid or expired access token.",
    },
  });
}

function sendSessionCheckUnavailable(response: Response): void {
  response.status(503).json({
    error: {
      code: "SERVICE_UNAVAILABLE",
      reason: "session_check_unavailable",
      message: "Unable to verify the session right now. Try again.",
    },
  });
}

function sendPasswordChangeRequired(response: Response): void {
  response.status(403).json({
    error: {
      code: "FORBIDDEN",
      reason: "password_change_required",
      message: "Password change is required before this action.",
    },
  });
}
