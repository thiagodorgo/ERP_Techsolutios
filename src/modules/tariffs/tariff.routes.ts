import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { TariffController, type TariffServiceResolver } from "./tariff.controller.js";
import { createDefaultTariffService } from "./tariff.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const TARIFF_PERMISSIONS = {
  read: "tariffs:read",
  create: "tariffs:create",
  update: "tariffs:update",
} as const;

export function createTariffRouter(
  resolveService: TariffServiceResolver = createDefaultTariffService,
): Router {
  const router = Router();
  const controller = new TariffController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/tariffs",
    requirePermission(TARIFF_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.post(
    "/tariffs",
    requirePermission(TARIFF_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  router.get(
    "/tariffs/:tariffId",
    requirePermission(TARIFF_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );

  router.patch(
    "/tariffs/:tariffId",
    requirePermission(TARIFF_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
