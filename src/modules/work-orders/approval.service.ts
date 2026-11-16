import { env } from "../../config/env.js";
import {
  createDefaultNotificationService,
  createMemoryNotificationService,
  type NotificationService,
} from "../notifications/notification.service.js";
import {
  getMemoryApprovalRepository,
  readMemoryApprovalAudit,
  recordMemoryApprovalAudit,
  type ApprovalRepository,
} from "./approval.repository.js";
import type {
  ApprovalActorContext,
  ApprovalAuditContext,
  ApprovalAuditEvent,
  ApprovalEntityType,
  DecideOperationalApprovalInput,
  OperationalApproval,
  RequestOperationalApprovalInput,
} from "./approval.types.js";
import { APPROVAL_ENTITY_TYPES, ApprovalError } from "./approval.types.js";

export class ApprovalService {
  constructor(
    private readonly repository: ApprovalRepository,
    private readonly notifications?: NotificationService,
  ) {}

  async request(input: RequestOperationalApprovalInput): Promise<OperationalApproval> {
    assertEntityType(input.entityType);
    const pendingReason = requiredText(input.pendingReason, "pendingReason");
    // B-APROVACOES-DURAVEIS — a trilha do pedido é do repositório: em memória, o vetor de sempre; em banco, a linha
    // `approval.requested` em audit_logs, na mesma transação da linha da aprovação.
    return this.repository.request({ ...input, pendingReason });
  }

  listPending(actor: ApprovalActorContext, query: Record<string, unknown> = {}) {
    return this.repository.listPending({
      tenantId: actor.tenantId,
      workOrderId: optionalText(query.work_order_id ?? query.workOrderId),
    });
  }

  async get(actor: ApprovalActorContext, approvalId: string): Promise<OperationalApproval> {
    const approval = await this.repository.findById(actor.tenantId, approvalId);
    if (!approval) {
      throw new ApprovalError(404, "APPROVAL_NOT_FOUND", "not_found", "Approval was not found.");
    }
    return approval;
  }

  approve(actor: ApprovalActorContext, approvalId: string, body: Record<string, unknown>, context?: ApprovalAuditContext) {
    return this.decide(
      actor,
      {
        tenantId: actor.tenantId,
        approvalId,
        actorUserId: actor.userId,
        decision: "approved",
        note: optionalText(body.note),
      },
      context,
    );
  }

  reject(actor: ApprovalActorContext, approvalId: string, body: Record<string, unknown>, context?: ApprovalAuditContext) {
    return this.decide(
      actor,
      {
        tenantId: actor.tenantId,
        approvalId,
        actorUserId: actor.userId,
        decision: "rejected",
        reason: requiredText(body.reason, "reason"),
      },
      context,
    );
  }

  private async decide(
    actor: ApprovalActorContext,
    input: DecideOperationalApprovalInput,
    context?: ApprovalAuditContext,
  ): Promise<OperationalApproval> {
    const current = await this.get(actor, input.approvalId);

    // B-O6R-07a (Ω6R-SEC-002, §3.2) — SEGREGAÇÃO DE FUNÇÃO: quem PEDIU não decide. Vale para approve E
    // reject (rejeitar a própria pendência também encerra o controle sem segundo par de olhos).
    //
    // ORDEM DELIBERADA — este teste vem ANTES do 409 `approval_already_decided`. Autorização primeiro:
    // o solicitante recebe a MESMA resposta (403) esteja a pendência aberta ou já decidida, e não
    // aprende pelo código de erro em que estado ela está. Se o 409 viesse antes, uma varredura do
    // próprio solicitante distinguiria "pendente" de "decidida" — vazamento pequeno, mas gratuito.
    //
    // A comparação é por `requestedByUserId` (o agregado já o carrega — approval.types.ts). Nenhum campo
    // novo, nenhuma migração.
    if (actor.userId === current.requestedByUserId) {
      recordMemoryApprovalAudit({
        action: "approval.self_decision_denied",
        tenantId: current.tenantId,
        actorId: actor.userId,
        approvalId: current.id,
        entityType: current.entityType,
        entityId: current.entityId,
        outcome: "denied",
        // §2.8 (allowlist) — nada de PII nova: `decision` é o enum approved|rejected e o ator já é o
        // `actorId` do próprio evento. O id do solicitante NÃO é repetido em metadata (seria a mesma
        // pessoa, dita duas vezes).
        metadata: {
          reason: "self_decision",
          decision: input.decision,
          status: current.status,
          work_order_id: current.workOrderId,
        },
      });

      throw new ApprovalError(
        403,
        "APPROVAL_SELF_DECISION",
        "self_decision",
        "The requester cannot decide their own approval.",
      );
    }

    if (current.status !== "pending_approval") {
      throw new ApprovalError(
        409,
        "APPROVAL_ALREADY_DECIDED",
        "approval_already_decided",
        "Approval already has a final decision.",
      );
    }

    // B-APROVACOES-DURAVEIS — o CAS: grava só se ainda estiver pendente. Casou 0 linhas → relê: não existe é 404; existe
    // (outro decisor chegou antes) é 409 `approval_already_decided`. A trilha da decisão é do repositório.
    const approval = await this.repository.decide(input, context);
    if (!approval) {
      const reread = await this.repository.findById(input.tenantId, input.approvalId);
      if (!reread) {
        throw new ApprovalError(404, "APPROVAL_NOT_FOUND", "not_found", "Approval was not found.");
      }
      throw new ApprovalError(
        409,
        "APPROVAL_ALREADY_DECIDED",
        "approval_already_decided",
        "Approval already has a final decision.",
      );
    }

    await this.notifyDecision(approval);
    return approval;
  }

  private async notifyDecision(approval: OperationalApproval): Promise<void> {
    if (!this.notifications) return;

    await this.notifications.createNotification({
      tenantId: approval.tenantId,
      recipientUserId: approval.requestedByUserId,
      type: `approval.${approval.status}`,
      title: approval.status === "approved" ? "Aprovacao registrada" : "Reprovacao registrada",
      message:
        approval.status === "approved"
          ? "A aprovacao operacional foi registrada."
          : "A aprovacao operacional foi reprovada.",
      severity: approval.status === "approved" ? "success" : "warning",
      sourceType: approval.entityType,
      sourceId: approval.entityId,
      actionUrl: approval.workOrderId ? `/work-orders/${approval.workOrderId}` : undefined,
      idempotencyKey: `${approval.id}:${approval.status}`,
      metadata: {
        approval_id: approval.id,
        status: approval.status,
      },
    });
  }
}

const memoryRepository = getMemoryApprovalRepository();
let defaultServicePromise: Promise<ApprovalService> | undefined;

export function createMemoryApprovalService(): ApprovalService {
  return new ApprovalService(memoryRepository, createMemoryNotificationService());
}

export async function createDefaultApprovalService(): Promise<ApprovalService> {
  defaultServicePromise ??= createRuntimeApprovalService();
  return defaultServicePromise;
}

export function resetApprovalRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

export function getApprovalAuditEventsForTests(): readonly ApprovalAuditEvent[] {
  return readMemoryApprovalAudit();
}

// B-APROVACOES-DURAVEIS — a escolha por `CORE_SAAS_PERSISTENCE`, como o serviço de OS: `prisma` grava na tabela
// `operational_approvals` (isolada por organização); qualquer outro valor usa a memória do processo.
async function createRuntimeApprovalService(): Promise<ApprovalService> {
  const repository: ApprovalRepository =
    env.CORE_SAAS_PERSISTENCE === "prisma" ? await (await import("./approval-prisma.repository.js")).createPrismaApprovalRepository() : memoryRepository; // B-APROV:fabrica-runtime
  return new ApprovalService(repository, await createDefaultNotificationService());
}

function assertEntityType(value: string): asserts value is ApprovalEntityType {
  if (!APPROVAL_ENTITY_TYPES.includes(value as ApprovalEntityType)) {
    throw new ApprovalError(400, "APPROVAL_INVALID", "invalid_entity_type", "entityType is invalid.");
  }
}

function requiredText(value: unknown, field: string): string {
  const normalized = optionalText(value);
  if (!normalized) {
    throw new ApprovalError(400, "APPROVAL_INVALID", "required_field", `${field} is required.`);
  }
  return normalized;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
