import type { NextFunction, Request, Response } from "express";

import { recordRequestAuditBestEffort } from "../audit/audit-request-context.js";
import type { Permission } from "../permissions/catalog.js";

export function requirePermission(permission: Permission) {
  return requireAnyPermission([permission]);
}

export function requireAnyPermission(permissions: readonly Permission[]) {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const tenantContext = request.tenantContext;

    if (!tenantContext?.tenantId) {
      await recordPermissionDenied(request, permissions, "tenant_required");
      sendForbidden(
        response,
        "tenant_required",
        "Tenant context is required.",
      );
      return;
    }

    if (tenantContext.roles.length === 0) {
      await recordPermissionDenied(request, permissions, "role_required");
      sendForbidden(response, "role_required", "Role is required.");
      return;
    }

    const hasPermission = permissions.some((permission) => tenantContext.permissions.includes(permission));

    if (!hasPermission) {
      await recordPermissionDenied(request, permissions, "permission_required");
      sendForbidden(
        response,
        "permission_required",
        `One of these permissions is required: ${permissions.join(", ")}.`,
      );
      return;
    }

    next();
  };
}

export function requireTenantContext(request: Request) {
  const tenantContext = request.tenantContext;

  if (!tenantContext?.tenantId) {
    throw new Error("Tenant context is required after RBAC middleware.");
  }

  return tenantContext;
}

function recordPermissionDenied(
  request: Request,
  permissions: readonly Permission[],
  reason: string,
): Promise<void> {
  return recordRequestAuditBestEffort(request, {
    action: "permission.denied",
    resourceType: "http_route",
    resourceId: `${request.method} ${request.path}`,
    outcome: "denied",
    severity: "warning",
    metadata: {
      reason,
      requiredPermissions: permissions,
      roles: request.tenantContext?.roles ?? [],
      permissions: request.tenantContext?.permissions ?? [],
    },
  });
}

function sendForbidden(
  response: Response,
  reason: string,
  message: string,
): void {
  response.status(403).json({
    error: {
      code: "FORBIDDEN",
      reason,
      message,
    },
  });
}
