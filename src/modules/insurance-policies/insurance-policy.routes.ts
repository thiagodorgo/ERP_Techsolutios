import { Router, type Response } from "express";

import type { Permission } from "../core-saas/permissions/catalog.js";
import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { InsurancePolicyController, type InsurancePolicyServiceResolver } from "./insurance-policy.controller.js";
import { createDefaultInsurancePolicyService } from "./insurance-policy.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const INSURANCE_POLICY_PERMISSIONS = {
  read: "insurance_policies:read",
  create: "insurance_policies:create",
  update: "insurance_policies:update",
} as const satisfies Record<string, Permission>;

export function createInsurancePolicyRouter(
  coreService: ICoreSaasService,
  resolveService: InsurancePolicyServiceResolver = () => createDefaultInsurancePolicyService(coreService),
): Router {
  const router = Router();
  const controller = new InsurancePolicyController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/insurance-policies",
    requirePermission(INSURANCE_POLICY_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.post(
    "/insurance-policies",
    requirePermission(INSURANCE_POLICY_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  router.get(
    "/insurance-policies/:insurancePolicyId",
    requirePermission(INSURANCE_POLICY_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );

  router.patch(
    "/insurance-policies/:insurancePolicyId",
    requirePermission(INSURANCE_POLICY_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
