import { randomUUID } from "node:crypto";

import type {
  DecideOperationalApprovalInput,
  OperationalApproval,
  RequestOperationalApprovalInput,
} from "./approval.types.js";

export interface ApprovalRepository {
  request(input: RequestOperationalApprovalInput): Promise<OperationalApproval>;
  findById(tenantId: string, approvalId: string): Promise<OperationalApproval | null>;
  listPending(input: {
    readonly tenantId: string;
    readonly workOrderId?: string;
  }): Promise<readonly OperationalApproval[]>;
  decide(input: DecideOperationalApprovalInput): Promise<OperationalApproval | null>;
  reset(): void;
}

export class InMemoryApprovalRepository implements ApprovalRepository {
  private readonly approvals = new Map<string, OperationalApproval>();

  async request(input: RequestOperationalApprovalInput): Promise<OperationalApproval> {
    const existing = [...this.approvals.values()].find(
      (approval) =>
        approval.tenantId === input.tenantId &&
        approval.entityType === input.entityType &&
        approval.entityId === input.entityId &&
        approval.status === "pending_approval",
    );
    if (existing) return existing;

    const approval: OperationalApproval = {
      id: `approval_${randomUUID().replaceAll("-", "")}`,
      tenantId: input.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      workOrderId: input.workOrderId,
      status: "pending_approval",
      requestedByUserId: input.requestedByUserId,
      requestedAt: new Date(),
      pendingReason: input.pendingReason,
    };
    this.approvals.set(approval.id, approval);
    return approval;
  }

  async findById(tenantId: string, approvalId: string): Promise<OperationalApproval | null> {
    const approval = this.approvals.get(approvalId);
    return approval?.tenantId === tenantId ? approval : null;
  }

  async listPending(input: {
    readonly tenantId: string;
    readonly workOrderId?: string;
  }): Promise<readonly OperationalApproval[]> {
    return [...this.approvals.values()]
      .filter((approval) => approval.tenantId === input.tenantId)
      .filter((approval) => approval.status === "pending_approval")
      .filter((approval) => !input.workOrderId || approval.workOrderId === input.workOrderId)
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  async decide(input: DecideOperationalApprovalInput): Promise<OperationalApproval | null> {
    const current = await this.findById(input.tenantId, input.approvalId);
    if (!current) return null;

    const updated: OperationalApproval = {
      ...current,
      status: input.decision,
      decidedByUserId: input.actorUserId,
      decidedAt: new Date(),
      decisionNote: input.note,
      rejectionReason: input.reason,
    };
    this.approvals.set(updated.id, updated);
    return updated;
  }

  reset(): void {
    this.approvals.clear();
  }
}
