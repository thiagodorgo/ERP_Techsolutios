import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { CommissionController, type CommissionServiceResolver } from "./commission.controller.js";
import { createDefaultCommissionService } from "./commission.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const COMMISSION_PERMISSIONS = {
  read: "commissions:read",
  readOwn: "commissions:read_own",
  managePolicy: "commissions:manage_policy",
  calculate: "commissions:calculate",
  approve: "commissions:approve",
  adjust: "commissions:adjust",
  settle: "commissions:settle",
  audit: "commissions:audit",
} as const;

export function createCommissionRouter(resolveService: CommissionServiceResolver = createDefaultCommissionService): Router {
  const router = Router();
  const controller = new CommissionController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/commissions/policies",
    requirePermission(COMMISSION_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.listPolicies(request));
    }),
  );

  router.post(
    "/commissions/policies",
    requirePermission(COMMISSION_PERMISSIONS.managePolicy),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.createPolicy(request));
    }),
  );

  router.get(
    "/commissions/basis-events",
    requirePermission(COMMISSION_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.listBasisEvents(request));
    }),
  );

  router.post(
    "/commissions/basis-events",
    requirePermission(COMMISSION_PERMISSIONS.calculate),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.createBasisEvent(request));
    }),
  );

  router.get(
    "/commissions/calculations",
    requirePermission(COMMISSION_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.listCalculations(request));
    }),
  );

  // R8.2 — drill-down do próprio ator; payeeId fixado no servidor (commissions:read_own).
  router.get(
    "/commissions/calculations/mine",
    requirePermission(COMMISSION_PERMISSIONS.readOwn),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.listMyCalculations(request));
    }),
  );

  router.get(
    "/commissions/statements",
    requirePermission(COMMISSION_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.listStatements(request));
    }),
  );

  // R8.1 — extrato agregado por payee na janela (visão tenant).
  router.get(
    "/commissions/statements/summary",
    requirePermission(COMMISSION_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.summarizeStatements(request));
    }),
  );

  // R8.2 — extrato do próprio ator; payeeId fixado no servidor (commissions:read_own).
  router.get(
    "/commissions/statements/my-summary",
    requirePermission(COMMISSION_PERMISSIONS.readOwn),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.summarizeMyStatements(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
