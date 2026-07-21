import { Router } from "express";

import { handleAsyncRoute, readRouteParam } from "../core-saas/routes/http.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { requirePlatformPermission } from "./platform-permissions.js";
import { createCloudChargesPlatformRouter } from "../cloud-charges/cloud-charge.routes.js";
import { createCloudCostAllocationPlatformRouter } from "../cloud-cost-allocation/cloud-cost-allocation.routes.js";
import { createCloudCostsPlatformRouter } from "../cloud-costs/aws-cur.routes.js";
import { createCloudUsagePlatformRouter } from "../cloud-usage/cloud-usage.routes.js";
import { toPlatformOverviewDto } from "./platform-overview.dto.js";
import {
  createDefaultPlatformOverviewService,
  type PlatformOverviewServiceResolver,
} from "./platform-overview.service.js";
import { toPlatformTenantDetailDto } from "./platform-tenant-detail.dto.js";
import {
  createDefaultPlatformTenantDetailService,
  type PlatformTenantDetailServiceResolver,
} from "./platform-tenant-detail.service.js";
import { PlatformTenantsService } from "./platform-tenants.service.js";
import {
  parseCreatePlatformTenantDto,
  parseCreateTenantAdminDto,
  parseUpdatePlatformTenantDto,
  parseUpdatePlatformTenantModulesDto,
  parseUpdateTenantStatusDto,
} from "./platform-tenants.validator.js";

// `coreSaasService` (injetado em app.ts) alimenta a contagem de usuários REAL por organização no
// caminho Prisma — cada contagem passa por listUsersForTenant (withTenantRls por org). O agregado é
// persistence-aware: em memória/teste devolve lista vazia honesta; sem Postgres não sobe caminho Prisma.
export function createPlatformRouter(
  coreSaasService?: ICoreSaasService,
  resolveOverviewService: PlatformOverviewServiceResolver = () =>
    createDefaultPlatformOverviewService(coreSaasService),
  service = new PlatformTenantsService(),
  resolveTenantDetailService: PlatformTenantDetailServiceResolver = () =>
    createDefaultPlatformTenantDetailService(coreSaasService),
): Router {
  const router = Router();

  router.use("/", createCloudChargesPlatformRouter());
  router.use("/cloud-cost-allocations", createCloudCostAllocationPlatformRouter());
  router.use("/cloud-costs", createCloudCostsPlatformRouter());
  router.use("/cloud-usage", createCloudUsagePlatformRouter());

  // Visão geral REAL da plataforma (cross-tenant). Path próprio /overview — não colide com /tenants*.
  // Gate platform-only: nenhum papel de tenant alcança este agregado.
  router.get(
    "/overview",
    requirePlatformPermission("platform:tenants:read"),
    handleAsyncRoute(async (_request, response) => {
      const overviewService = await resolveOverviewService();

      response.status(200).json({
        data: toPlatformOverviewDto(await overviewService.getOverview()),
      });
    }),
  );

  // Detalhe REAL de UMA organização (cross-tenant). Path próprio /tenants/:tenantId/detail (3 segmentos)
  // — não colide com GET /tenants/:tenantId. Gate platform-only. Usuários da org vêm sob withTenantRls
  // (isolamento por construção); org inexistente → 404 (não confirma existência de recurso de terceiros).
  router.get(
    "/tenants/:tenantId/detail",
    requirePlatformPermission("platform:tenants:read"),
    handleAsyncRoute(async (request, response) => {
      const detailService = await resolveTenantDetailService();
      const detail = await detailService.getDetail(readRouteParam(request.params.tenantId));

      if (!detail) {
        response.status(404).json({
          error: {
            code: "NOT_FOUND",
            reason: "platform_tenant_not_found",
            message: "Platform tenant not found.",
          },
        });
        return;
      }

      response.status(200).json({
        data: toPlatformTenantDetailDto(detail),
      });
    }),
  );

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
