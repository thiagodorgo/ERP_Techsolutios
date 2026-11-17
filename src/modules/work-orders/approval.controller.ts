import type { Request } from "express";

import { extractAuditRequestContext } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import type { ApprovalService } from "./approval.service.js";
import { createDefaultApprovalService } from "./approval.service.js";
import type { ApprovalAuditContext, OperationalApproval } from "./approval.types.js";

export type ApprovalServiceResolver = () => Promise<ApprovalService>;

export class ApprovalController {
  constructor(
    private readonly resolveService: ApprovalServiceResolver = createDefaultApprovalService,
  ) {}

  async listPending(request: Request) {
    const [service, actor] = await this.resolveWithActor(request);
    const approvals = await service.listPending(actor, request.query as Record<string, unknown>);
    return { data: approvals.map(toApprovalDto) };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveWithActor(request);
    return {
      data: toApprovalDto(await service.get(actor, readRouteParam(request.params.approvalId))),
    };
  }

  async approve(request: Request) {
    const [service, actor] = await this.resolveWithActor(request);
    const approval = await service.approve(
      actor,
      readRouteParam(request.params.approvalId),
      request.body ?? {},
      auditContextOf(request),
    );
    return { data: toApprovalDto(approval) };
  }

  async reject(request: Request) {
    const [service, actor] = await this.resolveWithActor(request);
    const approval = await service.reject(
      actor,
      readRouteParam(request.params.approvalId),
      request.body ?? {},
      auditContextOf(request),
    );
    return { data: toApprovalDto(approval) };
  }

  private resolveWithActor(request: Request) {
    return Promise.all([this.resolveService(), Promise.resolve(requireTenantContext(request))]);
  }

}

// B-APROVACOES-DURAVEIS (plano §3.5) — a auditoria da decisão e da recusa deixou de ser gravada aqui, por fora e depois do
// fato: ela nasce na transação da decisão (ou, na recusa, numa transação própria antes do 403). O controller só entrega o
// contexto da requisição, os mesmos campos que a linha de antes levava.
function auditContextOf(request: Request): ApprovalAuditContext {
  const context = extractAuditRequestContext(request);
  return {
    actorEmail: context.actorEmail,
    requestId: context.requestId,
    correlationId: context.correlationId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  };
}

export function toApprovalDto(approval: OperationalApproval) {
  return {
    id: approval.id,
    entity_type: approval.entityType,
    entity_id: approval.entityId,
    work_order_id: approval.workOrderId ?? null,
    status: approval.status,
    requested_by: approval.requestedByUserId,
    requested_at: approval.requestedAt.toISOString(),
    pending_reason: approval.pendingReason,
    decided_by: approval.decidedByUserId ?? null,
    decided_at: approval.decidedAt?.toISOString() ?? null,
    note: approval.decisionNote ?? null,
    reason: approval.rejectionReason ?? null,
    safe_message:
      approval.status === "pending_approval"
        ? "Aprovacao pendente."
        : approval.status === "approved"
          ? "Aprovacao registrada."
          : "Reprovacao registrada.",
  };
}
