import type { Cheque, ListChequeResult } from "./cheque.types.js";

// §2.8 — a resposta OMITE tenant_id (resolvido pelo ator) e deleted_at (só expõe `active`). direction/status/
// cheque_number/bank/currency/notes são dados de NEGÓCIO do instrumento (não segredo/token/path). cleared_entry_id/
// bounce_entry_id são UUIDs de lançamento do PRÓPRIO tenant (paridade com createdBy/updatedBy já expostos —
// não é nova classe de vazamento). due_date sai como date-only (competência nunca deriva dela).
export function toChequeDto(cheque: Cheque) {
  return {
    id: cheque.id,
    accountId: cheque.accountId,
    direction: cheque.direction,
    chequeNumber: cheque.chequeNumber,
    bank: cheque.bank,
    amount: cheque.amount,
    currency: cheque.currency,
    dueDate: cheque.dueDate ? cheque.dueDate.toISOString() : null,
    status: cheque.status,
    clearedEntryId: cheque.clearedEntryId ?? null,
    bounceEntryId: cheque.bounceEntryId ?? null,
    bounceReason: cheque.bounceReason ?? null,
    notes: cheque.notes ?? null,
    active: cheque.deletedAt == null,
    createdBy: cheque.createdBy ?? null,
    updatedBy: cheque.updatedBy ?? null,
    createdAt: cheque.createdAt.toISOString(),
    updatedAt: cheque.updatedAt.toISOString(),
  };
}

export function toChequeListDto(result: ListChequeResult) {
  return {
    items: result.items.map((cheque) => ({
      id: cheque.id,
      accountId: cheque.accountId,
      direction: cheque.direction,
      chequeNumber: cheque.chequeNumber,
      bank: cheque.bank,
      amount: cheque.amount,
      currency: cheque.currency,
      dueDate: cheque.dueDate ? cheque.dueDate.toISOString() : null,
      status: cheque.status,
      clearedEntryId: cheque.clearedEntryId ?? null,
      bounceEntryId: cheque.bounceEntryId ?? null,
      active: cheque.deletedAt == null,
      createdAt: cheque.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}
