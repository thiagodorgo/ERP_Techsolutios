import { useRef } from "react";

import type { FinancialEntriesFilters } from "../entries/financial-entries.types";
import type { FinancialTitle } from "../titles/financial-titles.types";

// B-SAN3-12b (§6.3 do plano) — o ESTADO NAVEGÁVEL do Financeiro na querystring: `?aba=rec|pag|ext|conc&conta=<id>&filtro=<alvo>`.
// Os redirecionamentos de /finance/charges e /finance/payments apontam para `?aba=rec` e `?aba=pag` (F13). O "alvo" é o
// filtro que um indicador ou bloco clicável aplica (D-PADRAO-BLOCOS-CLICAVEIS): visível acima da lista e removível com um
// clique. Filtro desconhecido na URL é ignorado (nunca vira filtro inventado). O filtro do EXTRATO vai ao servidor
// (`entriesFiltersFor`); o dos TÍTULOS separa linhas já carregadas por campos que o servidor deu (`overdue`, vencimento,
// situação) — contagem e seleção, nunca soma de dinheiro (F8).

export type FinanceTab = "rec" | "pag" | "ext" | "conc";

export type FinanceState = {
  readonly tab: FinanceTab;
  readonly accountId: string | null;
  readonly target: string | null;
};

const TABS: readonly FinanceTab[] = ["rec", "pag", "ext", "conc"];
const TARGET = /^(venc|hoje|sem7|parcial|dir:(in|out)|mes:\d{4}-(0[1-9]|1[0-2])(:(in|out))?|conc:(pendente|conciliado|valor|data))$/;
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function isFinanceTarget(value: string | null | undefined): value is string {
  return typeof value === "string" && TARGET.test(value);
}

export function readFinanceState(search: string): FinanceState {
  const params = new URLSearchParams(search);
  const rawTab = params.get("aba");
  const tab = TABS.includes(rawTab as FinanceTab) ? (rawTab as FinanceTab) : "rec";
  const conta = params.get("conta");
  const filtro = params.get("filtro");
  return { tab, accountId: conta && conta.trim() !== "" ? conta : null, target: isFinanceTarget(filtro) ? filtro : null };
}

export function financeStateSearch(state: FinanceState): string {
  const params = new URLSearchParams({ aba: state.tab });
  if (state.accountId) params.set("conta", state.accountId);
  if (state.target) params.set("filtro", state.target);
  return `?${params}`;
}

/** "2026-10" → "outubro"; valor fora do formato volta como veio. */
export function monthName(competencia: string): string {
  const month = Number(competencia.split("-")[1]);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? MONTHS[month - 1] : competencia;
}

export function targetLabel(target: string): string {
  if (target === "venc") return "Vencidos";
  if (target === "hoje") return "Vencem hoje";
  if (target === "sem7") return "Vencem nos próximos 7 dias";
  if (target === "parcial") return "Recebidos ou pagos em parte";
  if (target === "dir:in") return "Entradas";
  if (target === "dir:out") return "Saídas";
  const [kind, value, direction] = target.split(":");
  if (kind === "mes") return `${direction === "in" ? "Entradas de " : direction === "out" ? "Saídas de " : "Lançamentos de "}${monthName(value)} de ${value.slice(0, 4)}`;
  if (kind === "conc") return { pendente: "A conciliar", conciliado: "Conciliados", valor: "Com ressalva de valor", data: "Com ressalva de data" }[value] ?? target;
  return target;
}

function lastDayOfMonth(competencia: string): string {
  const [year, month] = competencia.split("-").map(Number);
  const day = new Date(year, month, 0).getDate();
  return `${competencia}-${String(day).padStart(2, "0")}`;
}

/** Janela civil inclusiva dos seis meses que terminam no mês da data informada. */
export function sixMonthRange(date: Date = new Date()): { readonly from: string; readonly to: string } {
  const first = new Date(date.getFullYear(), date.getMonth() - 5, 1);
  const competencia = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  return {
    from: `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}-01`,
    to: lastDayOfMonth(competencia),
  };
}

/** Filtros do GET /financial-entries para o estado da tela — aplicados no SERVIDOR. */
export function entriesFiltersFor(state: FinanceState): FinancialEntriesFilters {
  const filters: { -readonly [K in keyof FinancialEntriesFilters]: FinancialEntriesFilters[K] } = {};
  if (state.accountId && (state.tab === "ext" || state.tab === "conc")) filters.accountId = state.accountId;
  const target = state.tab === "ext" || state.tab === "conc" ? state.target : null;
  if (target?.startsWith("mes:")) {
    const [, competencia, direction] = target.split(":");
    filters.from = `${competencia}-01`;
    filters.to = lastDayOfMonth(competencia);
    if (direction === "in" || direction === "out") filters.direction = direction;
  } else if (target === "dir:in" || target === "dir:out") {
    filters.direction = target === "dir:in" ? "in" : "out";
  } else if (target === "conc:pendente") {
    filters.reconciled = false;
  } else if (target === "conc:conciliado") {
    filters.reconciled = true;
  } else if (target === "conc:valor" || target === "conc:data") {
    filters.reconciled = true;
    filters.divergenceType = target === "conc:valor" ? "value" : "date";
  }
  return filters;
}

export function localIsoDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Dias entre hoje e o vencimento (negativo = vencido), por data civil. */
export function daysUntil(dueDate: string, today: string = localIsoDate()): number {
  const toUtc = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(dueDate) - toUtc(today)) / 86_400_000);
}

export function isOpenTitle(title: Pick<FinancialTitle, "status">): boolean {
  return title.status !== "paid" && title.status !== "cancelled";
}

export function titleMatchesTarget(title: FinancialTitle, target: string | null, today: string = localIsoDate()): boolean {
  if (!target) return true;
  if (target === "venc") return title.overdue;
  if (target === "hoje") return daysUntil(title.dueDate, today) === 0;
  if (target === "sem7") {
    const days = daysUntil(title.dueDate, today);
    return days > 0 && days <= 7;
  }
  if (target === "parcial") return title.status === "partially_paid";
  return true;
}

/**
 * Último valor BOM visto (estado §7 "dados desatualizados"): quando a atualização em 2º plano falha e já houve dado bom,
 * a tela continua mostrando o dado bom e `stale` liga. Antes do primeiro dado bom, devolve o valor atual (que é o erro).
 */
export function useLastGood<T>(value: T, good: boolean): { readonly value: T; readonly stale: boolean } {
  const last = useRef<{ value: T } | null>(null);
  if (good) last.current = { value };
  if (!good && last.current) return { value: last.current.value, stale: true };
  return { value, stale: false };
}
