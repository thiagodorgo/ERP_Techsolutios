import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toChecklistLinkDto, toChecklistRunSummaryListDto } from "./impound.checklist-link.dto.js";
import type { ImpoundChecklistLinkService } from "./impound.checklist-link.service.js";

export type ImpoundChecklistLinkServiceResolver = () => Promise<ImpoundChecklistLinkService>;

export class ImpoundChecklistLinkController {
  constructor(private readonly resolveService: ImpoundChecklistLinkServiceResolver) {}

  async link(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const link = await service.linkChecklistRun(actor, readRouteParam(request.params.processId), body);
    await recordRequestAuditBestEffort(request, {
      action: "impound.checklist_run.linked",
      resourceType: "impound_process_checklist_link",
      resourceId: link.id,
      outcome: "success",
      severity: "info",
      metadata: { processId: link.processId, linkSource: link.linkSource },
    });
    return { status: 201, data: toChecklistLinkDto(link) };
  }

  async listChecklistRuns(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const runs = await service.listChecklistRuns(actor, readRouteParam(request.params.processId));
    return { body: toChecklistRunSummaryListDto(runs) };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
