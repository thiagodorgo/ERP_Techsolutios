// B-ASS-03 — leitura de `tenant_usage_daily` para a rota de plataforma (FORCE-POR-TENANT). A leitura
// roda sob `withTenantRls` com o filtro `tenant_id` explícito (padrão das rotas por organização): sob
// superusuário o GUC sozinho não filtra (BYPASSRLS), e a rota não pode ler as linhas de outra org.

import { env } from "../../../config/env.js";
import { SubscriptionBillingError } from "../plans/plan-types.js";
import type { TenantUsageDaily } from "./metering.types.js";

export type UsageQueryFilters = {
  readonly from?: string;
  readonly to?: string;
};

export type TenantUsageDailyQuery = {
  tenantExists(tenantId: string): Promise<boolean>;
  list(tenantId: string, filters: UsageQueryFilters): Promise<readonly TenantUsageDaily[]>;
};

export class TenantUsageDailyQueryService {
  constructor(private readonly query: TenantUsageDailyQuery) {}

  async listForTenant(
    tenantId: string,
    filters: UsageQueryFilters = {},
  ): Promise<readonly TenantUsageDaily[]> {
    if (!(await this.query.tenantExists(tenantId))) {
      throw new SubscriptionBillingError(
        404,
        "NOT_FOUND",
        "tenant_not_found",
        "Platform tenant not found.",
      );
    }
    return this.query.list(tenantId, filters);
  }
}

export async function createDefaultTenantUsageDailyQueryService(): Promise<TenantUsageDailyQueryService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return new TenantUsageDailyQueryService({
      tenantExists: async () => false,
      list: async () => [],
    });
  }

  const [{ prisma }, { PrismaTenantUsageDailyQuery }] = await Promise.all([
    import("../../../database/prisma.js"),
    import("./usage-query-prisma.repository.js"),
  ]);

  return new TenantUsageDailyQueryService(new PrismaTenantUsageDailyQuery(prisma));
}
