import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { PatiosDashboardController, type PatiosDashboardServiceResolver } from "./patios-dashboard.controller.js";
import { createDefaultPatiosDashboardService } from "./patios-dashboard.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

// impound:read REUSADA (D-Ω5P-DASH-01, plano PR-20 §d) — sem permissão nova; mesma distribuição de papéis do
// módulo de pátios inteiro.
export const PATIOS_DASHBOARD_PERMISSIONS = {
  read: "impound:read",
} as const;

export function createPatiosDashboardRouter(
  resolveService: PatiosDashboardServiceResolver = createDefaultPatiosDashboardService,
): Router {
  const router = Router();
  const controller = new PatiosDashboardController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/patios/dashboard/summary",
    requirePermission(PATIOS_DASHBOARD_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.summary(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
