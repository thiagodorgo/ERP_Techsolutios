// B-ASS-03 — persistência de `tenant_usage_daily`. O UPSERT é por (`tenant_id`,`date`): `active_users`
// guarda o MAIOR do dia (GREATEST) e as demais colunas guardam o ÚLTIMO medido (R-F / R-MED-5).

import type { TenantUsageDaily, TenantUsageUpsert } from "./metering.types.js";

export type TenantUsageDailyRepository = {
  upsert(input: TenantUsageUpsert): Promise<TenantUsageDaily>;
};

export class InMemoryTenantUsageDailyRepository implements TenantUsageDailyRepository {
  private readonly rows = new Map<string, TenantUsageDaily>();

  async upsert(input: TenantUsageUpsert): Promise<TenantUsageDaily> {
    const key = `${input.tenantId}|${input.date}`;
    const existing = this.rows.get(key);
    const row: TenantUsageDaily = existing
      ? {
          ...existing,
          activeUsers: Math.max(existing.activeUsers ?? 0, input.activeUsers),
          dbBytesEstimated: input.dbBytesEstimated,
          filesBytes: input.filesBytes,
          filesWithoutSize: input.filesWithoutSize,
          trackedVehicles: input.trackedVehicles,
          measuredAt: input.measuredAt,
          metadata: input.metadata,
        }
      : { ...input };
    this.rows.set(key, row);
    return row;
  }

  list(): readonly TenantUsageDaily[] {
    return [...this.rows.values()];
  }

  get(tenantId: string, date: string): TenantUsageDaily | undefined {
    return this.rows.get(`${tenantId}|${date}`);
  }

  reset(): void {
    this.rows.clear();
  }
}
