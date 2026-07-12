import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toTariffDto, toTariffListDto } from "./tariff.dto.js";
import type { TariffService } from "./tariff.service.js";

export type TariffServiceResolver = () => Promise<TariffService>;

export class TariffController {
  constructor(private readonly resolveService: TariffServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);
    return { body: toTariffListDto(result) };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.create(actor, request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "tariff.created",
      resourceType: "tariff",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { priceTableId: item.priceTableId, status: item.status },
    });
    return { status: 201, data: toTariffDto(item) };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.get(actor, readRouteParam(request.params.tariffId));
    return { data: toTariffDto(item) };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const item = await service.update(actor, readRouteParam(request.params.tariffId), body);
    const deactivating = body.is_active === false || body.isActive === false;
    await recordRequestAuditBestEffort(request, {
      action: deactivating ? "tariff.deactivated" : "tariff.updated",
      resourceType: "tariff",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { priceTableId: item.priceTableId, status: item.status },
    });
    return { data: toTariffDto(item) };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
