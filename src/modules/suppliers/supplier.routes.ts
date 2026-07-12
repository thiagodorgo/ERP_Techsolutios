import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { SupplierController, type SupplierServiceResolver } from "./supplier.controller.js";
import { createDefaultSupplierService } from "./supplier.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const SUPPLIER_PERMISSIONS = {
  read: "suppliers:read",
  create: "suppliers:create",
  update: "suppliers:update",
} as const;

export function createSupplierRouter(
  resolveService: SupplierServiceResolver = createDefaultSupplierService,
): Router {
  const router = Router();
  const controller = new SupplierController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/suppliers",
    requirePermission(SUPPLIER_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.post(
    "/suppliers",
    requirePermission(SUPPLIER_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  router.get(
    "/suppliers/:supplierId",
    requirePermission(SUPPLIER_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );

  router.patch(
    "/suppliers/:supplierId",
    requirePermission(SUPPLIER_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
