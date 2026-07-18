import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { FinancialEntryController, type FinancialEntryServiceResolver } from "./financial-entry.controller.js";
import { createDefaultFinancialEntryService } from "./financial-entry.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const FINANCIAL_ENTRY_PERMISSIONS = {
  read: "financial_entries:read",
  create: "financial_entries:create",
  update: "financial_entries:update",
} as const;

export function createFinancialEntryRouter(
  resolveService: FinancialEntryServiceResolver = createDefaultFinancialEntryService,
): Router {
  const router = Router();
  const controller = new FinancialEntryController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/financial-entries",
    requirePermission(FINANCIAL_ENTRY_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.post(
    "/financial-entries",
    requirePermission(FINANCIAL_ENTRY_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  router.get(
    "/financial-entries/:financialEntryId",
    requirePermission(FINANCIAL_ENTRY_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );

  router.patch(
    "/financial-entries/:financialEntryId",
    requirePermission(FINANCIAL_ENTRY_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  // DELETE lógico usa a permissão de update (não é remoção física — é mutação de estado via deleted_at).
  router.delete(
    "/financial-entries/:financialEntryId",
    requirePermission(FINANCIAL_ENTRY_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.delete(request));
    }),
  );

  // ESTORNO — cria um contra-lançamento (mutação corretiva de um lançamento existente): permissão de update.
  router.post(
    "/financial-entries/:financialEntryId/reverse",
    requirePermission(FINANCIAL_ENTRY_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.reverse(request));
    }),
  );

  // LIQUIDAÇÃO — pagar/receber é LANÇAR caixa contra um título: permissão de create. Path próprio (não
  // colide com o router de financial-titles: /financial-titles/:id/pay tem 3 segmentos, POST).
  router.post(
    "/financial-titles/:financialTitleId/pay",
    requirePermission(FINANCIAL_ENTRY_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.payTitle(request));
    }),
  );

  // SALDO computado da conta (SOMADO no backend). Path próprio (não colide com o router de
  // financial-accounts: /financial-accounts/:id/balance tem 3 segmentos).
  router.get(
    "/financial-accounts/:financialAccountId/balance",
    requirePermission(FINANCIAL_ENTRY_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.balance(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
