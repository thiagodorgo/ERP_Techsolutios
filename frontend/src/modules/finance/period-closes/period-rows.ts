import type { PeriodRow } from "./period-closes.types";
import { previousPeriodKey } from "./period-keys";

// J-547 (conserto único, C3-12 e C3-01) — as competências que a tela de Fechamento mostra, e o tempo de cada uma, numa
// regra só para as 3 aparências. Só TypeScript puro (R-E2E-JWT).
//
// C3-12 — UMA regra para o mês sem linha no servidor: a competência que nunca teve fechamento está ABERTA (é o que o
// servidor responde em `GET /financial-periods/:period`). Ela entra na lista como "aberta" e, se já terminou, conta em
// "Terminaram e não estão fechados"; o calendário da C, os blocos, os indicadores e a lista leem as MESMAS linhas, então
// o número que a tela mostra é o mesmo em todo lugar. O recorte é o ano corrente até a competência corrente, mais a
// anterior (em janeiro, dezembro do ano que passou), mais toda competência que o servidor já tem.
//
// C3-01 — o tempo para fechar é a data do fechamento (`closedAt`, no calendário de São Paulo) menos o último dia da
// competência, em dias, como a referência aprovada (`closedAt` menos o fim da competência). Nada aqui soma ou acumula
// (P-DINHEIRO-DO-SERVIDOR e a trava F8, que vale para todo `frontend/src/modules/finance/**`): o indicador da A é a
// MEDIANA dos dias, não a média, porque a média pediria acumular no navegador (conflito C-J547-1, registrado em
// `controle/decisoes.md`).

const KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DAY_MS = 86_400_000;

const CIVIL_SP = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });

/** As linhas da tela: as do servidor e, sem linha no servidor, as competências do ano corrente até a corrente e a anterior, como abertas. */
export function periodRowsFor(serverRows: readonly PeriodRow[], currentKey: string): PeriodRow[] {
  const byKey = new Map(serverRows.map((row) => [row.period, row]));
  const keys = new Set<string>([currentKey, previousPeriodKey(currentKey)]);
  const match = KEY.exec(currentKey);
  if (match) for (let month = 1; month <= Number(match[2]); month++) keys.add(`${match[1]}-${String(month).padStart(2, "0")}`);
  for (const key of keys) if (!byKey.has(key)) byKey.set(key, { period: key, status: "open", closedAt: null, reopenedAt: null });
  return [...byKey.values()].sort((a, b) => b.period.localeCompare(a.period));
}

/** A competência terminou e não está fechada (aberta ou reaberta): o que "Terminaram e não estão fechados" conta. */
export function endedAndNotClosed(row: Pick<PeriodRow, "period" | "status">, currentKey: string): boolean {
  return row.period < currentKey && row.status !== "closed";
}

/** `AAAA-MM-DD` do instante no calendário de São Paulo. */
export function civilDateSP(instant: Date): string {
  return CIVIL_SP.format(instant);
}

function civilMs(date: string): number {
  return Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
}

/** O último dia da competência, `AAAA-MM-DD`. */
export function lastDayOfPeriod(period: string): string | null {
  const match = KEY.exec(period);
  if (!match) return null;
  const last = new Date(Date.UTC(Number(match[1]), Number(match[2]), 0));
  return last.toISOString().slice(0, 10);
}

/** Dias entre o fim da competência e o fechamento (`closedAt`); `null` sem fechamento. */
export function daysToClose(period: string, closedAt: string | null): number | null {
  const last = lastDayOfPeriod(period);
  if (!last || !closedAt) return null;
  const closed = new Date(closedAt);
  if (Number.isNaN(closed.getTime())) return null;
  return Math.round((civilMs(civilDateSP(closed)) - civilMs(last)) / DAY_MS);
}

/** Dias desde o fim da competência até hoje (para a que terminou e não fechou). */
export function daysOpen(period: string, today: Date = new Date()): number | null {
  const last = lastDayOfPeriod(period);
  if (!last) return null;
  return Math.max(0, Math.round((civilMs(civilDateSP(today)) - civilMs(last)) / DAY_MS));
}

/** Acima disto, a referência marca o fechamento como lento. */
export const SLOW_CLOSE_DAYS = 5;

/** O tempo para fechar de cada competência FECHADA, em dias (as sem `closedAt` ficam de fora). */
export function closedDays(rows: readonly PeriodRow[]): number[] {
  const out: number[] = [];
  for (const row of rows) {
    if (row.status !== "closed") continue;
    const days = daysToClose(row.period, row.closedAt);
    if (days !== null) out.push(days);
  }
  return out;
}

/** A mediana, com uma casa, do tempo para fechar (dias); `null` sem nenhum mês fechado. Ordena e pega o meio: não acumula. */
export function medianDays(days: readonly number[]): number | null {
  if (days.length === 0) return null;
  const sorted = [...days].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return Math.round(value * 10) / 10;
}

/** O texto do tempo para fechar de uma linha, nas 3 aparências. */
export function closeTimeText(row: PeriodRow, currentKey: string, today: Date = new Date()): { readonly text: string; readonly tone: "done" | "slow" | "muted" | "late" } {
  const days = daysToClose(row.period, row.closedAt);
  if (row.status === "closed" && days !== null) return { text: `${days} d`, tone: days > SLOW_CLOSE_DAYS ? "slow" : "done" };
  if (row.status === "reopened" && days !== null) return { text: `fechou em ${days} d`, tone: "muted" };
  if (row.period === currentKey) return { text: "em andamento", tone: "muted" };
  if (row.period > currentKey) return { text: "—", tone: "muted" };
  if (row.status === "closing") return { text: "fechando", tone: "muted" };
  return { text: `aberto há ${daysOpen(row.period, today) ?? 0} d`, tone: "late" };
}
