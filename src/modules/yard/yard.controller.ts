import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import {
  toYardAreaDto,
  toYardAreaListDto,
  toYardDto,
  toYardListDto,
  toYardOccupancyDto,
  toYardSpotDto,
  toYardSpotListDto,
} from "./yard.dto.js";
import type { YardService } from "./yard.service.js";

export type YardServiceResolver = () => Promise<YardService>;

export class YardController {
  constructor(private readonly resolveService: YardServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);
    return { body: toYardListDto(result) };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const yard = await service.create(actor, request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "yard.created",
      resourceType: "yard",
      resourceId: yard.id,
      outcome: "success",
      severity: "info",
      metadata: { active: yard.active },
    });
    return { status: 201, data: toYardDto(yard) };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const yard = await service.get(actor, readRouteParam(request.params.yardId));
    return { data: toYardDto(yard) };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const yard = await service.update(actor, readRouteParam(request.params.yardId), body);
    const deactivating = body.active === false;
    await recordRequestAuditBestEffort(request, {
      action: deactivating ? "yard.deactivated" : "yard.updated",
      resourceType: "yard",
      resourceId: yard.id,
      outcome: "success",
      severity: "info",
      metadata: { active: yard.active },
    });
    return { data: toYardDto(yard) };
  }

  async occupancy(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const yardId = readRouteParam(request.params.yardId);
    const spots = await service.getOccupancy(actor, yardId);
    return { body: toYardOccupancyDto(yardId, spots) };
  }

  async listAreas(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const areas = await service.listAreas(actor, readRouteParam(request.params.yardId));
    return { body: toYardAreaListDto(areas) };
  }

  async createArea(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const area = await service.createArea(actor, readRouteParam(request.params.yardId), request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "yard_area.created",
      resourceType: "yard_area",
      resourceId: area.id,
      outcome: "success",
      severity: "info",
      metadata: { yardId: area.yardId, kind: area.kind },
    });
    return { status: 201, data: toYardAreaDto(area) };
  }

  async getArea(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const area = await service.getArea(actor, readRouteParam(request.params.areaId));
    return { data: toYardAreaDto(area) };
  }

  async updateArea(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const area = await service.updateArea(actor, readRouteParam(request.params.areaId), request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "yard_area.updated",
      resourceType: "yard_area",
      resourceId: area.id,
      outcome: "success",
      severity: "info",
      metadata: { yardId: area.yardId, kind: area.kind },
    });
    return { data: toYardAreaDto(area) };
  }

  async listSpots(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const spots = await service.listSpots(actor, readRouteParam(request.params.areaId));
    return { body: toYardSpotListDto(spots) };
  }

  async createSpot(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const spot = await service.createSpot(actor, readRouteParam(request.params.areaId), request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "yard_spot.created",
      resourceType: "yard_spot",
      resourceId: spot.id,
      outcome: "success",
      severity: "info",
      metadata: { areaId: spot.areaId, status: spot.status },
    });
    return { status: 201, data: toYardSpotDto(spot) };
  }

  async getSpot(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const spot = await service.getSpot(actor, readRouteParam(request.params.spotId));
    return { data: toYardSpotDto(spot) };
  }

  async updateSpot(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const spot = await service.updateSpot(actor, readRouteParam(request.params.spotId), request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "yard_spot.updated",
      resourceType: "yard_spot",
      resourceId: spot.id,
      outcome: "success",
      severity: "info",
      metadata: { areaId: spot.areaId, status: spot.status },
    });
    return { data: toYardSpotDto(spot) };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
