import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toVehicleDto, toVehicleListDto } from "./vehicle.dto.js";
import type { VehicleService } from "./vehicle.service.js";

export type VehicleServiceResolver = () => Promise<VehicleService>;

export class VehicleController {
  constructor(private readonly resolveService: VehicleServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);

    return {
      body: toVehicleListDto(result),
    };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const vehicle = await service.create(actor, request.body ?? {});

    await recordRequestAuditBestEffort(request, {
      action: "vehicle.created",
      resourceType: "vehicle",
      resourceId: vehicle.id,
      outcome: "success",
      severity: "info",
      metadata: {
        plate: vehicle.plate,
      },
    });

    return {
      status: 201,
      data: toVehicleDto(vehicle),
    };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const vehicle = await service.get(actor, readRouteParam(request.params.vehicleId));

    return {
      data: toVehicleDto(vehicle),
    };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const vehicle = await service.update(actor, readRouteParam(request.params.vehicleId), body);

    const deactivating = body.is_active === false || body.isActive === false;

    await recordRequestAuditBestEffort(request, {
      action: deactivating ? "vehicle.deactivated" : "vehicle.updated",
      resourceType: "vehicle",
      resourceId: vehicle.id,
      outcome: "success",
      severity: "info",
      metadata: deactivating
        ? {
            plate: vehicle.plate,
            isActive: vehicle.isActive,
          }
        : {
            plate: vehicle.plate,
          },
    });

    return {
      data: toVehicleDto(vehicle),
    };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
