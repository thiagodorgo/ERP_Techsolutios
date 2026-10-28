import type { FinancialTitlesApiContext } from "../titles/financial-titles.types";

// B-SAN3-12b — camada de dados das CONTAS do Financeiro (GET/POST /financial-accounts, GET /financial-accounts/:id/balance).
// Espelha `toFinancialAccountListDto`/`toFinancialAccountDto`/`toFinancialAccountBalanceDto` do backend (§2.8: sem
// tenant_id). O SALDO é calculado no servidor; o front só exibe (F8).

export type FinancialAccountKind = "cash" | "bank" | "wallet";

export type FinancialAccount = {
  readonly id: string;
  readonly name: string;
  readonly kind: FinancialAccountKind;
  readonly currency: string;
  readonly openingBalance: number;
  readonly bankName: string | null;
  readonly active: boolean;
  readonly createdAt: string;
};

export type FinancialAccountBalance = {
  readonly accountId: string;
  readonly openingBalance: number;
  readonly inflow: number;
  readonly outflow: number;
  readonly balance: number;
};

export type FinancialAccountsSource = "api" | "mock" | "fallback";

export type FinancialAccountsData = {
  readonly items: readonly FinancialAccount[];
  readonly pagination: { readonly limit: number; readonly offset: number; readonly total: number };
  readonly source: FinancialAccountsSource;
  readonly fallbackReason?: string;
};

export type FinancialAccountsApiContext = FinancialTitlesApiContext;

export type CreateFinancialAccountPayload = {
  readonly name: string;
  readonly kind: FinancialAccountKind;
  readonly opening_balance?: number;
  readonly bank_name?: string;
};
