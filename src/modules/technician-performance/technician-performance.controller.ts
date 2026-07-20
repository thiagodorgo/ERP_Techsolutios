import type { Request } from "express";

import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { toTechnicianPerformanceDto } from "./technician-performance.dto.js";
import type { TechnicianPerformanceService } from "./technician-performance.service.js";

export type TechnicianPerformanceServiceResolver = () => Promise<TechnicianPerformanceService>;

export class TechnicianPerformanceController {
  constructor(private readonly resolveService: TechnicianPerformanceServiceResolver) {}

  async list(request: Request) {
    const service = await this.resolveService();
    const actor = requireTenantContext(request);
    const result = await service.getPerformance(actor, request.query as Record<string, unknown>);

    return { data: toTechnicianPerformanceDto(result) };
  }
}
