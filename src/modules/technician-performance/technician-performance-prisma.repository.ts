import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import { computeTechnicianPerformance } from "./technician-performance.compute.js";
import type {
  TechnicianPerformanceInput,
  TechnicianPerformanceResult,
  WorkOrderPerformanceRow,
} from "./technician-performance.types.js";
import type { TechnicianPerformanceRepository } from "./technician-performance.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

// Carrega as OSs ATRIBUÍDAS do tenant (só assigned_user_id / status / created_at) dentro da RLS e delega
// ao MESMO compute puro do InMemory → paridade garantida. A janela/operador ficam a cargo do compute
// (fonte única da semântica). Varredura das atribuídas (data set operacional); otimização por groupBy SQL
// fica como follow-up (P-JMAPAS7-PERF-SCALE), espelhando a nota de escala do financial-summary.
export class PrismaTechnicianPerformanceRepository implements TechnicianPerformanceRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async getPerformance(input: TechnicianPerformanceInput): Promise<TechnicianPerformanceResult> {
    const workOrders = await this.client.workOrder.findMany({
      where: { tenant_id: input.tenantId, assigned_user_id: { not: null } },
      select: { assigned_user_id: true, status: true, created_at: true },
    });

    const rows: WorkOrderPerformanceRow[] = workOrders.map((workOrder) => ({
      operatorUserId: workOrder.assigned_user_id as string,
      status: workOrder.status,
      createdAt: workOrder.created_at,
    }));

    return {
      items: computeTechnicianPerformance(rows, {
        operatorUserId: input.operatorUserId,
        from: input.from,
        to: input.to,
      }),
    };
  }
}

export class RlsPrismaTechnicianPerformanceRepository implements TechnicianPerformanceRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  getPerformance(input: TechnicianPerformanceInput): Promise<TechnicianPerformanceResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaTechnicianPerformanceRepository(tx).getPerformance(input),
    );
  }
}

export async function createPrismaTechnicianPerformanceRepository(): Promise<RlsPrismaTechnicianPerformanceRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaTechnicianPerformanceRepository(prisma);
}
