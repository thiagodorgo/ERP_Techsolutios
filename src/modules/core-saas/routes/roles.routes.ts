import { Router } from "express";

import { requirePermission } from "../middleware/rbac.middleware.js";
import type { CoreSaasRegistry } from "../services/core-saas.service.js";
import { handleRoute, readRouteParam } from "./http.js";

export function createRolesRouter(service: CoreSaasRegistry): Router {
  const router = Router();

  router.get(
    "/",
    requirePermission("roles.manage"),
    handleRoute((_request, response) => {
      response.status(200).json({
        data: service.listRoles(),
      });
    }),
  );

  router.get(
    "/:role",
    requirePermission("roles.manage"),
    handleRoute((request, response) => {
      response.status(200).json({
        data: service.getRoleDefinition(readRouteParam(request.params.role)),
      });
    }),
  );

  return router;
}
