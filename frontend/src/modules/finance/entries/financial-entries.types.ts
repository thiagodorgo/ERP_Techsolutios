import type { FinancialTitlesApiContext } from "../titles/financial-titles.types";

// B-SAN3-12b — camada de dados dos LANÇAMENTOS (extrato, conciliação, agregado, política) e do cheque do título.
// Espelha o contrato do 12a (`API_CONTRACTS.md` §Financeiro, `financeiro_baixa_conta_conciliacao@2026-10-24.b-san3-12`).
// `reconciled` + `reconciledAt` são o estado LÓGICO que o CAS da conciliação espera de volta (§4.6 do plano).

export type FinanceApiContext = FinancialTitlesApiContext;

export type FinancialEntryDirection = "in" | "out";
export type DivergenceType = "value" | "date";

export type FinancialEntry = {
  readonly id: string;
  readonly accountId: string;
  readonly titleId: string | null;
  readonly direction: FinancialEntryDirection;
  readonly amount: number;
  readonly currency: string;
  readonly paymentMethod: string;
  readonly category: string | null;
  readonly occurredAt: string;
  readonly competencia: string;
  readonly description: string | null;
  readonly reversalOf: string | null;
  readonly reconciled: boolean;
  readonly divergenceType: DivergenceType | null;
  readonly reconciliationRef: string | null;
  /** ISO exatamente como veio do servidor (ms incluídos) — volta no `expected_reconciled_at`. */
  readonly reconciledAt: string | null;
  readonly reconciledBy: string | null;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type FinancialEntriesSource = "api" | "mock" | "fallback";

export type FinancialEntriesData = {
  readonly items: readonly FinancialEntry[];
  readonly pagination: { readonly limit: number; readonly offset: number; readonly total: number };
  readonly source: FinancialEntriesSource;
  readonly fallbackReason?: string;
};

/** Filtros do GET /financial-entries que a tela usa (todos aplicados NO SERVIDOR). */
export type FinancialEntriesFilters = {
  readonly accountId?: string | null;
  readonly direction?: FinancialEntryDirection | null;
  readonly reconciled?: boolean | null;
  readonly divergenceType?: DivergenceType | null;
  /** Datas civis do negócio, `YYYY-MM-DD`, inclusivas. */
  readonly from?: string | null;
  readonly to?: string | null;
};

export type AggregateGroupBy = "none" | "month" | "day";

export type AggregateBucket = {
  readonly bucket: string | null;
  readonly count: number;
  readonly inflow: number;
  readonly outflow: number;
  readonly net: number;
};

export type EntriesAggregate = {
  readonly groupBy: AggregateGroupBy;
  readonly currency: string;
  readonly timezone: string;
  readonly items: readonly AggregateBucket[];
};

export type EntriesAggregateQuery = FinancialEntriesFilters & { readonly groupBy: AggregateGroupBy };

export type ReconciliationPolicy = {
  readonly canUnreconcile: boolean;
  readonly delegatedToFinance: boolean;
};

export type ReconcilePayload = {
  readonly reconciled: boolean;
  readonly divergence_type?: DivergenceType;
  readonly reconciliation_ref?: string;
  readonly expected_reconciled: boolean;
  readonly expected_reconciled_at: string | null;
};

/** Cheque pendente vinculado a um título (GET /cheques?title_id=). */
export type TitleCheque = {
  readonly id: string;
  readonly chequeNumber: string;
  readonly bank: string | null;
  readonly amount: number;
  readonly status: "registered" | "deposited";
  readonly dueDate: string | null;
};

export type UnlinkResult = {
  readonly cheque: { readonly id: string; readonly chequeNumber: string; readonly status: string };
  /** `cheque_still_depositable`: o cheque desvinculado já estava depositado e ainda pode compensar. */
  readonly stillDepositable: boolean;
};
