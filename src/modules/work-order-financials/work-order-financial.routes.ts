import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import {
  WorkOrderFinancialController,
  type WorkOrderFinancialServiceResolver,
  type WorkOrderInvoicingServiceResolver,
} from "./work-order-financial.controller.js";
import {
  createDefaultWorkOrderFinancialService,
  createDefaultWorkOrderInvoicingService,
} from "./work-order-financial.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const WORK_ORDER_FINANCIAL_PERMISSIONS = {
  read: "work_order_financials:read",
  create: "work_order_financials:create",
  update: "work_order_financials:update",
  // Ω4-3 — faturar = criar um Título; reusa financial_titles:create (backend é a autoridade; a UI molda).
  invoice: "financial_titles:create",
} as const;

// Ω3F-3a — Financeiro da OS. Router PRÓPRIO (não toca src/modules/work-orders/**), montado em
// src/app.ts no padrão service-quotes. DELETE é lógico e usa :update (espelho do DELETE de anexos,
// que usa work_orders:update — o orçamento não tem DELETE; o "void" dele também roda com :update).
export function createWorkOrderFinancialRouter(
  resolveService: WorkOrderFinancialServiceResolver = createDefaultWorkOrderFinancialService,
  resolveInvoicingService: WorkOrderInvoicingServiceResolver = createDefaultWorkOrderInvoicingService,
): Router {
  const router = Router();
  const controller = new WorkOrderFinancialController(resolveService, resolveInvoicingService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/work-orders/:workOrderId/financial-items",
    requirePermission(WORK_ORDER_FINANCIAL_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.post(
    "/work-orders/:workOrderId/financial-items",
    requirePermission(WORK_ORDER_FINANCIAL_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  router.patch(
    "/work-orders/:workOrderId/financial-items/:itemId",
    requirePermission(WORK_ORDER_FINANCIAL_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  router.delete(
    "/work-orders/:workOrderId/financial-items/:itemId",
    requirePermission(WORK_ORDER_FINANCIAL_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.delete(request));
    }),
  );

  // Ω4-3 — faturar a OS: minta o Título a receber (idempotente por OS). Perm financial_titles:create.
  router.post(
    "/work-orders/:workOrderId/invoice",
    requirePermission(WORK_ORDER_FINANCIAL_PERMISSIONS.invoice),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.invoice(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  if (result.status === 204) {
    response.status(204).send();
    return;
  }
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
