import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import type { ApprovalService } from "./approval.service.js";
import { createDefaultApprovalService } from "./approval.service.js";
import type { OperationalApproval } from "./approval.types.js";

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
    );
    await this.recordDecisionAudit(request, approval);
    return { data: toApprovalDto(approval) };
  }

  async reject(request: Request) {
    const [service, actor] = await this.resolveWithActor(request);
    const approval = await service.reject(
      actor,
      readRouteParam(request.params.approvalId),
      request.body ?? {},
    );
    await this.recordDecisionAudit(request, approval);
    return { data: toApprovalDto(approval) };
  }

  private resolveWithActor(request: Request) {
    return Promise.all([this.resolveService(), Promise.resolve(requireTenantContext(request))]);
  }

  private recordDecisionAudit(request: Request, approval: OperationalApproval) {
    return recordRequestAuditBestEffort(request, {
      action: approval.status === "approved" ? "approval.approved" : "approval.rejected",
      resourceType: approval.entityType,
      resourceId: approval.entityId,
      outcome: "success",
      severity: approval.status === "approved" ? "info" : "warning",
      metadata: {
        approvalId: approval.id,
        status: approval.status,
        workOrderId: approval.workOrderId,
      },
    });
  }
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
