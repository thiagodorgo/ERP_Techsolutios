import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import { computeWorkOrderTimeseries } from "./work-order-timeseries.compute.js";
import type {
  WorkOrderTimeseriesInput,
  WorkOrderTimeseriesResult,
  WorkOrderTimeseriesRow,
} from "./work-order-timeseries.types.js";
import type { WorkOrderTimeseriesRepository } from "./work-order-timeseries.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

// Carrega as OSs do tenant (SÓ status/created_at/completed_at/cancelled_at) dentro da RLS e delega ao MESMO
// compute puro do InMemory → paridade garantida. O bucketing/janela/zero-fill ficam no compute (fonte única
// da semântica). Varredura completa (data set de dashboard); a otimização por date_trunc/groupBy SQL fica
// como follow-up (P-WOTS-SCALE), espelhando as notas de escala do financial-summary/technician-performance.
export class PrismaWorkOrderTimeseriesRepository implements WorkOrderTimeseriesRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async getTimeseries(input: WorkOrderTimeseriesInput): Promise<WorkOrderTimeseriesResult> {
    const workOrders = await this.client.workOrder.findMany({
      where: { tenant_id: input.tenantId },
      select: { status: true, created_at: true, completed_at: true, cancelled_at: true },
    });

    const rows: WorkOrderTimeseriesRow[] = workOrders.map((workOrder) => ({
      status: workOrder.status,
      createdAt: workOrder.created_at,
      completedAt: workOrder.completed_at,
      cancelledAt: workOrder.cancelled_at,
    }));

    return computeWorkOrderTimeseries(rows, input.window);
  }
}

export class RlsPrismaWorkOrderTimeseriesRepository implements WorkOrderTimeseriesRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  getTimeseries(input: WorkOrderTimeseriesInput): Promise<WorkOrderTimeseriesResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaWorkOrderTimeseriesRepository(tx).getTimeseries(input),
    );
  }
}

export async function createPrismaWorkOrderTimeseriesRepository(): Promise<RlsPrismaWorkOrderTimeseriesRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaWorkOrderTimeseriesRepository(prisma);
}
