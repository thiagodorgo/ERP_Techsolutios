import type { FinanceApiContext } from "../entries/financial-entries.types";

// B-SAN3-24 (24b) — camada de dados da tela de Fechamento do mês. Espelha `src/modules/financial-period-closes/`
// (`GET /financial-periods`, `GET /financial-periods/:period` com o checklist AO VIVO, `POST …/close` e `…/reopen`).
// Os ids dos títulos em disputa (`checklist.blocking.inDisputeTitleIds`) NÃO entram aqui: a tela só precisa da contagem.
// R-E2E-JWT: só TypeScript puro.

export type PeriodsApiContext = FinanceApiContext;

export const PERIOD_STATUSES = ["open", "closing", "closed", "reopened"] as const;
export type PeriodStatus = (typeof PERIOD_STATUSES)[number];

/** Uma linha de `GET /financial-periods` (competência que já teve fechamento). */
export type PeriodRow = {
  readonly period: string;
  readonly status: PeriodStatus;
  readonly closedAt: string | null;
  readonly reopenedAt: string | null;
};

export type PeriodChecklist = {
  /** Bloqueante: títulos em contestação na competência. */
  readonly inDisputeTitles: number;
  /** Informativos: não impedem o fechamento. */
  readonly unpaidTitles: number;
  readonly unreconciledEntries: number;
};

export type DirectionTotals = { readonly count: number; readonly sumAmount: number };

/** O retrato congelado do fechamento mais recente (somas do SERVIDOR; a tela não soma). */
export type PeriodSnapshot = {
  readonly computedAt: string | null;
  readonly forced: boolean;
  readonly forcedReason: string | null;
  readonly entriesIn: DirectionTotals;
  readonly entriesOut: DirectionTotals;
  readonly net: number;
  readonly receivable: DirectionTotals;
  readonly payable: DirectionTotals;
  readonly pendingAtClose: PeriodChecklist;
};

export type PeriodDetail = {
  readonly period: string;
  readonly status: PeriodStatus;
  readonly closedAt: string | null;
  readonly reopenedAt: string | null;
  readonly reopenReason: string | null;
  readonly snapshot: PeriodSnapshot | null;
  /** Quantos fechamentos a competência já teve (o histórico imutável do servidor). */
  readonly closeCount: number;
  /** Ao vivo (`GET /:period`); a resposta de `close`/`reopen` não o traz (null). */
  readonly checklist: PeriodChecklist | null;
};

export type PeriodsData = {
  readonly items: readonly PeriodRow[];
  readonly total: number;
  readonly source: "api" | "mock" | "fallback";
  readonly fallbackStatus?: number;
};

/** Corpo de `POST …/close`: vazio, ou o fechamento forçado com o motivo (R-DISPUTA-DO-GET, R-AUDIT-FORCADO). */
export type ClosePeriodBody = Record<string, never> | { readonly force: true; readonly reason: string };

export type PeriodAction = "close" | "reopen";
