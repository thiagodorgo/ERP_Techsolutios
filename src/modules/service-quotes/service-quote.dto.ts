import type { ServiceQuote, ListServiceQuoteResult } from "./service-quote.types.js";

export function toServiceQuoteDto(quote: ServiceQuote) {
  return {
    id: quote.id,
    workOrderId: quote.workOrderId ?? null,
    customerId: quote.customerId ?? null,
    serviceCatalogId: quote.serviceCatalogId,
    sourceTariffId: quote.sourceTariffId ?? null,
    sourcePriceTableId: quote.sourcePriceTableId ?? null,
    frozenUnitPrice: quote.frozenUnitPrice,
    frozenCurrency: quote.frozenCurrency,
    quantity: quote.quantity,
    frozenTotal: quote.frozenTotal,
    frozenAt: quote.frozenAt.toISOString(),
    priceSource: quote.priceSource,
    status: quote.status,
    isActive: quote.isActive,
    notes: quote.notes ?? null,
    // Ω3F-4a/4b — cabeçalho exposto. shareToken NUNCA entra aqui (§2.8): só o endpoint /share o devolve.
    number: quote.number ?? null,
    issuedAt: quote.issuedAt ? quote.issuedAt.toISOString() : null,
    validUntil: quote.validUntil ? quote.validUntil.toISOString() : null,
    createdWorkOrderId: quote.createdWorkOrderId ?? null,
    createdBy: quote.createdBy ?? null,
    updatedBy: quote.updatedBy ?? null,
    createdAt: quote.createdAt.toISOString(),
    updatedAt: quote.updatedAt.toISOString(),
  };
}

// B1 (crítico + lição recorrente) — o list DTO emite TODOS os campos que a tela lê: dinheiro SEMPRE
// com moeda (`frozenCurrency`), a fonte do preço (`priceSource`) e os links de volta (`workOrderId`,
// `customerId`). Sem eles a coluna de valor fica ambígua e a navegação para a OS morre — a classe de
// bug que reprovou 4 blocos.
export function toServiceQuoteListDto(result: ListServiceQuoteResult) {
  return {
    items: result.items.map((quote) => ({
      id: quote.id,
      workOrderId: quote.workOrderId ?? null,
      customerId: quote.customerId ?? null,
      serviceCatalogId: quote.serviceCatalogId,
      sourceTariffId: quote.sourceTariffId ?? null,
      frozenUnitPrice: quote.frozenUnitPrice,
      frozenCurrency: quote.frozenCurrency,
      quantity: quote.quantity,
      frozenTotal: quote.frozenTotal,
      frozenAt: quote.frozenAt.toISOString(),
      priceSource: quote.priceSource,
      status: quote.status,
      isActive: quote.isActive,
      createdAt: quote.createdAt.toISOString(),
    })),
    pagination: {
      limit: result.limit,
      offset: result.offset,
      total: result.total,
    },
  };
}
