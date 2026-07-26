import { Router, type Response } from "express";

import { createPersistentRbacContextMiddleware } from "../core-saas/middleware/persistent-rbac-context.middleware.js";
import { requirePermission } from "../core-saas/middleware/rbac.middleware.js";
import { tenantContextMiddleware } from "../core-saas/middleware/tenant-context.middleware.js";
import { handleAsyncRoute } from "../core-saas/routes/http.js";
import { JurisdictionController, type JurisdictionServiceResolver } from "./jurisdiction.controller.js";
import { createDefaultJurisdictionService } from "./jurisdiction.service.js";

type ControllerResult = {
  readonly status?: number;
  readonly body?: unknown;
  readonly data?: unknown;
};

// jurisdiction:manage NÃO existe (sem guard/rota = permissão morta — mesma disciplina do yard:manage diferido).
export const JURISDICTION_PERMISSIONS = {
  read: "jurisdiction:read",
  create: "jurisdiction:create",
  update: "jurisdiction:update",
} as const;

export function createJurisdictionRouter(
  resolveService: JurisdictionServiceResolver = createDefaultJurisdictionService,
): Router {
  const router = Router();
  const controller = new JurisdictionController(resolveService);

  router.use(tenantContextMiddleware);
  router.use(createPersistentRbacContextMiddleware());

  // Defaults federais por natureza (read-only). Path literal separado — declarado ANTES de qualquer :param.
  router.get(
    "/jurisdiction-defaults",
    requirePermission(JURISDICTION_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.defaults(request));
    }),
  );

  // Perfis normativos
  router.get(
    "/jurisdiction-profiles",
    requirePermission(JURISDICTION_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.list(request));
    }),
  );
  router.post(
    "/jurisdiction-profiles",
    requirePermission(JURISDICTION_PERMISSIONS.create),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.create(request));
    }),
  );
  router.get(
    "/jurisdiction-profiles/:profileId",
    requirePermission(JURISDICTION_PERMISSIONS.read),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.get(request));
    }),
  );
  router.patch(
    "/jurisdiction-profiles/:profileId",
    requirePermission(JURISDICTION_PERMISSIONS.update),
    handleAsyncRoute(async (request, response) => {
      sendResult(response, await controller.update(request));
    }),
  );

  return router;
}

function sendResult(response: Response, result: ControllerResult): void {
  response.status(result.status ?? 200).json(result.body ?? { data: result.data });
}
