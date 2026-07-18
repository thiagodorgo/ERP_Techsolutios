import type { Request } from "express";

import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { toFinancialSummaryDto } from "./financial-summary.dto.js";
import type { FinancialSummaryService } from "./financial-summary.service.js";

export type FinancialSummaryServiceResolver = () => Promise<FinancialSummaryService>;

export class FinancialSummaryController {
  constructor(private readonly resolveService: FinancialSummaryServiceResolver) {}

  async summary(request: Request) {
    const service = await this.resolveService();
    const actor = requireTenantContext(request);
    const summary = await service.getSummary(actor);
    return { data: toFinancialSummaryDto(summary) };
  }
}
