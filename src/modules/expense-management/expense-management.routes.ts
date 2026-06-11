import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requireAnyPermission, requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { ExpenseManagementController, type ExpenseManagementServiceResolver } from "./expense-management.controller.js";
import { createDefaultExpenseManagementService } from "./expense-management.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const EXPENSE_MANAGEMENT_PERMISSIONS = {
  reportRead: "expense_report:read",
  reportReadOwn: "expense_report:read_own",
  reportCreate: "expense_report:create",
  reportUpdate: "expense_report:update",
  reportSubmit: "expense_report:submit",
  policyRead: "expense_policy:read",
  syncWrite: "expense_sync:write",
} as const;

export function createExpenseManagementRouter(
  resolveService: ExpenseManagementServiceResolver = createDefaultExpenseManagementService,
): Router {
  const router = Router();
  const controller = new ExpenseManagementController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/expense-policies",
    requirePermission(EXPENSE_MANAGEMENT_PERMISSIONS.policyRead),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.listPolicies(request));
    }),
  );

  router.get(
    "/expense-categories",
    requireAnyPermission([
      EXPENSE_MANAGEMENT_PERMISSIONS.policyRead,
      EXPENSE_MANAGEMENT_PERMISSIONS.reportRead,
      EXPENSE_MANAGEMENT_PERMISSIONS.reportReadOwn,
      EXPENSE_MANAGEMENT_PERMISSIONS.reportCreate,
    ]),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.listCategories(request));
    }),
  );

  router.get(
    "/expense-reports",
    requireAnyPermission([
      EXPENSE_MANAGEMENT_PERMISSIONS.reportRead,
      EXPENSE_MANAGEMENT_PERMISSIONS.reportReadOwn,
    ]),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.listReports(request));
    }),
  );

  router.post(
    "/expense-reports",
    requirePermission(EXPENSE_MANAGEMENT_PERMISSIONS.reportCreate),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.createReport(request));
    }),
  );

  router.get(
    "/expense-reports/:reportId",
    requireAnyPermission([
      EXPENSE_MANAGEMENT_PERMISSIONS.reportRead,
      EXPENSE_MANAGEMENT_PERMISSIONS.reportReadOwn,
    ]),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.getReport(request));
    }),
  );

  router.patch(
    "/expense-reports/:reportId",
    requirePermission(EXPENSE_MANAGEMENT_PERMISSIONS.reportUpdate),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.updateReport(request));
    }),
  );

  router.post(
    "/expense-reports/:reportId/items",
    requirePermission(EXPENSE_MANAGEMENT_PERMISSIONS.reportUpdate),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.addItem(request));
    }),
  );

  router.post(
    "/expense-reports/:reportId/submit",
    requirePermission(EXPENSE_MANAGEMENT_PERMISSIONS.reportSubmit),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.submitReport(request));
    }),
  );

  router.post(
    "/mobile/sync/expense-actions",
    requirePermission(EXPENSE_MANAGEMENT_PERMISSIONS.syncWrite),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.syncExpenseActions(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
