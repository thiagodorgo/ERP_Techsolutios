import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toTenantSettingDto, toTenantSettingListDto } from "./tenant-setting.dto.js";
import type { TenantSettingService } from "./tenant-setting.service.js";

export type TenantSettingServiceResolver = () => Promise<TenantSettingService>;

export class TenantSettingController {
  constructor(private readonly resolveService: TenantSettingServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);
    return { body: toTenantSettingListDto(result) };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.get(actor, readRouteParam(request.params.key));
    return { data: toTenantSettingDto(item) };
  }

  async upsert(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const item = await service.upsert(actor, readRouteParam(request.params.key), body);
    await recordRequestAuditBestEffort(request, {
      action: "tenant_setting.upserted",
      resourceType: "tenant_setting",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { key: item.key, category: item.category ?? null },
    });
    return { data: toTenantSettingDto(item) };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
