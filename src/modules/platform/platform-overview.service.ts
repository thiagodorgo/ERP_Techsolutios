import { env } from "../../config/env.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import {
  InMemoryPlatformOverviewRepository,
  type PlatformOverviewRepository,
} from "./platform-overview.repository.js";
import type { PlatformOverview } from "./platform-overview.types.js";

export class PlatformOverviewService {
  constructor(private readonly repository: PlatformOverviewRepository) {}

  getOverview(): Promise<PlatformOverview> {
    return this.repository.getOverview();
  }
}

export type PlatformOverviewServiceResolver = () => Promise<PlatformOverviewService>;

// Store de memória vazio → agregado honesto (orgs: [], contagens 0) em dev/teste sem Postgres.
const memoryRepository = new InMemoryPlatformOverviewRepository();
let defaultServicePromise: Promise<PlatformOverviewService> | undefined;

export function createMemoryPlatformOverviewService(): PlatformOverviewService {
  return new PlatformOverviewService(memoryRepository);
}

// Persistence-aware, espelhando o padrão do repo (dashboard/technician-performance):
// memória em dev/teste, Prisma real (cross-tenant, sob RLS por org) só quando persistence=prisma.
// O caminho Prisma NUNCA é incondicional (não subiria o app sem Postgres no teste).
export async function createDefaultPlatformOverviewService(
  coreSaasService?: ICoreSaasService,
): Promise<PlatformOverviewService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryPlatformOverviewService();
  }

  defaultServicePromise ??= createPrismaPlatformOverviewService(coreSaasService);

  return defaultServicePromise;
}

// O InMemory é stateless; só o cache do service Prisma precisa ser limpo entre testes.
export function resetPlatformOverviewRuntimeForTests(): void {
  defaultServicePromise = undefined;
}

async function createPrismaPlatformOverviewService(
  coreSaasService?: ICoreSaasService,
): Promise<PlatformOverviewService> {
  const { createPrismaPlatformOverviewRepository } = await import(
    "./platform-overview-prisma.repository.js"
  );

  return new PlatformOverviewService(await createPrismaPlatformOverviewRepository(coreSaasService));
}
