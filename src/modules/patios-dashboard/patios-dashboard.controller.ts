import type { Request } from "express";

import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { toPatiosDashboardSummaryDto } from "./patios-dashboard.dto.js";
import type { PatiosDashboardService } from "./patios-dashboard.service.js";

export type PatiosDashboardServiceResolver = () => Promise<PatiosDashboardService>;

export class PatiosDashboardController {
  constructor(private readonly resolveService: PatiosDashboardServiceResolver) {}

  async summary(request: Request) {
    const service = await this.resolveService();
    const actor = requireTenantContext(request);
    const summary = await service.getSummary(actor);

    return {
      data: toPatiosDashboardSummaryDto(summary),
    };
  }
}
