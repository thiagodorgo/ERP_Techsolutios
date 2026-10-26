import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import { adaptFinancialAccountBalance, adaptFinancialAccountResponse, adaptFinancialAccountsResponse } from "./financial-accounts.adapter";
import type {
  CreateFinancialAccountPayload,
  FinancialAccount,
  FinancialAccountBalance,
  FinancialAccountsApiContext,
  FinancialAccountsData,
} from "./financial-accounts.types";

// B-SAN3-12b — serviço das contas. Leitura: modo mock → vazio honesto; erro real → `fallback` com motivo (a tela mostra
// erro, nunca lista vazia — F9). Escrita: o erro do backend NÃO é engolido (o formulário precisa do `reason`).

const EMPTY = { limit: 0, offset: 0, total: 0 } as const;

export async function listFinancialAccounts(context: FinancialAccountsApiContext): Promise<FinancialAccountsData> {
  if (isMockMode()) return { items: [], pagination: { ...EMPTY }, source: "mock" };
  try {
    return adaptFinancialAccountsResponse(await apiRequest<unknown>("/financial-accounts?limit=100", context), "api");
  } catch {
    return { items: [], pagination: { ...EMPTY }, source: "fallback", fallbackReason: "Não foi possível consultar as contas." };
  }
}

/** Saldo de UMA conta, somado no servidor. Falha → null (a tela mostra "saldo indisponível"). */
export async function getFinancialAccountBalance(context: FinancialAccountsApiContext, accountId: string): Promise<FinancialAccountBalance | null> {
  if (isMockMode()) return null;
  try {
    return adaptFinancialAccountBalance(await apiRequest<unknown>(`/financial-accounts/${encodeURIComponent(accountId)}/balance`, context));
  } catch {
    return null;
  }
}

export async function createFinancialAccount(context: FinancialAccountsApiContext, payload: CreateFinancialAccountPayload): Promise<FinancialAccount> {
  const account = adaptFinancialAccountResponse(await apiRequest<unknown>("/financial-accounts", { ...context, method: "POST", body: payload }));
  if (!account) throw new Error("invalid_financial_account_response");
  return account;
}
