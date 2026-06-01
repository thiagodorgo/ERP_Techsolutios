import type { NextFunction, Request, Response } from "express";

import { resolveRequestActor } from "../../auth/middleware/authenticated-actor.middleware.js";
import type { RequestActor } from "../../auth/types/auth.types.js";
import {
  isValidPermission,
  isValidRole,
  resolvePermissionsForRoles,
  uniquePermissions,
  type Permission,
  type Role,
} from "../permissions/catalog.js";
import type { AuthenticatedActor as CoreAuthenticatedActor } from "../types/core-saas.types.js";

declare module "express-serve-static-core" {
  interface Request {
    tenantContext?: CoreAuthenticatedActor;
  }
}

export function tenantContextMiddleware(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  const actor = resolveRequestActor(request);
  const explicitPermissions =
    actor?.authType === "legacy_headers" &&
    readHeader(request, "x-permissions") !== undefined;

  request.tenantContext = createTenantContextFromRequestActor(actor, explicitPermissions);

  next();
}

export function createTenantContextFromRequestActor(
  actor: RequestActor | null,
  explicitPermissions = false,
): CoreAuthenticatedActor {
  const roles = parseRoles(actor?.roles ?? []);
  const permissions = resolveEffectivePermissions(
    roles,
    parsePermissions(actor?.authType === "legacy_headers" ? actor.permissions : []),
    actor?.authType === "legacy_headers" && explicitPermissions,
  );

  return {
    tenantId: actor?.tenantId ?? "",
    userId: actor?.userId ?? "anonymous",
    roles,
    permissions,
    explicitPermissions: actor?.authType === "legacy_headers" && explicitPermissions,
  };
}

function resolveEffectivePermissions(
  roles: readonly Role[],
  requestedPermissions: readonly Permission[],
  explicitPermissions: boolean,
): Permission[] {
  const rolePermissions = resolvePermissionsForRoles(roles);

  if (!explicitPermissions) {
    return rolePermissions;
  }

  const requestedPermissionSet = new Set(requestedPermissions);

  return uniquePermissions(
    rolePermissions.filter((permission) => requestedPermissionSet.has(permission)),
  );
}

function parseRoles(values: readonly string[]): Role[] {
  return values
    .filter(isValidRole)
    .map((role) => role.toLowerCase() as Role);
}

function parsePermissions(values: readonly string[]): Permission[] {
  return values
    .filter(isValidPermission)
    .map((permission) => permission.toLowerCase() as Permission);
}

function readHeader(request: Request, headerName: string): string | undefined {
  const value = request.header(headerName);

  return value?.trim() || undefined;
}
