import type { Request } from "express";

import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { toWorkOrderTimeseriesDto } from "./work-order-timeseries.dto.js";
import type { WorkOrderTimeseriesService } from "./work-order-timeseries.service.js";

export type WorkOrderTimeseriesServiceResolver = () => Promise<WorkOrderTimeseriesService>;

export class WorkOrderTimeseriesController {
  constructor(private readonly resolveService: WorkOrderTimeseriesServiceResolver) {}

  async list(request: Request) {
    const service = await this.resolveService();
    const actor = requireTenantContext(request);
    const result = await service.getTimeseries(actor, request.query as Record<string, unknown>);

    return { data: toWorkOrderTimeseriesDto(result) };
  }
}
