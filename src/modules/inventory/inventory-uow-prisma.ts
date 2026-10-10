import type { PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import { PrismaCycleCountRepository } from "./cycle-count-prisma.repository.js";
import { cycleCountBusyError } from "./cycle-count.types.js";
import { mapTransientDbFailure, PrismaInventoryRepository } from "./inventory-prisma.repository.js";
import type { InventoryUnitOfWork, InventoryUowContext } from "./inventory-uow.js";

// B-O6R-04a — implementação Prisma da porta: `run` abre UMA transação tenant-scoped (withTenantRls) e entrega os
// repositórios LIGADOS a ela (os construtores aceitam PrismaExecutor = PrismaClient | TransactionClient). O work
// lançar = rollback de tudo (ajuste + carimbo). Falha transitória (contenção > timeout, impasse) → 503
// `CYCLE_COUNT_UNAVAILABLE/cycle_count_busy`, nada gravado — o fechamento segue retomável.
export class PrismaInventoryUnitOfWork implements InventoryUnitOfWork {
  constructor(private readonly prisma: PrismaClient) {}

  async run<T>(tenantId: string, work: (ctx: InventoryUowContext) => Promise<T>): Promise<T> {
    try {
      return await withTenantRls(this.prisma, tenantId, (tx) =>
        work({ inventory: new PrismaInventoryRepository(tx), cycleCounts: new PrismaCycleCountRepository(tx) }),
      );
    } catch (error) {
      throw mapTransientDbFailure(error, cycleCountBusyError);
    }
  }
}

export async function createPrismaInventoryUnitOfWork(): Promise<PrismaInventoryUnitOfWork> {
  const { prisma } = await import("../../database/prisma.js");

  return new PrismaInventoryUnitOfWork(prisma);
}
