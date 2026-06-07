import { Router } from "express";

import { requirePermission, requireTenantContext } from "../middleware/rbac.middleware.js";
import type { ICoreSaasService } from "../services/core-saas-service.interface.js";
import {
  handleAsyncRoute,
  readRouteParam,
  readString,
  readStringArray,
} from "./http.js";

export function createUsersRouter(service: ICoreSaasService): Router {
  const router = Router();

  router.get(
    "/",
    requirePermission("users.read"),
    handleAsyncRoute(async (request, response) => {
      const actor = requireTenantContext(request);
      const users = await service.listUsersForTenant(actor.tenantId);

      response.status(200).json({
        data: users,
      });
    }),
  );

  router.post(
    "/",
    requirePermission("users.manage"),
    handleAsyncRoute(async (request, response) => {
      const actor = requireTenantContext(request);
      const body = request.body as Record<string, unknown>;
      const user = await service.createUser(
        {
          tenantId: actor.tenantId,
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
    handleAsyncRoute(async (request, response) => {
      const actor = requireTenantContext(request);
      const user = await service.getUserForTenant(
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
