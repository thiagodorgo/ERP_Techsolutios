import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { ServiceCatalogController, type ServiceCatalogServiceResolver } from "./service-catalog.controller.js";
import { createDefaultServiceCatalogService } from "./service-catalog.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const SERVICE_CATALOG_PERMISSIONS = {
  read: "service_catalog:read",
  create: "service_catalog:create",
  update: "service_catalog:update",
} as const;

export function createServiceCatalogRouter(
  resolveService: ServiceCatalogServiceResolver = createDefaultServiceCatalogService,
): Router {
  const router = Router();
  const controller = new ServiceCatalogController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/service-catalog",
    requirePermission(SERVICE_CATALOG_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.post(
    "/service-catalog",
    requirePermission(SERVICE_CATALOG_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  router.get(
    "/service-catalog/:serviceId",
    requirePermission(SERVICE_CATALOG_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );

  router.patch(
    "/service-catalog/:serviceId",
    requirePermission(SERVICE_CATALOG_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
