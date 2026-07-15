import type { WorkOrdersApiContext } from "./work-orders.types";

export type OperationalApprovalStatus =
  | "pending_approval"
  | "approved"
  | "rejected";

export type OperationalApprovalEntityType =
  | "work_order"
  | "checklist_run"
  | "evidence";

// P-Ω3F1-ENTITYTYPE — o enum técnico NUNCA aparece cru na UI (§3/§11.2). Rótulos PT-BR de
// negócio, acentuados (§11.3). Valor desconhecido degrada para "Registro" (nunca o token cru).
const ENTITY_TYPE_LABELS: Record<OperationalApprovalEntityType, string> = {
  work_order: "Ordem de serviço",
  checklist_run: "Checklist",
  evidence: "Evidência",
};

export function entityTypeLabel(entityType: string): string {
  return ENTITY_TYPE_LABELS[entityType as OperationalApprovalEntityType] ?? "Registro";
}

export type OperationalApproval = {
  readonly id: string;
  readonly entityType: OperationalApprovalEntityType;
  readonly entityId: string;
  readonly workOrderId?: string | null;
  readonly status: OperationalApprovalStatus;
  readonly requestedBy: string;
  readonly requestedAt: string;
  readonly pendingReason: string;
  readonly decidedBy?: string | null;
  readonly decidedAt?: string | null;
  readonly note?: string | null;
  readonly reason?: string | null;
  readonly safeMessage: string;
};

export type ApprovalApiContext = WorkOrdersApiContext;
