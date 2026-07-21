import { env } from "../../config/env.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import {
  InMemoryPlatformTenantDetailRepository,
  type PlatformTenantDetailRepository,
} from "./platform-tenant-detail.repository.js";
import type { PlatformTenantDetail } from "./platform-tenant-detail.types.js";

export class PlatformTenantDetailService {
  constructor(private readonly repository: PlatformTenantDetailRepository) {}

  getDetail(tenantId: string): Promise<PlatformTenantDetail | null> {
    return this.repository.getDetail(tenantId);
  }
}

export type PlatformTenantDetailServiceResolver = () => Promise<PlatformTenantDetailService>;

// Store de memória vazio → detalhe honesto (qualquer id → null → 404) em dev/teste sem Postgres.
const memoryRepository = new InMemoryPlatformTenantDetailRepository();
let defaultServicePromise: Promise<PlatformTenantDetailService> | undefined;

export function createMemoryPlatformTenantDetailService(): PlatformTenantDetailService {
  return new PlatformTenantDetailService(memoryRepository);
}

// Persistence-aware, espelhando o overview: memória em dev/teste; Prisma real (org por id + usuários
// da org sob RLS) só quando persistence=prisma. O caminho Prisma NUNCA é incondicional (não subiria o
// app sem Postgres no teste).
export async function createDefaultPlatformTenantDetailService(
  coreSaasService?: ICoreSaasService,
): Promise<PlatformTenantDetailService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryPlatformTenantDetailService();
  }

  defaultServicePromise ??= createPrismaPlatformTenantDetailService(coreSaasService);

  return defaultServicePromise;
}

// O InMemory é stateless; só o cache do service Prisma precisa ser limpo entre testes.
export function resetPlatformTenantDetailRuntimeForTests(): void {
  defaultServicePromise = undefined;
}

async function createPrismaPlatformTenantDetailService(
  coreSaasService?: ICoreSaasService,
): Promise<PlatformTenantDetailService> {
  const { createPrismaPlatformTenantDetailRepository } = await import(
    "./platform-tenant-detail-prisma.repository.js"
  );

  return new PlatformTenantDetailService(
    await createPrismaPlatformTenantDetailRepository(coreSaasService),
  );
}
