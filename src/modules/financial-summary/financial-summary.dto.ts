import type { FinancialSummary } from "./financial-summary.types.js";

// §2.8 — OMITE tenant_id. Só agregados de dinheiro (somas/contagens) e projeções mínimas de título recente
// (party_name já é dado modelado do título; sem document/tenant_id). Valores como number; datas ISO.
export function toFinancialSummaryDto(summary: FinancialSummary) {
  return {
    receivable: { ...summary.receivable },
    payable: { ...summary.payable },
    settledThisMonth: { ...summary.settledThisMonth },
    cash: { ...summary.cash },
    cheques: { ...summary.cheques },
    cashFlow: summary.cashFlow.map((point) => ({ ...point })),
    recentTitles: summary.recentTitles.map((title) => ({
      id: title.id,
      direction: title.direction,
      partyName: title.partyName,
      amount: title.amount,
      openAmount: title.openAmount,
      dueDate: title.dueDate.toISOString().slice(0, 10),
      status: title.status,
      overdue: title.overdue,
    })),
  };
}
