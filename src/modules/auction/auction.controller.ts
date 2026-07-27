import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toAuctionViewDto, toRecordAttemptDto, toRegisterEdictDto } from "./auction.dto.js";
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

  // Ω5P PR-13a — REGISTRO do edital da rodada (impound:transition). §2.8: só round/classification/created no audit
  // (NUNCA edict_reference bruto/auctioneer_ref/notes).
  async registerEdict(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.registerEdict(actor, readRouteParam(request.params.processId), request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "auction.edict_registered",
      resourceType: "auction_edict",
      resourceId: result.edict.id,
      outcome: "success",
      severity: "info",
      metadata: { round: result.edict.roundNumber, classification: result.edict.classification ?? null, created: result.created },
    });
    return { status: result.created ? 201 : 200, body: toRegisterEdictDto(result) };
  }

  // Ω5P PR-13a — RECICLAGEM por 2 strikes edict-backed (impound:transition; sucata IRREVERSÍVEL). §2.8: só status/
  // strikeCount no audit.
  async reclassifyScrap(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const view = await service.reclassifyScrap(actor, readRouteParam(request.params.processId));
    await recordRequestAuditBestEffort(request, {
      action: "auction.reclassified_scrap",
      resourceType: "impound_process",
      resourceId: readRouteParam(request.params.processId),
      outcome: "success",
      severity: "warning",
      metadata: { status: view.status, strikeCount: view.strikeCount },
    });
    return { body: toAuctionViewDto(view) };
  }

  // Ω5P PR-13a — RECICLAGEM por INSERVIBILIDADE (impound:transition, §§16-18). O reason (fundamento do ato) é
  // registrado no audit interno (trilha legal do ato — precedente financial-period reopen), NUNCA no payload da
  // cadeia (§2.8 — a cadeia carrega só o reason CODIFICADO unrecoverable_direct).
  async reclassifyUnrecoverable(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const view = await service.reclassifyUnrecoverable(actor, readRouteParam(request.params.processId), request.body ?? {});
    await recordRequestAuditBestEffort(request, {
      action: "auction.reclassified_unrecoverable",
      resourceType: "impound_process",
      resourceId: readRouteParam(request.params.processId),
      outcome: "success",
      severity: "warning",
      metadata: { status: view.status, reason: readAuditReason(request.body) },
    });
    return { body: toAuctionViewDto(view) };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}

// Fundamento do ato p/ a trilha de auditoria interna (best-effort). Trimado + truncado (defensivo). Só o audit
// INTERNO (RLS-scoped) — NUNCA a resposta pública nem o payload da cadeia.
function readAuditReason(body: unknown): string | null {
  const value = (body as { readonly reason?: unknown } | null | undefined)?.reason;
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return null;
  return normalized.slice(0, 500);
}
