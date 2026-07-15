import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export type ServiceQuoteItemActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω3F-4a — item (linha) do Orçamento. CONGELA (snapshot imutável) unit_amount + total_amount no
// momento do lançamento: source=tariff resolve a Tarifa vigente via ApplicableTariffResolver (a
// MESMA máquina do orçamento — tabela PUBLICADA + vigência + cliente do orçamento) numa ÚNICA
// leitura; source=manual usa o valor do corpo (description obrigatória). tariffId/priceTableId são
// PROVENIÊNCIA apenas — JAMAIS relidos para recalcular (anti-refaturamento). Delete LÓGICO via
// deletedAt: o item some da lista e do total agregado. Itens só existem enquanto o orçamento-pai
// está `draft` (espelho da regra de edição do próprio ServiceQuote).
export type ServiceQuoteItem = {
  readonly id: string;
  readonly tenantId: string;
  readonly serviceQuoteId: string;
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

export type CreateServiceQuoteItemInput = Omit<
  ServiceQuoteItem,
  "id" | "createdAt" | "updatedAt" | "deletedAt"
>;

// PATCH — edição inline de quantity/notes/description (+ unitAmount SÓ para source=manual). O
// total_amount é recomputado no service a partir do unit_amount JÁ CONGELADO (nunca relê a
// Tarifa — espelho de service-quote.service.update). Item deletado → 404.
export type UpdateServiceQuoteItemInput = {
  readonly tenantId: string;
  readonly serviceQuoteId: string;
  readonly itemId: string;
  readonly description?: string;
  readonly quantity?: number;
  readonly unitAmount?: number;
  readonly totalAmount?: number;
  readonly notes?: string;
  readonly updatedBy?: string;
};

export type ListServiceQuoteItemResult = {
  readonly items: readonly ServiceQuoteItem[];
  // B1 (lição recorrente) — o total agregado é SOMADO no backend (o front nunca soma):
  // apenas itens não-deletados entram.
  readonly totalAmount: number;
  readonly currency: string;
};

export const SERVICE_QUOTE_ITEM_SOURCES = ["tariff", "manual"] as const;

export class ServiceQuoteItemError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "ServiceQuoteItemError";
  }
}
