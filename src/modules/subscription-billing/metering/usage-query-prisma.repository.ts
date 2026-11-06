// B-ASS-03 — repositório Prisma da leitura de `tenant_usage_daily` (rota FORCE-POR-TENANT). `withTenantRls`
// troca o GUC na transação; o filtro `tenant_id` explícito fecha o laço sob superusuário (BYPASSRLS).

import type { PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../../database/rls.js";
import type { TenantUsageDaily } from "./metering.types.js";
import type { TenantUsageDailyQuery, UsageQueryFilters } from "./usage-query.service.js";

type UsageRow = {
  readonly tenant_id: string;
  readonly date: Date;
  readonly active_users: number | null;
  readonly db_bytes_estimated: bigint | null;
  readonly files_bytes: bigint | null;
  readonly files_without_size: number | null;
  readonly tracked_vehicles: number | null;
  readonly method_version: number;
  readonly measured_at: Date;
  readonly metadata: unknown;
};

export class PrismaTenantUsageDailyQuery implements TenantUsageDailyQuery {
  constructor(private readonly client: PrismaClient) {}

  async tenantExists(tenantId: string): Promise<boolean> {
    const tenant = await this.client.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });

    return tenant !== null;
  }

  list(tenantId: string, filters: UsageQueryFilters): Promise<readonly TenantUsageDaily[]> {
    return withTenantRls(this.client, tenantId, (tx) =>
      tx.tenantUsageDaily.findMany({
        where: {
          tenant_id: tenantId,
          ...(filters.from || filters.to
            ? {
                date: {
                  ...(filters.from ? { gte: dateOnly(filters.from) } : {}),
                  ...(filters.to ? { lte: dateOnly(filters.to) } : {}),
                },
              }
            : {}),
        },
        orderBy: { date: "asc" },
      }),
    ).then((rows) => rows.map(mapUsageRow));
  }
}

function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function mapUsageRow(row: UsageRow): TenantUsageDaily {
  return {
    tenantId: row.tenant_id,
    date: row.date.toISOString().slice(0, 10),
    activeUsers: row.active_users,
    dbBytesEstimated: row.db_bytes_estimated,
    filesBytes: row.files_bytes,
    filesWithoutSize: row.files_without_size,
    trackedVehicles: row.tracked_vehicles,
    methodVersion: row.method_version,
    measuredAt: row.measured_at,
    metadata: asMetadata(row.metadata),
  };
}

function asMetadata(value: unknown): TenantUsageDaily["metadata"] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as { tablesTimedOut?: unknown };
    return {
      tablesTimedOut: Array.isArray(obj.tablesTimedOut)
        ? obj.tablesTimedOut.filter((item): item is string => typeof item === "string")
        : [],
    };
  }

  return { tablesTimedOut: [] };
}
