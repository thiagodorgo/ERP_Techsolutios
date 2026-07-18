import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { FinancialSummaryController, type FinancialSummaryServiceResolver } from "./financial-summary.controller.js";
import { createDefaultFinancialSummaryService } from "./financial-summary.service.js";

type ControllerResult = { readonly status?: number; readonly body?: unknown; readonly data?: unknown };

// Agregado financeiro (leitura). Reusa financial_entries:read (a permissão de "Consultar Caixa/Extrato e
// saldo") — o mesmo conjunto de papéis que lê os demais reads financeiros (finance/manager/auditor/viewer/
// admins), sem furo. Sem permissão nova.
export const FINANCIAL_SUMMARY_PERMISSION = "financial_entries:read" as const;

export function createFinancialSummaryRouter(
  resolveService: FinancialSummaryServiceResolver = createDefaultFinancialSummaryService,
): Router {
  const router = Router();
  const controller = new FinancialSummaryController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/financial-summary",
    requirePermission(FINANCIAL_SUMMARY_PERMISSION),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.summary(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
