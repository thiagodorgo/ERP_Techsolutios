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
