import { Router, type Request, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { sendRouteError } from "../core-saas/routes/http.js";
import { FinancialPeriodCloseController, type FinancialPeriodCloseServiceResolver } from "./financial-period-close.controller.js";
import { createDefaultFinancialPeriodCloseService } from "./financial-period-close.service.js";
import { FinancialPeriodCloseError } from "./financial-period-close.types.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const FINANCIAL_PERIOD_PERMISSIONS = {
  read: "financial_period:read",
  close: "financial_period:close",
  reopen: "financial_period:reopen",
} as const;

export function createFinancialPeriodCloseRouter(
  resolveService: FinancialPeriodCloseServiceResolver = createDefaultFinancialPeriodCloseService,
): Router {
  const router = Router();
  const controller = new FinancialPeriodCloseController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/financial-periods",
    requirePermission(FINANCIAL_PERIOD_PERMISSIONS.read),
    handlePeriodRoute((request) => controller.list(request)),
  );

  router.get(
    "/financial-periods/:period",
    requirePermission(FINANCIAL_PERIOD_PERMISSIONS.read),
    handlePeriodRoute((request) => controller.get(request)),
  );

  // CLOSE — trava retroativa da competência. Path de 3 segmentos (POST) → não colide com GET /:period.
  router.post(
    "/financial-periods/:period/close",
    requirePermission(FINANCIAL_PERIOD_PERMISSIONS.close),
    handlePeriodRoute((request) => controller.close(request)),
  );

  // REOPEN — override administrativo (mais restrito que close: fora de finance). exige reason.
  router.post(
    "/financial-periods/:period/reopen",
    requirePermission(FINANCIAL_PERIOD_PERMISSIONS.reopen),
    handlePeriodRoute((request) => controller.reopen(request)),
  );

  return router;
}

// Wrapper local: um FinancialPeriodCloseError com `details` (ex.: 422 pending_items_block_close lista as
// pendências no corpo) é serializado com details; os demais erros caem no sendRouteError compartilhado.
function handlePeriodRoute(handler: (request: Request) => Promise<ControllerResult>) {
  return async (request: Request, response: Response): Promise<void> => {
    try {
      const result = await handler(request);
      response.status(result.status ?? 200).json(result.body ?? { data: result.data });
    } catch (error) {
      if (error instanceof FinancialPeriodCloseError && error.details) {
        response.status(error.statusCode).json({
          error: { code: error.code, reason: error.reason, message: error.message, details: error.details },
        });
        return;
      }
      sendRouteError(response, error);
    }
  };
}
