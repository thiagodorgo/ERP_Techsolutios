import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  CloseEvaluator,
  CloseMeta,
  CompetenciaRows,
  FinancialPeriodCloseStore,
  ReopenEvaluator,
} from "./financial-period-close.repository.js";
import type { FinancialPeriodClose, PeriodEntryRow, PeriodTitleRow, StoredSnapshot } from "./financial-period-close.types.js";

type PrismaExecutor = Prisma.TransactionClient;

type PeriodCloseRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly period: string;
  readonly status: string;
  readonly closed_at: Date | null;
  readonly closed_by: string | null;
  readonly reopened_at: Date | null;
  readonly reopened_by: string | null;
  readonly reopen_reason: string | null;
  readonly closing_started_at: Date | null;
  readonly snapshot: Prisma.JsonValue | null;
  readonly created_at: Date;
  readonly updated_at: Date;
};

function mapRecord(record: PeriodCloseRecord): FinancialPeriodClose {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    period: record.period,
    status: record.status,
    closedAt: record.closed_at ?? undefined,
    closedBy: record.closed_by ?? undefined,
    reopenedAt: record.reopened_at ?? undefined,
    reopenedBy: record.reopened_by ?? undefined,
    reopenReason: record.reopen_reason ?? undefined,
    closingStartedAt: record.closing_started_at ?? undefined,
    snapshot: (record.snapshot as StoredSnapshot | null) ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

// Prisma store — o CLOSE lê títulos+lançamentos da competência E escreve a linha na MESMA withTenantRls tx
// (atômico). Um advisory lock em (tenant,period) serializa fechamentos concorrentes; a proteção completa
// contra read-skew de writers exige o mesmo lock no write-path (P-Ω4-6-CLOSE-RACE — fora deste bloco). O
// controle compensatório REAL é a re-derivação material (D1), que flagra um título vazado a posteriori.
export class PrismaFinancialPeriodCloseStore implements FinancialPeriodCloseStore {
  constructor(private readonly prisma: PrismaClient) {}

  async find(tenantId: string, period: string): Promise<FinancialPeriodClose | undefined> {
    return withTenantRls(this.prisma, tenantId, async (tx) => {
      const record = await tx.financialPeriodClose.findFirst({ where: { tenant_id: tenantId, period } });
      return record ? mapRecord(record) : undefined;
    });
  }

  async list(tenantId: string, options: { readonly limit: number; readonly offset: number }): Promise<{ readonly items: readonly FinancialPeriodClose[]; readonly total: number }> {
    return withTenantRls(this.prisma, tenantId, async (tx) => {
      const [records, total] = await Promise.all([
        tx.financialPeriodClose.findMany({ where: { tenant_id: tenantId }, orderBy: [{ created_at: "desc" }, { id: "desc" }], take: options.limit, skip: options.offset }),
        tx.financialPeriodClose.count({ where: { tenant_id: tenantId } }),
      ]);
      return { items: records.map(mapRecord), total };
    });
  }

  async loadCompetencia(tenantId: string, period: string): Promise<CompetenciaRows> {
    return withTenantRls(this.prisma, tenantId, (tx) => this.readCompetencia(tx, tenantId, period));
  }

  async close(tenantId: string, period: string, evaluate: CloseEvaluator): Promise<{ readonly record: FinancialPeriodClose; readonly meta: CloseMeta }> {
    return withTenantRls(this.prisma, tenantId, async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${tenantId}:${period}`}))`;
      const existingRecord = await tx.financialPeriodClose.findFirst({ where: { tenant_id: tenantId, period } });
      const { titles, entries } = await this.readCompetencia(tx, tenantId, period);
      const evaluation = evaluate({ existing: existingRecord ? mapRecord(existingRecord) : undefined, titles, entries }); // pode lançar → rollback
      const snapshot = evaluation.write.snapshot as unknown as Prisma.InputJsonValue;
      const saved = await tx.financialPeriodClose.upsert({
        where: { tenant_id_period: { tenant_id: tenantId, period } },
        create: { tenant_id: tenantId, period, status: evaluation.write.status, closed_at: evaluation.write.closedAt, closed_by: evaluation.write.closedBy ?? null, snapshot },
        update: { status: evaluation.write.status, closed_at: evaluation.write.closedAt, closed_by: evaluation.write.closedBy ?? null, snapshot },
      });
      return { record: mapRecord(saved), meta: evaluation.meta };
    });
  }

  async reopen(tenantId: string, period: string, evaluate: ReopenEvaluator): Promise<FinancialPeriodClose> {
    return withTenantRls(this.prisma, tenantId, async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${tenantId}:${period}`}))`;
      const existingRecord = await tx.financialPeriodClose.findFirst({ where: { tenant_id: tenantId, period } });
      const write = evaluate({ existing: existingRecord ? mapRecord(existingRecord) : undefined }); // lança 422 se não-fechado
      const saved = await tx.financialPeriodClose.update({
        where: { tenant_id_period: { tenant_id: tenantId, period } },
        data: { status: write.status, reopened_at: write.reopenedAt, reopened_by: write.reopenedBy ?? null, reopen_reason: write.reopenReason },
      });
      return mapRecord(saved);
    });
  }

  private async readCompetencia(tx: PrismaExecutor, tenantId: string, period: string): Promise<CompetenciaRows> {
    // tenant_id filtrado EXPLICITAMENTE (g/ataque), além da RLS. Só colunas materiais/informativas necessárias.
    const [titleRows, entryRows] = await Promise.all([
      tx.financialTitle.findMany({
        where: { tenant_id: tenantId, competencia: period, deleted_at: null },
        select: { id: true, direction: true, amount: true, paid_amount: true, status: true },
      }),
      tx.financialEntry.findMany({
        where: { tenant_id: tenantId, competencia: period, deleted_at: null },
        select: { direction: true, amount: true, reconciled: true },
      }),
    ]);
    const titles: PeriodTitleRow[] = titleRows.map((row) => ({
      id: row.id,
      direction: row.direction,
      amount: Number(row.amount),
      paidAmount: Number(row.paid_amount),
      status: row.status,
    }));
    const entries: PeriodEntryRow[] = entryRows.map((row) => ({ direction: row.direction, amount: Number(row.amount), reconciled: row.reconciled }));
    return { titles, entries };
  }
}

export async function createPrismaFinancialPeriodCloseStore(): Promise<PrismaFinancialPeriodCloseStore> {
  const { prisma } = await import("../../database/prisma.js");
  return new PrismaFinancialPeriodCloseStore(prisma);
}
