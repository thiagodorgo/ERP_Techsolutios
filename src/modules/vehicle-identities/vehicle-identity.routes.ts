import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { VehicleIdentityController, type VehicleIdentityServiceResolver } from "./vehicle-identity.controller.js";
import { createDefaultVehicleIdentityService } from "./vehicle-identity.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

// impound:read / impound:update REUSADAS (Ω-VID PR-02, D-Ω-VID-01) — sem permissão nova nesta fatia.
// vehicle_identity:merge é exclusiva do PR-04 (merge manual) e não existe/não é referenciada aqui.
export const VEHICLE_IDENTITY_PERMISSIONS = {
  read: "impound:read",
  write: "impound:update",
} as const;

export function createVehicleIdentityRouter(
  resolveService: VehicleIdentityServiceResolver = createDefaultVehicleIdentityService,
): Router {
  const router = Router();
  const controller = new VehicleIdentityController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/vehicle-identities",
    requirePermission(VEHICLE_IDENTITY_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );
  router.post(
    "/vehicle-identities",
    requirePermission(VEHICLE_IDENTITY_PERMISSIONS.write),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );
  router.get(
    "/vehicle-identities/:identityId",
    requirePermission(VEHICLE_IDENTITY_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );
  router.patch(
    "/vehicle-identities/:identityId",
    requirePermission(VEHICLE_IDENTITY_PERMISSIONS.write),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
