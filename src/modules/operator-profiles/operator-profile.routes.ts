import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { OperatorProfileController, type OperatorProfileServiceResolver } from "./operator-profile.controller.js";
import { createDefaultOperatorProfileService } from "./operator-profile.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const OPERATOR_PROFILE_PERMISSIONS = {
  read: "operator_profiles:read",
  create: "operator_profiles:create",
  update: "operator_profiles:update",
} as const;

export function createOperatorProfileRouter(
  resolveService: OperatorProfileServiceResolver = createDefaultOperatorProfileService,
): Router {
  const router = Router();
  const controller = new OperatorProfileController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/operator-profiles",
    requirePermission(OPERATOR_PROFILE_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.post(
    "/operator-profiles",
    requirePermission(OPERATOR_PROFILE_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  router.get(
    "/operator-profiles/:profileId",
    requirePermission(OPERATOR_PROFILE_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );

  router.patch(
    "/operator-profiles/:profileId",
    requirePermission(OPERATOR_PROFILE_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
