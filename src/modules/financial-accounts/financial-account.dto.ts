import type { FinancialAccount, ListFinancialAccountResult } from "./financial-account.types.js";

// §2.8 — a resposta OMITE tenant_id (resolvido pelo ator). openingBalance sai como number.
// createdBy/updatedBy são UUID interno (padrão dos vizinhos). Sem token/path/bucket/base64.
export function toFinancialAccountDto(account: FinancialAccount) {
  return {
    id: account.id,
    name: account.name,
    kind: account.kind,
    currency: account.currency,
    openingBalance: account.openingBalance,
    bankName: account.bankName ?? null,
    agency: account.agency ?? null,
    accountNumber: account.accountNumber ?? null,
    document: account.document ?? null,
    notes: account.notes ?? null,
    status: account.status,
    isActive: account.isActive,
    createdBy: account.createdBy ?? null,
    updatedBy: account.updatedBy ?? null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

export function toFinancialAccountListDto(result: ListFinancialAccountResult) {
  return {
    items: result.items.map((account) => ({
      id: account.id,
      name: account.name,
      kind: account.kind,
      currency: account.currency,
      openingBalance: account.openingBalance,
      bankName: account.bankName ?? null,
      status: account.status,
      isActive: account.isActive,
      createdAt: account.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}
