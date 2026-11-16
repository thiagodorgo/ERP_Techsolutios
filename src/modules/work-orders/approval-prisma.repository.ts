import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import { EnterpriseAuditLogService } from "../core-saas/audit/audit-log.service.js";
import type { AuditOutcome, AuditSeverity } from "../core-saas/audit/audit-log.types.js";
import type { ApprovalRepository } from "./approval.repository.js";
import type {
  ApprovalAuditContext,
  ApprovalEntityType,
  ApprovalStatus,
  DecideOperationalApprovalInput,
  OperationalApproval,
  RequestOperationalApprovalInput,
} from "./approval.types.js";
import { isWorkOrderUuid } from "./work-order.validators.js";

// B-APROVACOES-DURAVEIS (item 67 do portão) — a fila de Aprovações gravada na tabela `operational_approvals` (ENABLE +
// FORCE ROW LEVEL SECURITY pela organização), no idioma do repositório de OS:
//   - `PrismaApprovalRepository(client)` recebe o cliente, que é a TRANSAÇÃO (do invólucro abaixo, ou a da conclusão da
//     OS, quando o repositório de OS o constrói com o próprio cliente — a forma A do plano, N1);
//   - `RlsPrismaApprovalRepository(prismaClient)` abre, em cada método público, `withTenantRls`, que seta o contexto da
//     organização como 1ª instrução da transação.
// Sem `$transaction` interno e sem função solta que receba o cliente por parâmetro (a forma C, proibida: criaria chave no
// inventário de acessos suspeitos do B-SAN3-05, ratchet T13).

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

type OperationalApprovalRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly entity_type: string;
  readonly entity_id: string;
  readonly work_order_id: string | null;
  readonly status: string;
  readonly requested_by_user_id: string;
  readonly requested_at: Date;
  readonly pending_reason: string;
  readonly decided_by_user_id: string | null;
  readonly decided_at: Date | null;
  readonly decision_note: string | null;
  readonly rejection_reason: string | null;
};

// Corrida entre a inserção que conflita com uma pendente e a decisão dessa pendente: a pendente some antes da releitura,
// e a inserção seguinte passa. Três voltas cobrem a corrida; uma quarta seria defeito, e falha fechada.
const REQUEST_ATTEMPTS = 3;

export class PrismaApprovalRepository implements ApprovalRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async request(input: RequestOperationalApprovalInput): Promise<OperationalApproval> {
    for (let attempt = 0; attempt < REQUEST_ATTEMPTS; attempt += 1) {
      // `ON CONFLICT DO NOTHING` (skipDuplicates) sobre o índice único PARCIAL da migração: no máximo 1 pendente por
      // (organização, tipo, entidade), garantido pelo banco também em corrida. A falha que não é conflito propaga.
      const inserted = await this.client.operationalApproval.createManyAndReturn({
        data: [
          {
            tenant_id: input.tenantId,
            entity_type: input.entityType,
            entity_id: input.entityId,
            work_order_id: input.workOrderId ?? null,
            requested_by_user_id: input.requestedByUserId,
            pending_reason: input.pendingReason,
          },
        ],
        skipDuplicates: true,
      });
      if (inserted[0]) {
        const approval = mapApprovalRecord(inserted[0]);
        // A linha `approval.requested` nasce só com a linha da aprovação, na MESMA transação; a repetição que devolve a
        // pendente existente não grava auditoria nova (emenda 1 §3.6, E1-C).
        await this.writeAudit({ action: "approval.requested", actorId: input.requestedByUserId, approval, outcome: "success", severity: "info", metadata: { status: approval.status, work_order_id: approval.workOrderId } }); // B-APROV:auditoria-do-pedido
        return approval;
      }

      const pending = await this.client.operationalApproval.findFirst({
        where: {
          tenant_id: input.tenantId,
          entity_type: input.entityType,
          entity_id: input.entityId,
          status: "pending_approval",
        },
      });
      if (pending) return mapApprovalRecord(pending);
    }

    throw new Error("Approval request did not converge: the pending approval kept changing.");
  }

  async findById(tenantId: string, approvalId: string): Promise<OperationalApproval | null> {
    // O id de antes era `approval_<hex>`: num link salvo, responde 404, nunca 500 por uuid inválido.
    if (!isWorkOrderUuid(approvalId)) return null;
    const record = await this.client.operationalApproval.findFirst({
      where: { tenant_id: tenantId, id: approvalId },
    });
    return record ? mapApprovalRecord(record) : null;
  }

  async listPending(input: { readonly tenantId: string; readonly workOrderId?: string }): Promise<readonly OperationalApproval[]> {
    if (input.workOrderId !== undefined && !isWorkOrderUuid(input.workOrderId)) return [];
    const records = await this.client.operationalApproval.findMany({
      where: {
        tenant_id: input.tenantId,
        status: "pending_approval",
        ...(input.workOrderId ? { work_order_id: input.workOrderId } : {}),
      },
      orderBy: [{ requested_at: "desc" }, { id: "desc" }],
    });
    return records.map(mapApprovalRecord);
  }

  async decide(input: DecideOperationalApprovalInput, _context?: ApprovalAuditContext): Promise<OperationalApproval | null> {
    if (!isWorkOrderUuid(input.approvalId)) return null;
    const now = new Date();
    // CAS da casa (o `changeStatus` da OS): grava só se a aprovação ainda estiver pendente. Quem chega 2º re-avalia o
    // predicado contra a linha já decidida (READ COMMITTED) e casa 0 linhas.
    const updated = await this.client.operationalApproval.updateManyAndReturn({
      where: {
        tenant_id: input.tenantId,
        id: input.approvalId,
        status: "pending_approval", // B-APROV:cas-decisao
      },
      data: {
        status: input.decision,
        decided_by_user_id: input.actorUserId,
        decided_at: now,
        decision_note: input.note ?? null,
        rejection_reason: input.decision === "rejected" ? input.reason ?? null : null,
        updated_at: now,
      },
    });
    return updated[0] ? mapApprovalRecord(updated[0]) : null;
  }

  // A trilha durável: 1 linha em `audit_logs` pela MESMA transação (`this.client`), com o serviço de auditoria da casa
  // (mesmos campos de contexto da linha que o controller gravava por fora). Na auditoria entram só chaves da lista segura
  // (§2.8): ids, o estado e "informado: sim/não" — o texto da nota e o do motivo nunca entram.
  private async writeAudit(entry: {
    readonly action: "approval.requested" | "approval.approved" | "approval.rejected" | "approval.self_decision_denied";
    readonly actorId: string;
    readonly approval: OperationalApproval;
    readonly outcome: AuditOutcome;
    readonly severity: AuditSeverity;
    readonly metadata: Readonly<Record<string, unknown>>;
    readonly context?: ApprovalAuditContext;
  }): Promise<void> {
    // O escritor é o delegate da própria transação (não o `AuditLogRepository`, que importa o cliente global no topo do
    // módulo e tiraria o modo memória do ar sem DATABASE_URL).
    const writer = {
      create: (data: { readonly tenant_id: string; readonly actor_user_id?: string | null; readonly action: string; readonly entity: string; readonly entity_id?: string | null; readonly metadata?: Prisma.InputJsonValue }) =>
        this.client.auditLog.create({
          data: {
            tenant_id: data.tenant_id,
            actor_user_id: data.actor_user_id ?? null,
            action: data.action,
            entity: data.entity,
            entity_id: data.entity_id ?? null,
            metadata: data.metadata,
          },
        }),
    };
    await new EnterpriseAuditLogService(writer).record({
      tenantId: entry.approval.tenantId,
      actorId: entry.actorId,
      actorEmail: entry.context?.actorEmail,
      action: entry.action,
      resourceType: entry.approval.entityType,
      resourceId: entry.approval.entityId,
      outcome: entry.outcome,
      severity: entry.severity,
      correlationId: entry.context?.correlationId,
      requestId: entry.context?.requestId,
      ipAddress: entry.context?.ipAddress,
      userAgent: entry.context?.userAgent,
      metadata: { approvalId: entry.approval.id, ...entry.metadata },
    });
  }

  reset(): void {
    // A tabela não se apaga por aqui: a limpeza dos testes é escopada pela organização que cada um criou.
  }
}

export class RlsPrismaApprovalRepository implements ApprovalRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  request(input: RequestOperationalApprovalInput): Promise<OperationalApproval> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaApprovalRepository(tx).request(input));
  }

  findById(tenantId: string, approvalId: string): Promise<OperationalApproval | null> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaApprovalRepository(tx).findById(tenantId, approvalId));
  }

  listPending(input: { readonly tenantId: string; readonly workOrderId?: string }): Promise<readonly OperationalApproval[]> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaApprovalRepository(tx).listPending(input));
  }

  decide(input: DecideOperationalApprovalInput, context?: ApprovalAuditContext): Promise<OperationalApproval | null> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaApprovalRepository(tx).decide(input, context));
  }

  reset(): void {}
}

export async function createPrismaApprovalRepository(): Promise<RlsPrismaApprovalRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaApprovalRepository(prisma);
}

function mapApprovalRecord(record: OperationalApprovalRecord): OperationalApproval {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    entityType: record.entity_type as ApprovalEntityType,
    entityId: record.entity_id,
    workOrderId: record.work_order_id ?? undefined,
    status: record.status as ApprovalStatus,
    requestedByUserId: record.requested_by_user_id,
    requestedAt: record.requested_at,
    pendingReason: record.pending_reason,
    decidedByUserId: record.decided_by_user_id ?? undefined,
    decidedAt: record.decided_at ?? undefined,
    decisionNote: record.decision_note ?? undefined,
    rejectionReason: record.rejection_reason ?? undefined,
  };
}
