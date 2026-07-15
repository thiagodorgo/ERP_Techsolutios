import type { Permission, Role } from "../core-saas/permissions/catalog.js";

export type ServiceQuoteActorContext = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
};

// Ω3-a — ServiceQuote (orçamento). CONGELA (snapshot imutável) o preço unitário + total a partir da
// Tarifa vigente numa Tabela de Valores PUBLICADA, no momento da criação. Reeditar/republicar a Tarifa
// depois NÃO altera o quote (anti-refaturamento; resolve o deferral A4 de D-OMEGA2A).
// Os campos `frozen_*` são server-derived no create e NUNCA recalculados relendo a Tarifa.
export type ServiceQuote = {
  readonly id: string;
  readonly tenantId: string;
  readonly workOrderId?: string;
  readonly customerId?: string;
  readonly serviceCatalogId: string;
  // Rastreabilidade apenas (FK viva); JAMAIS relidos para recalcular preço.
  readonly sourceTariffId?: string;
  readonly sourcePriceTableId?: string;
  readonly frozenUnitPrice: number;
  readonly frozenCurrency: string;
  readonly quantity: number;
  readonly frozenTotal: number;
  readonly frozenAt: Date;
  readonly priceSource: string; // "tariff" | "manual"
  readonly status: string; // draft | approved | rejected | void
  readonly isActive: boolean;
  readonly notes?: string;
  // Ω3F-4a/4b — cabeçalho do orçamento. `number/issuedAt/validUntil` são editáveis enquanto draft.
  // `createdWorkOrderId` é a âncora de idempotência do approve (um orçamento gera no máx. 1 OS).
  // `shareToken` é o segredo de compartilhamento — NUNCA exposto no DTO normal (§2.8), só no /share.
  readonly number?: string;
  readonly issuedAt?: Date;
  readonly validUntil?: Date;
  readonly createdWorkOrderId?: string;
  readonly shareToken?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ListServiceQuoteInput = {
  readonly tenantId: string;
  readonly workOrderId?: string;
  readonly status?: string;
  readonly isActive?: boolean;
  readonly search?: string;
  readonly limit: number;
  readonly offset: number;
};

export type ListServiceQuoteResult = {
  readonly items: readonly ServiceQuote[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
};

export type CreateServiceQuoteInput = Omit<
  ServiceQuote,
  "id" | "isActive" | "createdAt" | "updatedAt"
> & {
  readonly isActive?: boolean;
};

// PATCH /:id — só `quantity`/`notes` enquanto `draft`. O `frozenTotal` é recomputado no service a
// partir do `frozenUnitPrice` JÁ congelado (nunca relê a Tarifa). PATCH /:id/status muda `status`
// (+ `isActive`). Preço/moeda/fonte NUNCA são mutáveis.
export type UpdateServiceQuoteInput = {
  readonly tenantId: string;
  readonly serviceQuoteId: string;
  readonly quantity?: number;
  readonly frozenTotal?: number;
  readonly notes?: string;
  readonly status?: string;
  readonly isActive?: boolean;
  // Ω3F-4a — cabeçalho editável em draft.
  readonly number?: string;
  readonly issuedAt?: Date;
  readonly validUntil?: Date;
  // Ω3F-4b — setados internamente por approve/share (nunca pelo corpo do PATCH normal).
  readonly createdWorkOrderId?: string;
  readonly shareToken?: string;
  readonly updatedBy?: string;
};

// Máquina de estado do orçamento. `void` é lógico-delete (libera a chave natural). `approved` e
// `rejected` só podem seguir para `void`; `void` é terminal.
export const SERVICE_QUOTE_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ["approved", "rejected", "void"],
  approved: ["void"],
  rejected: ["void"],
  void: [],
};

export const SERVICE_QUOTE_STATUSES = ["draft", "approved", "rejected", "void"] as const;
export const SERVICE_QUOTE_PRICE_SOURCES = ["tariff", "manual"] as const;

// Teto do Decimal(12,2): 9.999.999.999,99. Preço e total precisam caber (A3 do crítico).
// C3 (Ω3F-3a) — o valor agora mora no shape compartilhado (mesmo literal de antes); re-export
// preserva o contrato deste módulo e elimina o risco de drift entre os consumidores.
export { MONEY_MAX } from "../tariffs/financial-item.shape.js";

export class ServiceQuoteError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "ServiceQuoteError";
  }
}
