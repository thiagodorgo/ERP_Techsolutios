import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toPoiDto, toPoiListDto } from "./poi.dto.js";
import type { PoiService } from "./poi.service.js";

export type PoiServiceResolver = () => Promise<PoiService>;

export class PoiController {
  constructor(private readonly resolveService: PoiServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);
    return { body: toPoiListDto(result) };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.create(actor, request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "poi.created",
      resourceType: "poi",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { name: item.name },
    });
    return { status: 201, data: toPoiDto(item) };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.get(actor, readRouteParam(request.params.poiId));
    return { data: toPoiDto(item) };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const item = await service.update(actor, readRouteParam(request.params.poiId), body);
    const deactivating = body.is_active === false || body.isActive === false;
    await recordRequestAuditBestEffort(request, {
      action: deactivating ? "poi.deactivated" : "poi.updated",
      resourceType: "poi",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { name: item.name },
    });
    return { data: toPoiDto(item) };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
