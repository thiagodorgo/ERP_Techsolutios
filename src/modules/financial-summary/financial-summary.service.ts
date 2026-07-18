import { env } from "../../config/env.js";
import { InMemoryFinancialSummaryRepository, type FinancialSummaryRepository } from "./financial-summary.repository.js";
import type { FinancialSummary, FinancialSummaryActorContext } from "./financial-summary.types.js";

export class FinancialSummaryService {
  constructor(private readonly repository: FinancialSummaryRepository) {}

  // "now" fixado UMA vez aqui → todas as janelas (vencido/competência corrente/fluxo) usam a mesma referência.
  async getSummary(actor: FinancialSummaryActorContext): Promise<FinancialSummary> {
    return this.repository.getSummary({ tenantId: actor.tenantId, now: new Date() });
  }
}

const memoryRepository = new InMemoryFinancialSummaryRepository();
let defaultServicePromise: Promise<FinancialSummaryService> | undefined;

export function createMemoryFinancialSummaryService(): FinancialSummaryService {
  return new FinancialSummaryService(memoryRepository);
}

export async function createDefaultFinancialSummaryService(): Promise<FinancialSummaryService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryFinancialSummaryService();
  }
  defaultServicePromise ??= createPrismaFinancialSummaryService();
  return defaultServicePromise;
}

// O InMemory é STATELESS (lê os singletons dos módulos, resetados pelos próprios resets financeiros) — só o
// cache do service Prisma precisa ser limpo aqui.
export function resetFinancialSummaryRuntimeForTests(): void {
  defaultServicePromise = undefined;
}

async function createPrismaFinancialSummaryService(): Promise<FinancialSummaryService> {
  const { createPrismaFinancialSummaryRepository } = await import("./financial-summary-prisma.repository.js");
  return new FinancialSummaryService(await createPrismaFinancialSummaryRepository());
}
