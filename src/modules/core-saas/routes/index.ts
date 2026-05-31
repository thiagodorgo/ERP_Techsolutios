import { Router } from "express";

import { tenantContextMiddleware } from "../middleware/tenant-context.middleware.js";
import type { ICoreSaasService } from "../services/core-saas-service.interface.js";
import { createAuditRouter } from "./audit.routes.js";
import { createRolesRouter } from "./roles.routes.js";
import { createTenantsRouter } from "./tenants.routes.js";
import { createUsersRouter } from "./users.routes.js";

export function createCoreSaasRouter(service: ICoreSaasService): Router {
  const router = Router();

  router.use(tenantContextMiddleware);
  router.use("/tenants", createTenantsRouter(service));
  router.use("/users", createUsersRouter(service));
  router.use("/roles", createRolesRouter(service));
  router.use("/audit-events", createAuditRouter(service));

  return router;
}
