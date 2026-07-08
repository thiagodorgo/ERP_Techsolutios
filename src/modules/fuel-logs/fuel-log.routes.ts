import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { FuelLogController, type FuelLogServiceResolver } from "./fuel-log.controller.js";
import { createDefaultFuelLogService } from "./fuel-log.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const FUEL_LOG_PERMISSIONS = {
  read: "fuel_logs:read",
  create: "fuel_logs:create",
  update: "fuel_logs:update",
} as const;

export function createFuelLogRouter(resolveService: FuelLogServiceResolver = createDefaultFuelLogService): Router {
  const router = Router();
  const controller = new FuelLogController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/fuel-logs",
    requirePermission(FUEL_LOG_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.post(
    "/fuel-logs",
    requirePermission(FUEL_LOG_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  router.get(
    "/fuel-logs/:fuelLogId",
    requirePermission(FUEL_LOG_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );

  router.patch(
    "/fuel-logs/:fuelLogId",
    requirePermission(FUEL_LOG_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
