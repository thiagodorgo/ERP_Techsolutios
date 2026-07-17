import { randomUUID } from "node:crypto";

import type { WorkOrderAuditLogEntry } from "./work-order-audit-log.types.js";
import { WORK_ORDER_AUDIT_LOG_DEFAULT_LIMIT } from "./work-order-audit-log.types.js";

// Ω3F-8a — repositório de LEITURA da auditoria por entidade. Duas implementações (memory + prisma)
// convergem para WorkOrderAuditLogEntry, ambas ordenando por created_at DESC e limitando.

/** Dados mínimos para semear um AuditLog em memória (testes / dev sem banco). */
export type SeedAuditLogInput = {
  readonly tenantId: string;
  readonly entity: string;
  readonly entityId?: string | null;
  readonly action: string;
  readonly actorUserId?: string | null;
  readonly metadata?: Record<string, unknown> | null;
  readonly createdAt?: Date;
};

export interface WorkOrderAuditLogRepository {
  // Logs de UMA entidade (tenant + entity + entity_id), mais recentes primeiro, limitados.
  listByEntity(
    tenantId: string,
    entity: string,
    entityId: string,
    limit?: number,
  ): Promise<readonly WorkOrderAuditLogEntry[]>;
  reset?(): void;
}

export class InMemoryWorkOrderAuditLogRepository implements WorkOrderAuditLogRepository {
  private readonly logs = new Map<string, WorkOrderAuditLogEntry & { readonly tenantId: string }>();

  // Escrita SÓ para semear cenários (a auditoria de produção é escrita pelo core-saas/audit em prisma).
  seed(input: SeedAuditLogInput): WorkOrderAuditLogEntry {
    const entry = {
      id: randomUUID(),
      tenantId: input.tenantId,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? null,
      createdAt: input.createdAt ?? new Date(),
    };
    this.logs.set(entry.id, entry);
    return stripTenant(entry);
  }

  async listByEntity(
    tenantId: string,
    entity: string,
    entityId: string,
    limit: number = WORK_ORDER_AUDIT_LOG_DEFAULT_LIMIT,
  ): Promise<readonly WorkOrderAuditLogEntry[]> {
    return [...this.logs.values()]
      .filter((log) => log.tenantId === tenantId && log.entity === entity && log.entityId === entityId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, Math.max(0, limit))
      .map(stripTenant);
  }

  reset(): void {
    this.logs.clear();
  }
}

function stripTenant(entry: WorkOrderAuditLogEntry & { readonly tenantId: string }): WorkOrderAuditLogEntry {
  // O modelo de leitura não carrega tenant_id (§2.8) — o filtro por tenant é interno ao repositório.
  return {
    id: entry.id,
    actorUserId: entry.actorUserId,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    metadata: entry.metadata,
    createdAt: entry.createdAt,
  };
}
