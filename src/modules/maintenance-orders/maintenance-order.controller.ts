import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toMaintenanceOrderDto, toMaintenanceOrderListDto } from "./maintenance-order.dto.js";
import type { MaintenanceOrderService } from "./maintenance-order.service.js";

export type MaintenanceOrderServiceResolver = () => Promise<MaintenanceOrderService>;

export class MaintenanceOrderController {
  constructor(private readonly resolveService: MaintenanceOrderServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);

    return {
      body: toMaintenanceOrderListDto(result),
    };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const order = await service.create(actor, request.body ?? {});

    await recordRequestAuditBestEffort(request, {
      action: "maintenance_order.created",
      resourceType: "maintenance_order",
      resourceId: order.id,
      outcome: "success",
      severity: "info",
      metadata: {
        vehicleId: order.vehicleId,
        type: order.type,
        status: order.status,
      },
    });

    return {
      status: 201,
      data: toMaintenanceOrderDto(order),
    };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const order = await service.get(actor, readRouteParam(request.params.maintenanceOrderId));

    return {
      data: toMaintenanceOrderDto(order),
    };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const order = await service.update(actor, readRouteParam(request.params.maintenanceOrderId), body);

    const deactivating = body.is_active === false || body.isActive === false;
    const statusChanged = body.status !== undefined && body.status !== null && body.status !== "";

    await recordRequestAuditBestEffort(request, {
      action: deactivating ? "maintenance_order.deactivated" : "maintenance_order.updated",
      resourceType: "maintenance_order",
      resourceId: order.id,
      outcome: "success",
      severity: "info",
      metadata: {
        vehicleId: order.vehicleId,
        status: order.status,
        ...(statusChanged ? { statusChanged: true } : {}),
        ...(deactivating ? { isActive: order.isActive } : {}),
      },
    });

    return {
      data: toMaintenanceOrderDto(order),
    };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
