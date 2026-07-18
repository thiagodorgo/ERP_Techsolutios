import type { Permission, Role } from "../core-saas/permissions/catalog.js";

// Ω4-8 — Agregado financeiro do tenant computado NO BACKEND (o front NUNCA soma; resolve P-Ω4-2B-KPI-AGREGADO:
// os KPIs somavam só a página carregada). Read-only: varre TÍTULOS, LANÇAMENTOS, CONTAS e CHEQUES do tenant e
// devolve totais/contagens já somados. Money rules herdadas do Ω4-6: "aberto" = status ∉ {paid,cancelled};
// "vencido" = aberto E due_date < now; "saldo de caixa" = Σ(abertura + Σin − Σout) das contas ATIVAS.

export type FinancialSummaryActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

export type FinancialSummaryInput = {
  readonly tenantId: string;
  readonly now: Date;
};

// Um lado (receber/pagar): aberto = Σ(amount − paidAmount) de status ∉ {paid,cancelled}; vencido = subconjunto
// aberto com due_date < now.
export type DirectionSummary = {
  readonly openAmount: number;
  readonly openCount: number;
  readonly overdueAmount: number;
  readonly overdueCount: number;
  readonly inDisputeCount: number;
};

// Cheques pendentes (registered+deposited — ainda não compensados/devolvidos/cancelados) por direção.
export type ChequeSummary = {
  readonly pendingReceivedCount: number;
  readonly pendingReceivedAmount: number;
  readonly pendingIssuedCount: number;
  readonly pendingIssuedAmount: number;
};

// Fluxo de caixa mensal (últimos N meses, ordem cronológica) — alimenta o gráfico do dashboard.
export type CashFlowPoint = {
  readonly competencia: string; // 'YYYY-MM'
  readonly inflow: number;
  readonly outflow: number;
};

// Projeção mínima de um título recente (sem PII crua além de party_name já modelado; sem tenant_id).
export type RecentTitle = {
  readonly id: string;
  readonly direction: string;
  readonly partyName: string;
  readonly amount: number;
  readonly openAmount: number;
  readonly dueDate: Date;
  readonly status: string;
  readonly overdue: boolean;
};

export type FinancialSummary = {
  readonly receivable: DirectionSummary;
  readonly payable: DirectionSummary;
  // liquidado NA competência CORRENTE: Σ das entradas (in) e saídas (out) de caixa do mês (base occurred_at).
  readonly settledThisMonth: {
    readonly competencia: string;
    readonly inflow: number;
    readonly outflow: number;
  };
  readonly cash: {
    readonly totalBalance: number;
    readonly accountCount: number;
    readonly currency: string;
  };
  readonly cheques: ChequeSummary;
  readonly cashFlow: readonly CashFlowPoint[];
  readonly recentTitles: readonly RecentTitle[];
};

// Nº de meses do gráfico de fluxo de caixa e de títulos recentes.
export const CASH_FLOW_MONTHS = 6;
export const RECENT_TITLES_LIMIT = 6;
