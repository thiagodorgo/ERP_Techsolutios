import type { PrismaClient } from "@prisma/client";

import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import { mapTenantModuleFlags } from "./platform-modules.service.js";
import type {
  PlatformTenantDetail,
  PlatformTenantDetailUser,
} from "./platform-tenant-detail.types.js";
import type { PlatformTenantDetailRepository } from "./platform-tenant-detail.repository.js";

// Caminho PROD (CORE_SAAS_PERSISTENCE=prisma): detalhe REAL de UMA organização.
//
// ISOLAMENTO — como é garantido:
//  - O registro da org vem da tabela `tenants` (registro GLOBAL da plataforma, sem RLS). Ler UMA org por
//    id é uma leitura de plataforma LEGÍTIMA: a rota é gated por requirePlatformPermission — nenhum papel
//    de tenant a alcança. Não é dado tenant-scoped; é o catálogo de organizações da própria plataforma.
//  - A lista de usuários vem de listUsersForTenant(tenant.id), que roda DENTRO de withTenantRls(tenant.id)
//    na store Prisma. Os usuários retornados são SEMPRE só os daquela org (isolamento por construção) —
//    NUNCA cross-tenant, mesmo que a org exista.
//  - Org inexistente → null (a rota traduz para 404; não confirma existência de recurso de terceiros).
export class PrismaPlatformTenantDetailRepository implements PlatformTenantDetailRepository {
  constructor(
    private readonly prismaClient: PrismaClient,
    private readonly coreSaasService: ICoreSaasService,
  ) {}

  async getDetail(tenantId: string): Promise<PlatformTenantDetail | null> {
    const tenant = await this.prismaClient.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        modules: true,
        created_at: true,
      },
    });

    if (!tenant) {
      return null;
    }

    const enabledModules = Array.isArray(tenant.modules)
      ? tenant.modules.filter((value): value is string => typeof value === "string")
      : [];
    const modules = mapTenantModuleFlags(enabledModules);

    // Escopado ao tenant (withTenantRls dentro de listUsersForTenant). Mesma nota de escala do overview:
    // materializa a lista; migrar p/ contagem/paginação sob RLS quando o nº de usuários por org crescer.
    const tenantUsers = await this.coreSaasService.listUsersForTenant(tenant.id);
    const users: PlatformTenantDetailUser[] = tenantUsers.map((user) => ({
      name: user.name,
      email: user.email,
      roles: [...user.roles],
      status: user.status,
    }));

    return {
      id: tenant.id,
      name: tenant.name,
      ...(tenant.slug ? { slug: tenant.slug } : {}),
      status: tenant.status,
      createdAt: tenant.created_at.toISOString(),
      moduleCount: modules.filter((module) => module.enabled).length,
      modules,
      users,
    };
  }
}

// Import dinâmico de `database/prisma` (só carrega PrismaClient/DATABASE_URL no caminho prisma).
export async function createPrismaPlatformTenantDetailRepository(
  coreSaasService?: ICoreSaasService,
): Promise<PrismaPlatformTenantDetailRepository> {
  const { prisma } = await import("../../database/prisma.js");
  const service = coreSaasService ?? (await createFallbackCoreSaasService());

  return new PrismaPlatformTenantDetailRepository(prisma, service);
}

async function createFallbackCoreSaasService(): Promise<ICoreSaasService> {
  const { PrismaCoreSaasService } = await import("../core-saas/services/prisma-core-saas.service.js");

  return new PrismaCoreSaasService();
}
