import type { PrismaClient } from "@prisma/client";

import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import type { PlatformOverview, PlatformOverviewOrg } from "./platform-overview.types.js";
import type { PlatformOverviewRepository } from "./platform-overview.repository.js";

// Caminho PROD (CORE_SAAS_PERSISTENCE=prisma): dado REAL cross-tenant, sob isolamento.
//
// ISOLAMENTO — como é garantido:
//  - A lista de organizações vem da tabela `tenants`, que NÃO tem RLS. Listar todas as orgs é uma
//    leitura cross-tenant LEGÍTIMA e EXCLUSIVA de plataforma (a rota é gated por
//    requirePlatformPermission — nenhum papel de tenant a alcança).
//  - A contagem de usuários de CADA organização passa por listUsersForTenant(tenant.id), que já roda
//    DENTRO de withTenantRls(tenant.id) na store Prisma. Cada contagem é escopada ao seu próprio tenant
//    (isolamento por construção). NUNCA um groupBy/_count cross-tenant único — sob FORCE RLS ele
//    voltaria 0 (ou, sob BYPASSRLS, leitura sem escopo). N = nº de organizações → N+1 aceitável.
export class PrismaPlatformOverviewRepository implements PlatformOverviewRepository {
  constructor(
    private readonly prismaClient: PrismaClient,
    private readonly coreSaasService: ICoreSaasService,
  ) {}

  async getOverview(): Promise<PlatformOverview> {
    const tenants = await this.prismaClient.tenant.findMany({
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        modules: true,
        created_at: true,
      },
    });

    const orgs: PlatformOverviewOrg[] = [];
    let totalUsers = 0;
    let activeOrgs = 0;

    for (const tenant of tenants) {
      // Escopado ao tenant (withTenantRls dentro de listUsersForTenant). Follow-up de escala:
      // trocar a materialização por um `tx.user.count()` dentro do withTenantRls quando o nº de
      // usuários por org crescer (mesma nota de escala dos agregados vizinhos, ex.: financial-summary).
      const users = await this.coreSaasService.listUsersForTenant(tenant.id);
      const userCount = users.length;
      totalUsers += userCount;

      if (tenant.status === "active") {
        activeOrgs += 1;
      }

      orgs.push({
        id: tenant.id,
        name: tenant.name,
        ...(tenant.slug ? { slug: tenant.slug } : {}),
        status: tenant.status,
        moduleCount: Array.isArray(tenant.modules) ? tenant.modules.length : 0,
        userCount,
        createdAt: tenant.created_at.toISOString(),
      });
    }

    return {
      activeOrgs,
      totalOrgs: tenants.length,
      totalUsers,
      orgs,
    };
  }
}

// Import dinâmico de `database/prisma` (só carrega o PrismaClient/DATABASE_URL no caminho prisma).
export async function createPrismaPlatformOverviewRepository(
  coreSaasService?: ICoreSaasService,
): Promise<PrismaPlatformOverviewRepository> {
  const { prisma } = await import("../../database/prisma.js");
  const service = coreSaasService ?? (await createFallbackCoreSaasService());

  return new PrismaPlatformOverviewRepository(prisma, service);
}

async function createFallbackCoreSaasService(): Promise<ICoreSaasService> {
  const { PrismaCoreSaasService } = await import("../core-saas/services/prisma-core-saas.service.js");

  return new PrismaCoreSaasService();
}
