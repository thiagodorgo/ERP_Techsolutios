import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { NotificationController, type NotificationServiceResolver } from "./notification.controller.js";
import { createDefaultNotificationService } from "./notification.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const NOTIFICATION_PERMISSIONS = {
  read: "notifications:read",
  update: "notifications:update",
} as const;

export function createNotificationRouter(
  resolveService: NotificationServiceResolver = createDefaultNotificationService,
): Router {
  const router = Router();
  const controller = new NotificationController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/notifications",
    requirePermission(NOTIFICATION_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.listMyNotifications(request));
    }),
  );

  router.get(
    "/notifications/unread-count",
    requirePermission(NOTIFICATION_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.countUnread(request));
    }),
  );

  // F10 — orchestrator that runs the four fleet-alert producers for the tenant.
  // Gated by the notifications management permission (managers/tenant admins hold
  // it); tenant comes from the claim, any request body is ignored.
  router.post(
    "/notifications/fleet-alerts/run",
    requirePermission(NOTIFICATION_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.runFleetAlerts(request));
    }),
  );

  router.post(
    "/notifications/:notificationId/read",
    requirePermission(NOTIFICATION_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.markAsRead(request));
    }),
  );

  router.post(
    "/notifications/read-all",
    requirePermission(NOTIFICATION_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.markAllAsRead(request));
    }),
  );

  router.post(
    "/notifications/:notificationId/archive",
    requirePermission(NOTIFICATION_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.archive(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
