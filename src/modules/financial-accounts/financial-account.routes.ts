import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { FinancialAccountController, type FinancialAccountServiceResolver } from "./financial-account.controller.js";
import { createDefaultFinancialAccountService } from "./financial-account.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const FINANCIAL_ACCOUNT_PERMISSIONS = {
  read: "financial_accounts:read",
  create: "financial_accounts:create",
  update: "financial_accounts:update",
} as const;

export function createFinancialAccountRouter(
  resolveService: FinancialAccountServiceResolver = createDefaultFinancialAccountService,
): Router {
  const router = Router();
  const controller = new FinancialAccountController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/financial-accounts",
    requirePermission(FINANCIAL_ACCOUNT_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.post(
    "/financial-accounts",
    requirePermission(FINANCIAL_ACCOUNT_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  router.get(
    "/financial-accounts/:financialAccountId",
    requirePermission(FINANCIAL_ACCOUNT_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );

  router.patch(
    "/financial-accounts/:financialAccountId",
    requirePermission(FINANCIAL_ACCOUNT_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  // DELETE lógico usa a permissão de update (não é uma remoção física — é uma mutação de estado).
  router.delete(
    "/financial-accounts/:financialAccountId",
    requirePermission(FINANCIAL_ACCOUNT_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.delete(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
