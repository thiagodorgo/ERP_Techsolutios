// B-ASS-03 — o medidor diário. Para cada organização (menos a de sistema), mede usuários ativos, espaço
// de arquivos, bytes de banco (método 2, por tabela, com orçamento) e veículos rastreados; antes de
// gravar, confere o GUC e o canário (R-MED-4, fail-closed). O UPSERT é do repositório (GREATEST no
// dia / último medido nas demais — R-MED-5).

import {
  METERING_ATTACHMENT_MODELS,
  METERING_METHOD_VERSION,
  TenantContextMissingError,
  TableMeasurementTimeoutError,
  type TenantUsageDaily,
} from "./metering.types.js";
import type { MeteringSqlExecutor } from "./metering.sql.js";
import { assertRowsBelongToTenant } from "../../../database/rls.js";
import type { TenantUsageDailyRepository } from "./tenant-usage.repository.js";

export type MeteringDay = {
  readonly date: string;
  readonly start: Date;
  readonly end: Date;
};

export type MeteringTenantRef = {
  readonly id: string;
  readonly slug?: string;
};

export class TenantUsageMeter {
  constructor(
    private readonly sql: MeteringSqlExecutor,
    private readonly repository: TenantUsageDailyRepository,
    private readonly tables: readonly string[],
  ) {}

  async measureTenant(tenantId: string, day: MeteringDay): Promise<TenantUsageDaily> {
    // R-MED-4 — fail-closed ANTES de qualquer gravação: o GUC tem de casar e o canário tem de devolver
    // a linha da própria organização. Sem GUC a leitura dá 0 (FORCE RLS) e isto lança; engolir a
    // exceção deixa o dia da organização SEM linha e o job registra o erro (nunca grava 0 calado).
    const setting = await this.sql.currentTenantSetting();
    if (setting !== tenantId) {
      throw new TenantContextMissingError();
    }
    const canary = await this.sql.canaryTenantRows();
    assertRowsBelongToTenant(canary, tenantId, "users");

    const activeUsers = await this.sql.countActiveUsers();

    let filesBytes = 0n;
    let filesWithoutSize = 0;
    for (const model of METERING_ATTACHMENT_MODELS) {
      const file = await this.sql.sumAttachmentBytes(model);
      filesBytes += file.bytes;
      filesWithoutSize += file.withoutSize;
    }

    let dbBytes: bigint | null = null;
    const tablesTimedOut: string[] = [];
    for (const table of this.tables) {
      try {
        const bytes = await this.sql.measureTableBytes(table);
        dbBytes = (dbBytes ?? 0n) + bytes;
      } catch (error) {
        if (error instanceof TableMeasurementTimeoutError) {
          tablesTimedOut.push(error.table);
          continue;
        }
        throw error;
      }
    }

    const trackedVehicles = await this.sql.countTrackedVehicles(day.start, day.end);

    return this.repository.upsert({
      tenantId,
      date: day.date,
      activeUsers,
      dbBytesEstimated: dbBytes,
      filesBytes,
      filesWithoutSize,
      trackedVehicles,
      methodVersion: METERING_METHOD_VERSION,
      measuredAt: new Date(),
      metadata: { tablesTimedOut },
    });
  }

  /** A volta diária do job: uma medição por organização cobrável, sem a organização de sistema (R-MED-10). */
  async measureDaily(tenants: readonly MeteringTenantRef[], day: MeteringDay): Promise<TenantUsageDaily[]> {
    const rows: TenantUsageDaily[] = [];
    for (const tenant of tenants) {
      if ((tenant.slug ?? "").toLowerCase() === "platform") continue;
      rows.push(await this.measureTenant(tenant.id, day));
    }
    return rows;
  }
}

export type TenantUsageDailyDto = {
  readonly tenantId: string;
  readonly date: string;
  readonly activeUsers: number | null;
  readonly dbBytesEstimated: string | null;
  readonly filesBytes: string | null;
  readonly filesWithoutSize: number | null;
  readonly trackedVehicles: number | null;
  readonly methodVersion: number;
  readonly measuredAt: string;
  readonly metadata: TenantUsageDaily["metadata"];
};

/** Sonda I (R-MED-10): BigInt sai como string decimal; `JSON.stringify` não lança. */
export function toUsageDto(row: TenantUsageDaily): TenantUsageDailyDto {
  return {
    tenantId: row.tenantId,
    date: row.date,
    activeUsers: row.activeUsers,
    dbBytesEstimated: row.dbBytesEstimated === null ? null : row.dbBytesEstimated.toString(),
    filesBytes: row.filesBytes === null ? null : row.filesBytes.toString(),
    filesWithoutSize: row.filesWithoutSize,
    trackedVehicles: row.trackedVehicles,
    methodVersion: row.methodVersion,
    measuredAt: row.measuredAt.toISOString(),
    metadata: row.metadata,
  };
}
