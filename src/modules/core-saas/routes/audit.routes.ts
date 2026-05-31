import { Router } from "express";

import { requirePermission, requireTenantContext } from "../middleware/rbac.middleware.js";
import type { ICoreSaasService } from "../services/core-saas-service.interface.js";
import { handleAsyncRoute } from "./http.js";

export function createAuditRouter(service: ICoreSaasService): Router {
  const router = Router();

  router.get(
    "/",
    requirePermission("audit.read"),
    handleAsyncRoute(async (request, response) => {
      const actor = requireTenantContext(request);

      response.status(200).json({
        data: await service.getAuditEventsForTenant(actor.tenantId),
      });
    }),
  );

  return router;
}
