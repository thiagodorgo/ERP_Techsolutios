// B-ASS-02 — leitura do registro GLOBAL `tenants` (sem RLS): o id e o slug da organização. A rota é
// gated por permissão de plataforma, então ler UMA organização por id é leitura legítima do catálogo
// de organizações (mesmo critério do platform-tenant-detail). Nunca confirma dado tenant-scoped.

import type { PrismaClient } from "@prisma/client";

import type { TenantLookup, TenantRef } from "./subscriptions.service.js";

export class PrismaTenantLookup implements TenantLookup {
  constructor(private readonly client: PrismaClient) {}

  async getTenantById(id: string): Promise<TenantRef | null> {
    const record = await this.client.tenant.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });
    return record ? { id: record.id, slug: record.slug } : null;
  }
}
