import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toAuctionViewDto, toRecordAttemptDto } from "./auction.dto.js";
import type { AuctionService } from "./auction.service.js";

export type AuctionServiceResolver = () => Promise<AuctionService>;

export class AuctionController {
  constructor(private readonly resolveService: AuctionServiceResolver) {}

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const view = await service.get(actor, readRouteParam(request.params.processId));
    return { body: toAuctionViewDto(view) };
  }

  async markEligible(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const view = await service.markEligible(actor, readRouteParam(request.params.processId));
    // §2.8: só status/strikeCount no audit (não há PII; NUNCA notes).
    await recordRequestAuditBestEffort(request, {
      action: "auction.marked_eligible",
      resourceType: "impound_process",
      resourceId: readRouteParam(request.params.processId),
      outcome: "success",
      severity: "info",
      metadata: { status: view.status, strikeCount: view.strikeCount },
    });
    return { body: toAuctionViewDto(view) };
  }

  async recordAttempt(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.recordAttempt(actor, readRouteParam(request.params.processId), request.body ?? {});
    // §2.8: só round/outcome/strikeCount (NUNCA notes). PR-12 SÓ registra o strike (a reciclagem a sucata = PR-13).
    await recordRequestAuditBestEffort(request, {
      action: "auction.attempt_recorded",
      resourceType: "auction_attempt",
      resourceId: result.attempt.id,
      outcome: "success",
      severity: "info",
      metadata: {
        round: result.attempt.roundNumber,
        outcome: result.attempt.outcome,
        strikeCount: result.strikeCount,
        status: result.status,
      },
    });
    return { status: result.created ? 201 : 200, body: toRecordAttemptDto(result) };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
