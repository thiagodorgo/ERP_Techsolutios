// B-ASS-04 · F5 — o runtime Prisma do demonstrativo. PROVISÓRIO até a F5 (o esquema M3 chega do ramo do banco):
// falha FECHADO (503) em vez de cair silenciosamente para a memória. A F5 troca este corpo pelo repositório Prisma
// sob `withTenantRls`; o PR não sai sem essa troca.

import type { StatementRuntime } from "./statement.factory.js";
import { StatementError } from "./statement.types.js";

export async function createPrismaStatementRuntime(): Promise<StatementRuntime> {
  throw new StatementError(503, "statement_storage_not_ready", "Statement storage is not available yet.");
}
