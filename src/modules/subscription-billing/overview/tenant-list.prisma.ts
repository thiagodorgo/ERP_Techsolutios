// B-ASS-09 · F6 — a lista de organizações no Prisma: o registro GLOBAL `tenants` (sem RLS), só id, nome e slug. A rota é
// gated por permissão de plataforma; nenhum dado da organização (tabela sob RLS) é lido aqui. Mesmo critério do
// `PrismaTenantLookup` (`plans/tenant-lookup.prisma.ts`) e do `listTenants` do rateio.

import type { PrismaClient } from "@prisma/client";

import type { OverviewTenant } from "./overview.types.js";
import type { OverviewTenantList } from "./tenant-list.js";

export class PrismaOverviewTenantList implements OverviewTenantList {
  constructor(private readonly client: PrismaClient) {}

  async listTenants(): Promise<readonly OverviewTenant[]> {
    const records = await this.client.tenant.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } });
    return records.map((record) => ({ tenantId: record.id, tenantName: record.name, slug: record.slug }));
  }
}
