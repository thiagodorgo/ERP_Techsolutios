import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import { roundToDecimalPrecision } from "./inventory.calculations.js";
import type { InventoryAbcClass } from "./inventory.types.js";
import {
  type ApplyCloseInput,
  type CreateCycleCountInput,
  type CycleCount,
  type CycleCountEntry,
  type CycleCountStatus,
  type CycleCountWithEntries,
  type ListCycleCountsInput,
  type ListCycleCountsResult,
  type RecordEntryCountInput,
} from "./cycle-count.types.js";
import type { CycleCountRepository } from "./cycle-count.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaCycleCountRepository implements CycleCountRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async createSession(input: CreateCycleCountInput): Promise<CycleCountWithEntries> {
    const session = await this.client.cycleCount.create({
      data: {
        tenant_id: input.tenantId,
        abc_class: input.abcClass ?? null,
        status: "aberta",
        notes: input.notes ?? null,
        created_by: input.createdBy ?? null,
        updated_by: input.createdBy ?? null,
      },
    });

    if (input.entries.length > 0) {
      await this.client.cycleCountEntry.createMany({
        data: input.entries.map((entry) => ({
          tenant_id: input.tenantId,
          cycle_count_id: session.id,
          item_id: entry.itemId,
          system_quantity: roundToDecimalPrecision(entry.systemQuantity),
        })),
      });
    }

    return this.requireSessionWithEntries(input.tenantId, session.id);
  }

  async listSessions(input: ListCycleCountsInput): Promise<ListCycleCountsResult> {
    const where = buildSessionWhere(input);
    const [rows, total] = await Promise.all([
      this.client.cycleCount.findMany({
        where,
        orderBy: [{ created_at: "desc" }],
        take: input.limit,
        skip: input.offset,
      }),
      this.client.cycleCount.count({ where }),
    ]);

    return {
      items: rows.map(mapSessionRecord),
      total,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findSession(tenantId: string, cycleCountId: string): Promise<CycleCount | undefined> {
    const session = await this.client.cycleCount.findFirst({
      where: { tenant_id: tenantId, id: cycleCountId },
    });

    return session ? mapSessionRecord(session) : undefined;
  }

  async findSessionWithEntries(tenantId: string, cycleCountId: string): Promise<CycleCountWithEntries | undefined> {
    const session = await this.findSession(tenantId, cycleCountId);
    if (!session) return undefined;

    return { ...session, entries: await this.entriesOf(tenantId, cycleCountId) };
  }

  async recordEntryCount(input: RecordEntryCountInput): Promise<CycleCountEntry | undefined> {
    const updated = await this.client.cycleCountEntry.updateManyAndReturn({
      where: {
        tenant_id: input.tenantId,
        id: input.entryId,
        cycle_count_id: input.cycleCountId,
      },
      data: {
        counted_quantity: roundToDecimalPrecision(input.countedQuantity),
      },
    });

    return updated[0] ? mapEntryRecord(updated[0]) : undefined;
  }

  async applyClose(input: ApplyCloseInput): Promise<CycleCountWithEntries | undefined> {
    const session = await this.findSession(input.tenantId, input.cycleCountId);
    if (!session) return undefined;

    for (const result of input.entryResults) {
      await this.client.cycleCountEntry.updateMany({
        where: { tenant_id: input.tenantId, id: result.entryId, cycle_count_id: input.cycleCountId },
        data: {
          variance: roundToDecimalPrecision(result.variance),
          adjustment_movement_id: result.adjustmentMovementId,
        },
      });
    }

    await this.client.cycleCount.updateMany({
      where: { tenant_id: input.tenantId, id: input.cycleCountId },
      data: { status: "concluida", updated_by: input.updatedBy ?? null },
    });

    return this.requireSessionWithEntries(input.tenantId, input.cycleCountId);
  }

  async cancelSession(tenantId: string, cycleCountId: string, updatedBy?: string): Promise<CycleCount | undefined> {
    const updated = await this.client.cycleCount.updateManyAndReturn({
      where: { tenant_id: tenantId, id: cycleCountId },
      data: { status: "cancelada", is_active: false, updated_by: updatedBy ?? null },
    });

    return updated[0] ? mapSessionRecord(updated[0]) : undefined;
  }

  private async entriesOf(tenantId: string, cycleCountId: string): Promise<CycleCountEntry[]> {
    const rows = await this.client.cycleCountEntry.findMany({
      where: { tenant_id: tenantId, cycle_count_id: cycleCountId },
      orderBy: [{ created_at: "asc" }],
    });

    return rows.map(mapEntryRecord);
  }

  private async requireSessionWithEntries(tenantId: string, cycleCountId: string): Promise<CycleCountWithEntries> {
    const session = await this.findSessionWithEntries(tenantId, cycleCountId);
    if (!session) {
      throw new Error("Cycle count session vanished immediately after write.");
    }

    return session;
  }
}

export class RlsPrismaCycleCountRepository implements CycleCountRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  createSession(input: CreateCycleCountInput): Promise<CycleCountWithEntries> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaCycleCountRepository(tx).createSession(input));
  }

  listSessions(input: ListCycleCountsInput): Promise<ListCycleCountsResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaCycleCountRepository(tx).listSessions(input));
  }

  findSession(tenantId: string, cycleCountId: string): Promise<CycleCount | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaCycleCountRepository(tx).findSession(tenantId, cycleCountId));
  }

  findSessionWithEntries(tenantId: string, cycleCountId: string): Promise<CycleCountWithEntries | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaCycleCountRepository(tx).findSessionWithEntries(tenantId, cycleCountId),
    );
  }

  recordEntryCount(input: RecordEntryCountInput): Promise<CycleCountEntry | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaCycleCountRepository(tx).recordEntryCount(input));
  }

  applyClose(input: ApplyCloseInput): Promise<CycleCountWithEntries | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaCycleCountRepository(tx).applyClose(input));
  }

  cancelSession(tenantId: string, cycleCountId: string, updatedBy?: string): Promise<CycleCount | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) =>
      new PrismaCycleCountRepository(tx).cancelSession(tenantId, cycleCountId, updatedBy),
    );
  }
}

export async function createPrismaCycleCountRepository(): Promise<RlsPrismaCycleCountRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaCycleCountRepository(prisma);
}

function buildSessionWhere(input: ListCycleCountsInput): Prisma.CycleCountWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
  };
}

function mapSessionRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly abc_class: string | null;
  readonly status: string;
  readonly notes: string | null;
  readonly is_active: boolean;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): CycleCount {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    abcClass: (record.abc_class as InventoryAbcClass | null) ?? undefined,
    status: record.status as CycleCountStatus,
    notes: record.notes ?? undefined,
    isActive: record.is_active,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapEntryRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly cycle_count_id: string;
  readonly item_id: string;
  readonly system_quantity: unknown;
  readonly counted_quantity: unknown;
  readonly variance: unknown;
  readonly adjustment_movement_id: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): CycleCountEntry {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    cycleCountId: record.cycle_count_id,
    itemId: record.item_id,
    systemQuantity: decimalToNumber(record.system_quantity),
    countedQuantity: optionalDecimal(record.counted_quantity),
    variance: optionalDecimal(record.variance),
    adjustmentMovementId: record.adjustment_movement_id ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalDecimal(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}
