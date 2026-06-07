import type { NextFunction, Request, Response } from "express";

import { resolveRequestActor } from "../auth/middleware/authenticated-actor.middleware.js";

export const PLATFORM_PERMISSIONS = [
  "platform:tenants:read",
  "platform:tenants:create",
  "platform:tenants:update",
  "platform:tenants:suspend",
  "platform:modules:manage",
  "platform:users:create_admin",
  "platform:audit:read",
  "platform:health:read",
] as const;

export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number];

const platformPermissionSet = new Set<string>(PLATFORM_PERMISSIONS);
const platformRoles = new Set(["super_admin", "platform_admin"]);

export function requirePlatformPermission(permission: PlatformPermission) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const actor = resolveRequestActor(request);

    if (!actor) {
      sendForbidden(response, "platform_actor_required", "Platform actor is required.");
      return;
    }

    if (actor.authType === "legacy_headers" && !allowsLegacyPlatformHeaders()) {
      sendForbidden(
        response,
        "platform_legacy_headers_disabled",
        "Legacy platform headers are disabled outside development and test.",
      );
      return;
    }

    const normalizedRoles = actor.roles.map((role) => role.trim().toLowerCase());
    const hasPlatformRole = normalizedRoles.some((role) => platformRoles.has(role));
    const explicitPermissions = actor.authType === "legacy_headers" ? actor.permissions : [];
    const hasExplicitPermission = explicitPermissions.some((item) => item === permission);

    if (!hasPlatformRole && !hasExplicitPermission) {
      sendForbidden(response, "platform_permission_required", `Permission ${permission} is required.`);
      return;
    }

    next();
  };
}

export function isPlatformPermission(value: string): value is PlatformPermission {
  return platformPermissionSet.has(value);
}

function sendForbidden(response: Response, reason: string, message: string): void {
  response.status(403).json({
    error: {
      code: "FORBIDDEN",
      reason,
      message,
    },
  });
}

function allowsLegacyPlatformHeaders(): boolean {
  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();

  return !nodeEnv || nodeEnv === "development" || nodeEnv === "test";
}
