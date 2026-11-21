import { Router } from "express";

import { requirePermission, requireTenantContext } from "../middleware/rbac.middleware.js";
import type { ICoreSaasService } from "../services/core-saas-service.interface.js";
import type { UpdateUserInput, UserStatus } from "../types/core-saas.types.js";
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

  router.patch(
    "/:userId",
    requirePermission("users.manage"),
    handleAsyncRoute(async (request, response) => {
      const actor = requireTenantContext(request);
      const body = request.body as Record<string, unknown>;

      const input: UpdateUserInput = {
        userId: readRouteParam(request.params.userId),
        // Tenant comes from the authenticated claim; any tenant in the body is ignored.
        tenantId: actor.tenantId,
        ...(typeof body.name === "string" ? { name: readString(body.name) } : {}),
        ...("roles" in body ? { roles: readStringArray(body.roles) } : {}),
        ...("status" in body ? { status: body.status as UserStatus } : {}),
      };

      const user = await service.updateUser(input, actor);

      response.status(200).json({
        data: user,
      });
    }),
  );

  // B-USERS-CONCESSAO-PAINEL — conceder / retirar SÓ a "Visão da organização". O corpo é IGNORADO por inteiro (nenhum papel,
  // nome ou status vem dele); o tenant vem do claim. Quem chama precisa de `users:grant_organization_view`, não de `users.manage`.
  router.put(
    "/:userId/organization-view",
    requirePermission("users:grant_organization_view"), // B-USERS-CONCESSAO:put-gate
    handleAsyncRoute(async (request, response) => {
      const actor = requireTenantContext(request);
      const user = await service.setOrganizationView(
        { userId: readRouteParam(request.params.userId), tenantId: actor.tenantId, granted: true }, // B-USERS-CONCESSAO:put
        actor,
      );
      response.status(200).json({ data: user });
    }),
  );
  router.delete(
    "/:userId/organization-view",
    requirePermission("users:grant_organization_view"), // B-USERS-CONCESSAO:delete-gate
    handleAsyncRoute(async (request, response) => {
      const actor = requireTenantContext(request);
      const user = await service.setOrganizationView(
        { userId: readRouteParam(request.params.userId), tenantId: actor.tenantId, granted: false }, // B-USERS-CONCESSAO:delete
        actor,
      );
      response.status(200).json({ data: user });
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
