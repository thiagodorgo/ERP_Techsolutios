import type { NextFunction, Request, Response } from "express";

import { verifyAccessToken } from "../services/jwt.service.js";
import type {
  AuthenticatedActor,
  RequestActor,
} from "../types/auth.types.js";

declare module "express-serve-static-core" {
  interface Request {
    actor?: AuthenticatedActor;
  }
}

export function attachAuthenticatedActor() {
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

      request.actor = {
        userId: payload.sub,
        tenantId: payload.tenant_id,
        email: payload.email,
        roles: [...payload.roles],
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
