import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

import { setTenantRlsContext } from "../../database/rls.js";
import type {
  AppendPortalAccessLogInput,
  PortalAccessLogRepository,
  PortalAccessLogRow,
} from "./portal-access-log.types.js";

// InMemory (dev/test): append-only por construção (só append + leitura de teste; nenhuma mutação/remoção).
export class InMemoryPortalAccessLogRepository implements PortalAccessLogRepository {
  private readonly rows: PortalAccessLogRow[] = [];

  async append(input: AppendPortalAccessLogInput): Promise<void> {
    const now = new Date();
    this.rows.push({
      id: randomUUID(),
      tenantId: input.tenantId,
      portal: input.portal,
      action: input.action,
      outcome: input.outcome,
      processId: input.processId,
      queryFingerprint: input.queryFingerprint,
      ipHash: input.ipHash,
      userAgent: input.userAgent,
      sessionId: input.sessionId,
      occurredAt: input.occurredAt,
      createdAt: now,
    });
  }

  // Só para teste (a superfície pública NUNCA lê o log).
  readForTests(): readonly PortalAccessLogRow[] {
    return [...this.rows];
  }

  reset(): void {
    this.rows.length = 0;
  }
}

// Prisma: grava sob withTenantRls(tenant vinculado) — o portal jamais escreve/lê log de outro tenant (RLS FORCE).
export class PrismaPortalAccessLogRepository implements PortalAccessLogRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async append(input: AppendPortalAccessLogInput): Promise<void> {
    await this.prismaClient.$transaction(async (tx) => {
      await setTenantRlsContext(tx, input.tenantId);
      await tx.portalAccessLog.create({
        data: {
          tenant_id: input.tenantId,
          portal: input.portal,
          action: input.action,
          outcome: input.outcome,
          process_id: input.processId ?? null,
          query_fingerprint: input.queryFingerprint ?? null,
          ip_hash: input.ipHash,
          user_agent: input.userAgent ?? null,
          session_id: input.sessionId ?? null,
          occurred_at: input.occurredAt,
        },
      });
    });
  }
}

export async function createPrismaPortalAccessLogRepository(): Promise<PrismaPortalAccessLogRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new PrismaPortalAccessLogRepository(prisma);
}
