import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { ServiceQuoteItemController, type ServiceQuoteItemServiceResolver } from "./service-quote-item.controller.js";
import { createDefaultServiceQuoteItemService } from "./service-quote-item.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

// Reusa as permissões EXISTENTES de service_quotes (não cria permissão nova): itens são um detalhe
// do agregado orçamento e herdam seu RBAC.
export const SERVICE_QUOTE_ITEM_PERMISSIONS = {
  read: "service_quotes:read",
  create: "service_quotes:create",
  update: "service_quotes:update",
} as const;

// Ω3F-4a — itens do Orçamento. Router PRÓPRIO (não toca src/modules/service-quotes/**), montado em
// src/app.ts no padrão service-quotes. DELETE é lógico e usa :update (espelho do DELETE do
// Financeiro da OS).
export function createServiceQuoteItemRouter(
  resolveService: ServiceQuoteItemServiceResolver = createDefaultServiceQuoteItemService,
): Router {
  const router = Router();
  const controller = new ServiceQuoteItemController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/service-quotes/:serviceQuoteId/items",
    requirePermission(SERVICE_QUOTE_ITEM_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.post(
    "/service-quotes/:serviceQuoteId/items",
    requirePermission(SERVICE_QUOTE_ITEM_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  router.patch(
    "/service-quotes/:serviceQuoteId/items/:itemId",
    requirePermission(SERVICE_QUOTE_ITEM_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  router.delete(
    "/service-quotes/:serviceQuoteId/items/:itemId",
    requirePermission(SERVICE_QUOTE_ITEM_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.delete(request));
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
