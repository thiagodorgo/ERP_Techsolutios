import type { FinancialAccountBalance, FinancialEntry, ListFinancialEntryResult } from "./financial-entry.types.js";

// §2.8 — a resposta OMITE tenant_id (resolvido pelo ator), deleted_at (só expõe `active`) e o
// client_action_id (token opaco de idempotência). amount sai como number. direction/payment_method/
// category/competencia são valores de NEGÓCIO (não segredo/UUID) → OK expor. Expõe reconciled (bool).
export function toFinancialEntryDto(entry: FinancialEntry) {
  return {
    id: entry.id,
    accountId: entry.accountId,
    titleId: entry.titleId ?? null,
    direction: entry.direction,
    amount: entry.amount,
    currency: entry.currency,
    paymentMethod: entry.paymentMethod,
    category: entry.category ?? null,
    occurredAt: entry.occurredAt.toISOString(),
    competencia: entry.competencia,
    description: entry.description ?? null,
    reversalOf: entry.reversalOf ?? null,
    reconciled: entry.reconciled,
    active: entry.deletedAt == null,
    createdBy: entry.createdBy ?? null,
    updatedBy: entry.updatedBy ?? null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export function toFinancialEntryListDto(result: ListFinancialEntryResult) {
  return {
    items: result.items.map((entry) => ({
      id: entry.id,
      accountId: entry.accountId,
      titleId: entry.titleId ?? null,
      direction: entry.direction,
      amount: entry.amount,
      currency: entry.currency,
      paymentMethod: entry.paymentMethod,
      category: entry.category ?? null,
      occurredAt: entry.occurredAt.toISOString(),
      competencia: entry.competencia,
      reversalOf: entry.reversalOf ?? null,
      reconciled: entry.reconciled,
      active: entry.deletedAt == null,
      createdAt: entry.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}

// Saldo COMPUTADO no backend (front nunca soma). amount/openingBalance/balance como number.
export function toFinancialAccountBalanceDto(balance: FinancialAccountBalance) {
  return {
    accountId: balance.accountId,
    currency: balance.currency,
    openingBalance: balance.openingBalance,
    in: balance.in,
    out: balance.out,
    balance: balance.balance,
  };
}
