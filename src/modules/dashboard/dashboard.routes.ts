import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { DashboardController, type DashboardServiceResolver } from "./dashboard.controller.js";
import { createDefaultDashboardService } from "./dashboard.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const DASHBOARD_PERMISSIONS = {
  read: "dashboard:read",
} as const;

export function createDashboardRouter(
  resolveService: DashboardServiceResolver = createDefaultDashboardService,
): Router {
  const router = Router();
  const controller = new DashboardController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/dashboard/summary",
    requirePermission(DASHBOARD_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.summary(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
