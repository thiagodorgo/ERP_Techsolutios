import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type { ImpoundCustodyHistoryRepository } from "./impound.custody-history.repository.js";
import type { CustodyHistoryItem } from "./impound.custody-history.types.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaImpoundCustodyHistoryRepository implements ImpoundCustodyHistoryRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async listCustodyHistory(tenantId: string, processId: string): Promise<readonly CustodyHistoryItem[]> {
    const target = await this.client.impoundProcess.findFirst({
      where: { tenant_id: tenantId, id: processId },
      select: { id: true, identity_id: true },
    });
    if (!target) return [];

    // Com identidade resolvida → todos os processos dela; sem identidade → só o próprio (custódia única na base).
    // §allowlist: `identity_id` é usado só no filtro server-side; NUNCA sai no resultado.
    const where: Prisma.ImpoundProcessWhereInput = target.identity_id
      ? { tenant_id: tenantId, identity_id: target.identity_id }
      : { tenant_id: tenantId, id: processId };

    const rows = await this.client.impoundProcess.findMany({
      where,
      orderBy: [{ entered_at: { sort: "desc", nulls: "last" } }, { created_at: "desc" }],
      select: {
        id: true,
        vehicle_plate: true,
        vehicle_unidentified: true,
        status: true,
        entered_at: true,
        yard: { select: { name: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      vehiclePlate: row.vehicle_plate ?? undefined,
      vehicleUnidentified: row.vehicle_unidentified,
      status: row.status,
      enteredAt: row.entered_at ?? undefined,
      yardName: row.yard?.name ?? undefined,
      isCurrent: row.id === processId,
    }));
  }
}

// Wrapper RLS — mesmo padrão de impound.checklist-link-prisma e vehicle-identities.
export class RlsPrismaImpoundCustodyHistoryRepository implements ImpoundCustodyHistoryRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  listCustodyHistory(tenantId: string, processId: string): Promise<readonly CustodyHistoryItem[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaImpoundCustodyHistoryRepository(tx).listCustodyHistory(tenantId, processId));
  }
}

export async function createPrismaImpoundCustodyHistoryRepository(): Promise<RlsPrismaImpoundCustodyHistoryRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaImpoundCustodyHistoryRepository(prisma);
}
