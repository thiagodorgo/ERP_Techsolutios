import { createPrismaClient } from "../../../src/database/pg-connection.js";

export const e2eDatabaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public";

export function createE2ePrisma() {
  return createPrismaClient(e2eDatabaseUrl);
}
