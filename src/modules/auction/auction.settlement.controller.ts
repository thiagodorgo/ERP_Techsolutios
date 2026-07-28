import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toDistributeSettlementDto, toSettlementViewDto } from "./auction.settlement.dto.js";
import type { AuctionSettlementService } from "./auction.settlement.service.js";

export type AuctionSettlementServiceResolver = () => Promise<AuctionSettlementService>;

export class AuctionSettlementController {
  constructor(private readonly resolveService: AuctionSettlementServiceResolver) {}

  // GET /impound-processes/:id/auction/settlement (impound:read).
  async get(request: Request) {
    const service = await this.resolveService();
    const actor = requireTenantContext(request);
    const view = await service.get(actor, readRouteParam(request.params.processId));
    return { body: toSettlementViewDto(view) };
  }

  // POST /impound-processes/:id/auction/settlement (impound:transition) — DISTRIBUIÇÃO em cascata §6º (I7). §2.8: o
  // audit interno leva SÓ soldRound/hammer(string)/ownerBalance(string)/status/created — NUNCA PII de credor/ex-dono/
  // arrematante nem o breakdown detalhado (a prova ordenada vive na cadeia AUCTION_SETTLEMENT + na tabela RLS'd).
  async distribute(request: Request) {
    const service = await this.resolveService();
    const actor = requireTenantContext(request);
    const result = await service.distribute(actor, readRouteParam(request.params.processId), request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "auction.settlement_distributed",
      resourceType: "settlement",
      resourceId: result.settlement.id,
      outcome: "success",
      severity: "info",
      metadata: {
        soldRound: result.settlement.soldRound ?? null,
        hammerAmount: result.settlement.hammerAmount,
        ownerBalanceAmount: result.settlement.ownerBalanceAmount ?? null,
        status: result.settlement.status,
        created: result.created,
      },
    });
    return { status: result.created ? 201 : 200, body: toDistributeSettlementDto(result) };
  }
}
