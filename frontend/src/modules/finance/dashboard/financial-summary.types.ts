// Ω4-8b — espelho do DTO do backend GET /financial-summary (agregados já SOMADOS no servidor; o front nunca
// soma). source distingue api/mock/fallback (D-007: nunca fabricar número).

export type DirectionSummary = {
  readonly openAmount: number;
  readonly openCount: number;
  readonly overdueAmount: number;
  readonly overdueCount: number;
  readonly inDisputeCount: number;
};

export type CashFlowPoint = {
  readonly competencia: string;
  readonly inflow: number;
  readonly outflow: number;
};

export type RecentTitle = {
  readonly id: string;
  readonly direction: string;
  readonly partyName: string;
  readonly amount: number;
  readonly openAmount: number;
  readonly dueDate: string;
  readonly status: string;
  readonly overdue: boolean;
};

export type FinancialSummary = {
  readonly receivable: DirectionSummary;
  readonly payable: DirectionSummary;
  readonly settledThisMonth: { readonly competencia: string; readonly inflow: number; readonly outflow: number };
  readonly cash: { readonly totalBalance: number; readonly accountCount: number; readonly currency: string };
  readonly cheques: {
    readonly pendingReceivedCount: number;
    readonly pendingReceivedAmount: number;
    readonly pendingIssuedCount: number;
    readonly pendingIssuedAmount: number;
  };
  readonly cashFlow: readonly CashFlowPoint[];
  readonly recentTitles: readonly RecentTitle[];
};

export type FinancialSummarySource = "api" | "mock" | "fallback";

export type FinancialSummaryData = FinancialSummary & {
  readonly source: FinancialSummarySource;
  readonly fallbackReason?: string;
};

export type FinancialSummaryApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

const EMPTY_DIRECTION: DirectionSummary = { openAmount: 0, openCount: 0, overdueAmount: 0, overdueCount: 0, inDisputeCount: 0 };

// Agregado ZERADO honesto (mock/erro): tudo em zero, sem inventar linha (D-007).
export function emptyFinancialSummary(): FinancialSummary {
  return {
    receivable: { ...EMPTY_DIRECTION },
    payable: { ...EMPTY_DIRECTION },
    settledThisMonth: { competencia: "", inflow: 0, outflow: 0 },
    cash: { totalBalance: 0, accountCount: 0, currency: "BRL" },
    cheques: { pendingReceivedCount: 0, pendingReceivedAmount: 0, pendingIssuedCount: 0, pendingIssuedAmount: 0 },
    cashFlow: [],
    recentTitles: [],
  };
}
