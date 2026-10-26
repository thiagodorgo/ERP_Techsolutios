import { isMockMode } from "../../../config/env";
import { apiRequest } from "../../../services/api/client";
import {
  adaptEntriesAggregate,
  adaptFinancialEntriesResponse,
  adaptFinancialEntryResponse,
  adaptReconciliationPolicy,
  adaptTitleCheques,
  adaptUnlinkResult,
} from "./financial-entries.adapter";
import type {
  EntriesAggregate,
  EntriesAggregateQuery,
  FinanceApiContext,
  FinancialEntriesData,
  FinancialEntriesFilters,
  FinancialEntry,
  ReconcilePayload,
  ReconciliationPolicy,
  TitleCheque,
  UnlinkResult,
} from "./financial-entries.types";

// B-SAN3-12b — serviço dos lançamentos (rotas do 12a, §4.1–4.6 do plano). Leitura de LISTA cai em `fallback` com motivo
// (a tela mostra erro, nunca extrato vazio — F9); leitura pontual e ESCRITA propagam o erro (o formulário precisa do
// status/razão para falar e para decidir reler). Todo filtro vai ao SERVIDOR; o front não filtra dinheiro nem soma.

export const ENTRIES_PAGE_LIMIT = 100;

function filterQuery(filters: FinancialEntriesFilters, params: URLSearchParams): void {
  if (filters.accountId) params.set("account_id", filters.accountId);
  if (filters.direction) params.set("direction", filters.direction);
  if (typeof filters.reconciled === "boolean") params.set("reconciled", String(filters.reconciled));
  if (filters.divergenceType) params.set("divergence_type", filters.divergenceType);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
}

export function entriesListPath(filters: FinancialEntriesFilters): string {
  const params = new URLSearchParams();
  filterQuery(filters, params);
  params.set("limit", String(ENTRIES_PAGE_LIMIT));
  return `/financial-entries?${params}`;
}

export async function listFinancialEntries(context: FinanceApiContext, filters: FinancialEntriesFilters): Promise<FinancialEntriesData> {
  if (isMockMode()) return { items: [], pagination: { limit: 0, offset: 0, total: 0 }, source: "mock" };
  try {
    return adaptFinancialEntriesResponse(await apiRequest<unknown>(entriesListPath(filters), context), "api");
  } catch {
    return { items: [], pagination: { limit: 0, offset: 0, total: 0 }, source: "fallback", fallbackReason: "Não foi possível consultar o extrato." };
  }
}

export async function getFinancialEntry(context: FinanceApiContext, entryId: string): Promise<FinancialEntry> {
  const entry = adaptFinancialEntryResponse(await apiRequest<unknown>(`/financial-entries/${encodeURIComponent(entryId)}`, context));
  if (!entry) throw new Error("invalid_financial_entry_response");
  return entry;
}

export async function reconcileFinancialEntry(context: FinanceApiContext, entryId: string, payload: ReconcilePayload): Promise<FinancialEntry> {
  const entry = adaptFinancialEntryResponse(
    await apiRequest<unknown>(`/financial-entries/${encodeURIComponent(entryId)}/reconcile`, { ...context, method: "PATCH", body: payload }),
  );
  if (!entry) throw new Error("invalid_financial_entry_response");
  return entry;
}

/** Política para O ATOR (calculada no servidor). Falha → sem privilégio (fail-closed). */
export async function getReconciliationPolicy(context: FinanceApiContext): Promise<ReconciliationPolicy> {
  if (isMockMode()) return { canUnreconcile: false, delegatedToFinance: false };
  try {
    return adaptReconciliationPolicy(await apiRequest<unknown>("/financial-entries/reconciliation-policy", context));
  } catch {
    return { canUnreconcile: false, delegatedToFinance: false };
  }
}

/** Agregado somado no SERVIDOR. Falha ou forma inválida → null (a tela não renderiza o número — F19). */
export async function getEntriesAggregate(context: FinanceApiContext, query: EntriesAggregateQuery): Promise<EntriesAggregate | null> {
  if (isMockMode()) return null;
  const params = new URLSearchParams({ group_by: query.groupBy });
  filterQuery(query, params);
  try {
    return adaptEntriesAggregate(await apiRequest<unknown>(`/financial-entries/aggregate?${params}`, context));
  } catch {
    return null;
  }
}

/** Cheques PENDENTES vinculados ao título (GET /cheques?title_id=, do #456). */
export async function listPendingChequesForTitle(context: FinanceApiContext, titleId: string): Promise<TitleCheque[]> {
  return adaptTitleCheques(await apiRequest<unknown>(`/cheques?title_id=${encodeURIComponent(titleId)}`, context));
}

/** Troca da vinculação (§4.3): privilégio alto + justificativa; o servidor audita como Crítica. */
export async function unlinkChequeFromTitle(context: FinanceApiContext, chequeId: string, justification: string): Promise<UnlinkResult> {
  const result = adaptUnlinkResult(
    await apiRequest<unknown>(`/cheques/${encodeURIComponent(chequeId)}/unlink-title`, { ...context, method: "POST", body: { justification } }),
  );
  if (!result) throw new Error("invalid_cheque_response");
  return result;
}
