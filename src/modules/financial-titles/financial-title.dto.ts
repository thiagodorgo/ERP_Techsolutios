import type { FinancialTitle, ListFinancialTitleResult } from "./financial-title.types.js";
import { isTitleOverdue } from "./financial-title.validators.js";

// §2.8 — a resposta OMITE tenant_id (resolvido pelo ator) e deleted_at (só expõe `active`). amount/
// paid_amount saem como number. direction/party_type/status/competencia são valores de NEGÓCIO (não
// segredo/UUID) → OK expor. `overdue` é DERIVADO no backend (a UI não recalcula).
export function toFinancialTitleDto(title: FinancialTitle) {
  return {
    id: title.id,
    direction: title.direction,
    partyType: title.partyType,
    partyId: title.partyId ?? null,
    partyName: title.partyName,
    document: title.document ?? null,
    category: title.category ?? null,
    description: title.description ?? null,
    amount: title.amount,
    currency: title.currency,
    issueDate: title.issueDate.toISOString(),
    dueDate: title.dueDate.toISOString(),
    paidAmount: title.paidAmount,
    status: title.status,
    competencia: title.competencia,
    accountId: title.accountId ?? null,
    workOrderId: title.workOrderId ?? null,
    serviceQuoteId: title.serviceQuoteId ?? null,
    overdue: isTitleOverdue(title.status, title.dueDate),
    active: title.deletedAt == null,
    createdBy: title.createdBy ?? null,
    updatedBy: title.updatedBy ?? null,
    createdAt: title.createdAt.toISOString(),
    updatedAt: title.updatedAt.toISOString(),
  };
}

export function toFinancialTitleListDto(result: ListFinancialTitleResult) {
  return {
    items: result.items.map((title) => ({
      id: title.id,
      direction: title.direction,
      partyType: title.partyType,
      partyName: title.partyName,
      document: title.document ?? null,
      category: title.category ?? null,
      amount: title.amount,
      currency: title.currency,
      dueDate: title.dueDate.toISOString(),
      paidAmount: title.paidAmount,
      status: title.status,
      competencia: title.competencia,
      accountId: title.accountId ?? null,
      overdue: isTitleOverdue(title.status, title.dueDate),
      active: title.deletedAt == null,
      createdAt: title.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}
