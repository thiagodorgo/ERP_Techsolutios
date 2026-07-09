import { Router, type Response } from "express";

import type { Permission } from "../core-saas/permissions/catalog.js";
import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { CycleCountController, type CycleCountServiceResolver } from "./cycle-count.controller.js";
import { createDefaultCycleCountService } from "./cycle-count.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const CYCLE_COUNT_PERMISSIONS = {
  read: "cycle_counts:read",
  create: "cycle_counts:create",
} as const satisfies Record<string, Permission>;

/**
 * R7.6 — cycle count sessions. `read` is the inventory read set (finance/auditor
 * included); `create` (open/count/close/cancel — "quem conta") is granted to
 * super/tenant_admin/manager/inventory/operator. There is NO hard delete — a
 * session is cancelled logically.
 */
export function createCycleCountRouter(
  coreService: ICoreSaasService,
  resolveService: CycleCountServiceResolver = () => createDefaultCycleCountService(coreService),
): Router {
  const router = Router();
  const controller = new CycleCountController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/cycle-counts",
    requirePermission(CYCLE_COUNT_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.post(
    "/cycle-counts",
    requirePermission(CYCLE_COUNT_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.open(request));
    }),
  );

  router.get(
    "/cycle-counts/:cycleCountId",
    requirePermission(CYCLE_COUNT_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );

  router.patch(
    "/cycle-counts/:cycleCountId/entries/:entryId",
    requirePermission(CYCLE_COUNT_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.recordEntry(request));
    }),
  );

  router.post(
    "/cycle-counts/:cycleCountId/close",
    requirePermission(CYCLE_COUNT_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.close(request));
    }),
  );

  router.post(
    "/cycle-counts/:cycleCountId/cancel",
    requirePermission(CYCLE_COUNT_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.cancel(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
