import { Router } from "express";

import { requirePermission, requireTenantContext } from "../middleware/rbac.middleware.js";
import type { CoreSaasRegistry } from "../services/core-saas.service.js";
import { handleRoute, readRouteParam } from "./http.js";

export function createTenantsRouter(service: CoreSaasRegistry): Router {
  const router = Router();

  router.get(
    "/",
    requirePermission("tenant.manage"),
    handleRoute((request, response) => {
      const actor = requireTenantContext(request);
      const tenants = service.listTenantsForTenant(actor.tenantId);

      response.status(200).json({
        data: tenants,
      });
    }),
  );

  router.get(
    "/:tenantId",
    requirePermission("tenant.manage"),
    handleRoute((request, response) => {
      const actor = requireTenantContext(request);
      const tenant = service.getTenantForActor(
        readRouteParam(request.params.tenantId),
        actor.tenantId,
      );

      response.status(200).json({
        data: tenant,
      });
    }),
  );

  return router;
}
