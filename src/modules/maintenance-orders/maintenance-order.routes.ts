import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { createPayableSourceRoutes } from "../financial-titles/payable-source.routes.js";
import {
  MaintenanceOrderController,
  type MaintenanceOrderServiceResolver,
} from "./maintenance-order.controller.js";
import { createDefaultMaintenanceOrderService } from "./maintenance-order.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const MAINTENANCE_ORDER_PERMISSIONS = {
  read: "maintenance_orders:read",
  create: "maintenance_orders:create",
  update: "maintenance_orders:update",
} as const;

export function createMaintenanceOrderRouter(
  resolveService: MaintenanceOrderServiceResolver = createDefaultMaintenanceOrderService,
): Router {
  const router = Router();
  const controller = new MaintenanceOrderController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/maintenance-orders",
    requirePermission(MAINTENANCE_ORDER_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.post(
    "/maintenance-orders",
    requirePermission(MAINTENANCE_ORDER_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  router.get(
    "/maintenance-orders/:maintenanceOrderId",
    requirePermission(MAINTENANCE_ORDER_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );

  router.patch(
    "/maintenance-orders/:maintenanceOrderId",
    requirePermission(MAINTENANCE_ORDER_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  // Ω4C PR-02 — Contas a Pagar por origem: POST/DELETE/GET /maintenance-orders/:id/payable. resolveOwnership
  // usa o service.get() do PRÓPRIO módulo (404 cross-tenant nativo) antes de tocar título. Herda tenant+RBAC.
  router.use(
    "/maintenance-orders",
    createPayableSourceRoutes({
      sourceType: "maintenance_order",
      resolveOwnership: async (actor, sourceId) => {
        await (await resolveService()).get(actor, sourceId);
      },
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
