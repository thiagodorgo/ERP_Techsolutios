// B-ASS-02 — escrita do vínculo plano → módulo (R-PLAN-3, G16) no Postgres: grava `tenants.modules`
// com a lista já unida (versão vigente ∪ add-ons) feita pelo serviço. `tenants` é tabela GLOBAL
// (sem RLS): a escrita é de plataforma e não precisa de GUC. Organização sem assinatura não chega aqui
// (o serviço simplesmente não chama).

import type { PrismaClient } from "@prisma/client";

import type { TenantModulesWriter } from "./tenant-modules.sync.js";

export class PrismaTenantModulesWriter implements TenantModulesWriter {
  constructor(private readonly client: PrismaClient) {}

  async writeModules(tenantId: string, modules: readonly string[]): Promise<void> {
    await this.client.tenant.update({
      where: { id: tenantId },
      data: { modules: [...new Set(modules)] },
    });
  }
}
