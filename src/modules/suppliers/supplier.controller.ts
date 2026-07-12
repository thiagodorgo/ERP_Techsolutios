import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toSupplierDto, toSupplierListDto } from "./supplier.dto.js";
import type { SupplierService } from "./supplier.service.js";

export type SupplierServiceResolver = () => Promise<SupplierService>;

export class SupplierController {
  constructor(private readonly resolveService: SupplierServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);
    return { body: toSupplierListDto(result) };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.create(actor, request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "supplier.created",
      resourceType: "supplier",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { name: item.name, status: item.status },
    });
    return { status: 201, data: toSupplierDto(item) };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const item = await service.get(actor, readRouteParam(request.params.supplierId));
    return { data: toSupplierDto(item) };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const item = await service.update(actor, readRouteParam(request.params.supplierId), body);
    const deactivating = body.is_active === false || body.isActive === false;
    await recordRequestAuditBestEffort(request, {
      action: deactivating ? "supplier.deactivated" : "supplier.updated",
      resourceType: "supplier",
      resourceId: item.id,
      outcome: "success",
      severity: "info",
      metadata: { name: item.name, status: item.status },
    });
    return { data: toSupplierDto(item) };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
