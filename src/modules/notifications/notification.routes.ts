import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { NotificationController, type NotificationServiceResolver } from "./notification.controller.js";
import { createDefaultNotificationService } from "./notification.service.js";
import {
  ScheduledNotificationController,
  type ScheduledNotificationServiceResolver,
} from "./scheduled-notification.controller.js";
import { createDefaultScheduledNotificationService } from "./scheduled-notification.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

// Ω4C PR-04 (D-Ω4C-NOTIF-RBAC) — `notifications:create` separa "ler as minhas" (read, INTOCADO) de "criar/gerir/
// broadcast" (create). Ler/agir no PRÓPRIO inbox segue em read/update (amplos). A camada AGENDADA
// (/notifications/scheduled) — que pode fazer broadcast PUBLIC/CUSTOM — fica inteira atrás de create.
export const NOTIFICATION_PERMISSIONS = {
  read: "notifications:read",
  update: "notifications:update",
  create: "notifications:create",
} as const;

export function createNotificationRouter(
  resolveService: NotificationServiceResolver = createDefaultNotificationService,
  resolveScheduledService: ScheduledNotificationServiceResolver = createDefaultScheduledNotificationService,
): Router {
  const router = Router();
  const controller = new NotificationController(resolveService);
  const scheduledController = new ScheduledNotificationController(resolveScheduledService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  // -------------------------------------------------------------------------
  // Ω4C PR-04 — Motor de notificações AGENDÁVEIS (/notifications/scheduled). MONTADO ANTES das rotas do inbox
  // com :notificationId para não colidir (o path "scheduled" nunca é um id). Sub-recurso 100% atrás de
  // `notifications:create` (gestão/broadcast). Endpoints do inbox/sino abaixo seguem INTOCADOS.
  // -------------------------------------------------------------------------
  router.post(
    "/notifications/scheduled",
    requirePermission(NOTIFICATION_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await scheduledController.create(request));
    }),
  );

  router.get(
    "/notifications/scheduled",
    requirePermission(NOTIFICATION_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await scheduledController.list(request));
    }),
  );

  router.get(
    "/notifications/scheduled/:scheduledNotificationId",
    requirePermission(NOTIFICATION_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await scheduledController.get(request));
    }),
  );

  router.delete(
    "/notifications/scheduled/:scheduledNotificationId",
    requirePermission(NOTIFICATION_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await scheduledController.cancel(request));
    }),
  );

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
