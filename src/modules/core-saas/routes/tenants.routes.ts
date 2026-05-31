import { Router } from "express";

import { requirePermission, requireTenantContext } from "../middleware/rbac.middleware.js";
import type { ICoreSaasService } from "../services/core-saas-service.interface.js";
import { handleAsyncRoute, readRouteParam } from "./http.js";

export function createTenantsRouter(service: ICoreSaasService): Router {
  const router = Router();

  router.get(
    "/",
    requirePermission("tenant.manage"),
    handleAsyncRoute(async (request, response) => {
      const actor = requireTenantContext(request);
      const tenants = await service.listTenantsForTenant(actor.tenantId);

      response.status(200).json({
        data: tenants,
      });
    }),
  );

  router.get(
    "/:tenantId",
    requirePermission("tenant.manage"),
    handleAsyncRoute(async (request, response) => {
      const actor = requireTenantContext(request);
      const tenant = await service.getTenantForActor(
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
