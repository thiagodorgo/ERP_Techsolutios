import { env } from "../../config/env.js";
import { CoreSaasRegistry } from "./services/core-saas.service.js";
import { InMemoryCoreSaasStore } from "./store/core-saas.store.js";
import { MemoryCoreSaasAdapter } from "./services/memory-core-saas.adapter.js";
import type { ICoreSaasService } from "./services/core-saas-service.interface.js";

export * from "./middleware/rbac.middleware.js";
export * from "./middleware/tenant-context.middleware.js";
export * from "./permissions/catalog.js";
export * from "./routes/index.js";
export * from "./services/core-saas.service.js";
export * from "./services/core-saas-service.interface.js";
export * from "./services/memory-core-saas.adapter.js";
export * from "./store/async-core-saas.store.js";
export * from "./store/core-saas.store.js";
export * from "./types/core-saas.types.js";

export const coreSaasStore = new InMemoryCoreSaasStore();
export const coreSaasService = new CoreSaasRegistry(coreSaasStore);

export async function createCoreSaasService(): Promise<ICoreSaasService> {
  if (env.CORE_SAAS_PERSISTENCE === "memory") {
    return new MemoryCoreSaasAdapter(coreSaasService);
  }

  // Dynamic import: only loads src/database/prisma.ts (and PrismaClient) when
  // CORE_SAAS_PERSISTENCE=prisma, so DATABASE_URL is never required in memory mode.
  const { PrismaCoreSaasService } = await import("./services/prisma-core-saas.service.js");

  return new PrismaCoreSaasService();
}
