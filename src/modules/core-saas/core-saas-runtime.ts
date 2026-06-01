import { env } from "../../config/env.js";
import { coreSaasService } from "./core-saas-singleton.js";
import type { ICoreSaasService } from "./services/core-saas-service.interface.js";
import { MemoryCoreSaasAdapter } from "./services/memory-core-saas.adapter.js";

export async function createCoreSaasService(): Promise<ICoreSaasService> {
  if (env.CORE_SAAS_PERSISTENCE === "memory") {
    return new MemoryCoreSaasAdapter(coreSaasService);
  }

  if (env.CORE_SAAS_PERSISTENCE === "prisma") {
    // Dynamic import: only loads src/database/prisma.ts (and PrismaClient) when
    // CORE_SAAS_PERSISTENCE=prisma, so DATABASE_URL is never required in memory mode.
    const { PrismaCoreSaasService } = await import("./services/prisma-core-saas.service.js");

    return new PrismaCoreSaasService();
  }

  throw new Error(`Unsupported CORE_SAAS_PERSISTENCE: ${env.CORE_SAAS_PERSISTENCE}`);
}
