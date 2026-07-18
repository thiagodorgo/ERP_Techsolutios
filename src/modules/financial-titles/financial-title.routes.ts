import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { FinancialTitleController, type FinancialTitleServiceResolver } from "./financial-title.controller.js";
import { createDefaultFinancialTitleService } from "./financial-title.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const FINANCIAL_TITLE_PERMISSIONS = {
  read: "financial_titles:read",
  create: "financial_titles:create",
  update: "financial_titles:update",
} as const;

export function createFinancialTitleRouter(
  resolveService: FinancialTitleServiceResolver = createDefaultFinancialTitleService,
): Router {
  const router = Router();
  const controller = new FinancialTitleController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/financial-titles",
    requirePermission(FINANCIAL_TITLE_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.post(
    "/financial-titles",
    requirePermission(FINANCIAL_TITLE_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  router.get(
    "/financial-titles/:financialTitleId",
    requirePermission(FINANCIAL_TITLE_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );

  // Transição de status (máquina de estado). Usa a permissão de update (é uma mutação de estado).
  router.patch(
    "/financial-titles/:financialTitleId/status",
    requirePermission(FINANCIAL_TITLE_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.changeStatus(request));
    }),
  );

  router.patch(
    "/financial-titles/:financialTitleId",
    requirePermission(FINANCIAL_TITLE_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  // DELETE lógico usa a permissão de update (não é remoção física — é mutação de estado via deleted_at).
  router.delete(
    "/financial-titles/:financialTitleId",
    requirePermission(FINANCIAL_TITLE_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.delete(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
