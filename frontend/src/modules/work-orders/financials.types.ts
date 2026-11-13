import type { WorkOrdersApiContext } from "./work-orders.types";

// Ω3F-3b — itens financeiros da OS (aba Financeiro do hub). Espelha o DTO do backend
// (work-order-financial.dto.ts): dinheiro SEMPRE com moeda; o total é AGREGADO no backend
// (o front NUNCA soma — lição B1 que reprovou 4 blocos). §2.8: sem tenant_id/client_action_id.

export type WorkOrderFinancialSource = "tariff" | "manual";

export type WorkOrderFinancialItem = {
  readonly id: string;
  readonly workOrderId: string;
  readonly tariffId: string | null;
  readonly priceTableId: string | null;
  readonly description: string;
  readonly quantity: number;
  readonly unitAmount: number;
  readonly totalAmount: number;
  readonly currency: string;
  readonly source: WorkOrderFinancialSource;
  readonly notes: string | null;
  // B-SAN3-25 — o servidor emite os três (`work-order-financial.dto.ts:20-22`). Item faturado não se edita nem se exclui
  // (422 `item_invoiced`): a aba esconde os dois botões e mostra o chip "Faturado".
  readonly invoiced: boolean;
  readonly invoicedAt: string | null;
  readonly titleId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type WorkOrderFinancialList = {
  readonly items: readonly WorkOrderFinancialItem[];
  // Total já somado pelo backend (só itens não-deletados). O front apenas exibe.
  readonly totalAmount: number;
  readonly currency: string;
};

// Item avulso ("+", ex.: pedágio): descrição + valor unitário do corpo + qtd/observação.
export type WorkOrderFinancialManualInput = {
  readonly description: string;
  readonly unitAmount: number;
  readonly quantity?: number;
  readonly notes?: string;
};

// Edição inline: valor unitário (só item manual), quantidade, observação, descrição.
export type WorkOrderFinancialPatchInput = {
  readonly unitAmount?: number;
  readonly quantity?: number;
  readonly notes?: string;
  readonly description?: string;
};

export type WorkOrderFinancialApiContext = WorkOrdersApiContext;

// ---------- B-SAN3-25 — faturamento da OS (`POST /work-orders/:id/invoice`) ----------

// Corpo do faturamento: vazio (vencimento padrão do servidor, hoje + 30 dias UTC) ou com `due_date` ("AAAA-MM-DD").
export type WorkOrderInvoiceBody = { readonly due_date?: string };

// Situação do título como o servidor a emite (`FinancialTitleStatus`); `null` para o valor que a tela não conhece.
export type WorkOrderInvoiceTitleStatus = "open" | "scheduled" | "partially_paid" | "paid" | "in_dispute" | "cancelled";

// Adaptador MÍNIMO do título que a OS mostra (`toFinancialTitleDto`): o do Financeiro não lê `parentTitleId`, e editá-lo
// é de outro bloco (`P-SAN3-25-ADAPTADOR-DE-TITULO-DUPLICADO`). Sem parte, documento nem organização.
export type WorkOrderInvoiceTitle = {
  readonly id: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: WorkOrderInvoiceTitleStatus | null;
  readonly dueDate: string | null;
  // preenchido = título COMPLEMENTAR (o id do original); `null` = ORIGINAL
  readonly parentTitleId: string | null;
  readonly overdue: boolean;
};

// O 201 do faturamento (`work-order-financial.controller.ts:41-49`): o título criado, o total que o SERVIDOR faturou e a
// contagem de itens carimbados.
export type WorkOrderInvoiceResult = {
  readonly title: WorkOrderInvoiceTitle;
  readonly invoicedTotal: number;
  readonly currency: string;
  readonly invoicedItemCount: number;
};
