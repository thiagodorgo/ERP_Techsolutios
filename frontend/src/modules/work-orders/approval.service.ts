import { isMockMode } from "../../config/env";
import { apiRequest } from "../../services/api/client";
import type {
  ApprovalApiContext,
  OperationalApproval,
  OperationalApprovalEntityType,
  OperationalApprovalStatus,
} from "./approval.types";

export async function listPendingApprovals(
  context: ApprovalApiContext,
  workOrderId: string,
): Promise<OperationalApproval[]> {
  if (isMockMode()) return [mockApproval(workOrderId)];

  const response = await apiRequest<unknown>(
    `/approvals/pending?work_order_id=${encodeURIComponent(workOrderId)}`,
    context,
  );
  return approvalList(response);
}

/**
 * Todas as aprovações pendentes da organização (sem filtro de OS) — o backend
 * trata `work_order_id` como opcional. Usado pelo Dashboard (B-124).
 */
export async function listAllPendingApprovals(context: ApprovalApiContext): Promise<OperationalApproval[]> {
  if (isMockMode()) return [mockApproval("mock-work-order")];

  const response = await apiRequest<unknown>("/approvals/pending", context);
  return approvalList(response);
}

export async function approveOperationalApproval(
  context: ApprovalApiContext,
  approvalId: string,
  note?: string,
): Promise<OperationalApproval> {
  if (isMockMode()) {
    return {
      ...mockApproval("mock-work-order"),
      id: approvalId,
      status: "approved",
      note: note?.trim() || null,
      decidedBy: "mock-manager",
      decidedAt: new Date().toISOString(),
      safeMessage: "Aprovacao registrada.",
    };
  }

  return approvalFromResponse(
    await apiRequest<unknown>(`/approvals/${approvalId}/approve`, {
      ...context,
      method: "POST",
      body: { note: note?.trim() || undefined },
    }),
  );
}

export async function rejectOperationalApproval(
  context: ApprovalApiContext,
  approvalId: string,
  reason: string,
): Promise<OperationalApproval> {
  const normalizedReason = reason.trim();
  if (!normalizedReason) throw new Error("approval_rejection_reason_required");

  if (isMockMode()) {
    return {
      ...mockApproval("mock-work-order"),
      id: approvalId,
      status: "rejected",
      reason: normalizedReason,
      decidedBy: "mock-manager",
      decidedAt: new Date().toISOString(),
      safeMessage: "Reprovacao registrada.",
    };
  }

  return approvalFromResponse(
    await apiRequest<unknown>(`/approvals/${approvalId}/reject`, {
      ...context,
      method: "POST",
      body: { reason: normalizedReason },
    }),
  );
}

function approvalList(value: unknown): OperationalApproval[] {
  const data = asRecord(value).data;
  if (!Array.isArray(data)) return [];
  return data.map(approvalFromRecord).filter((item): item is OperationalApproval => item !== null);
}

function approvalFromResponse(value: unknown): OperationalApproval {
  const approval = approvalFromRecord(asRecord(asRecord(value).data));
  if (!approval) throw new Error("invalid_approval_response");
  return approval;
}

function approvalFromRecord(value: unknown): OperationalApproval | null {
  const record = asRecord(value);
  const id = text(record.id);
  const entityType = text(record.entity_type);
  const entityId = text(record.entity_id);
  const status = text(record.status);
  const requestedBy = text(record.requested_by);
  const requestedAt = text(record.requested_at);
  const pendingReason = text(record.pending_reason);
  const safeMessage = text(record.safe_message);
  if (
    !id ||
    !isEntityType(entityType) ||
    !entityId ||
    !isStatus(status) ||
    !requestedBy ||
    !requestedAt ||
    !pendingReason ||
    !safeMessage
  ) {
    return null;
  }

  return {
    id,
    entityType,
    entityId,
    workOrderId: nullableText(record.work_order_id),
    status,
    requestedBy,
    requestedAt,
    pendingReason,
    decidedBy: nullableText(record.decided_by),
    decidedAt: nullableText(record.decided_at),
    note: nullableText(record.note),
    reason: nullableText(record.reason),
    safeMessage,
  };
}

function mockApproval(workOrderId: string): OperationalApproval {
  return {
    id: "approval_mock_operational",
    entityType: "work_order",
    entityId: workOrderId,
    workOrderId,
    status: "pending_approval",
    requestedBy: "mock-operator",
    requestedAt: new Date().toISOString(),
    pendingReason: "Ordem de servico concluida e pronta para validacao operacional.",
    safeMessage: "Aprovacao pendente.",
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function nullableText(value: unknown): string | null {
  return text(value) ?? null;
}

function isEntityType(value: string | undefined): value is OperationalApprovalEntityType {
  return value === "work_order" || value === "checklist_run" || value === "evidence";
}

function isStatus(value: string | undefined): value is OperationalApprovalStatus {
  return value === "pending_approval" || value === "approved" || value === "rejected";
}
