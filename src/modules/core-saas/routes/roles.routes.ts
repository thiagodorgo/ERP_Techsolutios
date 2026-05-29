import { Router } from "express";

import { requirePermission } from "../middleware/rbac.middleware.js";
import type { ICoreSaasService } from "../services/core-saas-service.interface.js";
import { handleAsyncRoute, readRouteParam } from "./http.js";

export function createRolesRouter(service: ICoreSaasService): Router {
  const router = Router();

  router.get(
    "/",
    requirePermission("roles.manage"),
    handleAsyncRoute(async (_request, response) => {
      response.status(200).json({
        data: await service.listRoles(),
      });
    }),
  );

  router.get(
    "/:role",
    requirePermission("roles.manage"),
    handleAsyncRoute(async (request, response) => {
      response.status(200).json({
        data: await service.getRoleDefinition(readRouteParam(request.params.role)),
      });
    }),
  );

  return router;
}
