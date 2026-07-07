import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toServiceCatalogDto, toServiceCatalogListDto } from "./service-catalog.dto.js";
import type { ServiceCatalogService } from "./service-catalog.service.js";

export type ServiceCatalogServiceResolver = () => Promise<ServiceCatalogService>;

export class ServiceCatalogController {
  constructor(private readonly resolveService: ServiceCatalogServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);

    return {
      body: toServiceCatalogListDto(result),
    };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.create(actor, request.body ?? {});

    await recordRequestAuditBestEffort(request, {
      action: "service_catalog.created",
      resourceType: "service_catalog",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: {
        name: item.name,
      },
    });

    return {
      status: 201,
      data: toServiceCatalogDto(item),
    };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.get(actor, readRouteParam(request.params.serviceId));

    return {
      data: toServiceCatalogDto(item),
    };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const item = await service.update(actor, readRouteParam(request.params.serviceId), body);

    const deactivating = body.is_active === false || body.isActive === false;

    await recordRequestAuditBestEffort(request, {
      action: deactivating ? "service_catalog.deactivated" : "service_catalog.updated",
      resourceType: "service_catalog",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: deactivating
        ? {
            name: item.name,
            isActive: item.isActive,
          }
        : {
            name: item.name,
          },
    });

    return {
      data: toServiceCatalogDto(item),
    };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
