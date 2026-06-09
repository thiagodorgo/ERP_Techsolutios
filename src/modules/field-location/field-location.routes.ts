import { Router, type Response } from "express";

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

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
