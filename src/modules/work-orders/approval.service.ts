import { env } from "../../config/env.js";
import {
  createDefaultNotificationService,
  createMemoryNotificationService,
  type NotificationService,
} from "../notifications/notification.service.js";
import {
  getMemoryApprovalRepository,
  readMemoryApprovalAudit,
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
import type { WorkOrderService } from "./work-order.service.js";
import { actorReadsAssignedOnly, WorkOrderError, type WorkOrderAssignedToActorScope } from "./work-order.types.js";

/** B-WO-LEITURA — a porta de leitura da OS, injetada (import preguiçoso do serviço de OS, como `checklist.service`). */
export type ApprovalReadScope = {
  readScopeFor(actor: ApprovalActorContext): Promise<WorkOrderAssignedToActorScope | undefined>;
  canRead(actor: ApprovalActorContext, workOrderId: string): Promise<boolean>;
};

export class ApprovalService {
  constructor(
    private readonly repository: ApprovalRepository,
    private readonly notifications?: NotificationService,
    private readonly readScope?: ApprovalReadScope,
  ) {}

  async request(input: RequestOperationalApprovalInput): Promise<OperationalApproval> {
    assertEntityType(input.entityType);
    const pendingReason = requiredText(input.pendingReason, "pendingReason");
    // B-APROVACOES-DURAVEIS — a trilha do pedido é do repositório: em memória, o vetor de sempre; em banco, a linha
    // `approval.requested` em audit_logs, na mesma transação da linha da aprovação.
    return this.repository.request({ ...input, pendingReason });
  }

  async listPending(actor: ApprovalActorContext, query: Record<string, unknown> = {}): Promise<readonly OperationalApproval[]> {
    const canRead = await this.readFilterFor(actor); // B-WO-LEITURA:aprovacao-lista
    const approvals = await this.repository.listPending({
      tenantId: actor.tenantId,
      workOrderId: optionalText(query.work_order_id ?? query.workOrderId),
    });
    if (!canRead) return approvals;
    const visible: OperationalApproval[] = [];
    for (const approval of approvals) if (approval.workOrderId && (await canRead(approval.workOrderId))) visible.push(approval);
    return visible;
  }

  async get(actor: ApprovalActorContext, approvalId: string): Promise<OperationalApproval> {
    const canRead = await this.readFilterFor(actor); // o escopo resolve ANTES do findById (S-W3, Emenda 2 §5.5)
    const approval = await this.repository.findById(actor.tenantId, approvalId);
    if (!approval) throw approvalNotFoundError();
    if (canRead && !(approval.workOrderId && (await canRead(approval.workOrderId)))) throw approvalNotFoundError(); // B-WO-LEITURA:aprovacao-detalhe
    return approval;
  }

  /**
   * B-WO-LEITURA — `undefined` para quem lê a organização inteira; para o campo, a função memoizada por OS. Sem a
   * dependência: 503 fail-closed, como a lista de OS. `readScopeFor` é chamado aqui para que a falha do resolvedor
   * (503) nasça ANTES de qualquer leitura — inexistente e alheia respondem igual também nessa janela.
   */
  private async readFilterFor(actor: ApprovalActorContext): Promise<((workOrderId: string) => Promise<boolean>) | undefined> {
    if (!actorReadsAssignedOnly(actor)) return undefined;
    const readScope = this.readScope;
    if (!readScope) {
      throw new ApprovalError(503, "APPROVAL_SCOPE_UNAVAILABLE", "scope_resolver_unavailable", "Não foi possível montar as suas aprovações agora. Tente de novo.");
    }
    await readScope.readScopeFor(actor);
    const memo = new Map<string, Promise<boolean>>();
    return (workOrderId) => memo.get(workOrderId) ?? memo.set(workOrderId, readScope.canRead(actor, workOrderId)).get(workOrderId)!;
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
      // B-APROVACOES-DURAVEIS — a recusa é gravada ANTES do 403 (em banco, 1 linha durável em audit_logs). Se a gravação
      // falhar, o erro propaga: a resposta é erro, nunca aceite.
      await this.repository.recordDenied({ approval: current, actorUserId: actor.userId, decision: input.decision }, context); // B-APROV:trilha-recusa

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
        throw approvalNotFoundError();
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
  return new ApprovalService(memoryRepository, createMemoryNotificationService(), createWorkOrderReadScope());
}

/**
 * B-WO-LEITURA — a porta de leitura da OS para as aprovações: `readScopeFor` e `canRead` = `getForRead` sem erro
 * (`WorkOrderError` 404/400 → `false`; o resto sobe, fail-closed). Sem o serviço, o padrão por import preguiçoso
 * (`createDefaultWorkOrderService`), como `checklist.service` faz com `resolveWorkOrderService`.
 */
export function createWorkOrderReadScope(service?: WorkOrderService): ApprovalReadScope {
  const resolve = async (): Promise<WorkOrderService> =>
    service ?? (await (await import("./work-order.service.js")).createDefaultWorkOrderService());
  return {
    readScopeFor: async (actor) => (await resolve()).readScopeFor(actor),
    canRead: async (actor, workOrderId) => {
      try {
        await (await resolve()).getForRead(actor, workOrderId);
        return true;
      } catch (error) {
        if (error instanceof WorkOrderError && (error.statusCode === 404 || error.statusCode === 400)) return false;
        throw error;
      }
    },
  };
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
  return new ApprovalService(repository, await createDefaultNotificationService(), createWorkOrderReadScope());
}

// B-WO-LEITURA — o 404 da aprovação, num lugar só: o inexistente e a que não é do papel de campo lançam ESTE erro.
function approvalNotFoundError(): ApprovalError {
  return new ApprovalError(404, "APPROVAL_NOT_FOUND", "not_found", "Approval was not found.");
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
