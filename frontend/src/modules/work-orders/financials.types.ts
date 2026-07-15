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
