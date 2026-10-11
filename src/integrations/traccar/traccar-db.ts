// B-TRC-01 · `PrismaClient` SÓ da ingestão do Traccar (plano v2.1 §4.1; A2-07).
//
// O processo tem um `PrismaClient` público (`src/database/prisma.ts`, pool padrão de 10 conexões do `pg-pool`). Para
// a ingestão não roubar conexão do ERP, ela tem o PRÓPRIO pool, com `max = TRACCAR_DB_POOL_MAX` (5), mesmo papel de
// runtime, e marca as conexões com `application_name=erp-traccar-ingest` (contável em `pg_stat_activity`). A ingestão
// NUNCA importa `src/database/prisma.ts`.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

export const TRACCAR_INGEST_APPLICATION_NAME = "erp-traccar-ingest";

export function withTraccarIngestApplicationName(connectionString: string): string {
  const url = new URL(connectionString);
  url.searchParams.set("application_name", TRACCAR_INGEST_APPLICATION_NAME);
  return url.toString();
}

export function createTraccarIngestPrismaClient(options: { readonly connectionString: string; readonly max: number }): PrismaClient {
  if (!options.connectionString) {
    throw new Error("traccar ingest: DATABASE_URL é obrigatória para o pool da ingestão.");
  }
  if (!Number.isInteger(options.max) || options.max <= 0) {
    throw new Error("traccar ingest: TRACCAR_DB_POOL_MAX precisa ser inteiro positivo.");
  }
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: withTraccarIngestApplicationName(options.connectionString),
      max: options.max,
    }),
  });
}
