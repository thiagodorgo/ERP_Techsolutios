import { Router } from "express";

import { handleAsyncRoute, readRouteParam } from "../core-saas/routes/http.js";
import { requirePlatformPermission } from "./platform-permissions.js";
import { createCloudUsagePlatformRouter } from "../cloud-usage/cloud-usage.routes.js";
import { PlatformTenantsService } from "./platform-tenants.service.js";
import {
  parseCreatePlatformTenantDto,
  parseCreateTenantAdminDto,
  parseUpdatePlatformTenantDto,
  parseUpdatePlatformTenantModulesDto,
  parseUpdateTenantStatusDto,
} from "./platform-tenants.validator.js";

export function createPlatformRouter(service = new PlatformTenantsService()): Router {
  const router = Router();

  router.use("/cloud-usage", createCloudUsagePlatformRouter());

  router.get(
    "/tenants",
    requirePlatformPermission("platform:tenants:read"),
    handleAsyncRoute(async (_request, response) => {
      response.status(200).json({
        data: service.listTenants(),
      });
    }),
  );

  router.post(
    "/tenants",
    requirePlatformPermission("platform:tenants:create"),
    handleAsyncRoute(async (request, response) => {
      const tenant = service.createTenant(parseCreatePlatformTenantDto(request.body as Record<string, unknown>));

      response.status(201).json({
        data: tenant,
      });
    }),
  );

  router.get(
    "/tenants/:tenantId",
    requirePlatformPermission("platform:tenants:read"),
    handleAsyncRoute(async (request, response) => {
      response.status(200).json({
        data: service.getTenant(readRouteParam(request.params.tenantId)),
      });
    }),
  );

  router.patch(
    "/tenants/:tenantId",
    requirePlatformPermission("platform:tenants:update"),
    handleAsyncRoute(async (request, response) => {
      const tenant = service.updateTenant(
        readRouteParam(request.params.tenantId),
        parseUpdatePlatformTenantDto(request.body as Record<string, unknown>),
      );

      response.status(200).json({
        data: tenant,
      });
    }),
  );

  router.patch(
    "/tenants/:tenantId/status",
    requirePlatformPermission("platform:tenants:suspend"),
    handleAsyncRoute(async (request, response) => {
      const tenant = service.updateTenantStatus(
        readRouteParam(request.params.tenantId),
        parseUpdateTenantStatusDto(request.body as Record<string, unknown>),
      );

      response.status(200).json({
        data: tenant,
      });
    }),
  );

  router.get(
    "/tenants/:tenantId/modules",
    requirePlatformPermission("platform:tenants:read"),
    handleAsyncRoute(async (request, response) => {
      response.status(200).json({
        data: service.listTenantModules(readRouteParam(request.params.tenantId)),
      });
    }),
  );

  router.patch(
    "/tenants/:tenantId/modules",
    requirePlatformPermission("platform:modules:manage"),
    handleAsyncRoute(async (request, response) => {
      const modules = service.updateTenantModules(
        readRouteParam(request.params.tenantId),
        parseUpdatePlatformTenantModulesDto(request.body as Record<string, unknown>),
      );

      response.status(200).json({
        data: modules,
      });
    }),
  );

  router.post(
    "/tenants/:tenantId/admin-user",
    requirePlatformPermission("platform:users:create_admin"),
    handleAsyncRoute(async (request, response) => {
      const tenant = service.createTenantAdminUser(
        readRouteParam(request.params.tenantId),
        parseCreateTenantAdminDto(request.body as Record<string, unknown>),
      );

      response.status(201).json({
        data: tenant,
      });
    }),
  );

  return router;
}
