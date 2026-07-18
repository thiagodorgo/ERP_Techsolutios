import { deriveCompetencia, roundMoney } from "../financial-titles/index.js";
import type { CashFlowPoint, DirectionSummary, FinancialSummary, RecentTitle } from "./financial-summary.types.js";
import { CASH_FLOW_MONTHS, RECENT_TITLES_LIMIT } from "./financial-summary.types.js";

// Projeções mínimas (o que o agregado precisa de cada fonte) — desacopla o compute PURO dos tipos completos
// dos módulos, para InMemory e Prisma alimentarem os mesmos cálculos.
export type TitleRow = {
  readonly id: string;
  readonly direction: string; // receivable|payable
  readonly status: string; // open|scheduled|partially_paid|paid|in_dispute|cancelled
  readonly amount: number;
  readonly paidAmount: number;
  readonly dueDate: Date;
  readonly partyName?: string;
  readonly createdAt: Date;
};
export type EntryRow = { readonly direction: string; readonly amount: number; readonly competencia: string };
export type ChequeRow = { readonly direction: string; readonly status: string; readonly amount: number };
export type AccountBalanceRow = { readonly openingBalance: number; readonly inflow: number; readonly outflow: number };

// Aberto = status ∉ {paid,cancelled}. openAmount = Σ(amount − paidAmount). Vencido = aberto E due_date < now.
function isOpen(status: string): boolean {
  return status !== "paid" && status !== "cancelled";
}

function summarizeDirection(rows: readonly TitleRow[], now: number): DirectionSummary {
  let openAmount = 0;
  let openCount = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  let inDisputeCount = 0;
  for (const row of rows) {
    if (row.status === "in_dispute") inDisputeCount += 1;
    if (!isOpen(row.status)) continue;
    const remaining = row.amount - row.paidAmount;
    openAmount += remaining;
    openCount += 1;
    if (row.dueDate.getTime() < now) {
      overdueAmount += remaining;
      overdueCount += 1;
    }
  }
  return {
    openAmount: roundMoney(openAmount),
    openCount,
    overdueAmount: roundMoney(overdueAmount),
    overdueCount,
    inDisputeCount,
  };
}

// Aberto (não liquidado) primeiro, depois o mais RECENTE (createdAt desc), desempate por id — determinístico.
function compareRecent(left: TitleRow, right: TitleRow): number {
  const leftOpen = isOpen(left.status);
  const rightOpen = isOpen(right.status);
  if (leftOpen !== rightOpen) return leftOpen ? -1 : 1;
  return right.createdAt.getTime() - left.createdAt.getTime() || (left.id < right.id ? 1 : left.id > right.id ? -1 : 0);
}

function toRecentTitle(row: TitleRow, now: number): RecentTitle {
  const open = isOpen(row.status);
  return {
    id: row.id,
    direction: row.direction,
    partyName: row.partyName ?? "",
    amount: roundMoney(row.amount),
    openAmount: roundMoney(open ? row.amount - row.paidAmount : 0),
    dueDate: row.dueDate,
    status: row.status,
    overdue: open && row.dueDate.getTime() < now,
  };
}

// Janela de N competências terminando na competência CORRENTE (ordem cronológica), fuso de negócio.
export function cashFlowCompetencias(now: Date, months: number): string[] {
  const out: string[] = [];
  for (let back = months - 1; back >= 0; back -= 1) {
    // 1º dia do mês, back meses atrás — deriva a competência no fuso de negócio (mesma deriveCompetencia).
    const ref = new Date(now.getTime());
    ref.setUTCDate(1);
    ref.setUTCHours(12, 0, 0, 0); // meio-dia UTC evita virar de mês na conversão de fuso
    ref.setUTCMonth(ref.getUTCMonth() - back);
    out.push(deriveCompetencia(ref));
  }
  return out;
}

function buildCashFlow(entries: readonly EntryRow[], competencias: readonly string[]): CashFlowPoint[] {
  const inflow = new Map<string, number>();
  const outflow = new Map<string, number>();
  for (const entry of entries) {
    const bucket = entry.direction === "in" ? inflow : outflow;
    bucket.set(entry.competencia, (bucket.get(entry.competencia) ?? 0) + entry.amount);
  }
  return competencias.map((competencia) => ({
    competencia,
    inflow: roundMoney(inflow.get(competencia) ?? 0),
    outflow: roundMoney(outflow.get(competencia) ?? 0),
  }));
}

// Cheque PENDENTE = ainda em jogo (registered|deposited) — nem compensado, nem devolvido, nem cancelado.
function isChequePending(status: string): boolean {
  return status === "registered" || status === "deposited";
}

// Monta o agregado completo a partir das projeções já carregadas (título/lançamento/cheque/saldos de conta).
export function computeFinancialSummary(input: {
  readonly titles: readonly TitleRow[];
  readonly entries: readonly EntryRow[];
  readonly cheques: readonly ChequeRow[];
  readonly accounts: readonly AccountBalanceRow[];
  readonly currency: string;
  readonly now: Date;
}): FinancialSummary {
  const nowMs = input.now.getTime();
  const receivable = summarizeDirection(input.titles.filter((t) => t.direction === "receivable"), nowMs);
  const payable = summarizeDirection(input.titles.filter((t) => t.direction === "payable"), nowMs);

  const competencia = deriveCompetencia(input.now);
  let monthInflow = 0;
  let monthOutflow = 0;
  for (const entry of input.entries) {
    if (entry.competencia !== competencia) continue;
    if (entry.direction === "in") monthInflow += entry.amount;
    else if (entry.direction === "out") monthOutflow += entry.amount;
  }

  const totalBalance = input.accounts.reduce((total, a) => total + (a.openingBalance + a.inflow - a.outflow), 0);

  const chequePending = { pendingReceivedCount: 0, pendingReceivedAmount: 0, pendingIssuedCount: 0, pendingIssuedAmount: 0 };
  for (const cheque of input.cheques) {
    if (!isChequePending(cheque.status)) continue;
    if (cheque.direction === "received") {
      chequePending.pendingReceivedCount += 1;
      chequePending.pendingReceivedAmount += cheque.amount;
    } else if (cheque.direction === "issued") {
      chequePending.pendingIssuedCount += 1;
      chequePending.pendingIssuedAmount += cheque.amount;
    }
  }

  const recentTitles = [...input.titles].sort(compareRecent).slice(0, RECENT_TITLES_LIMIT).map((row) => toRecentTitle(row, nowMs));

  return {
    receivable,
    payable,
    settledThisMonth: { competencia, inflow: roundMoney(monthInflow), outflow: roundMoney(monthOutflow) },
    cash: { totalBalance: roundMoney(totalBalance), accountCount: input.accounts.length, currency: input.currency },
    cheques: {
      pendingReceivedCount: chequePending.pendingReceivedCount,
      pendingReceivedAmount: roundMoney(chequePending.pendingReceivedAmount),
      pendingIssuedCount: chequePending.pendingIssuedCount,
      pendingIssuedAmount: roundMoney(chequePending.pendingIssuedAmount),
    },
    cashFlow: buildCashFlow(input.entries, cashFlowCompetencias(input.now, CASH_FLOW_MONTHS)),
    recentTitles,
  };
}
