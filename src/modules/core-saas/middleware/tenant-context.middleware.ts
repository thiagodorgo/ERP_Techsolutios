import type { NextFunction, Request, Response } from "express";

import {
  isValidPermission,
  isValidRole,
  resolvePermissionsForRoles,
  uniquePermissions,
  type Permission,
  type Role,
} from "../permissions/catalog.js";
import type { AuthenticatedActor } from "../types/core-saas.types.js";

declare module "express-serve-static-core" {
  interface Request {
    tenantContext?: AuthenticatedActor;
  }
}

export function tenantContextMiddleware(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  const tenantId = readHeader(request, "x-tenant-id");
  const userId =
    readHeader(request, "x-user-id") ??
    readHeader(request, "x-actor-user-id") ??
    "anonymous";
  const roles = parseRoles(
    readHeader(request, "x-role") ?? readHeader(request, "x-roles"),
  );
  const explicitPermissionsHeader = readHeader(request, "x-permissions");
  const explicitPermissions = explicitPermissionsHeader !== undefined;
  const permissions = resolveEffectivePermissions(
    roles,
    parsePermissions(explicitPermissionsHeader),
    explicitPermissions,
  );

  request.tenantContext = {
    tenantId: tenantId ?? "",
    userId,
    roles,
    permissions,
    explicitPermissions,
  };

  next();
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

function parseRoles(value: string | undefined): Role[] {
  return parseHeaderList(value)
    .filter(isValidRole)
    .map((role) => role.toLowerCase() as Role);
}

function parsePermissions(value: string | undefined): Permission[] {
  return parseHeaderList(value)
    .filter(isValidPermission)
    .map((permission) => permission.toLowerCase() as Permission);
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
