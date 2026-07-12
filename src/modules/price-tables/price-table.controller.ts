import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toPriceTableDto, toPriceTableListDto } from "./price-table.dto.js";
import type { PriceTableService } from "./price-table.service.js";

export type PriceTableServiceResolver = () => Promise<PriceTableService>;

export class PriceTableController {
  constructor(private readonly resolveService: PriceTableServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);
    return { body: toPriceTableListDto(result) };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.create(actor, request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "price_table.created",
      resourceType: "price_table",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { name: item.name, status: item.status },
    });
    return { status: 201, data: toPriceTableDto(item) };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.get(actor, readRouteParam(request.params.priceTableId));
    return { data: toPriceTableDto(item) };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const item = await service.update(actor, readRouteParam(request.params.priceTableId), body);
    const deactivating = body.is_active === false || body.isActive === false;
    await recordRequestAuditBestEffort(request, {
      action: deactivating ? "price_table.deactivated" : "price_table.updated",
      resourceType: "price_table",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { name: item.name, status: item.status },
    });
    return { data: toPriceTableDto(item) };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
