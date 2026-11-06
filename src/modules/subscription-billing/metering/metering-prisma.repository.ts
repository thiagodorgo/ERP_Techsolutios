// B-ASS-03 — executor SQL e repositório Prisma do medidor. Todas as leituras rodam SOB a transação do
// chamador (GUC `app.current_tenant_id` já setado por `withTenantRlsBudget`); nenhuma consulta filtra
// `tenant_id` com igualdade literal — o isolamento é da RLS (R-MED-3, guard T-MED-5).

import type { Prisma } from "@prisma/client";

import {
  TableMeasurementTimeoutError,
  type MeteringAttachmentModel,
  type TenantUsageDaily,
  type TenantUsageUpsert,
} from "./metering.types.js";
import type { AttachmentBytes, MeteringSqlExecutor } from "./metering.sql.js";
import { TenantUsageMeter } from "./metering.service.js";
import type { TenantUsageDailyRepository } from "./tenant-usage.repository.js";
import type { MeteringDay } from "./metering.service.js";

type MeteringTx = Prisma.TransactionClient;

const TABLE_NAME_PATTERN = /^[a-z0-9_]+$/;

function isStatementTimeout(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  const message = (error as { message?: string }).message ?? "";
  return code === "57014" || /statement timeout/i.test(message);
}

export class PrismaMeteringSqlExecutor implements MeteringSqlExecutor {
  private savepointIndex = 0;

  constructor(private readonly tx: MeteringTx) {}

  async currentTenantSetting(): Promise<string | null> {
    const rows = await this.tx.$queryRaw<Array<{ setting: string | null }>>`
      SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::text AS setting`;
    return rows[0]?.setting ?? null;
  }

  async canaryTenantRows(): Promise<readonly { readonly tenantId: string }[]> {
    const rows = await this.tx.$queryRaw<Array<{ tenant_id: string }>>`
      SELECT tenant_id FROM users LIMIT 1`;
    return rows.map((row) => ({ tenantId: row.tenant_id }));
  }

  async countActiveUsers(): Promise<number> {
    return this.tx.user.count({ where: { status: "active" } });
  }

  async sumAttachmentBytes(model: MeteringAttachmentModel): Promise<AttachmentBytes> {
    const where = attachmentWhere(model);
    const rows = await this.tx.$queryRawUnsafe<Array<{ bytes: bigint | null; without_size: number | null }>>(
      `SELECT coalesce(sum(size_bytes), 0)::bigint AS bytes,
              count(*) FILTER (WHERE size_bytes IS NULL)::int AS without_size
         FROM "${model}" ${where}`,
    );
    const row = rows[0];
    return {
      bytes: row?.bytes ?? 0n,
      withoutSize: row?.without_size ?? 0,
    };
  }

  async measureTableBytes(table: string): Promise<bigint> {
    if (!TABLE_NAME_PATTERN.test(table)) {
      throw new Error(`measureTableBytes: nome de tabela inválido: ${table}`);
    }
    this.savepointIndex += 1;
    const savepoint = `metering_t_${this.savepointIndex}`;
    await this.tx.$executeRawUnsafe(`SAVEPOINT ${savepoint}`);
    try {
      const rows = await this.tx.$queryRawUnsafe<Array<{ bytes: bigint | null }>>(
        `SELECT coalesce(sum(pg_column_size(t.*)), 0)::bigint AS bytes FROM "${table}" t`,
      );
      await this.tx.$executeRawUnsafe(`RELEASE SAVEPOINT ${savepoint}`);
      return rows[0]?.bytes ?? 0n;
    } catch (error) {
      if (isStatementTimeout(error)) {
        await this.tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        throw new TableMeasurementTimeoutError(table);
      }
      throw error;
    }
  }

  async countTrackedVehicles(dayStart: Date, dayEnd: Date): Promise<number> {
    const rows = await this.tx.$queryRaw<Array<{ n: number }>>`
      SELECT count(distinct vehicle_id)::int AS n
        FROM vehicle_tracking_bindings
       WHERE valid_from <= ${dayEnd}
         AND (valid_to IS NULL OR valid_to >= ${dayStart})`;
    return rows[0]?.n ?? 0;
  }
}

export class PrismaTenantUsageDailyRepository implements TenantUsageDailyRepository {
  constructor(private readonly tx: MeteringTx) {}

  async upsert(input: TenantUsageUpsert): Promise<TenantUsageDaily> {
    const row = await this.tx.$queryRaw<Array<{
      id: string;
      tenant_id: string;
      date: Date;
      active_users: number | null;
      db_bytes_estimated: bigint | null;
      files_bytes: bigint | null;
      files_without_size: number | null;
      tracked_vehicles: number | null;
      method_version: number;
      measured_at: Date;
      metadata: TenantUsageUpsert["metadata"];
    }>>`
      INSERT INTO tenant_usage_daily (
        tenant_id, date, active_users, db_bytes_estimated, files_bytes, files_without_size,
        tracked_vehicles, method_version, measured_at, metadata
      ) VALUES (
        ${input.tenantId}::uuid, ${input.date}::date, ${input.activeUsers},
        ${input.dbBytesEstimated}, ${input.filesBytes}, ${input.filesWithoutSize},
        ${input.trackedVehicles}, ${input.methodVersion}, ${input.measuredAt}, ${JSON.stringify(input.metadata)}::jsonb
      )
      ON CONFLICT (tenant_id, date) DO UPDATE SET
        active_users = GREATEST(tenant_usage_daily.active_users, EXCLUDED.active_users),
        db_bytes_estimated = EXCLUDED.db_bytes_estimated,
        files_bytes = EXCLUDED.files_bytes,
        files_without_size = EXCLUDED.files_without_size,
        tracked_vehicles = EXCLUDED.tracked_vehicles,
        method_version = EXCLUDED.method_version,
        measured_at = EXCLUDED.measured_at,
        metadata = EXCLUDED.metadata,
        updated_at = now()
      RETURNING id, tenant_id, date, active_users, db_bytes_estimated, files_bytes,
        files_without_size, tracked_vehicles, method_version, measured_at, metadata`;
    const saved = row[0]!;
    return {
      tenantId: saved.tenant_id,
      date: toIsoDate(saved.date),
      activeUsers: saved.active_users,
      dbBytesEstimated: saved.db_bytes_estimated,
      filesBytes: saved.files_bytes,
      filesWithoutSize: saved.files_without_size,
      trackedVehicles: saved.tracked_vehicles,
      methodVersion: saved.method_version,
      measuredAt: saved.measured_at,
      metadata: saved.metadata,
    };
  }
}

export function measureTenantUsageInTx(
  tx: MeteringTx,
  tenantId: string,
  day: MeteringDay,
  tables: readonly string[],
): Promise<TenantUsageDaily> {
  const sql = new PrismaMeteringSqlExecutor(tx);
  const repository = new PrismaTenantUsageDailyRepository(tx);
  return new TenantUsageMeter(sql, repository, tables).measureTenant(tenantId, day);
}

function attachmentWhere(model: MeteringAttachmentModel): string {
  if (model === "work_order_attachments" || model === "attachments") {
    return `WHERE deleted_at IS NULL AND status = 'stored'`;
  }
  return "";
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
