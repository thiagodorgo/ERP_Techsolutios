import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { TenantSettingController, type TenantSettingServiceResolver } from "./tenant-setting.controller.js";
import { createDefaultTenantSettingService } from "./tenant-setting.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const TENANT_SETTING_PERMISSIONS = {
  read: "tenant_settings:read",
  update: "tenant_settings:update",
} as const;

export function createTenantSettingsRouter(
  resolveService: TenantSettingServiceResolver = createDefaultTenantSettingService,
): Router {
  const router = Router();
  const controller = new TenantSettingController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/tenant-settings",
    requirePermission(TENANT_SETTING_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.get(
    "/tenant-settings/:key",
    requirePermission(TENANT_SETTING_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );

  router.put(
    "/tenant-settings/:key",
    requirePermission(TENANT_SETTING_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.upsert(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
