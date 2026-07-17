import { prisma } from "../../database/prisma.js";
import { withTenantRls } from "../../database/rls.js";
import { AuditLogRepository } from "../core-saas/repositories/audit-log.repository.js";
import type { WorkOrderAuditLogEntry } from "./work-order-audit-log.types.js";
import { WORK_ORDER_AUDIT_LOG_DEFAULT_LIMIT } from "./work-order-audit-log.types.js";
import type { WorkOrderAuditLogRepository } from "./work-order-audit-log.repository.js";

type PrismaAuditLogRow = Awaited<ReturnType<AuditLogRepository["listByEntity"]>>[number];

// Ω3F-8a — leitura da auditoria em prisma. Cada consulta roda sob withTenantRls (RLS por tenant, além
// do filtro explícito por tenant_id) e reusa o AuditLogRepository (writer histórico + o novo listByEntity).
export class PrismaWorkOrderAuditLogRepository implements WorkOrderAuditLogRepository {
  async listByEntity(
    tenantId: string,
    entity: string,
    entityId: string,
    limit: number = WORK_ORDER_AUDIT_LOG_DEFAULT_LIMIT,
  ): Promise<readonly WorkOrderAuditLogEntry[]> {
    const rows = await withTenantRls(prisma, tenantId, async (tx) =>
      new AuditLogRepository(tx).listByEntity(tenantId, entity, entityId, limit),
    );

    return rows.map(mapRow);
  }
}

function mapRow(row: PrismaAuditLogRow): WorkOrderAuditLogEntry {
  return {
    id: row.id,
    actorUserId: row.actor_user_id ?? null,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id ?? null,
    metadata: asRecord(row.metadata),
    createdAt: row.created_at,
  };
}

// metadata é Json? — só propagamos objetos (o writer sempre grava um objeto); array/primitivo → null.
function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function createPrismaWorkOrderAuditLogRepository(): WorkOrderAuditLogRepository {
  return new PrismaWorkOrderAuditLogRepository();
}
