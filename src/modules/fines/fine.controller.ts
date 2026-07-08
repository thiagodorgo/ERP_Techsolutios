import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toFineDto, toFineListDto } from "./fine.dto.js";
import type { FineService } from "./fine.service.js";

export type FineServiceResolver = () => Promise<FineService>;

export class FineController {
  constructor(private readonly resolveService: FineServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);

    return {
      body: toFineListDto(result),
    };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const fine = await service.create(actor, request.body ?? {});

    await recordRequestAuditBestEffort(request, {
      action: "fine.created",
      resourceType: "fine",
      resourceId: fine.id,
      outcome: "success",
      severity: "info",
      metadata: {
        vehicleId: fine.vehicleId,
        status: fine.status,
      },
    });

    return {
      status: 201,
      data: toFineDto(fine),
    };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const fine = await service.get(actor, readRouteParam(request.params.fineId));

    return {
      data: toFineDto(fine),
    };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const fine = await service.update(actor, readRouteParam(request.params.fineId), body);

    const deactivating = body.is_active === false || body.isActive === false;
    const statusChanged = body.status !== undefined && body.status !== null && body.status !== "";

    await recordRequestAuditBestEffort(request, {
      action: deactivating ? "fine.deactivated" : "fine.updated",
      resourceType: "fine",
      resourceId: fine.id,
      outcome: "success",
      severity: "info",
      metadata: {
        vehicleId: fine.vehicleId,
        status: fine.status,
        ...(statusChanged ? { statusChanged: true } : {}),
        ...(deactivating ? { isActive: fine.isActive } : {}),
      },
    });

    return {
      data: toFineDto(fine),
    };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
