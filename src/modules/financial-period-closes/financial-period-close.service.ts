import { env } from "../../config/env.js";
import {
  createMemoryFinancialPeriodCloseStore,
  type CloseEvaluator,
  type CloseMeta,
  type FinancialPeriodCloseStore,
  type ReopenEvaluator,
} from "./financial-period-close.repository.js";
import { computeSnapshotBody, deriveChecklist } from "./financial-period-close.snapshot.js";
import type {
  Checklist,
  FinancialPeriodClose,
  FinancialPeriodCloseActorContext,
  ListFinancialPeriodCloseResult,
  StoredSnapshot,
} from "./financial-period-close.types.js";
import { FinancialPeriodCloseError } from "./financial-period-close.types.js";
import { parseForce, parseLimit, parseOffset, parsePeriod, parseReason } from "./financial-period-close.validators.js";

type RawRecord = Record<string, unknown>;

type CloseResult = { readonly record: FinancialPeriodClose; readonly meta: CloseMeta };
type PeriodStatusResult = { readonly record?: FinancialPeriodClose; readonly period: string; readonly checklist: Checklist };

export class FinancialPeriodCloseService {
  constructor(private readonly store: FinancialPeriodCloseStore) {}

  async list(actor: FinancialPeriodCloseActorContext, query: RawRecord): Promise<ListFinancialPeriodCloseResult> {
    const limit = parseLimit(query.limit);
    const offset = parseOffset(query.offset);
    const { items, total } = await this.store.list(actor.tenantId, { limit, offset });
    return { items, total, limit, offset };
  }

  // GET status — devolve a linha (status/snapshot CONGELADO) + um checklist AO VIVO das linhas atuais da
  // competência (pré-visualização informativa de pendências, mesmo depois de fechado).
  async get(actor: FinancialPeriodCloseActorContext, periodParam: string): Promise<PeriodStatusResult> {
    const period = parsePeriod(periodParam);
    const [record, { titles, entries }] = await Promise.all([
      this.store.find(actor.tenantId, period),
      this.store.loadCompetencia(actor.tenantId, period),
    ]);
    return { record, period, checklist: deriveChecklist(titles, entries) };
  }

  // CLOSE — fluxo ATÔMICO (§3.3). Já fechado → 409 period_already_closed; closing → 409 period_closing_in_progress;
  // pendência BLOQUEANTE (in_dispute) sem force → 422 pending_items_block_close (nada gravado). force ignora só o
  // gate bloqueante, mas EXIGE reason (e/ataque) e carimba forced/forcedReason no snapshot + os ids das disputas
  // sobrepostas na auditoria (server-side). O flip open→closed (ou reopened→closed) grava snapshot no MESMO write.
  async close(actor: FinancialPeriodCloseActorContext, periodParam: string, body: RawRecord): Promise<CloseResult> {
    const period = parsePeriod(periodParam);
    const force = parseForce(body.force);
    const reason = force ? parseReason(body.reason) : null;
    const now = new Date();

    const evaluate: CloseEvaluator = ({ existing, titles, entries }) => {
      if (existing?.status === "closed") {
        throw periodAlreadyClosedError(period);
      }
      if (existing?.status === "closing") {
        throw periodClosingInProgressError(period);
      }
      const checklist = deriveChecklist(titles, entries);
      if (checklist.blocking.inDisputeTitles > 0 && !force) {
        throw pendingItemsBlockCloseError(period, checklist);
      }
      const snapshotBody = computeSnapshotBody(titles, entries, {
        period,
        computedAt: now.toISOString(),
        closedBy: actor.userId ?? null,
        forced: force,
        forcedReason: reason,
      });
      const history = existing?.snapshot?.history ?? [];
      const snapshot: StoredSnapshot = { latest: snapshotBody, history: [...history, snapshotBody] };
      return {
        write: { status: "closed", closedAt: now, closedBy: actor.userId, snapshot },
        meta: { overriddenDisputeTitleIds: force ? [...checklist.blocking.inDisputeTitleIds] : [], forced: force },
      };
    };

    return this.store.close(actor.tenantId, period, evaluate);
  }

  // REOPEN — reason OBRIGATÓRIO (RN-FIN-009) validado ANTES (400 reason_required precede o 422). Linha
  // inexistente OU status ≠ closed → 422 period_not_closed. closed→reopened (isPeriodClosed volta a false).
  async reopen(actor: FinancialPeriodCloseActorContext, periodParam: string, body: RawRecord): Promise<FinancialPeriodClose> {
    const period = parsePeriod(periodParam);
    const reason = parseReason(body.reason);
    const now = new Date();

    const evaluate: ReopenEvaluator = ({ existing }) => {
      if (!existing || existing.status !== "closed") {
        throw periodNotClosedError(period);
      }
      return { status: "reopened", reopenedAt: now, reopenedBy: actor.userId, reopenReason: reason };
    };

    return this.store.reopen(actor.tenantId, period, evaluate);
  }
}

function periodAlreadyClosedError(period: string): FinancialPeriodCloseError {
  return new FinancialPeriodCloseError(409, "FINANCIAL_PERIOD_CONFLICT", "period_already_closed", `The financial period ${period} is already closed.`);
}

function periodClosingInProgressError(period: string): FinancialPeriodCloseError {
  return new FinancialPeriodCloseError(409, "FINANCIAL_PERIOD_CONFLICT", "period_closing_in_progress", `The financial period ${period} is being closed.`);
}

function pendingItemsBlockCloseError(period: string, checklist: Checklist): FinancialPeriodCloseError {
  return new FinancialPeriodCloseError(
    422,
    "FINANCIAL_PERIOD_UNPROCESSABLE",
    "pending_items_block_close",
    `The financial period ${period} has blocking pending items (titles in dispute). Use force to override.`,
    {
      pending: {
        blocking: { inDisputeTitles: checklist.blocking.inDisputeTitles },
        informational: {
          unpaidTitles: checklist.informational.unpaidTitles,
          unreconciledEntries: checklist.informational.unreconciledEntries,
        },
      },
    },
  );
}

function periodNotClosedError(period: string): FinancialPeriodCloseError {
  return new FinancialPeriodCloseError(422, "FINANCIAL_PERIOD_UNPROCESSABLE", "period_not_closed", `The financial period ${period} is not closed.`);
}

let defaultServicePromise: Promise<FinancialPeriodCloseService> | undefined;

export function createMemoryFinancialPeriodCloseService(): FinancialPeriodCloseService {
  return new FinancialPeriodCloseService(createMemoryFinancialPeriodCloseStore());
}

export async function createDefaultFinancialPeriodCloseService(): Promise<FinancialPeriodCloseService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryFinancialPeriodCloseService();
  }
  defaultServicePromise ??= createPrismaFinancialPeriodCloseService();
  return defaultServicePromise;
}

// O singleton InMemory de fechamento (compartilhado com o guard) é limpo por resetFinancialTitleRuntimeForTests;
// aqui só zeramos o cache do service Prisma. O harness de testes chama os três resets financeiros.
export function resetFinancialPeriodCloseRuntimeForTests(): void {
  defaultServicePromise = undefined;
}

async function createPrismaFinancialPeriodCloseService(): Promise<FinancialPeriodCloseService> {
  const { createPrismaFinancialPeriodCloseStore } = await import("./financial-period-close-prisma.repository.js");
  return new FinancialPeriodCloseService(await createPrismaFinancialPeriodCloseStore());
}
