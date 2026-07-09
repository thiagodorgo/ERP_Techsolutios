import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import {
  toCycleCountDto,
  toCycleCountEntryDto,
  toCycleCountListDto,
  toCycleCountSummaryDto,
  toVarianceReportDto,
} from "./cycle-count.dto.js";
import type { CycleCountService } from "./cycle-count.service.js";

export type CycleCountServiceResolver = () => Promise<CycleCountService>;

export class CycleCountController {
  constructor(private readonly resolveService: CycleCountServiceResolver) {}

  async open(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const session = await service.open(actor, request.body ?? {});

    await recordRequestAuditBestEffort(request, {
      action: "cycle_count.opened",
      resourceType: "cycle_count",
      resourceId: session.id,
      outcome: "success",
      severity: "info",
      metadata: {
        abcClass: session.abcClass ?? null,
        entries: session.entries.length,
      },
    });

    return {
      status: 201,
      data: toCycleCountDto(session),
    };
  }

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);

    return {
      body: toCycleCountListDto(result),
    };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const session = await service.get(actor, readRouteParam(request.params.cycleCountId));

    return {
      data: toCycleCountDto(session),
    };
  }

  async recordEntry(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const entry = await service.recordEntry(
      actor,
      readRouteParam(request.params.cycleCountId),
      readRouteParam(request.params.entryId),
      request.body ?? {},
    );

    return {
      data: toCycleCountEntryDto(entry),
    };
  }

  async close(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const report = await service.close(actor, readRouteParam(request.params.cycleCountId));

    await recordRequestAuditBestEffort(request, {
      action: "cycle_count.closed",
      resourceType: "cycle_count",
      resourceId: report.cycleCount.id,
      outcome: "success",
      severity: "info",
      metadata: {
        adjustments: report.cycleCount.entries.filter((entry) => entry.adjustmentMovementId).length,
        totalVarianceValue: report.totalVarianceValue,
      },
    });

    return {
      data: toVarianceReportDto(report),
    };
  }

  async cancel(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const session = await service.cancel(actor, readRouteParam(request.params.cycleCountId));

    await recordRequestAuditBestEffort(request, {
      action: "cycle_count.cancelled",
      resourceType: "cycle_count",
      resourceId: session.id,
      outcome: "success",
      severity: "info",
      metadata: {},
    });

    return {
      data: toCycleCountSummaryDto(session),
    };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
