import { env } from "../../config/env.js";
import {
  InMemoryWorkOrderTimeseriesRepository,
  type WorkOrderTimeseriesRepository,
} from "./work-order-timeseries.repository.js";
import type {
  WorkOrderTimeseriesActorContext,
  WorkOrderTimeseriesResult,
} from "./work-order-timeseries.types.js";
import { resolveWindow } from "./work-order-timeseries.validators.js";

type RawRecord = Record<string, unknown>;

export class WorkOrderTimeseriesService {
  constructor(private readonly repository: WorkOrderTimeseriesRepository) {}

  // "now" fixado UMA vez aqui → a janela default (últimos N dias terminando hoje) usa uma referência única.
  async getTimeseries(
    actor: WorkOrderTimeseriesActorContext,
    query: RawRecord = {},
  ): Promise<WorkOrderTimeseriesResult> {
    const window = resolveWindow(query, new Date());

    return this.repository.getTimeseries({ tenantId: actor.tenantId, window });
  }
}

const memoryRepository = new InMemoryWorkOrderTimeseriesRepository();
let defaultServicePromise: Promise<WorkOrderTimeseriesService> | undefined;

export function createMemoryWorkOrderTimeseriesService(): WorkOrderTimeseriesService {
  return new WorkOrderTimeseriesService(memoryRepository);
}

export async function createDefaultWorkOrderTimeseriesService(): Promise<WorkOrderTimeseriesService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryWorkOrderTimeseriesService();
  }

  defaultServicePromise ??= createPrismaWorkOrderTimeseriesService();

  return defaultServicePromise;
}

// O InMemory é STATELESS (lê o singleton de work_orders, resetado por resetWorkOrderRuntimeForTests) — só o
// cache do service Prisma precisa ser limpo aqui.
export function resetWorkOrderTimeseriesRuntimeForTests(): void {
  defaultServicePromise = undefined;
}

async function createPrismaWorkOrderTimeseriesService(): Promise<WorkOrderTimeseriesService> {
  const { createPrismaWorkOrderTimeseriesRepository } = await import("./work-order-timeseries-prisma.repository.js");

  return new WorkOrderTimeseriesService(await createPrismaWorkOrderTimeseriesRepository());
}
