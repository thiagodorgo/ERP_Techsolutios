import type { NextFunction, Request, Response } from "express";

import type { Permission } from "../permissions/catalog.js";

export function requirePermission(permission: Permission) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const tenantContext = request.tenantContext;

    if (!tenantContext?.tenantId) {
      sendForbidden(
        response,
        "tenant_required",
        "Tenant context is required.",
      );
      return;
    }

    if (tenantContext.roles.length === 0) {
      sendForbidden(response, "role_required", "Role is required.");
      return;
    }

    if (!tenantContext.permissions.includes(permission)) {
      sendForbidden(
        response,
        "permission_required",
        `Permission ${permission} is required.`,
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
