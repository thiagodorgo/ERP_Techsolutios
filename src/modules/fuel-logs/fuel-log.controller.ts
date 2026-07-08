import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toFuelLogDto, toFuelLogListDto } from "./fuel-log.dto.js";
import type { FuelLogService } from "./fuel-log.service.js";

export type FuelLogServiceResolver = () => Promise<FuelLogService>;

export class FuelLogController {
  constructor(private readonly resolveService: FuelLogServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);

    return {
      body: toFuelLogListDto(result),
    };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const entry = await service.create(actor, request.body ?? {});

    await recordRequestAuditBestEffort(request, {
      action: "fuel_log.created",
      resourceType: "fuel_log",
      resourceId: entry.fuelLog.id,
      outcome: "success",
      severity: "info",
      metadata: {
        vehicleId: entry.fuelLog.vehicleId,
        fuelType: entry.fuelLog.fuelType,
        odometer: entry.fuelLog.odometer,
      },
    });

    return {
      status: 201,
      data: toFuelLogDto(entry),
    };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const entry = await service.get(actor, readRouteParam(request.params.fuelLogId));

    return {
      data: toFuelLogDto(entry),
    };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const entry = await service.update(actor, readRouteParam(request.params.fuelLogId), body);

    const deactivating = body.is_active === false || body.isActive === false;

    await recordRequestAuditBestEffort(request, {
      action: deactivating ? "fuel_log.deactivated" : "fuel_log.updated",
      resourceType: "fuel_log",
      resourceId: entry.fuelLog.id,
      outcome: "success",
      severity: "info",
      metadata: deactivating
        ? {
            vehicleId: entry.fuelLog.vehicleId,
            isActive: entry.fuelLog.isActive,
          }
        : {
            vehicleId: entry.fuelLog.vehicleId,
          },
    });

    return {
      data: toFuelLogDto(entry),
    };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
