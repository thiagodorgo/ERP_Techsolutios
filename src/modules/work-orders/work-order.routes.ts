import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { WorkOrderController, type WorkOrderServiceResolver } from "./work-order.controller.js";
import { createDefaultWorkOrderService } from "./work-order.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const WORK_ORDER_PERMISSIONS = {
  read: "work_orders:read",
  create: "work_orders:create",
  update: "work_orders:update",
  assign: "work_orders:assign",
  status: "work_orders:status",
  cancel: "work_orders:cancel",
  delete: "work_orders:delete",
} as const;

export function createWorkOrderRouter(resolveService: WorkOrderServiceResolver = createDefaultWorkOrderService): Router {
  const router = Router();
  const controller = new WorkOrderController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/work-orders",
    requirePermission(WORK_ORDER_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.post(
    "/work-orders",
    requirePermission(WORK_ORDER_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  router.get(
    "/work-orders/:workOrderId",
    requirePermission(WORK_ORDER_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );

  router.patch(
    "/work-orders/:workOrderId",
    requirePermission(WORK_ORDER_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  router.patch(
    "/work-orders/:workOrderId/status",
    requirePermission(WORK_ORDER_PERMISSIONS.status),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.changeStatus(request));
    }),
  );

  router.post(
    "/work-orders/:workOrderId/assign",
    requirePermission(WORK_ORDER_PERMISSIONS.assign),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.assign(request));
    }),
  );

  router.get(
    "/work-orders/:workOrderId/timeline",
    requirePermission(WORK_ORDER_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.timeline(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
