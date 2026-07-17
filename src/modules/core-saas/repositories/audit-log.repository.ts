import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "../../../database/prisma.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

type CreateAuditLogData = {
  readonly tenant_id: string;
  readonly actor_user_id?: string | null;
  readonly action: string;
  readonly entity: string;
  readonly entity_id?: string | null;
  readonly metadata?: Prisma.InputJsonValue;
};

export class AuditLogRepository {
  constructor(private readonly client: PrismaExecutor = prisma) {}

  listByTenant(tenantId: string) {
    return this.client.auditLog.findMany({
      where: {
        tenant_id: tenantId,
      },
      orderBy: {
        created_at: "desc",
      },
    });
  }

  // Ω3F-8a — LEITURA da auditoria de UMA entidade (aba "Logs da OS"): filtra por
  // (tenant_id, entity, entity_id), ordena por created_at DESC e limita (apoiado pelo índice
  // audit_logs_tenant_entity_idx). O chamador (serviço) já roda dentro de withTenantRls.
  listByEntity(tenantId: string, entity: string, entityId: string, limit = 200) {
    return this.client.auditLog.findMany({
      where: {
        tenant_id: tenantId,
        entity,
        entity_id: entityId,
      },
      orderBy: {
        created_at: "desc",
      },
      take: limit,
    });
  }

  create(data: CreateAuditLogData) {
    return this.client.auditLog.create({
      data: {
        tenant_id: data.tenant_id,
        actor_user_id: data.actor_user_id ?? null,
        action: data.action,
        entity: data.entity,
        entity_id: data.entity_id ?? null,
        metadata: data.metadata,
      },
    });
  }
}
