import type { Permission, Role } from "../core-saas/permissions/catalog.js";

// Ω4-6 — Fechamento de período financeiro (trava retroativa). Orquestra CROSS-agregado: LÊ títulos E
// lançamentos da competência para congelar um SNAPSHOT material e virar o status open→closed (e
// closed→reopened). O CHOKEPOINT (isPeriodClosed) continua morando em financial-titles (compartilhado por
// título E lançamento); este módulo depende dos dois e nenhum depende dele → sem ciclo de módulos.
// status ∈ {open, closing, closed, reopened} — 'closing' é reservado (defensivo/futuro; v1 nunca o escreve).

export const FINANCIAL_PERIOD_STATUSES = ["open", "closing", "closed", "reopened"] as const;
export type FinancialPeriodStatus = (typeof FINANCIAL_PERIOD_STATUSES)[number];

export type FinancialPeriodCloseActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// D1 (ataque, money-crítico) — SNAPSHOT MATERIAL re-derivável: SÓ colunas que são IMUTÁVEIS pós-fechamento
// (create/update/delete/changeStatus/reverse de título e lançamento TODOS passam pelo chokepoint). paid_amount
// e status de título MUDAM legitimamente após o fechamento (pagamento cross-mês via applyPayment, que NÃO
// atravessa o chokepoint) → ficam FORA da base material (viram informativos point-in-time). Assim a
// re-derivação material continua batendo com o snapshot congelado mesmo após um pagamento cross-mês, e passa a
// FLAGRAR de verdade um título vazado por corrida (count/sumAmount extra) — controle compensatório do
// P-Ω4-6-CLOSE-RACE.
export type DirectionAggregate = {
  readonly count: number;
  readonly sumAmount: number;
};

export type MaterialSnapshot = {
  readonly titles: {
    readonly receivable: DirectionAggregate;
    readonly payable: DirectionAggregate;
  };
  readonly entries: {
    readonly in: DirectionAggregate;
    readonly out: DirectionAggregate;
    readonly net: number;
  };
};

export type TitleStatusCounts = {
  readonly open: number;
  readonly scheduled: number;
  readonly partiallyPaid: number;
  readonly paid: number;
  readonly inDispute: number;
  readonly cancelled: number;
};

// Corpo do snapshot CONGELADO num fechamento. `material` é a invariante re-derivável (D1). Os demais campos
// (sumPaid, byStatus, balance, pending) são INFORMATIVOS point-in-time: dependem de paid_amount/status/
// reconciled (mutáveis pós-fechamento) e NÃO entram em re-derivação/checksum.
export type SnapshotBody = {
  readonly period: string;
  readonly computedAt: string;
  readonly closedBy: string | null;
  readonly forced: boolean;
  readonly forcedReason: string | null;
  readonly material: MaterialSnapshot;
  readonly titles: {
    readonly receivable: DirectionAggregate & { readonly sumPaid: number };
    readonly payable: DirectionAggregate & { readonly sumPaid: number };
    readonly byStatus: TitleStatusCounts;
  };
  readonly entries: MaterialSnapshot["entries"];
  readonly balance: {
    readonly receivableOpen: number;
    readonly payableOpen: number;
  };
  readonly pending: {
    readonly blocking: { readonly inDisputeTitles: number };
    readonly informational: { readonly unpaidTitles: number; readonly unreconciledEntries: number };
  };
};

// (d, ataque) — SNAPSHOT IMUTÁVEL/VERSIONADO: a coluna `snapshot` guarda o corpo mais recente (`latest`) + o
// HISTÓRICO append-only de TODOS os fechamentos (`history`). Um reclose após reopen NÃO sobrescreve a prova do
// 1º fechamento; preserva a trilha de múltiplos ciclos (RN-AUD-005).
export type StoredSnapshot = {
  readonly latest: SnapshotBody;
  readonly history: readonly SnapshotBody[];
};

export type FinancialPeriodClose = {
  readonly id: string;
  readonly tenantId: string;
  readonly period: string;
  readonly status: string;
  readonly closedAt?: Date;
  readonly closedBy?: string;
  readonly reopenedAt?: Date;
  readonly reopenedBy?: string;
  readonly reopenReason?: string;
  readonly closingStartedAt?: Date;
  readonly snapshot?: StoredSnapshot;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

// Linhas MATERIAIS lidas por competência para o snapshot (tenant já filtrado na leitura — g/ataque). paidAmount
// e status são carregados p/ os campos INFORMATIVOS (não entram no material). id sustenta os ids de disputa
// sobrepostos na auditoria de um force (e/ataque) — nunca no snapshot público (§2.8).
export type PeriodTitleRow = {
  readonly id: string;
  readonly direction: string;
  readonly amount: number;
  readonly paidAmount: number;
  readonly status: string;
};

export type PeriodEntryRow = {
  readonly direction: string;
  readonly amount: number;
  readonly reconciled: boolean;
};

// Checklist de pendências (RN-FIN-008). BLOQUEANTE: títulos in_dispute (divergência financeira não resolvida).
// INFORMATIVO (nunca bloqueia): títulos não liquidados (carry-over normal de fim de mês) e lançamentos não
// conciliados (o extrato chega DEPOIS do fechamento — D-Ω4-5-RECONCILE-META). inDisputeTitleIds é server-side
// (auditoria do force); NUNCA vai ao snapshot público.
export type Checklist = {
  readonly blocking: { readonly inDisputeTitles: number; readonly inDisputeTitleIds: readonly string[] };
  readonly informational: { readonly unpaidTitles: number; readonly unreconciledEntries: number };
};

export type ListFinancialPeriodCloseResult = {
  readonly items: readonly FinancialPeriodClose[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export class FinancialPeriodCloseError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
    readonly details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = "FinancialPeriodCloseError";
  }
}
