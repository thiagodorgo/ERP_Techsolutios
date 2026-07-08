import type { Request } from "express";

import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { toDashboardSummaryDto } from "./dashboard.dto.js";
import type { DashboardService } from "./dashboard.service.js";

export type DashboardServiceResolver = () => Promise<DashboardService>;

export class DashboardController {
  constructor(private readonly resolveService: DashboardServiceResolver) {}

  async summary(request: Request) {
    const service = await this.resolveService();
    const actor = requireTenantContext(request);
    const summary = await service.getSummary(actor);

    return {
      data: toDashboardSummaryDto(summary),
    };
  }
}
