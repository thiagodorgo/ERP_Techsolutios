// B-ASS-09 · F6 — a lista de organizações que a visão e os grupos leem (plano v2 §3, árvore `tenant-list.ts`). O registro
// `tenants` é GLOBAL (sem RLS) e só rotas `requirePlatformPermission` chegam aqui. Porta + dublê em memória; o caminho
// Prisma está em `tenant-list.prisma.ts`.
//
// O serviço de grupos recebe a mesma lista pela porta dele (`GroupTenantDirectory`, F5b), montada aqui
// (`groupTenantDirectoryOf`): os vínculos estão sob RLS FORCE e só se leem organização por organização.

import type { GroupTenantDirectory, GroupTenantRef } from "../economic-groups/economic-groups.service.js";
import type { OverviewTenant } from "./overview.types.js";

export interface OverviewTenantList {
  /** Todas as organizações (a da plataforma inclusive; a visão a reconhece pelo slug). */
  listTenants(): Promise<readonly OverviewTenant[]>;
}

export class InMemoryOverviewTenantList implements OverviewTenantList {
  private readonly tenants = new Map<string, OverviewTenant>();

  upsert(tenant: OverviewTenant): void {
    this.tenants.set(tenant.tenantId, tenant);
  }

  async listTenants(): Promise<readonly OverviewTenant[]> {
    return [...this.tenants.values()];
  }
}

/**
 * O diretório que o `EconomicGroupsService` usa, sobre a lista de organizações. A lista é lida UMA vez por diretório (a
 * fábrica monta um por pedido): o serviço consulta organização por organização (até 500 numa troca), e cada consulta
 * leria o registro inteiro de novo.
 */
export function groupTenantDirectoryOf(list: OverviewTenantList): GroupTenantDirectory {
  let byId: Promise<ReadonlyMap<string, OverviewTenant>> | undefined;
  const tenants = () => (byId ??= list.listTenants().then((all) => new Map(all.map((tenant) => [tenant.tenantId, tenant]))));
  const refOf = (tenant: OverviewTenant): GroupTenantRef => ({ id: tenant.tenantId, slug: tenant.slug ?? "", name: tenant.tenantName });
  return {
    async getTenant(id) {
      const tenant = (await tenants()).get(id);
      return tenant ? refOf(tenant) : null;
    },
    async listTenantIds() {
      return [...(await tenants()).keys()];
    },
  };
}
