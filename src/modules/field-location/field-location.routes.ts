import { Router, type NextFunction, type Request, type Response } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { FieldLocationController, type FieldLocationServiceResolver } from "./field-location.controller.js";
import { createDefaultFieldLocationService } from "./field-location.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const FIELD_LOCATION_PERMISSIONS = {
  read: "field_location:read",
  send: "field_location:send",
  history: "field_location:history",
} as const;

// B-SAN3-17 (P6 do plano v2): o aceite exige a permissão de enviar posição; a revogação não exige permissão nominal
// (só o ator autenticado com papel na organização), porque a LGPD pede revogação facilitada e quem perdeu o `send`
// continua podendo dizer não. As duas só alcançam o perfil do próprio ator.
const LOCATION_CONSENT_GRANT_PERMISSION = FIELD_LOCATION_PERMISSIONS.send;

export function createFieldLocationRouter(
  resolveService: FieldLocationServiceResolver = createDefaultFieldLocationService,
): Router {
  const router = Router();
  const controller = new FieldLocationController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.post(
    "/mobile/field-locations",
    requirePermission(FIELD_LOCATION_PERMISSIONS.send),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.recordMobileLocation(request));
    }),
  );

  router.post(
    "/mobile/location-consent",
    requirePermission(LOCATION_CONSENT_GRANT_PERMISSION),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.setOwnTrackingConsent(request, true));
    }),
  );

  router.post(
    "/mobile/location-consent/revoke",
    requireAuthenticatedTenantActor,
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.setOwnTrackingConsent(request, false));
    }),
  );

  router.get(
    "/field-locations/latest",
    requirePermission(FIELD_LOCATION_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.listLatest(request));
    }),
  );

  router.get(
    "/field-locations/history",
    requirePermission(FIELD_LOCATION_PERMISSIONS.history),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.listHistory(request));
    }),
  );

  return router;
}

// A guarda da revogação, local a este roteador (`core-saas/middleware/**` fica intocado): o mesmo formato de erro e a
// mesma auditoria de negação do `requirePermission`, sem permissão nominal. Como `/auth/password`, alcança todo
// usuário com papel na organização.
async function requireAuthenticatedTenantActor(request: Request, response: Response, next: NextFunction): Promise<void> {
  const tenantContext = request.tenantContext;

  if (!tenantContext?.tenantId) {
    await recordRevocationDenied(request, "tenant_required");
    sendForbidden(response, "tenant_required", "Tenant context is required.");
    return;
  }

  if (tenantContext.roles.length === 0) {
    await recordRevocationDenied(request, "role_required");
    sendForbidden(response, "role_required", "Role is required.");
    return;
  }

  next();
}

function recordRevocationDenied(request: Request, reason: string): Promise<void> {
  return recordRequestAuditBestEffort(request, {
    action: "permission.denied",
    resourceType: "http_route",
    resourceId: `${request.method} ${request.path}`,
    outcome: "denied",
    severity: "warning",
    metadata: {
      reason,
      requiredPermissions: [],
      roles: request.tenantContext?.roles ?? [],
      permissions: request.tenantContext?.permissions ?? [],
    },
  });
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

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
