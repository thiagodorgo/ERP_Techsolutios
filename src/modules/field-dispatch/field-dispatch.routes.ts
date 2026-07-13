import { Router, type RequestHandler, type Response } from "express";

import type { Permission } from "../core-saas/permissions/catalog.js";
import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { FieldDispatchController, type FieldDispatchServiceResolver } from "./field-dispatch.controller.js";
import { createDefaultFieldDispatchService } from "./field-dispatch.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const FIELD_DISPATCH_PERMISSIONS = {
  read: "field_dispatch:read",
  create: "field_dispatch:create",
  update: "field_dispatch:update",
  cancel: "field_dispatch:cancel",
  reassign: "field_dispatch:reassign",
} as const satisfies Record<string, Permission>;

export function createFieldDispatchRouter(
  coreService: ICoreSaasService,
  resolveService: FieldDispatchServiceResolver = () => createDefaultFieldDispatchService(coreService),
): Router {
  const router = Router();
  const controller = new FieldDispatchController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/operations/dispatches",
    requirePermission(FIELD_DISPATCH_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.post(
    "/operations/dispatches",
    requirePermission(FIELD_DISPATCH_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  router.get(
    "/operations/dispatches/:dispatchId",
    requirePermission(FIELD_DISPATCH_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );

  // Ω3-b — timeline do despacho (eventos create/status/reassign/cancel) como rota dedicada.
  router.get(
    "/operations/dispatches/:dispatchId/timeline",
    requirePermission(FIELD_DISPATCH_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.timeline(request));
    }),
  );

  router.patch(
    "/operations/dispatches/:dispatchId/status",
    requireStatusPermission(),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.changeStatus(request));
    }),
  );

  router.patch(
    "/operations/dispatches/:dispatchId/reassign",
    requirePermission(FIELD_DISPATCH_PERMISSIONS.reassign),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.reassign(request));
    }),
  );

  return router;
}

function requireStatusPermission(): RequestHandler {
  return (request, response, next) => {
    const permission =
      typeof request.body?.status === "string" && request.body.status.trim() === "cancelled"
        ? FIELD_DISPATCH_PERMISSIONS.cancel
        : FIELD_DISPATCH_PERMISSIONS.update;

    return requirePermission(permission)(request, response, next);
  };
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
