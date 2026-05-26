import { Router } from "express";

import { requirePermission, requireTenantContext } from "../middleware/rbac.middleware.js";
import type { CoreSaasRegistry } from "../services/core-saas.service.js";
import { handleRoute } from "./http.js";

export function createAuditRouter(service: CoreSaasRegistry): Router {
  const router = Router();

  router.get(
    "/",
    requirePermission("audit.read"),
    handleRoute((request, response) => {
      const actor = requireTenantContext(request);

      response.status(200).json({
        data: service.getAuditEventsForTenant(actor.tenantId),
      });
    }),
  );

  return router;
}
