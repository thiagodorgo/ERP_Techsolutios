import { randomUUID } from "node:crypto";

import { getMemoryFinancialEntryRepositoryForTests } from "../financial-entries/financial-entry.service.js";
import type { InMemoryFinancialEntryRepository } from "../financial-entries/financial-entry.repository.js";
import type { FinancialPeriodCloseRow } from "../financial-titles/financial-title.repository.js";
import {
  getMemoryFinancialPeriodCloseRepositoryForTests,
  getMemoryFinancialTitleRepositoryForTests,
} from "../financial-titles/financial-title.service.js";
import type { InMemoryFinancialTitleRepository, InMemoryFinancialPeriodCloseRepository } from "../financial-titles/financial-title.repository.js";
import type {
  FinancialPeriodClose,
  PeriodEntryRow,
  PeriodTitleRow,
  StoredSnapshot,
} from "./financial-period-close.types.js";

// Escrita do CLOSE (flip + snapshot no MESMO write → atômico por construção). closingStartedAt fica de fora
// (reservado, nunca escrito em v1). O status é sempre "closed".
export type CloseWrite = {
  readonly status: string;
  readonly closedAt: Date;
  readonly closedBy?: string;
  readonly snapshot: StoredSnapshot;
};

export type CloseMeta = {
  readonly overriddenDisputeTitleIds: readonly string[];
  readonly forced: boolean;
};

export type CloseEvaluation = {
  readonly write: CloseWrite;
  readonly meta: CloseMeta;
};

export type ReopenWrite = {
  readonly status: string;
  readonly reopenedAt: Date;
  readonly reopenedBy?: string;
  readonly reopenReason: string;
};

export type CompetenciaRows = {
  readonly titles: readonly PeriodTitleRow[];
  readonly entries: readonly PeriodEntryRow[];
};

// O EVALUATOR é PURO e vive no service (usa as funções de snapshot). Recebe o estado LIDO (linha atual +
// títulos/lançamentos da competência) e devolve o que gravar — OU LANÇA (409/422) para abortar sem gravar.
// No Prisma o read+evaluate+write correm na MESMA withTenantRls tx → lançar reverte tudo (rollback).
export type CloseEvaluator = (context: { readonly existing?: FinancialPeriodClose } & CompetenciaRows) => CloseEvaluation;
export type ReopenEvaluator = (context: { readonly existing?: FinancialPeriodClose }) => ReopenWrite;

export interface FinancialPeriodCloseStore {
  find(tenantId: string, period: string): Promise<FinancialPeriodClose | undefined>;
  list(tenantId: string, options: { readonly limit: number; readonly offset: number }): Promise<{ readonly items: readonly FinancialPeriodClose[]; readonly total: number }>;
  loadCompetencia(tenantId: string, period: string): Promise<CompetenciaRows>;
  close(tenantId: string, period: string, evaluate: CloseEvaluator): Promise<{ readonly record: FinancialPeriodClose; readonly meta: CloseMeta }>;
  reopen(tenantId: string, period: string, evaluate: ReopenEvaluator): Promise<FinancialPeriodClose>;
}

function toTitleRow(title: { id: string; direction: string; amount: number; paidAmount: number; status: string }): PeriodTitleRow {
  return { id: title.id, direction: title.direction, amount: title.amount, paidAmount: title.paidAmount, status: title.status };
}

function toEntryRow(entry: { direction: string; amount: number; reconciled: boolean }): PeriodEntryRow {
  return { direction: entry.direction, amount: entry.amount, reconciled: entry.reconciled };
}

export function mapRow(row: FinancialPeriodCloseRow): FinancialPeriodClose {
  return {
    id: row.id,
    tenantId: row.tenantId,
    period: row.period,
    status: row.status,
    closedAt: row.closedAt,
    closedBy: row.closedBy,
    reopenedAt: row.reopenedAt,
    reopenedBy: row.reopenedBy,
    reopenReason: row.reopenReason,
    closingStartedAt: row.closingStartedAt,
    snapshot: (row.snapshot as StoredSnapshot | undefined) ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// InMemory — delega ao MESMO singleton de fechamento do guard (getMemoryFinancialPeriodCloseRepositoryForTests)
// e lê títulos/lançamentos dos singletons de Ω4-2/Ω4-4. Sem tx real (single-threaded): flip+snapshot é um único
// createRow/updateRow → atômico por construção (se o persist lançar, nada fica gravado — teste 14).
export class InMemoryFinancialPeriodCloseStore implements FinancialPeriodCloseStore {
  constructor(
    private readonly closes: InMemoryFinancialPeriodCloseRepository = getMemoryFinancialPeriodCloseRepositoryForTests(),
    private readonly titles: InMemoryFinancialTitleRepository = getMemoryFinancialTitleRepositoryForTests(),
    private readonly entries: InMemoryFinancialEntryRepository = getMemoryFinancialEntryRepositoryForTests(),
  ) {}

  async find(tenantId: string, period: string): Promise<FinancialPeriodClose | undefined> {
    const row = this.closes.findRow(tenantId, period);
    return row ? mapRow(row) : undefined;
  }

  async list(tenantId: string, options: { readonly limit: number; readonly offset: number }): Promise<{ readonly items: readonly FinancialPeriodClose[]; readonly total: number }> {
    const rows = this.closes.listRows(tenantId);
    return { items: rows.slice(options.offset, options.offset + options.limit).map(mapRow), total: rows.length };
  }

  async loadCompetencia(tenantId: string, period: string): Promise<CompetenciaRows> {
    const [titles, entries] = await Promise.all([
      this.titles.findByCompetencia(tenantId, period),
      this.entries.findByCompetencia(tenantId, period),
    ]);
    return { titles: titles.map(toTitleRow), entries: entries.map(toEntryRow) };
  }

  async close(tenantId: string, period: string, evaluate: CloseEvaluator): Promise<{ readonly record: FinancialPeriodClose; readonly meta: CloseMeta }> {
    const existingRow = this.closes.findRow(tenantId, period);
    const { titles, entries } = await this.loadCompetencia(tenantId, period);
    const evaluation = evaluate({ existing: existingRow ? mapRow(existingRow) : undefined, titles, entries }); // pode lançar 409/422
    const now = new Date();
    const row: FinancialPeriodCloseRow = {
      id: existingRow?.id ?? randomUUID(),
      tenantId,
      period,
      status: evaluation.write.status,
      closedAt: evaluation.write.closedAt,
      closedBy: evaluation.write.closedBy,
      reopenedAt: existingRow?.reopenedAt,
      reopenedBy: existingRow?.reopenedBy,
      reopenReason: existingRow?.reopenReason,
      snapshot: evaluation.write.snapshot,
      createdAt: existingRow?.createdAt ?? now,
      updatedAt: now,
    };
    const saved = existingRow ? this.closes.updateRow(row) : this.closes.createRow(row);
    return { record: mapRow(saved), meta: evaluation.meta };
  }

  async reopen(tenantId: string, period: string, evaluate: ReopenEvaluator): Promise<FinancialPeriodClose> {
    const existingRow = this.closes.findRow(tenantId, period);
    const write = evaluate({ existing: existingRow ? mapRow(existingRow) : undefined }); // lança 422 se não-fechado
    // existingRow é garantidamente 'closed' aqui (o evaluate lançaria antes, caso contrário).
    const now = new Date();
    const row: FinancialPeriodCloseRow = {
      ...(existingRow as FinancialPeriodCloseRow),
      status: write.status,
      reopenedAt: write.reopenedAt,
      reopenedBy: write.reopenedBy,
      reopenReason: write.reopenReason,
      updatedAt: now,
    };
    return mapRow(this.closes.updateRow(row));
  }
}

export function createMemoryFinancialPeriodCloseStore(): FinancialPeriodCloseStore {
  return new InMemoryFinancialPeriodCloseStore();
}
