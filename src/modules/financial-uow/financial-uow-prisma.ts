import type { PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import { PrismaFinancialEntryRepository } from "../financial-entries/financial-entry-prisma.repository.js";
import {
  PrismaFinancialTitleRepository,
  assertPeriodOpenSharedInTx,
} from "../financial-titles/financial-title-prisma.repository.js";
import type { FinancialUnitOfWork, FinancialUowContext } from "./financial-uow.js";

// B-O6R-02 — implementação Prisma da porta de Unit of Work do financeiro: `run` abre UMA transação
// tenant-scoped (withTenantRls) e entrega repositórios LIGADOS a essa transação (os construtores já
// aceitam PrismaExecutor = PrismaClient | TransactionClient). O work lançar = rollback de tudo —
// inclusive do lançamento do perdedor numa corrida (DIN-001, F3). `assertPeriodOpenShared` delega ao
// guard in-tx único (trava SHARED + re-check, DIN-008) — a mesma chave/expressão do close
// (src/database/financial-period-lock.ts).
export class PrismaFinancialUnitOfWork implements FinancialUnitOfWork {
  constructor(private readonly prisma: PrismaClient) {}

  run<T>(tenantId: string, work: (ctx: FinancialUowContext) => Promise<T>): Promise<T> {
    return withTenantRls(this.prisma, tenantId, async (tx) => {
      const ctx: FinancialUowContext = {
        titles: new PrismaFinancialTitleRepository(tx),
        entries: new PrismaFinancialEntryRepository(tx),
        assertPeriodOpenShared: (period, onClosed) => assertPeriodOpenSharedInTx(tx, tenantId, period, onClosed),
      };
      return work(ctx);
    });
  }
}

export async function createPrismaFinancialUnitOfWork(): Promise<PrismaFinancialUnitOfWork> {
  const { prisma } = await import("../../database/prisma.js");
  return new PrismaFinancialUnitOfWork(prisma);
}
