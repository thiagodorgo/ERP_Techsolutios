import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export type WorkOrderFinancialActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω3F-3a — item do Financeiro da OS. CONGELA (snapshot imutável) unit_amount + total_amount no
// momento do lançamento: source=tariff resolve a Tarifa vigente via ApplicableTariffResolver (a
// MESMA máquina do orçamento — tabela PUBLICADA + vigência + cliente da OS) numa ÚNICA leitura;
// source=manual usa o valor do corpo (description obrigatória). tariffId/priceTableId são
// PROVENIÊNCIA apenas — JAMAIS relidos para recalcular (anti-refaturamento). Delete LÓGICO via
// deletedAt: o item some da lista e do total agregado.
export type WorkOrderFinancialItem = {
  readonly id: string;
  readonly tenantId: string;
  readonly workOrderId: string;
  readonly tariffId?: string;
  readonly priceTableId?: string;
  readonly description: string;
  readonly quantity: number;
  readonly unitAmount: number;
  readonly totalAmount: number;
  readonly currency: string;
  readonly source: string; // "tariff" | "manual"
  readonly notes?: string;
  readonly clientActionId?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date;
};

export type CreateWorkOrderFinancialItemInput = Omit<
  WorkOrderFinancialItem,
  "id" | "createdAt" | "updatedAt" | "deletedAt"
>;

// PATCH — edição inline de quantity/notes/description (+ unitAmount SÓ para source=manual). O
// total_amount é recomputado no service a partir do unit_amount JÁ CONGELADO (nunca relê a
// Tarifa — espelho de service-quote.service.update). Item deletado → 404.
export type UpdateWorkOrderFinancialItemInput = {
  readonly tenantId: string;
  readonly workOrderId: string;
  readonly itemId: string;
  readonly description?: string;
  readonly quantity?: number;
  readonly unitAmount?: number;
  readonly totalAmount?: number;
  readonly notes?: string;
  readonly updatedBy?: string;
};

export type ListWorkOrderFinancialResult = {
  readonly items: readonly WorkOrderFinancialItem[];
  // B1 (lição recorrente) — o total agregado é SOMADO no backend (o front nunca soma):
  // apenas itens não-deletados entram.
  readonly totalAmount: number;
  readonly currency: string;
};

export const WORK_ORDER_FINANCIAL_SOURCES = ["tariff", "manual"] as const;

export class WorkOrderFinancialError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "WorkOrderFinancialError";
  }
}
