import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { PriceTableController, type PriceTableServiceResolver } from "./price-table.controller.js";
import { createDefaultPriceTableService } from "./price-table.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const PRICE_TABLE_PERMISSIONS = {
  read: "price_tables:read",
  create: "price_tables:create",
  update: "price_tables:update",
} as const;

export function createPriceTableRouter(
  resolveService: PriceTableServiceResolver = createDefaultPriceTableService,
): Router {
  const router = Router();
  const controller = new PriceTableController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/price-tables",
    requirePermission(PRICE_TABLE_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.post(
    "/price-tables",
    requirePermission(PRICE_TABLE_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  router.get(
    "/price-tables/:priceTableId",
    requirePermission(PRICE_TABLE_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );

  router.patch(
    "/price-tables/:priceTableId",
    requirePermission(PRICE_TABLE_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
