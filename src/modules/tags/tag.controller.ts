import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toTagDto, toTagListDto } from "./tag.dto.js";
import type { TagService } from "./tag.service.js";

export type TagServiceResolver = () => Promise<TagService>;

export class TagController {
  constructor(private readonly resolveService: TagServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);
    return { body: toTagListDto(result) };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.create(actor, request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "tag.created",
      resourceType: "tag",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { name: item.name },
    });
    return { status: 201, data: toTagDto(item) };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.get(actor, readRouteParam(request.params.tagId));
    return { data: toTagDto(item) };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const item = await service.update(actor, readRouteParam(request.params.tagId), body);
    const deactivating = body.is_active === false || body.isActive === false;
    await recordRequestAuditBestEffort(request, {
      action: deactivating ? "tag.deactivated" : "tag.updated",
      resourceType: "tag",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { name: item.name },
    });
    return { data: toTagDto(item) };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
