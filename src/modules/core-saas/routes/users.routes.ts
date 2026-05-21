import { Router } from "express";

import { requirePermission, requireTenantContext } from "../middleware/rbac.middleware.js";
import type { CoreSaasRegistry } from "../services/core-saas.service.js";
import {
  handleRoute,
  readRouteParam,
  readString,
  readStringArray,
} from "./http.js";

export function createUsersRouter(service: CoreSaasRegistry): Router {
  const router = Router();

  router.get(
    "/",
    requirePermission("users.read"),
    handleRoute((request, response) => {
      const actor = requireTenantContext(request);
      const users = service.listUsersForTenant(actor.tenantId);

      response.status(200).json({
        data: users,
      });
    }),
  );

  router.post(
    "/",
    requirePermission("users.manage"),
    handleRoute((request, response) => {
      const actor = requireTenantContext(request);
      const body = request.body as Record<string, unknown>;
      const user = service.createUser(
        {
          tenantId: readString(body.tenantId) || actor.tenantId,
          name: readString(body.name),
          email: readString(body.email),
          roles: readStringArray(body.roles),
          branchIds: readStringArray(body.branchIds),
          status: body.status === "inactive" ? "inactive" : undefined,
        },
        actor,
      );

      response.status(201).json({
        data: user,
      });
    }),
  );

  router.get(
    "/:userId",
    requirePermission("users.read"),
    handleRoute((request, response) => {
      const actor = requireTenantContext(request);
      const user = service.getUserForTenant(
        readRouteParam(request.params.userId),
        actor.tenantId,
      );

      response.status(200).json({
        data: user,
      });
    }),
  );

  return router;
}
