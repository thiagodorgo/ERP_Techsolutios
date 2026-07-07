import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { VehicleController, type VehicleServiceResolver } from "./vehicle.controller.js";
import { createDefaultVehicleService } from "./vehicle.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const VEHICLE_PERMISSIONS = {
  read: "vehicles:read",
  create: "vehicles:create",
  update: "vehicles:update",
} as const;

export function createVehicleRouter(resolveService: VehicleServiceResolver = createDefaultVehicleService): Router {
  const router = Router();
  const controller = new VehicleController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/vehicles",
    requirePermission(VEHICLE_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.post(
    "/vehicles",
    requirePermission(VEHICLE_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  router.get(
    "/vehicles/:vehicleId",
    requirePermission(VEHICLE_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );

  router.patch(
    "/vehicles/:vehicleId",
    requirePermission(VEHICLE_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
