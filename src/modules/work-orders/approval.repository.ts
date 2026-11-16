import { randomUUID } from "node:crypto";

import type {
  ApprovalAuditContext,
  ApprovalAuditEvent,
  DecideOperationalApprovalInput,
  OperationalApproval,
  RequestOperationalApprovalInput,
} from "./approval.types.js";

export interface ApprovalRepository {
  // B-APROVACOES-DURAVEIS (emenda 1 §3.6) — as 3 propriedades que o B-SAN3-16 usa e as duas implementações preservam:
  // (1) a repetição com a mesma (organização, tipo, entidade) pendente devolve a pendente que existe, sem linha nova;
  // (2) a falha de gravação propaga o erro — nunca sucesso sem linha; (3) o `id` devolvido é o da linha gravada.
  request(input: RequestOperationalApprovalInput): Promise<OperationalApproval>;
  findById(tenantId: string, approvalId: string): Promise<OperationalApproval | null>;
  listPending(input: {
    readonly tenantId: string;
    readonly workOrderId?: string;
  }): Promise<readonly OperationalApproval[]>;
  // A decisão é um CAS sobre `status = 'pending_approval'`: devolve `null` se a aprovação não existe OU já foi decidida
  // (quem chama relê para distinguir 404 de 409). Duas decisões simultâneas: 1 passa, a outra recebe `null`.
  decide(input: DecideOperationalApprovalInput, context?: ApprovalAuditContext): Promise<OperationalApproval | null>;
  reset(): void;
}

// B-APROVACOES-DURAVEIS (plano §3.6) — o pedido de validação da CONCLUSÃO, montado num lugar só para os dois repositórios
// de OS: `entity_type = 'work_order'` e `entity_id` = `work_order_id` = a OS (o pedido do técnico, do B-SAN3-16, tem
// chave própria e convive com este). O campo só vale com destino `completed`; com qualquer outro, falha fechada.
export function assertApprovalRequestOnlyOnCompletion(input: { readonly status: string; readonly approvalRequest?: unknown }): void {
  if (input.approvalRequest !== undefined && input.status !== "completed") {
    throw new Error("approvalRequest is accepted only with status completed.");
  }
}

export function completionApprovalRequestInput(
  input: { readonly tenantId: string; readonly workOrderId: string },
  request: { readonly requestedByUserId: string; readonly pendingReason: string },
): RequestOperationalApprovalInput {
  return {
    tenantId: input.tenantId,
    entityType: "work_order",
    entityId: input.workOrderId,
    workOrderId: input.workOrderId,
    requestedByUserId: request.requestedByUserId,
    pendingReason: request.pendingReason,
  };
}

// A trilha da memória: o mesmo vetor de módulo que os testes de regressão leem por `getApprovalAuditEventsForTests`.
// Em banco, a trilha é a tabela `audit_logs` (approval-prisma.repository.ts).
const memoryAuditEvents: ApprovalAuditEvent[] = [];

export function recordMemoryApprovalAudit(
  input: Omit<ApprovalAuditEvent, "metadata" | "createdAt"> & {
    readonly metadata?: Readonly<Record<string, unknown>>;
  },
): void {
  memoryAuditEvents.push({
    ...input,
    metadata: sanitizeAuditMetadata(input.metadata ?? {}),
    createdAt: new Date().toISOString(),
  });
}

export function readMemoryApprovalAudit(): readonly ApprovalAuditEvent[] {
  return memoryAuditEvents.map((event) => ({ ...event, metadata: { ...event.metadata } }));
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
    // Em memória, o comportamento de antes não muda (emenda 1 §3.6, E1-C): a repetição também registra o pedido.
    const approval: OperationalApproval = existing ?? {
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
    if (!existing) this.approvals.set(approval.id, approval);
    recordMemoryApprovalAudit({
      action: "approval.requested",
      tenantId: input.tenantId,
      actorId: input.requestedByUserId,
      approvalId: approval.id,
      entityType: approval.entityType,
      entityId: approval.entityId,
      outcome: "success",
      metadata: {
        status: approval.status,
        work_order_id: approval.workOrderId,
      },
    });
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
    // O mesmo CAS do banco: num processo só, o tique é atômico, e a 2ª decisão encontra a 1ª já gravada.
    if (!current || current.status !== "pending_approval") return null;

    const updated: OperationalApproval = {
      ...current,
      status: input.decision,
      decidedByUserId: input.actorUserId,
      decidedAt: new Date(),
      decisionNote: input.note,
      rejectionReason: input.reason,
    };
    this.approvals.set(updated.id, updated);
    recordMemoryApprovalAudit({
      action: updated.status === "approved" ? "approval.approved" : "approval.rejected",
      tenantId: updated.tenantId,
      actorId: input.actorUserId,
      approvalId: updated.id,
      entityType: updated.entityType,
      entityId: updated.entityId,
      outcome: "success",
      metadata: {
        status: updated.status,
        work_order_id: updated.workOrderId,
        reason_provided: Boolean(updated.rejectionReason),
        note_provided: Boolean(updated.decisionNote),
      },
    });
    return updated;
  }

  reset(): void {
    this.approvals.clear();
    memoryAuditEvents.length = 0;
  }
}

// O armazém de aprovações da memória, ÚNICO no processo: o serviço de aprovações o lê, e o repositório de OS em memória
// grava nele o pedido da conclusão, no mesmo tique do status (B-APROVACOES-DURAVEIS, plano §3.6).
const memoryApprovalRepository = new InMemoryApprovalRepository();

export function getMemoryApprovalRepository(): InMemoryApprovalRepository {
  return memoryApprovalRepository;
}

const unsafeAuditKeys = /authorization|bearer|token|base64|file_data|local_path|path|bucket|storage_?key/i;

export function sanitizeAuditMetadata(metadata: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !unsafeAuditKeys.test(key))
      .map(([key, value]) => [key, sanitizeAuditValue(value)]),
  );
}

function sanitizeAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeAuditValue);
  if (value && typeof value === "object") {
    return sanitizeAuditMetadata(value as Readonly<Record<string, unknown>>);
  }
  return value;
}
