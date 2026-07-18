import { roundMoney } from "../financial-titles/financial-title.validators.js";
import type {
  Checklist,
  DirectionAggregate,
  MaterialSnapshot,
  PeriodEntryRow,
  PeriodTitleRow,
  SnapshotBody,
  TitleStatusCounts,
} from "./financial-period-close.types.js";

// Funções PURAS (recebem arrays de títulos+lançamentos da competência → snapshot/checklist). Compartilhadas
// pelos caminhos InMemory E Prisma → paridade testável no nível do snapshot (§8 teste 13).

function aggregate(rows: readonly { readonly amount: number }[]): DirectionAggregate {
  const sumAmount = rows.reduce((total, row) => total + row.amount, 0);
  return { count: rows.length, sumAmount: roundMoney(sumAmount) };
}

// D1 — SNAPSHOT MATERIAL: SÓ colunas imutáveis pós-fechamento (amount/direction/count por título e lançamento).
// EXCLUI paid_amount/status (título) e reconciled/divergence/updated_* (lançamento). É o valor que uma
// verificação futura re-derivaria das linhas vivas — continua batendo mesmo após pagamento cross-mês/reconcile.
export function computeMaterialSnapshot(titles: readonly PeriodTitleRow[], entries: readonly PeriodEntryRow[]): MaterialSnapshot {
  const receivable = titles.filter((title) => title.direction === "receivable");
  const payable = titles.filter((title) => title.direction === "payable");
  const inflow = entries.filter((entry) => entry.direction === "in");
  const outflow = entries.filter((entry) => entry.direction === "out");
  const inAgg = aggregate(inflow);
  const outAgg = aggregate(outflow);
  return {
    titles: { receivable: aggregate(receivable), payable: aggregate(payable) },
    entries: { in: inAgg, out: outAgg, net: roundMoney(inAgg.sumAmount - outAgg.sumAmount) },
  };
}

function sumPaid(rows: readonly PeriodTitleRow[]): number {
  return roundMoney(rows.reduce((total, row) => total + row.paidAmount, 0));
}

// pós-análise M-1 — saldo EM ABERTO (cobrável/devido): Σ(amount − paidAmount) SÓ dos títulos não-cancelados.
// Título cancelado NÃO é aberto (o checklist também o exclui). O `material` mantém TODOS (incl. cancelado) para
// o checksum re-derivável; só o `balance.*` derivado exclui — senão o Dashboard (Ω4-8) superestima o A receber/A pagar.
function sumOpen(rows: readonly PeriodTitleRow[]): number {
  return roundMoney(
    rows.filter((row) => row.status !== "cancelled").reduce((total, row) => total + (row.amount - row.paidAmount), 0),
  );
}

function countStatuses(titles: readonly PeriodTitleRow[]): TitleStatusCounts {
  const counts: TitleStatusCounts = { open: 0, scheduled: 0, partiallyPaid: 0, paid: 0, inDispute: 0, cancelled: 0 };
  const mutable = counts as { -readonly [K in keyof TitleStatusCounts]: number };
  for (const title of titles) {
    switch (title.status) {
      case "open": mutable.open += 1; break;
      case "scheduled": mutable.scheduled += 1; break;
      case "partially_paid": mutable.partiallyPaid += 1; break;
      case "paid": mutable.paid += 1; break;
      case "in_dispute": mutable.inDispute += 1; break;
      case "cancelled": mutable.cancelled += 1; break;
      default: break;
    }
  }
  return counts;
}

// RN-FIN-008 — BLOQUEANTE: in_dispute. INFORMATIVO: não liquidados (status ∉ {paid,cancelled}) e lançamentos
// não conciliados. inDisputeTitleIds é server-side (auditoria do force) — nunca no snapshot público (§2.8).
export function deriveChecklist(titles: readonly PeriodTitleRow[], entries: readonly PeriodEntryRow[]): Checklist {
  const inDispute = titles.filter((title) => title.status === "in_dispute");
  const unpaid = titles.filter((title) => title.status !== "paid" && title.status !== "cancelled");
  const unreconciled = entries.filter((entry) => !entry.reconciled);
  return {
    blocking: { inDisputeTitles: inDispute.length, inDisputeTitleIds: inDispute.map((title) => title.id) },
    informational: { unpaidTitles: unpaid.length, unreconciledEntries: unreconciled.length },
  };
}

export function computeSnapshotBody(
  titles: readonly PeriodTitleRow[],
  entries: readonly PeriodEntryRow[],
  context: { readonly period: string; readonly computedAt: string; readonly closedBy: string | null; readonly forced: boolean; readonly forcedReason: string | null },
): SnapshotBody {
  const material = computeMaterialSnapshot(titles, entries);
  const receivable = titles.filter((title) => title.direction === "receivable");
  const payable = titles.filter((title) => title.direction === "payable");
  const checklist = deriveChecklist(titles, entries);
  const receivablePaid = sumPaid(receivable);
  const payablePaid = sumPaid(payable);
  return {
    period: context.period,
    computedAt: context.computedAt,
    closedBy: context.closedBy,
    forced: context.forced,
    forcedReason: context.forcedReason,
    material,
    titles: {
      receivable: { ...material.titles.receivable, sumPaid: receivablePaid },
      payable: { ...material.titles.payable, sumPaid: payablePaid },
      byStatus: countStatuses(titles),
    },
    entries: material.entries,
    balance: {
      // pós-análise M-1: exclui cancelados (não são "abertos") — o Dashboard Ω4-8 consome estes campos.
      receivableOpen: sumOpen(receivable),
      payableOpen: sumOpen(payable),
    },
    pending: {
      blocking: { inDisputeTitles: checklist.blocking.inDisputeTitles },
      informational: {
        unpaidTitles: checklist.informational.unpaidTitles,
        unreconciledEntries: checklist.informational.unreconciledEntries,
      },
    },
  };
}
