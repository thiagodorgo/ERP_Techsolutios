// B-ASS-03 — dublê em memória do executor SQL do medidor, para os testes de unidade sem Postgres.
// Simula o GUC: `currentTenantId` é o contexto da volta; todas as leituras filtram por ele.

import type { MeteringSqlExecutor, AttachmentBytes } from "./metering.sql.js";
import {
  METERING_ATTACHMENT_FILTERS,
  TableMeasurementTimeoutError,
  type MeteringAttachmentModel,
} from "./metering.types.js";

export type MemoryUserSeed = {
  readonly tenantId: string;
  readonly status: string;
};

export type MemoryAttachmentSeed = {
  readonly tenantId: string;
  readonly model: MeteringAttachmentModel;
  readonly sizeBytes?: number;
  readonly deletedAt?: Date;
  readonly status?: string;
};

export type MemoryBindingSeed = {
  readonly tenantId: string;
  readonly vehicleId: string;
  readonly validFrom: Date;
  readonly validTo?: Date;
};

export class InMemoryMeteringSqlExecutor implements MeteringSqlExecutor {
  currentTenantId: string | null = null;
  private readonly users: MemoryUserSeed[] = [];
  private readonly attachments: MemoryAttachmentSeed[] = [];
  private readonly bindings: MemoryBindingSeed[] = [];
  private readonly dbBytes = new Map<string, bigint>();
  private readonly timedOut = new Set<string>();

  seedUsers(rows: readonly MemoryUserSeed[]): void {
    this.users.push(...rows);
  }

  seedAttachments(rows: readonly MemoryAttachmentSeed[]): void {
    this.attachments.push(...rows);
  }

  seedBindings(rows: readonly MemoryBindingSeed[]): void {
    this.bindings.push(...rows);
  }

  seedTableBytes(tenantId: string, table: string, bytes: bigint): void {
    this.dbBytes.set(`${tenantId}|${table}`, bytes);
  }

  seedTimeout(table: string): void {
    this.timedOut.add(table);
  }

  async currentTenantSetting(): Promise<string | null> {
    return this.currentTenantId;
  }

  async canaryTenantId(): Promise<string | null> {
    if (this.currentTenantId === null) return null;
    const hasUser = this.users.some((user) => user.tenantId === this.currentTenantId);
    return hasUser ? this.currentTenantId : null;
  }

  async countActiveUsers(): Promise<number> {
    return this.users.filter((user) => user.tenantId === this.currentTenantId && user.status === "active").length;
  }

  async sumAttachmentBytes(model: MeteringAttachmentModel): Promise<AttachmentBytes> {
    const filter = METERING_ATTACHMENT_FILTERS[model];
    const rows = this.attachments.filter((attachment) => attachment.tenantId === this.currentTenantId && attachment.model === model);
    const living = rows.filter((row) => {
      if (filter.deletedAt && row.deletedAt) return false;
      if (filter.status && row.status !== undefined && row.status !== "stored") return false;
      return true;
    });
    let bytes = 0n;
    let withoutSize = 0;
    for (const row of living) {
      if (row.sizeBytes === undefined) withoutSize += 1;
      else bytes += BigInt(row.sizeBytes);
    }
    return { bytes, withoutSize };
  }

  async measureTableBytes(table: string): Promise<bigint> {
    if (this.timedOut.has(table)) throw new TableMeasurementTimeoutError(table);
    return this.dbBytes.get(`${this.currentTenantId}|${table}`) ?? 0n;
  }

  async countTrackedVehicles(dayStart: Date, dayEnd: Date): Promise<number> {
    const vehicles = new Set<string>();
    for (const binding of this.bindings) {
      if (binding.tenantId !== this.currentTenantId) continue;
      if (binding.validFrom.getTime() > dayEnd.getTime()) continue;
      if (binding.validTo && binding.validTo.getTime() < dayStart.getTime()) continue;
      vehicles.add(binding.vehicleId);
    }
    return vehicles.size;
  }
}
