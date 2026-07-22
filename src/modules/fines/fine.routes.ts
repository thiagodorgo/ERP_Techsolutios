import { Router, type Response } from "express";

import type { Permission } from "../core-saas/permissions/catalog.js";
import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { createPayableSourceRoutes } from "../financial-titles/payable-source.routes.js";
import { FineController, type FineServiceResolver } from "./fine.controller.js";
import { createDefaultFineService } from "./fine.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

export const FINE_PERMISSIONS = {
  read: "fines:read",
  create: "fines:create",
  update: "fines:update",
} as const satisfies Record<string, Permission>;

export function createFineRouter(
  coreService: ICoreSaasService,
  resolveService: FineServiceResolver = () => createDefaultFineService(coreService),
): Router {
  const router = Router();
  const controller = new FineController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  router.get(
    "/fines",
    requirePermission(FINE_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );

  router.post(
    "/fines",
    requirePermission(FINE_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );

  router.get(
    "/fines/:fineId",
    requirePermission(FINE_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );

  router.patch(
    "/fines/:fineId",
    requirePermission(FINE_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  // Ω4C PR-07 (D-Ω4C-MULSEG-PAYABLE) — Contas a Pagar por origem: POST/DELETE/GET /fines/:id/payable
  // (source_type='fine', já no FINANCIAL_TITLE_SOURCE_TYPES → SEM migração). O factory PR-02 permanece
  // INTOCADO; a multa injeta um resolveOwnership mais rico: prova a posse (get → 404 cross-tenant) E o
  // either/or genuíno (débito ativo no extrato → 409 fine_disposition_conflict). Herda tenant + RBAC
  // (financial_titles:create/update) do próprio módulo. `:id` = fineId.
  router.use(
    "/fines",
    createPayableSourceRoutes({
      sourceType: "fine",
      resolveOwnership: async (actor, sourceId) => {
        await (await resolveService()).assertPayableDispositionAllowed(actor, sourceId);
      },
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
