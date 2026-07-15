import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { ServiceQuoteController, type ServiceQuoteServiceResolver } from "./service-quote.controller.js";
import { createDefaultServiceQuoteService } from "./service-quote.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const SERVICE_QUOTE_PERMISSIONS = {
  read: "service_quotes:read",
  create: "service_quotes:create",
  update: "service_quotes:update",
  approve: "service_quotes:approve",
} as const;

export function createServiceQuoteRouter(
  resolveService: ServiceQuoteServiceResolver = createDefaultServiceQuoteService,
): Router {
  const router = Router();
  const controller = new ServiceQuoteController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/service-quotes",
    requirePermission(SERVICE_QUOTE_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.post(
    "/service-quotes",
    requirePermission(SERVICE_QUOTE_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  router.get(
    "/service-quotes/:serviceQuoteId",
    requirePermission(SERVICE_QUOTE_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );

  router.patch(
    "/service-quotes/:serviceQuoteId",
    requirePermission(SERVICE_QUOTE_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  router.patch(
    "/service-quotes/:serviceQuoteId/status",
    requirePermission(SERVICE_QUOTE_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.updateStatus(request));
    }),
  );

  // Ω3F-4b — aprovar→cria OS (idempotente); permissão dedicada service_quotes:approve.
  router.post(
    "/service-quotes/:serviceQuoteId/approve",
    requirePermission(SERVICE_QUOTE_PERMISSIONS.approve),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.approve(request));
    }),
  );

  // Ω3F-4b — compartilhar (gera/reusa token); reusa service_quotes:update (quem edita compartilha).
  router.post(
    "/service-quotes/:serviceQuoteId/share",
    requirePermission(SERVICE_QUOTE_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.share(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
