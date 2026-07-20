import { env } from "../../config/env.js";
import {
  InMemoryTechnicianPerformanceRepository,
  type TechnicianPerformanceRepository,
} from "./technician-performance.repository.js";
import {
  TechnicianPerformanceError,
  type TechnicianPerformanceActorContext,
  type TechnicianPerformanceResult,
  type TechnicianPerformanceRow,
} from "./technician-performance.types.js";
import { parseOptionalDate, parseOptionalUuid } from "./technician-performance.validators.js";

type RawRecord = Record<string, unknown>;

export class TechnicianPerformanceService {
  constructor(private readonly repository: TechnicianPerformanceRepository) {}

  async getPerformance(
    actor: TechnicianPerformanceActorContext,
    query: RawRecord = {},
  ): Promise<TechnicianPerformanceResult> {
    const operatorUserId = parseOptionalUuid(query.operatorUserId, "invalid_operator_user_id", "operatorUserId");
    const from = parseOptionalDate(query.from, "invalid_from", "from");
    const to = parseOptionalDate(query.to, "invalid_to", "to");

    if (from && to && from > to) {
      throw new TechnicianPerformanceError(
        400,
        "TECHNICIAN_PERFORMANCE_FILTER_INVALID",
        "invalid_window",
        "from must be before or equal to to.",
      );
    }

    const result = await this.repository.getPerformance({ tenantId: actor.tenantId, operatorUserId, from, to });

    // Técnico pedido EXPLICITAMENTE sem OS atribuída na janela → linha zerada com completionRate=null
    // (nunca 0 fabricado, nunca lista vazia enganosa). NÃO se aplica quando operatorUserId não foi pedido
    // (aí a lista vazia é honesta: nenhum técnico tem OS atribuída).
    if (operatorUserId && result.items.length === 0) {
      const zero: TechnicianPerformanceRow = {
        operatorUserId,
        assignedCount: 0,
        completedCount: 0,
        cancelledCount: 0,
        completionRate: null,
      };

      return { items: [zero] };
    }

    return result;
  }
}

const memoryRepository = new InMemoryTechnicianPerformanceRepository();
let defaultServicePromise: Promise<TechnicianPerformanceService> | undefined;

export function createMemoryTechnicianPerformanceService(): TechnicianPerformanceService {
  return new TechnicianPerformanceService(memoryRepository);
}

export async function createDefaultTechnicianPerformanceService(): Promise<TechnicianPerformanceService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryTechnicianPerformanceService();
  }

  defaultServicePromise ??= createPrismaTechnicianPerformanceService();

  return defaultServicePromise;
}

// O InMemory é STATELESS (lê o singleton de work_orders, resetado por resetWorkOrderRuntimeForTests) — só
// o cache do service Prisma precisa ser limpo aqui.
export function resetTechnicianPerformanceRuntimeForTests(): void {
  defaultServicePromise = undefined;
}

async function createPrismaTechnicianPerformanceService(): Promise<TechnicianPerformanceService> {
  const { createPrismaTechnicianPerformanceRepository } = await import("./technician-performance-prisma.repository.js");

  return new TechnicianPerformanceService(await createPrismaTechnicianPerformanceRepository());
}
